import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import webpush from "../lib/webpush.js";

// ── Helpers ──────────────────────────────────────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── GET /messages/users ──────────────────────────────────────────
// Returns conversation partners with lastMessage + unreadCount, sorted by recency
export const getUsers = async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Find all unique conversation partners
        const msgs = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).select("senderId receiverId");

        const partnerIds = new Set();
        msgs.forEach(m => {
            const s = m.senderId.toString();
            const r = m.receiverId.toString();
            if (s !== userId) partnerIds.add(s);
            if (r !== userId) partnerIds.add(r);
        });

        if (partnerIds.size === 0) return res.status(200).json([]);

        // 2. Get user documents
        const users = await User.find({ _id: { $in: [...partnerIds] } }).select("-password");

        // 3. For each partner, get last message + unread count
        const enriched = await Promise.all(
            users.map(async (user) => {
                const partnerId = user._id.toString();

                const lastMessage = await Message.findOne({
                    $or: [
                        { senderId: userId, receiverId: partnerId },
                        { senderId: partnerId, receiverId: userId },
                    ],
                })
                    .sort({ createdAt: -1 })
                    .lean();

                const unreadCount = await Message.countDocuments({
                    senderId: partnerId,
                    receiverId: userId,
                    status: "sent",
                });

                return {
                    ...user.toObject(),
                    lastMessage: lastMessage
                        ? {
                              _id: lastMessage._id,
                              message: lastMessage.message,
                              image: !!lastMessage.image,
                              audio: !!lastMessage.audio,
                              senderId: lastMessage.senderId,
                              createdAt: lastMessage.createdAt,
                          }
                        : null,
                    unreadCount,
                };
            })
        );

        // 4. Sort by most recent message
        enriched.sort((a, b) => {
            const aTime = a.lastMessage?.createdAt || 0;
            const bTime = b.lastMessage?.createdAt || 0;
            return new Date(bTime) - new Date(aTime);
        });

        res.status(200).json(enriched);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── GET /messages/search?q= ──────────────────────────────────────
export const searchUsers = async (req, res) => {
    try {
        const { q = "" } = req.query;
        if (!q.trim()) return res.status(200).json([]);

        // Escape special regex characters to prevent ReDoS
        const safeQuery = escapeRegex(q.trim());

        const users = await User.find({
            _id: { $ne: req.userId },
            name: { $regex: safeQuery, $options: "i" },
        }).select("-password").limit(10);
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── GET /messages/:id?before=&limit= ────────────────────────────
// Cursor-based pagination: returns `limit` messages older than `before`
export const getMessages = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.userId;
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);
        const beforeId = req.query.before;

        const filter = {
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        };

        // If a cursor is provided, fetch messages older than it
        if (beforeId) {
            filter._id = { $lt: beforeId };
        }

        const messages = await Message.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit + 1) // fetch one extra to know if there's more
            .lean();

        const hasMore = messages.length > limit;
        if (hasMore) messages.pop(); // remove the extra

        // Reverse so oldest-first for the frontend
        messages.reverse();

        res.status(200).json({ messages, hasMore });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── POST /messages/send/:id ──────────────────────────────────────
export const sendMessage = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.userId;
        const { message, image, audio, replyTo } = req.body;

        let imageUrl = "";
        if (image) {
            const result = await cloudinary.uploader.upload(image);
            imageUrl = result.secure_url;
        }

        let audioUrl = "";
        if (audio) {
            const result = await cloudinary.uploader.upload(audio, { resource_type: "auto" });
            audioUrl = result.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: message || "",
            image: imageUrl,
            audio: audioUrl,
            replyTo: replyTo || undefined,
        });

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        } else {
            const receiverUser = await User.findById(receiverId);
            const senderUser = await User.findById(senderId);
            if (receiverUser?.pushSubscription) {
                const payload = JSON.stringify({
                    title: `New message from ${senderUser.name}`,
                    body: message || (audio ? "🎤 Voice message" : "📷 Image"),
                    icon: "/favicon.png",
                });
                try {
                    await webpush.sendNotification(receiverUser.pushSubscription, payload);
                } catch (err) {
                    console.log("Web push error:", err);
                }
            }
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── DELETE /messages/:id ─────────────────────────────────────────
export const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const senderId = req.userId;

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });
        if (message.senderId.toString() !== senderId)
            return res.status(403).json({ message: "You can only delete your own messages" });

        await Message.findByIdAndDelete(id);

        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        if (receiverSocketId) io.to(receiverSocketId).emit("deleteMessage", id);

        res.status(200).json({ _id: id });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ── PUT /messages/mark-seen ──────────────────────────────────────
export const markMessagesAsSeen = async (req, res) => {
    try {
        const { senderId } = req.body;
        const receiverId = req.userId;

        const result = await Message.updateMany(
            { senderId, receiverId, status: "sent" },
            { $set: { status: "seen" } }
        );

        // Only emit socket event if messages were actually updated
        if (result.modifiedCount > 0) {
            const senderSocketId = getReceiverSocketId(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("messagesSeen", { receiverId });
            }
        }
        res.status(200).json({ message: "Messages marked as seen" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
