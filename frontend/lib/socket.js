import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : window.location.origin;

let socket = null;

export const connectSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[socket] disconnected:", reason);
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(
      `[socket] reconnected after ${attemptNumber} attempts`
    );

    // refresh data here if needed
    // fetchChats();
    // fetchMessages();
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connection error:", err.message);
  });

  return socket;
};

window.addEventListener("online", () => {
  if (socket && !socket.connected) {
    console.log("[socket] network restored");
    socket.connect();
  }
});

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;