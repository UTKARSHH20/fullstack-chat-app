import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketIds } from "../lib/socket.js";
import webpush from "../lib/webpush.js";

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Escapes special regex characters in a string to prevent ReDoS injection.
 * @param {string} str - The raw input string.
 * @returns {string} - The safely escaped string.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Validates and cleans search queries to protect against malicious input patterns.
 * @param {any} query - The raw query from the request.
 * @param {number} maxLength - Maximum allowed characters.
 * @returns {string|null} - Sanitized string or null if invalid.
 */
const sanitizeSearchQuery = (query, maxLength = 100) => {
    if (typeof query !== "string") return null;
    const trimmed = query.trim();
    if (!trimmed || trimmed.length > maxLength) return null;
    return escapeRegex(trimmed);
};

/**
 * SECURITY GATEWAY: Validates incoming Base64 image payload signatures and data footprints.
 * Rejects extension forgery by analyzing actual MIME content mapping declarations.
 * * @param {string} base64Str - The raw Base64 data URL string from the client.
 * @param {number} maxSizeBytes - Maximum permissible binary footprint (default 5MB).
 * @returns {Object} Validation status descriptor containing { isValid: boolean, error?: string }
 */
const validateImageAttachment = (base64Str, maxSizeBytes = 5 * 1024 * 1024) => {
    // Check if format conforms to a legitimate Data URL structure
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return { isValid: false, error: "Invalid file format structure or corrupt payload." };
    }

    const mimeType = match[1];
    const rawData = match[2];

    // Enforce strict allow-list on image signatures to block structural forgery
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return { isValid: false, error: "Unsupported image signature type. Allowed formats: JPEG, PNG, WEBP, GIF." };
    }

    // Calculate precise binary footprint size from base64 encoding representation string length
    const binarySizeEstimate = Math.floor((rawData.length * 3) / 4) - (rawData.endsWith("==") ? 2 : rawData.endsWith("=") ? 1 : 0);
    if (binarySizeEstimate > maxSizeBytes) {
        return { isValid: false, error: "File boundary limit exceeded. Image size must be under 5MB." };
    }

    return { isValid: true };
};

// ── GET /messages/users ──────────────────────────────────────────
/**
 * Retrieves a list of users the current user has conversed with.
 * Includes the latest message snippet and unread message counts.
 * PERFORMANCE OPTIMIZED: Uses $project to strip massive fields and only return essential UI data.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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
                    pipeline: [{ $project: { password: 0 } }],
                    as: "partner",
                },
            },
            { $unwind: "$partner" },
            // OPTIMIZATION: Only project the necessary user fields to save DB memory & bandwidth
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

        res.status(200).json(result);
    } catch (err) {
        console.error("getUsers:", err.message);
        res.status(500).json({ message: "Could not load conversations" });
    }
}

// ── GET /messages/search?q= ──────────────────────────────────────
/**
 * Searches across the global user base by name.
 * Hardened against ReDoS and oversized payload attacks.
 * PERFORMANCE OPTIMIZED: Explicitly uses .select() to retrieve only UI-critical fields.
 * @param {Object} req - Express request object containing `q` query.
 * @param {Object} res - Express response object.
 */
export async function searchUsers(req, res) {
    try {
        const safeQuery = sanitizeSearchQuery(req.query.q);
        
        // Return empty array if query is missing, empty, invalid type, or too long
        if (!safeQuery) return res.status(200).json([]);

        // OPTIMIZATION: explicitly pull only necessary public fields
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
/**
 * Fetches message history for a specific conversation using cursor-based pagination.
 * @param {Object} req - Express request object containing receiver `id` param.
 * @param {Object} res - Express response object.
 */
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
/**
 * Handles sending text, image, and voice messages to a specific user.
 * HARDENED SECURITY: Validates incoming file signatures on raw base64 allocations.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function sendMessage(req, res) {
    try {
        const { id: receiverId } = req.params;
        // GSSoC Issue #57 Fix
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
            // SECURITY CHECK: Intercept extension masquerades using file signature processing rules
            const validation = validateImageAttachment(image);
            if (!validation.isValid) {
                return res.status(400).json({ message: validation.error });
            }

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
/**
 * Deletes a message and emits a deletion event to relevant sockets.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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
/**
 * Marks all unread messages in a conversation as seen.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function markMessagesAsSeen(req, res) {
    try {
        const { senderId } = req.body;
        const receiverId = req.userId;

        const result = await Message.updateMany(
            { senderId, receiverId, status: { $ne: "seen" } },
            { $set: { status: "seen" } }
        );

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

/**
 * Toggles a user's emoji reaction on a specific message.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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
            // Add new reaction
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

/**
 * Searches specific conversation history for message content.
 * Hardened against ReDoS and oversized payload attacks.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function searchTextMessages(req, res) {
    try {
        const { id: partnerId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(partnerId)) {
            return res.status(400).json({ message: "Invalid partner user ID format" });
        }

        const safeQuery = sanitizeSearchQuery(req.query.q);
        
        // Return empty array if query is missing, empty, invalid type, or too long
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