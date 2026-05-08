import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";

// GET /api/messages/users — all users except the logged-in one
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.userId } }).select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// GET /api/messages/:id — conversation between logged-in user and :id
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

// POST /api/messages/send/:id — send a message (text or image) + emit via socket
export const sendMessage = async (req, res) => {
    try {
        const { id: receiverId } = req.params;
        const senderId = req.userId;
        const { message, image } = req.body;

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
        });

        // ── Real-time delivery via Socket.io ─────────────────────
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
