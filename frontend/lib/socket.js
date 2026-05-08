import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : window.location.origin;

let socket = null;

export const connectSocket = (userId) => {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
        query: { userId },
        withCredentials: true,
    });

    socket.on("connect", () => {
        console.log("[socket] connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
        console.warn("[socket] connection error:", err.message);
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket?.connected) {
        socket.disconnect();
        socket = null;
        console.log("[socket] disconnected");
    }
};

export const getSocket = () => socket;
