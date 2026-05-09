import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import webpush from "../lib/webpush.js";

export const getUsers = async (req, res) => {
    try {
        const userId = req.userId;
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
        const users = await User.find({ _id: { $in: [...partnerIds] } }).select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const { q = "" } = req.query;
        if (!q.trim()) return res.status(200).json([]);
        const users = await User.find({
            _id: { $ne: req.userId },
            name: { $regex: q.trim(), $options: "i" },
        }).select("-password").limit(10);
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.userId;
        const messages = await Message.find({
            $or: [
                { senderId, receiverId },
                { senderId: receiverId, receiverId: senderId },
            ],
        }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

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

export const markMessagesAsSeen = async (req, res) => {
    try {
        const { senderId } = req.body;
        const receiverId = req.userId;

        await Message.updateMany(
            { senderId, receiverId, status: "sent" },
            { $set: { status: "seen" } }
        );

        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesSeen", { receiverId });
        }
        res.status(200).json({ message: "Messages marked as seen" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
