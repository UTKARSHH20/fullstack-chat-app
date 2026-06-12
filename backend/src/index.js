import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression"; // <-- Clean & Simple Import
import mongoSanitize from "express-mongo-sanitize"; // FIX #576: NoSQL injection protection
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import connectDB from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import messageRoutes from "./routes/message.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import scheduledMessageRoutes from "./routes/scheduledMessage.route.js";
import { startScheduler, stopScheduler } from "./lib/messageScheduler.js";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Core Security & Parser Middleware Layer
// Security Middleware Layer
app.use(cors({
    origin: process.env.NODE_ENV === "production"
        ? true
        : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true,
}));
app.use(compression()); // <-- Gzip Compression Added Right Here
app.use(helmet({ contentSecurityPolicy: false }));
// GSSoC Issue #35 Fix
app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));
/**
 * SECURITY MIDDLEWARE: NoSQL Injection Prevention (Fix #576)
 * Strips MongoDB query operators ($where, $gt, $ne, etc.) from all incoming
 * request bodies, query strings, and params — preventing attackers from
 * injecting malicious operators like { "email": { "$gt": "" } }.
 * replaceWith: '_' replaces dangerous keys with safe underscores.
 */
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(cookieParser()); // Must precede CSRF to parse incoming cookies

/**
 * SECURITY MIDDLEWARE: CSRF Token Generation
 * Injects a cryptographically secure token into the client's cookie jar.
 * Left readable by client-side scripts so Axios can auto-map it to request headers.
 */
app.use((req, res, next) => {
    let csrfToken = req.cookies["XSRF-TOKEN"];
    if (!csrfToken) {
        csrfToken = crypto.randomBytes(32).toString("hex");
        res.cookie("XSRF-TOKEN", csrfToken, {
            sameSite: "strict",
            secure: process.env.NODE_ENV !== "development",
            httpOnly: false // Explicitly false for Double-Submit Axios mapping
        });
    }
    next();
});

/**
 * SECURITY MIDDLEWARE: CSRF Token Validation
 * Enforces strict double-submit verification on all state-changing endpoints.
 * Mitigates Cross-Site Request Forgery by ensuring headers perfectly match the cookie origin.
 */
app.use((req, res, next) => {
    // Only intercept state-mutating request methods
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
        const headerToken = req.headers["x-xsrf-token"];
        const cookieToken = req.cookies["XSRF-TOKEN"];

        // Timing-safe comparison to prevent side-channel timing attacks
        if (!headerToken || !cookieToken || !crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
            console.warn(`CSRF Validation Blocked: Origin handshake mismatch on ${req.method} ${req.url}`);
            return res.status(403).json({ message: "CSRF token validation failed. Unauthorized cross-site request." });
        }
    }
    next();
});

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
app.use("/api/users", authLimiter, userRoutes);
app.use("/api/messages", messageLimiter, messageRoutes);
app.use("/api/messages", messageLimiter, scheduledMessageRoutes);
app.use("/api/analytics", analyticsRoutes);

/*
 * CENTRALIZED EXPRESS ERROR HANDLING MIDDLEWARE
 * Intercepts all unhandled route exceptions.
 * HARDENING FIX: Sanitizes stack traces in production to prevent info disclosure.
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
server.listen(PORT, () => {
    // GSSoC Issue #45 Fix
    console.log(`[INFO] Server successfully running on port ${PORT}`);
    connectDB();
    startScheduler();
});

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
    stopScheduler();
    process.exit(1);
});