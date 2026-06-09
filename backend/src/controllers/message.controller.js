import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketIds } from "../lib/socket.js";
import getSmartReplies from "../lib/smartReplies.js";
import webpush from "../lib/webpush.js";
import { catchAsync } from "../lib/utils.js";
import xss from "xss";

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Escapes special regex characters in a string to prevent ReDoS injection.
 * @param {string} str - The raw input string.
 * @returns {string} - The safely escaped string.
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Extracts the public ID from a Cloudinary secure URL.
 * @param {string} url - The Cloudinary file URL.
 * @returns {string|null} - The public ID or null.
 */
const extractPublicId = (url) => {
    if (!url) return null;
    try {
        const parts = url.split("/");
        const filename = parts.pop();
        return filename.split(".")[0];
    } catch {
        return null;
    }
};

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

/**
 * SECURITY GATEWAY: Validates incoming Base64 audio payload signatures and data footprints.
 * @param {string} base64Str - The raw Base64 data URL string from the client.
 * @param {number} maxSizeBytes - Maximum permissible binary footprint (default 10MB).
 * @returns {Object} Validation status descriptor containing { isValid: boolean, error?: string }
 */
const validateAudioAttachment = (base64Str, maxSizeBytes = 10 * 1024 * 1024) => {
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return { isValid: false, error: "Invalid audio format structure or corrupt payload." };
    }

    const mimeType = match[1];
    const rawData = match[2];

    const ALLOWED_MIME_TYPES = ["audio/webm", "audio/mp3", "audio/wav", "audio/mpeg", "audio/ogg", "audio/x-m4a", "audio/m4a"];
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return { isValid: false, error: "Unsupported audio format. Allowed formats: WEBM, MP3, WAV, OGG, M4A." };
    }

    const binarySizeEstimate = Math.floor((rawData.length * 3) / 4) - (rawData.endsWith("==") ? 2 : rawData.endsWith("=") ? 1 : 0);
    if (binarySizeEstimate > maxSizeBytes) {
        return { isValid: false, error: "Audio size exceeds the 10MB limit." };
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
export const getUsers = catchAsync(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.userId);
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
            statusMood: partner.statusMood || null,
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
});

// ── GET /messages/search?q= ──────────────────────────────────────
/**
 * Searches across the global user base by name.
 * Hardened against ReDoS and oversized payload attacks.
 * PERFORMANCE OPTIMIZED: Explicitly uses .select() to retrieve only UI-critical fields.
 * @param {Object} req - Express request object containing `q` query.
 * @param {Object} res - Express response object.
 */
export const searchUsers = catchAsync(async (req, res) => {
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
});

// ── GET /messages/:id?before=&limit= ────────────────────────────
/**
 * Fetches message history for a specific conversation using cursor-based pagination.
 * @param {Object} req - Express request object containing receiver `id` param.
 * @param {Object} res - Express response object.
 */
export const getMessages = catchAsync(async (req, res) => {
        const { id: receiverId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver user ID format" });
        }
        const senderId = req.userId;
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);
        const beforeId = req.query.before;

        if (beforeId && !mongoose.Types.ObjectId.isValid(beforeId)) {
            return res.status(400).json({ message: "Invalid cursor ID format" });
        }

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
});

// ── GET /messages/suggestions/:messageId ─────────────────────────
/**
 * Returns quick reply suggestions for an incoming message.
 * Only the sender or receiver of the message may request suggestions.
 */
export async function getMessageSuggestions(req, res) {
    try {
        const { messageId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message: "Invalid message ID format" });
        }

        const message = await Message.findById(messageId).lean();
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const currentUserId = req.userId?.toString();
        const isParticipant = [message.senderId?.toString(), message.receiverId?.toString()].includes(currentUserId);
        if (!isParticipant) {
            return res.status(403).json({ message: "Not authorized to view suggestions for this message" });
        }

        if (message.senderId?.toString() === currentUserId) {
            return res.status(200).json({ suggestions: [] });
        }

        const suggestions = getSmartReplies(message.message || "");
        res.status(200).json({ suggestions });
    } catch (err) {
        console.error("getMessageSuggestions:", err.message);
        res.status(500).json({ message: "Could not load suggestions" });
    }
}

// ── POST /messages/send/:id ──────────────────────────────────────
/**
 * Handles sending text, image, and voice messages to a specific user.
 * Triggers socket events or offline web-push notifications.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const sendMessage = catchAsync(async (req, res) => {
        const { id: receiverId } = req.params;
        // GSSoC Issue #57 Fix
        if (!receiverId) {
            return res.status(400).json({ message: "Receiver ID is required" });
        }
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Invalid receiver user ID format" });
        }
        const senderId = req.userId;

        if (senderId === receiverId) {
            return res.status(400).json({ message: "You cannot send messages to yourself" });
        }
        const { message, image, audio, replyTo } = req.body;

        if (replyTo && !mongoose.Types.ObjectId.isValid(replyTo)) {
            return res.status(400).json({ message: "Invalid replyTo ID format" });
        }

        let sanitizedMessage = message ? xss(message.trim()) : "";

        if (!sanitizedMessage && !image && !audio) {
            return res.status(400).json({ message: "Message content cannot be empty" });
        }

        // OPTIMIZATION: Only fetch the push subscription and name to limit memory use
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
            const validation = validateAudioAttachment(audio);
            if (!validation.isValid) {
                return res.status(400).json({ message: validation.error });
            }
            const result = await cloudinary.uploader.upload(audio, { resource_type: "auto" });
            audioUrl = result.secure_url;
        }

        const receiverSocketIds = getReceiverSocketIds(receiverId);
        let status = "sent";
        if (receiverSocketIds.length > 0) status = "delivered";

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: sanitizedMessage,
            image: imageUrl,
            audio: audioUrl,
            replyTo: replyTo || undefined,
            status,
        });

        if (receiverSocketIds.length > 0) {
            receiverSocketIds.forEach(socketId => io.to(socketId).emit("newMessage", newMessage));
        }
        
        if (receiverUser.pushSubscription) {
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
                    // Have to execute a fresh update since we limited fields on the initial query
                    await User.findByIdAndUpdate(receiverId, { pushSubscription: null });
                    console.log(`Cleared expired push subscription for user ${receiverId}`);
                }
            }
        }

        res.status(201).json(newMessage);
});

// ── DELETE /messages/:id ─────────────────────────────────────────
/**
 * Deletes a message and emits a deletion event to relevant sockets.
 * Enforces ownership validation before deletion.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const deleteMessage = catchAsync(async (req, res) => {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid message ID format" });
        }
        const senderId = req.userId;

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });
        if (message.senderId.toString() !== senderId)
            return res.status(403).json({ message: "You can only delete your own messages" });

        if (message.image) {
            const publicId = extractPublicId(message.image);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId).catch(err => console.error("Cloudinary image delete failed:", err));
            }
        }
        if (message.audio) {
            const publicId = extractPublicId(message.audio);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId, { resource_type: "video" }).catch(err => console.error("Cloudinary audio delete failed:", err));
            }
        }

        await Message.findByIdAndDelete(id);

        const receiverSocketIds = getReceiverSocketIds(message.receiverId.toString());
        receiverSocketIds.forEach(socketId => io.to(socketId).emit("deleteMessage", id));
        
        const senderSocketIds = getReceiverSocketIds(senderId);
        senderSocketIds.forEach(socketId => io.to(socketId).emit("deleteMessage", id));

        res.status(200).json({ _id: id });
});

// ── PUT /messages/mark-seen ──────────────────────────────────────
/**
 * Marks all unread messages in a conversation as seen.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const markMessagesAsSeen = catchAsync(async (req, res) => {
        const { senderId } = req.body;
        if (!senderId || !mongoose.Types.ObjectId.isValid(senderId)) {
            return res.status(400).json({ message: "Invalid sender ID format" });
        }
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
});

/**
 * Toggles a user's emoji reaction on a specific message.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const reactToMessage = catchAsync(async (req, res) => {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid message ID format" });
        }
        const { emoji } = req.body;
        const userId = req.userId;

        if (typeof emoji !== "string" || emoji.length === 0 || emoji.length > 10) {
            return res.status(400).json({ message: "Invalid emoji" });
        }

        const message = await Message.findById(id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        const isParticipant =
            message.senderId.toString() === userId ||
            message.receiverId.toString() === userId;
        if (!isParticipant) {
            return res.status(403).json({ message: "Forbidden: you are not a participant in this message conversation" });
        }

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
});

/**
 * Searches specific conversation history for message content.
 * Hardened against ReDoS and oversized payload attacks.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export const searchTextMessages = catchAsync(async (req, res) => {
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
});