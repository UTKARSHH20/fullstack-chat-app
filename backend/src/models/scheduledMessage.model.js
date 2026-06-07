import mongoose from "mongoose";

const scheduledMessageSchema = new mongoose.Schema(
    {
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, default: "" },
        image: { type: String, default: "" },
        audio: { type: String, default: "" },
        scheduledFor: { type: Date, required: true },
        status: { type: String, enum: ["pending", "sent", "cancelled"], default: "pending" },
        sentAt: { type: Date, default: null },
        cancelledAt: { type: Date, default: null },
        replyTo: {
            _id: { type: mongoose.Schema.Types.ObjectId },
            message: { type: String, default: "" },
            senderName: { type: String, default: "" },
        },
    },
    { timestamps: true }
);

// Index for finding pending messages to send
scheduledMessageSchema.index({ status: 1, scheduledFor: 1 });
// Index for user's scheduled messages
scheduledMessageSchema.index({ senderId: 1, status: 1 });
// Index for time-based cleanup
scheduledMessageSchema.index({ createdAt: 1 });

const ScheduledMessage = mongoose.model("ScheduledMessage", scheduledMessageSchema);
export default ScheduledMessage;
