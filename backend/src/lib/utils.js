import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRETKEY, { expiresIn: "15d" });
    res.cookie("jwt", token, {
        maxAge: 15 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development" || process.env.FORCE_SECURE_COOKIES === "true" // GSSoC Issue #49 Fix
    });
    return token;
}

export const validateImageAttachment = (base64Str, maxSizeBytes = 5 * 1024 * 1024) => {
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return { isValid: false, error: "Invalid file format structure or corrupt payload." };
    }

    const mimeType = match[1];
    const rawData = match[2];

    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return { isValid: false, error: "Unsupported image signature type. Allowed formats: JPEG, PNG, WEBP, GIF." };
    }

    const binarySizeEstimate = Math.floor((rawData.length * 3) / 4) - (rawData.endsWith("==") ? 2 : rawData.endsWith("=") ? 1 : 0);
    if (binarySizeEstimate > maxSizeBytes) {
        return { isValid: false, error: "File boundary limit exceeded. Image size must be under 5MB." };
    }

    return { isValid: true };
};

export const validateAudioAttachment = (base64Str, maxSizeBytes = 10 * 1024 * 1024) => {
    const match = base64Str.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return { isValid: false, error: "Invalid audio format structure or corrupt payload." };
    }

    const mimeType = match[1];
    const rawData = match[2];

    const ALLOWED_MIME_TYPES = ["audio/webm", "audio/mp3", "audio/wav", "audio/mpeg", "audio/ogg", "audio/x-m4a", "audio/m4a"];
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return { isValid: false, error: "Unsupported audio format. Allowed formats: WEBM, MP3, WAV, OGG, M4A." };
    }

    const binarySizeEstimate = Math.floor((rawData.length * 3) / 4) - (rawData.endsWith("==") ? 2 : rawData.endsWith("=") ? 1 : 0);
    if (binarySizeEstimate > maxSizeBytes) {
        return { isValid: false, error: "Audio size exceeds the 10MB limit." };
    }

    return { isValid: true };
};