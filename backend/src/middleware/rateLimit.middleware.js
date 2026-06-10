import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX = 20;
const RATE_LIMIT_MESSAGE = { message: "Too many attempts, please try again later" };

function normalizeEmail(email) {
    if (typeof email !== "string") return null;
    const normalized = email.toLowerCase().trim();
    return normalized || null;
}

function getEmailFromGoogleCredential(credential) {
    if (typeof credential !== "string" || !credential.includes(".")) return null;
    try {
        const payload = credential.split(".")[1];
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
        return normalizeEmail(decoded?.email);
    } catch {
        return null;
    }
}

function getUserIdFromJwtCookie(req) {
    const token = req.cookies?.jwt;
    if (!token) return null;
    try {
        const decoded = jwt.decode(token);
        return decoded?.userId ? String(decoded.userId) : null;
    } catch {
        return null;
    }
}

export function extractAuthUserKey(req) {
    if (req.userId) return String(req.userId);

    const email = normalizeEmail(req.body?.email);
    if (email) return email;

    const googleEmail = getEmailFromGoogleCredential(req.body?.credential);
    if (googleEmail) return googleEmail;

    const userId = getUserIdFromJwtCookie(req);
    if (userId) return userId;

    return null;
}

export const authIpLimiter = rateLimit({
    windowMs: AUTH_WINDOW_MS,
    max: AUTH_MAX,
    message: RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
});

export const authUserLimiter = rateLimit({
    windowMs: AUTH_WINDOW_MS,
    max: AUTH_MAX,
    message: RATE_LIMIT_MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `user:${extractAuthUserKey(req)}`,
    skip: (req) => !extractAuthUserKey(req),
});
