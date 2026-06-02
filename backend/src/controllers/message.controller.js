import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketIds } from "../lib/socket.js";
import webpush from "../lib/webpush.js";

// ── Helpers ──────────────────────────────────────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── GET /messages/users ──────────────────────────────────────────
// Returns conversation partners with lastMessage + unreadCount, sorted by recency
export async function getUsers(req, res) {
    const userId = new mongoose.Types.ObjectId(req.userId);
    try {
        const conversations = await Message.aggregate([
            { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        partnerId: {
                            $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"]
                        },
                    },
                    lastMessage: { $first: "$$ROOT" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id.partnerId",
                    foreignField: "_id",
                    as: "partner",
                },
            },
            { $unwind: "$partner" },
            { $sort: { "lastMessage.createdAt": -1 } },
        ]);

        // Get unread counts in a single query
        const unreadCounts = await Message.aggregate([
            { $match: { receiverId: userId, status: { $in: ["sent", "delivered"] } } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } },
        ]);
        const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));

        const result = conversations.map(({ partner, lastMessage }) => ({
            _id: partner._id,
            name: partner.name,
            email: partner.email,
            profilePicture: partner.profilePicture,
            lastSeen: partner.lastSeen,
            lastMessage: {
                _id: lastMessage._id,
                message: lastMessage.message,
                image: !!lastMessage.image,
                audio: !!lastMessage.audio,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
            },
            unreadCount: unreadMap[partner._id.toString()] || 0,
        }));

        res.status(200).json(result);
    } catch (err) {
        console.error("getUsers:", err.message);
        res.status(500).json({ message: "Could not load conversations" });
    }
}

// ── GET /messages/search?q= ──────────────────────────────────────
export async function searchUsers(req, res) {
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
    } catch (err) {
        console.error("searchUsers:", err.message);
        res.status(500).json({ message: "Could not search users" });
    }
}

// ── GET /messages/:id?before=&limit= ────────────────────────────
// Cursor-based pagination: returns `limit` messages older than `before`
export async function getMessages(req, res) {
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
    } catch (err) {
        console.error("getMessages:", err.message);
        res.status(500).json({ message: "Could not load messages" });
    }
}

// ── POST /messages/send/:id ──────────────────────────────────────
export async function sendMessage(req, res) {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.userId;

        if (senderId === receiverId) {
            return res.status(400).json({ message: "You cannot send messages to yourself" });
        }
        const { message, image, audio, replyTo } = req.body;

        if (!message?.trim() && !image && !audio) {
            return res.status(400).json({ message: "Message content cannot be empty" });
        }

        const receiverExists = await User.findById(receiverId);
        if (!receiverExists) {
            return res.status(404).json({ message: "Receiver user not found" });
        }

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

        const receiverSocketIds = getReceiverSocketIds(receiverId);
        let status = "sent";
        if (receiverSocketIds.length > 0) status = "delivered";

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: message || "",
            image: imageUrl,
            audio: audioUrl,
            replyTo: replyTo || undefined,
            status,
        });

        if (receiverSocketIds.length > 0) {
            receiverSocketIds.forEach(socketId => io.to(socketId).emit("newMessage", newMessage));
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
                } catch (pushErr) {
                    console.error("Web push error:", pushErr.message);
                    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                        receiverUser.pushSubscription = null;
                        await receiverUser.save();
                        console.log(`Cleared expired push subscription for user ${receiverId}`);
                    }
                }
            }
        }

        res.status(201).json(newMessage);
    } catch (err) {
        console.error("sendMessage:", err.message);
        res.status(500).json({ message: "Could not send message" });
    }
}

// ── DELETE /messages/:id ─────────────────────────────────────────
export async function deleteMessage(req, res) {
    try {
        const { id } = req.params;
        const senderId = req.userId;

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });
        if (message.senderId.toString() !== senderId)
            return res.status(403).json({ message: "You can only delete your own messages" });

        await Message.findByIdAndDelete(id);

        const receiverSocketIds = getReceiverSocketIds(message.receiverId.toString());
        receiverSocketIds.forEach(socketId => io.to(socketId).emit("deleteMessage", id));
        
        const senderSocketIds = getReceiverSocketIds(senderId);
        senderSocketIds.forEach(socketId => io.to(socketId).emit("deleteMessage", id));

        res.status(200).json({ _id: id });
    } catch (err) {
        console.error("deleteMessage:", err.message);
        res.status(500).json({ message: "Could not delete message" });
    }
}

// ── PUT /messages/mark-seen ──────────────────────────────────────
export async function markMessagesAsSeen(req, res) {
    try {
        const { senderId } = req.body;
        const receiverId = req.userId;

        const result = await Message.updateMany(
            { senderId, receiverId, status: { $ne: "seen" } },
            { $set: { status: "seen" } }
        );

        // Only emit socket event if messages were actually updated
        if (result.modifiedCount > 0) {
            const senderSocketIds = getReceiverSocketIds(senderId);
            senderSocketIds.forEach(socketId => io.to(socketId).emit("messagesSeen", { receiverId }));
        }
        res.status(200).json({ message: "Messages marked as seen" });
    } catch (err) {
        console.error("markMessagesAsSeen:", err.message);
        res.status(500).json({ message: "Could not mark messages as seen" });
    }
}

export async function reactToMessage(req, res) {
    try {
        const { id } = req.params;
        const { emoji } = req.body;
        const userId = req.userId;

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        // Check if user already reacted with this emoji
        const existingReactionIndex = message.reactions.findIndex(
            (r) => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Remove reaction
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Remove existing reaction by same user (if we only want 1 reaction per user) or just push it. 
            // We'll allow multiple emojis per user like Slack/Discord, but usually a single user has unique emojis.
            message.reactions.push({ emoji, userId });
        }

        await message.save();

        // Emit to the other person in the chat
        const otherUserId = message.senderId.toString() === userId ? message.receiverId.toString() : message.senderId.toString();
        const receiverSocketIds = getReceiverSocketIds(otherUserId);
        const senderSocketIds = getReceiverSocketIds(userId);
        
        receiverSocketIds.forEach(socketId => io.to(socketId).emit("messageReacted", { messageId: id, reactions: message.reactions }));
        senderSocketIds.forEach(socketId => io.to(socketId).emit("messageReacted", { messageId: id, reactions: message.reactions }));

        res.status(200).json(message.reactions);
    } catch (err) {
        console.error("reactToMessage:", err.message);
        res.status(500).json({ message: "Could not update reaction" });
    }
}
