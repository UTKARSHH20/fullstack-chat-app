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
};

io.on("connection", async (socket) => {
    const userId = socket.userId;

    if (userId) {
        if (!userSocketMap[userId]) userSocketMap[userId] = new Set();
        userSocketMap[userId].add(socket.id);
        
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

        // Target status updates only to active contacts when the first session establishes
        const contacts = await getActiveContacts(userId);
        if (isFirstSession) {
            contacts.forEach(contactId => {
                const contactSockets = getReceiverSocketIds(contactId);
                contactSockets.forEach(s => {
                    io.to(s).emit("userStatusChanged", { userId, status: "online" });
                });
            });
        }

        // Provide initial state of online contacts on client demand
        socket.on("getOnlineContacts", (callback) => {
            if (typeof callback !== "function") return;
            const onlineContacts = contacts.filter(contactId => userSocketMap[contactId] && userSocketMap[contactId].length > 0);
            callback(onlineContacts);
        });
    } //  The "if (userId)" block now closes safely here!
    
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
    socket.on("callUser", async ({ userToCall, signalData, type }) => {
        try {
            const sender = await User.findById(userId).select("name");
            if (!sender) return;
            const receiverSockets = getReceiverSocketIds(userToCall);
            receiverSockets.forEach(s => io.to(s).emit("incomingCall", { signal: signalData, from: userId, name: sender.name, type }));
        } catch (err) {
            console.error("Error in callUser:", err);
        }
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
        if (userId && userSocketMap[userId]) {
            userSocketMap[userId].delete(socket.id);

            if (userSocketMap[userId].size === 0) {
                delete userSocketMap[userId];
                try {
                    await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
                    
                    // Notify only their active contacts that they went offline
                    const originalContacts = await getActiveContacts(userId);
                    originalContacts.forEach(contactId => {
                        const contactSockets = getReceiverSocketIds(contactId);
                        contactSockets.forEach(s => {
                            io.to(s).emit("userStatusChanged", { userId, status: "offline" });
                        });
                    });
                } catch (err) {
                    console.error(err);
                }
            }
        }
    });
}); 

export { io, app, server };
