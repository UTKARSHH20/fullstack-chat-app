import ScheduledMessage from "../models/scheduledMessage.model.js";
import Message from "../models/message.model.js";
import { io, getReceiverSocketIds } from "./socket.js";
import webpush from "./webpush.js";
import xss from "xss";
import cloudinary from "./cloudinary.js";
import { validateImageAttachment, validateAudioAttachment } from "./attachmentValidator.js";

let schedulerInterval = null;

const SCHEDULER_INTERVAL = 30000; // Check every 30 seconds

/**
 * Processes a single pending scheduled message.
 * Creates the actual message, sends socket events, and marks as sent.
 */
async function processScheduledMessage(scheduledMsg) {
    try {
        // Sanitize message text
        const sanitizedMessage = scheduledMsg.message ? xss(scheduledMsg.message.trim()) : "";

        // Handle image attachment
        let imageUrl = "";
        if (scheduledMsg.image) {
            if (scheduledMsg.image.startsWith('data:')) {
                const validation = validateImageAttachment(scheduledMsg.image);
                if (!validation.isValid) {
                    console.error(`[Scheduler] Image validation failed for scheduled message ${scheduledMsg._id}:`, validation.error);
                    scheduledMsg.status = "failed";
                    scheduledMsg.failureReason = validation.error;
                    await scheduledMsg.save();
                    return; // Skip processing this message
                }
                const uploadResult = await cloudinary.uploader.upload(scheduledMsg.image);
                imageUrl = uploadResult.secure_url;
            } else {
                imageUrl = scheduledMsg.image; // Assume already a URL
            }
        }

        // Handle audio attachment
        let audioUrl = "";
        if (scheduledMsg.audio) {
            if (scheduledMsg.audio.startsWith('data:')) {
                const validation = validateAudioAttachment(scheduledMsg.audio);
                if (!validation.isValid) {
                    console.error(`[Scheduler] Audio validation failed for scheduled message ${scheduledMsg._id}:`, validation.error);
                    scheduledMsg.status = "failed";
                    scheduledMsg.failureReason = validation.error;
                    await scheduledMsg.save();
                    return; // Skip processing this message
                }
                const uploadResult = await cloudinary.uploader.upload(scheduledMsg.audio, { resource_type: "auto" });
                audioUrl = uploadResult.secure_url;
            } else {
                audioUrl = scheduledMsg.audio; // Assume already a URL
            }
        }

        // Create the actual message
        const newMessage = new Message({
            senderId: scheduledMsg.senderId,
            receiverId: scheduledMsg.receiverId,
            message: sanitizedMessage,
            image: imageUrl,
            audio: audioUrl,
            replyTo: scheduledMsg.replyTo,
            status: "sent",
        });

        await newMessage.save();

        // Update scheduled message status
        scheduledMsg.status = "sent";
        scheduledMsg.sentAt = new Date();
        await scheduledMsg.save();

        // Populate sender info for socket event
        await newMessage.populate("senderId", "name profilePicture");

        // Emit socket event to receiver
        const receiverSocketIds = getReceiverSocketIds(scheduledMsg.receiverId.toString());
        if (receiverSocketIds && receiverSocketIds.length > 0) {
            io.to(receiverSocketIds).emit("newMessage", newMessage);
        }

        // Send push notification if enabled
        try {
            // In a real app, fetch user subscriptions from database
            // For now, this is a placeholder for push notification logic
            const notificationPayload = {
                title: "New message",
                body: sanitizedMessage || "(Message with attachment)",
                icon: "/icon.png",
            };

            // Push notifications would be sent here using webpush
            // webpush.sendNotification(subscription, JSON.stringify(notificationPayload));
        } catch (pushError) {
            console.error("Push notification error:", pushError.message);
        }

        console.log(`[Scheduler] Sent scheduled message ${scheduledMsg._id} to user ${scheduledMsg.receiverId}`);
    } catch (error) {
        console.error(`[Scheduler] Error processing message ${scheduledMsg._id}:`, error.message);
    }
}

/**
 * Main scheduler function that finds and processes pending messages.
 */
async function runScheduler() {
    try {
        const now = new Date();

        // Find all pending messages scheduled for now or in the past
        const pendingMessages = await ScheduledMessage.find({
            status: "pending",
            scheduledFor: { $lte: now },
        }).populate("senderId receiverId");

        if (pendingMessages.length > 0) {
            console.log(`[Scheduler] Found ${pendingMessages.length} message(s) to process`);

            // Process all pending messages in parallel
            await Promise.all(pendingMessages.map(processScheduledMessage));
        }
    } catch (error) {
        console.error("[Scheduler] Error in scheduler loop:", error.message);
    }
}

/**
 * Start the message scheduler.
 */
export function startScheduler() {
    if (schedulerInterval) {
        console.warn("[Scheduler] Scheduler already running");
        return;
    }

    console.log("[Scheduler] Starting message scheduler...");
    schedulerInterval = setInterval(runScheduler, SCHEDULER_INTERVAL);

    // Run once immediately on startup
    runScheduler();
}

/**
 * Stop the message scheduler.
 */
export function stopScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log("[Scheduler] Message scheduler stopped");
    }
}

/**
 * Get scheduler status.
 */
export function getSchedulerStatus() {
    return {
        isRunning: schedulerInterval !== null,
        interval: SCHEDULER_INTERVAL,
    };
}
