import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        message:    { type: String, default: "" },
        image:      { type: String, default: "" },
        audio:      { type: String, default: "" },
        replyTo: {
            _id:        { type: mongoose.Schema.Types.ObjectId },
            message:    { type: String, default: "" },
            senderName: { type: String, default: "" },
        },
        status: { type: String, enum: ["sent", "seen"], default: "sent" },
    },
    { timestamps: true }
);

// Compound index for fast conversation lookups & pagination
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
// Index for unread-count queries
messageSchema.index({ receiverId: 1, status: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;