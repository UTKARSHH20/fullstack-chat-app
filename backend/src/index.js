import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 5001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── CORS ─────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.NODE_ENV === "production"
        ? true   // allow the same origin (Render serves frontend + backend together)
        : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// ── API routes ───────────────────────────────────────────────────
app.use("/api/auth",     authRoutes);
app.use("/api/messages", messageRoutes);

// ── Serve React frontend in production ───────────────────────────
if (process.env.NODE_ENV === "production") {
    const frontendDist = path.join(__dirname, "../../frontend/dist");
    app.use(express.static(frontendDist));
    app.get("*", (req, res) => {
        res.sendFile(path.join(frontendDist, "index.html"));
    });
}

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});