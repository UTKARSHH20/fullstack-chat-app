import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
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

// Authenticate WebSocket connections via JWT from handshake cookie
io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) return next(new Error("Authentication required"));

    const match = cookieHeader.match(/(?:^|;\s*)jwt=([^;]+)/);
    const token = match ? match[1] : null;
    if (!token) return next(new Error("Authentication required"));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRETKEY);
        socket.userId = decoded.userId;
        next();
    } catch {
        next(new Error("Invalid or expired token"));
    }
});

const userSocketMap = {};

export const getReceiverSocketIds = (userId) => 
    userSocketMap[userId] ? [...userSocketMap[userId]] : [];

export const broadcastStatusMoodUpdate = ({ userId, statusMood }) => {
    io.emit("statusMoodUpdated", { userId, statusMood });
};

// Keep track of the last time MongoDB was updated for a user to avoid connection churn overhead
const lastDbUpdateCache = new Map();
const THROTTLE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

async function throttledUpdateLastSeen(userId) {
    const now = Date.now();
    const lastUpdate = lastDbUpdateCache.get(userId);

    if (!lastUpdate || (now - lastUpdate > THROTTLE_TIME)) {
        lastDbUpdateCache.set(userId, now);
        try {
            await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        } catch (err) {
            console.error(`[DB Error] Failed to update lastSeen for ${userId}:`, err);
        }
    }
}

/**
 * 🛠️ Security Helper: Validates if two users can communicate.
 * Adjust the database query inside based on whether you track relationships via 
 * a Friends/Block schema or directly within the User model.
 */
const canCommunicate = async (senderId, receiverId) => {
    if (!senderId || !receiverId || senderId === receiverId) return false;
    
    try {
        const receiver = await User.findById(receiverId);
        if (!receiver) return false;

        // Example: If your User schema has a 'blockedUsers' array
        if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
            return false;
        }

        return true;
    } catch (error) {
        console.error("Authorization check failed:", error);
        return false;
    }
};

const getActiveContacts = async (userId) => {
    try {
        const [senders, receivers] = await Promise.all([
            Message.distinct("senderId", { receiverId: userId }),
            Message.distinct("receiverId", { senderId: userId })
        ]);
        const merged = [...senders, ...receivers].map(id => id.toString());
        return [...new Set(merged)];
    } catch (err) {
        console.error("Error fetching active contacts:", err);
        return [];
    }
}

io.on("connection", (socket) => {
    const userId = socket.userId;

    // Early guard return: Prevent state pollution / memory leaks from unauthenticated sockets
    if (!userId) {
        console.warn(`[Socket.io] Connection rejected: Missing userId for socket ${socket.id}`);
        return socket.disconnect(true);
    }

    // Now safe to assume userId exists
    if (!userSocketMap[userId]) userSocketMap[userId] = [];
    userSocketMap[userId].push(socket.id);
    
    // Update lastSeen with a throttle mechanism to protect against connection churn
    throttledUpdateLastSeen(userId);

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

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Typing indicators (🔒 Protected)
    socket.on("typing", async ({ receiverId }) => {
        if (!(await canCommunicate(userId, receiverId))) return;

        const receiverSockets = getReceiverSocketIds(receiverId);
        receiverSockets.forEach(s => io.to(s).emit("userTyping", { senderId: userId }));
    });

    socket.on("stopTyping", async ({ receiverId }) => {
        if (!(await canCommunicate(userId, receiverId))) return;

        const receiverSockets = getReceiverSocketIds(receiverId);
        receiverSockets.forEach(s => io.to(s).emit("userStoppedTyping", { senderId: userId }));
    });

    // WebRTC Signaling (🔒 Protected)
    socket.on("callUser", async ({ userToCall, signalData, type }) => {
        try {
            if (!(await canCommunicate(userId, userToCall))) return;

            const sender = await User.findById(userId).select("name");
            if (!sender) return;
            const receiverSockets = getReceiverSocketIds(userToCall);
            receiverSockets.forEach(s => io.to(s).emit("incomingCall", { signal: signalData, from: userId, name: sender.name, type }));
        } catch (err) {
            console.error("Error in callUser:", err);
        }
    });

    socket.on("answerCall", async ({ to, signal }) => {
        if (!(await canCommunicate(userId, to))) return;

        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("callAccepted", signal));
    });

    socket.on("iceCandidate", async ({ to, candidate }) => {
        if (!(await canCommunicate(userId, to))) return;

        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("iceCandidate", candidate));
    });

    socket.on("endCall", async ({ to }) => {
        if (!(await canCommunicate(userId, to))) return;

        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("callEnded"));
    });

    socket.on("rejectCall", async ({ to }) => {
        if (!(await canCommunicate(userId, to))) return;

        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("callRejected"));
    });

    socket.on("disconnect", async () => {
        userSocketMap[userId] = userSocketMap[userId]?.filter(id => id !== socket.id) || [];
        
        if (userSocketMap[userId].length === 0) {
            delete userSocketMap[userId];
            // Update lastSeen when they completely disconnect (if not updated recently)
            await throttledUpdateLastSeen(userId);
            // Clean up our local cache memory since the user is fully offline
            lastDbUpdateCache.delete(userId);
        }
        
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
}); 

export { io, app, server };
