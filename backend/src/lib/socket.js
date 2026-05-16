import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
        credentials: true,
    },
});

import User from "../models/user.model.js";

const userSocketMap = {};

export const getReceiverSocketId = (userId) => userSocketMap[userId];

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
        userSocketMap[userId] = socket.id;
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
                        const senderSocket = getReceiverSocketId(senderIdStr.toString());
                        if (senderSocket) {
                            io.to(senderSocket).emit("messagesDelivered", { receiverId: userId });
                        }
                    });
                }
            }).catch(console.error);
        });
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Typing indicators
    socket.on("typing", ({ receiverId }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit("userTyping", { senderId: userId });
    });

    socket.on("stopTyping", ({ receiverId }) => {
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) io.to(receiverSocketId).emit("userStoppedTyping", { senderId: userId });
    });

    // WebRTC Signaling
    socket.on("callUser", ({ userToCall, signalData, from, name, type }) => {
        const receiverSocketId = getReceiverSocketId(userToCall);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("incomingCall", { signal: signalData, from, name, type });
        }
    });

    socket.on("answerCall", ({ to, signal }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("callAccepted", signal);
        }
    });

    socket.on("iceCandidate", ({ to, candidate }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("iceCandidate", candidate);
        }
    });

    socket.on("endCall", ({ to }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("callEnded");
        }
    });

    socket.on("rejectCall", ({ to }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("callRejected");
        }
    });

    socket.on("disconnect", async () => {
        if (userId) {
            delete userSocketMap[userId];
            try {
                await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            } catch (err) {
                console.log(err);
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
