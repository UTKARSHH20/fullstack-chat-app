import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketIds } from "../lib/socket.js";
import webpush from "../lib/webpush.js";
import { getRedisClient } from "../lib/redis.js"; // <-- Redis Import

// ── Helpers ──────────────────────────────────────────────────────
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeSearchQuery = (query, maxLength = 100) => {
    if (typeof query !== "string") return null;
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > maxLength) return null;
    return escapeRegex(trimmed);
};

// ── GET /messages/users ──────────────────────────────────────────
export async function getUsers(req, res) {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const cacheKey = `user:conversations:${req.userId}`; // <-- Cache Key
    const redis = getRedisClient();

    try {
        // Redis Cache Hit Check
        if (redis) {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

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
                    pipeline: [{ $project: { password: 0 } }],
                    as: "partner",
                },
            },
            { $unwind: "$partner" },
            { 
                $project: {
                    "partner.password": 0,
                    "partner.__v": 0,
                    "partner.pushSubscription": 0,
                    "partner.googleId": 0
                } 
            },
            { $sort: { "lastMessage.createdAt": -1 } },
        ]);

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

        // Redis Cache Miss - Save to Cache for 5 minutes
        if (redis) {
            await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
        }

        res.status(200).json(result);
    } catch (err) {
        console.error("getUsers:", err.message);
        res.status(500).json({ message: "Could not load conversations" });
    }
}

// ── GET /messages/search?q= ──────────────────────────────────────
export async function searchUsers(req, res) {
    try {
        const safeQuery = sanitizeSearchQuery(req.query.q);
        if (!safeQuery) return res.status(200).json([]);

        const users = await User.find({
            _id: { $ne: req.userId },
            name: { $regex: safeQuery, $options: "i" },
        })
        .select("_id name email profilePicture lastSeen")
        .limit(10);
        
        res.status(200).json(users);
    } catch (err) {
        console.error("searchUsers:", err.message);
        res.status(500).json({ message: "Could not search users" });
    }
}

// ── GET /messages/:id?before=&limit= ────────────────────────────
export async function getMessages(req, res) {
    try {
        const { id: receiverId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver user ID format" });
        }
        const senderId = req.userId;
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);
        const beforeId = req.query.before;

        const filter = {
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        };

        if (beforeId) {
            filter._id = { $lt: beforeId };
        }

        const messages = await Message.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .lean();

        const hasMore = messages.length > limit;
        if (hasMore) messages.pop();

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
        if (!receiverId) {
            return res.status(400).json({ message: "Receiver ID is required" });
        }
        const senderId = req.userId;

        if (senderId === receiverId) {
            return res.status(400).json({ message: "You cannot send messages to yourself" });
        }
        const { message, image, audio, replyTo } = req.body;

        if (!message?.trim() && !image && !audio) {
            return res.status(400).json({ message: "Message content cannot be empty" });
        }

        const receiverUser = await User.findById(receiverId).select("name pushSubscription");
        if (!receiverUser) {
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

        // Redis Cache Invalidation
        const redis = getRedisClient();
        if (redis) {
            await redis.del(`user:conversations:${senderId}`);
            await redis.del(`user:conversations:${receiverId}`);
        }

        if (receiverSocketIds.length > 0) {
            receiverSocketIds.forEach(socketId => io.to(socketId).emit("newMessage", newMessage));
        } else if (receiverUser.pushSubscription) {
            const senderUser = await User.findById(senderId).select("name");
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
                    await User.findByIdAndUpdate(receiverId, { pushSubscription: null });
                    console.log(`Cleared expired push subscription for user ${receiverId}`);
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

        // Redis Cache Invalidation
        const redis = getRedisClient();
        if (redis) {
            await redis.del(`user:conversations:${senderId}`);
            await redis.del(`user:conversations:${message.receiverId.toString()}`);
        }

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

        if (result.modifiedCount > 0) {
            // Redis Cache Invalidation
            const redis = getRedisClient();
            if (redis) {
                await redis.del(`user:conversations:${senderId}`);
                await redis.del(`user:conversations:${receiverId}`);
            }

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

        const existingReactionIndex = message.reactions.findIndex(
            (r) => r.userId.toString() === userId && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            message.reactions.push({ emoji, userId });
        }

        await message.save();

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

export async function searchTextMessages(req, res) {
    try {
        const { id: partnerId } = req.params;
        const { q = "" } = req.query;
        if (!mongoose.Types.ObjectId.isValid(partnerId)) {
            return res.status(400).json({ message: "Invalid partner user ID format" });
        }

        const safeQuery = sanitizeSearchQuery(req.query.q);
        if (!safeQuery) return res.status(200).json([]);

        const senderId = req.userId;

        const messages = await Message.find({
            $or: [
                { senderId, receiverId: partnerId },
                { senderId: partnerId, receiverId: senderId }
            ],
            message: { $regex: safeQuery, $options: "i" }
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (err) {
        console.error("searchTextMessages:", err.message);
        res.status(500).json({ message: "Could not search messages" });
    }
}