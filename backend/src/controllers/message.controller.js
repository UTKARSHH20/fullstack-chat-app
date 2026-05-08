import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// GET /api/messages/users — only users you've chatted with
export const getUsers = async (req, res) => {
    try {
        const userId = req.userId;

        // Find all messages involving current user
        const msgs = await Message.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).select("senderId receiverId");

        // Collect unique partner IDs
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

// GET /api/messages/search?q=name — search ALL users to start a new chat
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

// GET /api/messages/:id — conversation history
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

// POST /api/messages/send/:id
export const sendMessage = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.userId;
        const { message, image, replyTo } = req.body;

        let imageUrl = "";
        if (image) {
            const result = await cloudinary.uploader.upload(image);
            imageUrl = result.secure_url;
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            message: message || "",
            image: imageUrl,
            replyTo: replyTo || undefined,
        });

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// DELETE /api/messages/:id
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
