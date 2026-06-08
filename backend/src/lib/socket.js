import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

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

const userSocketMap = {};

// SECURITY ENGINE: In-memory store for tracking sliding window handshake intervals
const connectionRates = {};
const MAX_CONNECTIONS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 10000; // 10-second sliding window

export const getReceiverSocketIds = (userId) => userSocketMap[userId] || [];

/**
 * SOCKET MIDDLEWARE: IP-Based Connection Rate Limiter
 * Intercepts incoming client handshakes prior to connection establishment.
 * Safely mitigates script-based resource exhaustion or socket flooding attacks.
 */
io.use((socket, next) => {
    // Safely extract client IP checking proxy layers first
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const currentTime = Date.now();

    if (!connectionRates[clientIp]) {
        connectionRates[clientIp] = [];
    }

    // Retain only connection timestamps within the active 10-second window
    connectionRates[clientIp] = connectionRates[clientIp].filter(
        (timestamp) => currentTime - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Drop handshakes immediately if they exceed thresholds
    if (connectionRates[clientIp].length >= MAX_CONNECTIONS_PER_WINDOW) {
        console.warn(`WebSocket Rate Limit Breached: Blocked connection from IP ${clientIp}`);
        return next(new Error("Too many connection requests. Please slow down."));
    }

    // Log the current valid handshake timestamp and let the client pass through
    connectionRates[clientIp].push(currentTime);
    next();
});

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
        if (!userSocketMap[userId]) userSocketMap[userId] = [];
        userSocketMap[userId].push(socket.id);
        
        // Also update lastSeen to 'now' when they connect
        User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(err => console.error(err));

        // Mark offline pending messages as delivered
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
                    console.error(err);
                }
            }
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };