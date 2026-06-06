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

// Guard clauses ensuring mandatory configuration tokens are present at boot
const REQUIRED_ENV_VARS = ["MONGODB_URL", "JWT_SECRETKEY"];
for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
        console.error(`FATAL ERROR: Environment variable ${envVar} is missing.`);
        process.exit(1);
    }
}

// Ensure production has an explicit client URL configured
if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
    console.error("FATAL ERROR: Environment variable CLIENT_URL is required in production.");
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security Middleware Layer
// Restrict CORS to an explicit allowlist. In production the allowed origin
// is taken from CLIENT_URL. In development we allow localhost dev ports.
const allowedOrigins = process.env.NODE_ENV === "production"
    ? [process.env.CLIENT_URL]
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, mobile apps, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        return callback(new Error("CORS policy: Origin not allowed"), false);
    },
    credentials: true,
}));
app.use(helmet({ contentSecurityPolicy: false }));
// GSSoC Issue #35 Fix
app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// Rate Limiting Policy Declarations
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

// Primary Endpoint Route Mappings
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/messages", messageLimiter, messageRoutes);

/**
 * CENTRALIZED EXPRESS ERROR HANDLING MIDDLEWARE
 * Intercepts all unhandled route exceptions.
 * HARDENING FIX: Sanitizes stack traces in production to prevent information disclosure vulnerabilities.
 */
app.use((err, req, res, next) => {
    // Log the full diagnostic stack internally on the server console for debugging
    console.error("Centralized Route Error Intercepted:", err.stack || err);

    const statusCode = err.status || err.statusCode || 500;
    
    // Evaluate execution scope to mask internal error details from HTTP clients in production
    if (process.env.NODE_ENV === "production") {
        return res.status(statusCode).json({
            message: "An internal server error occurred.",
            statusCode
        });
    }

    // Deliver complete stack information only during local development testing cycles
    return res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        error: err.toString(),
        stack: err.stack,
        statusCode
    });
});

// SPA Asset Distribution Handlers (Production Target Static Serves)
if (process.env.NODE_ENV === "production") {
    const frontendDist = path.join(__dirname, "../../frontend/dist");
    app.use(express.static(frontendDist));
    app.use((req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

// System Boot
const startServer = async () => {
    try {
        await connectDB();
        // GSSoC Issue #45 Fix
        server.listen(PORT, () => {
            console.log(`[INFO] Server successfully running on port ${PORT}`);
        });
    } catch (err) {
        console.error("FATAL ERROR: Failed to connect to the database on startup.", err);
        process.exit(1);
    }
};

startServer();

// Global Process Exception Listeners Hardened Against Leak Vectors
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection Hook Catch:", err?.message || err);
});

process.on("uncaughtException", (err) => {
    // Conditionally isolate stack traces from log dumps based on active environments
    if (process.env.NODE_ENV === "production") {
        console.error("Fatal Uncaught Exception Triggered: Process Terminating. Context:", err?.message || "Internal Error");
    } else {
        console.error("Uncaught exception stack trace details:", err);
    }
    process.exit(1);
});