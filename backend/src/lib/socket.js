import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        // Allow any origin so the app works on phones/tablets on local network
        // and in all dev environments. Lock this down to your domain in production.
        origin: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(",")
            : true,
        credentials: true,
    },
});

import User from "../models/user.model.js";

const userSocketMap = {};

export const getReceiverSocketIds = (userId) => userSocketMap[userId] || [];

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
        if (!userSocketMap[userId]) userSocketMap[userId] = [];
        userSocketMap[userId].push(socket.id);
        
        // Also update lastSeen to 'now' when they connect
        User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(err => console.log(err));

        // Mark offline pending messages as delivered
        import("../models/message.model.js").then(({ default: Message }) => {
            Message.updateMany(
                { receiverId: userId, status: "sent" },
                { $set: { status: "delivered" } }
            ).then(async (res) => {
                if (res.modifiedCount > 0) {
                    const senders = await Message.distinct("senderId", { receiverId: userId, status: "delivered" });
                    senders.forEach(senderIdStr => {
                        const senderSockets = getReceiverSocketIds(senderIdStr.toString());
                        senderSockets.forEach(s => io.to(s).emit("messagesDelivered", { receiverId: userId }));
                    });
                }
            }).catch(console.error);
        });
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Typing indicators
    socket.on("typing", ({ receiverId }) => {
        const receiverSockets = getReceiverSocketIds(receiverId);
        receiverSockets.forEach(s => io.to(s).emit("userTyping", { senderId: userId }));
    });

    socket.on("stopTyping", ({ receiverId }) => {
        const receiverSockets = getReceiverSocketIds(receiverId);
        receiverSockets.forEach(s => io.to(s).emit("userStoppedTyping", { senderId: userId }));
    });

    // WebRTC Signaling
    socket.on("callUser", ({ userToCall, signalData, from, name, type }) => {
        const receiverSockets = getReceiverSocketIds(userToCall);
        receiverSockets.forEach(s => io.to(s).emit("incomingCall", { signal: signalData, from, name, type }));
    });

    socket.on("answerCall", ({ to, signal }) => {
        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("callAccepted", signal));
    });

    socket.on("iceCandidate", ({ to, candidate }) => {
        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("iceCandidate", candidate));
    });

    socket.on("endCall", ({ to }) => {
        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("callEnded"));
    });

    socket.on("rejectCall", ({ to }) => {
        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("callRejected"));
    });

    socket.on("disconnect", async () => {
        if (userId) {
            userSocketMap[userId] = userSocketMap[userId]?.filter(id => id !== socket.id) || [];
            if (userSocketMap[userId].length === 0) {
                delete userSocketMap[userId];
                try {
                    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
                } catch (err) {
                    console.log(err);
                }
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
