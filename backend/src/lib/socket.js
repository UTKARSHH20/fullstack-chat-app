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

/**
 * FIX (#568): In-memory cache tracking the last DB write timestamp per userId.
 * Previously this was referenced but never defined, causing a ReferenceError crash
 * on user disconnect when the registry cleanup tried to call lastDbUpdateCache.delete().
 */
const lastDbUpdateCache = new Map();

/**
 * FIX (#568): Throttled lastSeen updater — limits DB writes to at most once every
 * 30 seconds per user to protect against connection-churn storms.
 * Previously referenced throughout the file but never defined, causing crashes.
 */
const THROTTLE_MS = 30_000;
const throttledUpdateLastSeen = async (userId) => {
    const now = Date.now();
    const lastUpdate = lastDbUpdateCache.get(userId) || 0;
    if (now - lastUpdate < THROTTLE_MS) return;
    lastDbUpdateCache.set(userId, now);
    try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
    } catch (err) {
        console.error("[Socket] Failed to update lastSeen:", err.message);
    }
};

export const getReceiverSocketIds = (userId) =>
    userSocketMap[userId] ? [...userSocketMap[userId]] : [];

export const broadcastStatusMoodUpdate = ({ userId, statusMood }) => {
    io.emit("statusMoodUpdated", { userId, statusMood });
};

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

/**
 * FIX (#568): SINGLE connection handler.
 *
 * Root cause of the memory leak: the original code had TWO nested io.on("connection")
 * calls — an outer one (that contained a helper function) and an inner one with the
 * actual logic. Because the inner io.on() was INSIDE the outer callback, every new
 * socket connection would register one additional "connection" event listener on the
 * server, causing the listener count to grow unboundedly (O(n²) growth pattern).
 * Node.js emits a MaxListenersExceededWarning and heap memory climbs continuously.
 *
 * Fix: collapsed into a single, flat io.on("connection") handler. Helper functions
 * that were incorrectly scoped inside the connection callback are now at module level.
 */
io.on("connection", (socket) => {
    const userId = socket.userId;

    // Early guard return: Prevent state pollution / memory leaks from unauthenticated sockets
    if (!userId) {
        console.warn(`[Socket.io] Connection rejected: Missing userId for socket ${socket.id}`);
        return socket.disconnect(true);
    }

    // Register this socket ID under the user's registry slot
    if (!userSocketMap[userId]) userSocketMap[userId] = [];
    userSocketMap[userId].push(socket.id);

    // Update lastSeen with throttle to protect against connection churn
    throttledUpdateLastSeen(userId);

    // Mark offline pending messages as delivered now that user is online
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
            receiverSockets.forEach(s =>
                io.to(s).emit("incomingCall", { signal: signalData, from: userId, name: sender.name, type })
            );
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

    socket.on("callCanceled", async ({ to }) => {
        const receiverSockets = getReceiverSocketIds(to);
        receiverSockets.forEach(s => io.to(s).emit("callCanceled"));
    });

    socket.on("disconnect", async () => {
        // FIX (#568): Remove only THIS socket from the user's registry slot.
        // Previously, the registry was never cleaned up correctly because
        // lastDbUpdateCache was undefined — causing a crash on every disconnect.
        userSocketMap[userId] = userSocketMap[userId]?.filter(id => id !== socket.id) || [];

        if (userSocketMap[userId].length === 0) {
            delete userSocketMap[userId];
            // Update lastSeen when they completely disconnect (throttled)
            await throttledUpdateLastSeen(userId);
            // Evict the throttle cache entry since user is fully offline
            lastDbUpdateCache.delete(userId);
        }

        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
