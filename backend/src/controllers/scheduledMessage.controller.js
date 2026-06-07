import mongoose from "mongoose";
import ScheduledMessage from "../models/scheduledMessage.model.js";
import User from "../models/user.model.js";

// ── POST /messages/schedule ──────────────────────────────────────
/**
 * Schedule a new message for future delivery.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function scheduleMessage(req, res) {
    try {
        const { receiverId, message, image, audio, scheduledFor, replyTo } = req.body;
        const senderId = req.userId;

        // Validation
        if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ message: "Valid receiver ID is required." });
        }

        if (!scheduledFor) {
            return res.status(400).json({ message: "Scheduled timestamp is required." });
        }

        const scheduledDate = new Date(scheduledFor);
        const now = new Date();

        if (scheduledDate <= now) {
            return res.status(400).json({ message: "Scheduled time must be in the future." });
        }

        if (!message && !image && !audio) {
            return res.status(400).json({ message: "Message, image, or audio is required." });
        }

        // Check receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "Receiver user not found." });
        }

        // Create scheduled message
        const scheduledMessage = new ScheduledMessage({
            senderId,
            receiverId,
            message: message || "",
            image: image || "",
            audio: audio || "",
            scheduledFor: scheduledDate,
            replyTo: replyTo || null,
            status: "pending",
        });

        await scheduledMessage.save();
        await scheduledMessage.populate("senderId receiverId", "name profilePicture");

        res.status(201).json({
            message: "Message scheduled successfully.",
            data: scheduledMessage,
        });
    } catch (error) {
        console.error("scheduleMessage:", error.message || error);
        res.status(500).json({ message: "Could not schedule message." });
    }
}

// ── GET /messages/scheduled ──────────────────────────────────────
/**
 * Get all scheduled messages for the authenticated user.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function getScheduledMessages(req, res) {
    try {
        const senderId = new mongoose.Types.ObjectId(req.userId);
        const { status, sort } = req.query;

        let query = { senderId };

        if (status && ["pending", "sent", "cancelled"].includes(status)) {
            query.status = status;
        }

        let sortBy = { scheduledFor: 1 }; // Default: ascending (upcoming first)
        if (sort === "oldest") {
            sortBy = { createdAt: 1 };
        } else if (sort === "newest") {
            sortBy = { createdAt: -1 };
        }

        const scheduledMessages = await ScheduledMessage.find(query)
            .populate("senderId receiverId", "name profilePicture")
            .sort(sortBy)
            .lean();

        res.status(200).json({
            message: "Scheduled messages retrieved.",
            data: scheduledMessages,
        });
    } catch (error) {
        console.error("getScheduledMessages:", error.message || error);
        res.status(500).json({ message: "Could not retrieve scheduled messages." });
    }
}

// ── GET /messages/scheduled/:id ──────────────────────────────────
/**
 * Get a specific scheduled message by ID.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function getScheduledMessage(req, res) {
    try {
        const { id } = req.params;
        const senderId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid scheduled message ID." });
        }

        const scheduledMessage = await ScheduledMessage.findOne({
            _id: id,
            senderId,
        }).populate("senderId receiverId", "name profilePicture");

        if (!scheduledMessage) {
            return res.status(404).json({ message: "Scheduled message not found." });
        }

        res.status(200).json({
            message: "Scheduled message retrieved.",
            data: scheduledMessage,
        });
    } catch (error) {
        console.error("getScheduledMessage:", error.message || error);
        res.status(500).json({ message: "Could not retrieve scheduled message." });
    }
}

// ── PATCH /messages/scheduled/:id ────────────────────────────────
/**
 * Update a scheduled message (only pending messages can be updated).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function updateScheduledMessage(req, res) {
    try {
        const { id } = req.params;
        const senderId = req.userId;
        const { message, image, audio, scheduledFor, replyTo } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid scheduled message ID." });
        }

        const scheduledMessage = await ScheduledMessage.findOne({
            _id: id,
            senderId,
        });

        if (!scheduledMessage) {
            return res.status(404).json({ message: "Scheduled message not found." });
        }

        if (scheduledMessage.status !== "pending") {
            return res.status(400).json({
                message: `Cannot update ${scheduledMessage.status} message. Only pending messages can be edited.`,
            });
        }

        // Update fields if provided
        if (message !== undefined) scheduledMessage.message = message;
        if (image !== undefined) scheduledMessage.image = image;
        if (audio !== undefined) scheduledMessage.audio = audio;
        if (replyTo !== undefined) scheduledMessage.replyTo = replyTo;

        if (scheduledFor) {
            const newScheduledDate = new Date(scheduledFor);
            const now = new Date();

            if (newScheduledDate <= now) {
                return res.status(400).json({ message: "Scheduled time must be in the future." });
            }

            scheduledMessage.scheduledFor = newScheduledDate;
        }

        // Validate at least one content field exists
        if (!scheduledMessage.message && !scheduledMessage.image && !scheduledMessage.audio) {
            return res.status(400).json({ message: "Message, image, or audio is required." });
        }

        await scheduledMessage.save();
        await scheduledMessage.populate("senderId receiverId", "name profilePicture");

        res.status(200).json({
            message: "Scheduled message updated successfully.",
            data: scheduledMessage,
        });
    } catch (error) {
        console.error("updateScheduledMessage:", error.message || error);
        res.status(500).json({ message: "Could not update scheduled message." });
    }
}

// ── DELETE /messages/scheduled/:id ───────────────────────────────
/**
 * Cancel a scheduled message.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
export async function deleteScheduledMessage(req, res) {
    try {
        const { id } = req.params;
        const senderId = req.userId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid scheduled message ID." });
        }

        const scheduledMessage = await ScheduledMessage.findOne({
            _id: id,
            senderId,
        });

        if (!scheduledMessage) {
            return res.status(404).json({ message: "Scheduled message not found." });
        }

        if (scheduledMessage.status !== "pending") {
            return res.status(400).json({
                message: `Cannot cancel ${scheduledMessage.status} message.`,
            });
        }

        // Mark as cancelled instead of deleting
        scheduledMessage.status = "cancelled";
        scheduledMessage.cancelledAt = new Date();
        await scheduledMessage.save();

        res.status(200).json({
            message: "Scheduled message cancelled successfully.",
            data: scheduledMessage,
        });
    } catch (error) {
        console.error("deleteScheduledMessage:", error.message || error);
        res.status(500).json({ message: "Could not cancel scheduled message." });
    }
}
