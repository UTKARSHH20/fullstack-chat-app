import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 5001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
    origin: process.env.NODE_ENV === "production"
        ? true
        : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true,
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: "Too many attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});

const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: { message: "Too many messages sent, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/messages", messageLimiter, messageRoutes);

if (process.env.NODE_ENV === "production") {
    const frontendDist = path.join(__dirname, "../../frontend/dist");
    app.use(express.static(frontendDist));
    app.use((req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});

process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err.message);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    process.exit(1);
});