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

// userId → socketId map
const userSocketMap = {};

export const getReceiverSocketId = (userId) => userSocketMap[userId];

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
        userSocketMap[userId] = socket.id;
        console.log(`[socket] connected: userId=${userId} socketId=${socket.id}`);
    }

    // Broadcast updated online users list to everyone
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        if (userId) {
            delete userSocketMap[userId];
            console.log(`[socket] disconnected: userId=${userId}`);
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
