/*
 * Attachment validation utilities shared between live message handling and scheduled messages.
 * These functions validate Base64 data URLs for images and audio files, enforce MIME allow‑lists,
 * and ensure size limits (5 MB for images, 10 MB for audio). They return an object
 * { isValid: boolean, error?: string }.
 */

export const validateImageAttachment = (base64Str, maxSizeBytes = 5 * 1024 * 1024) => {
    // Verify Data URL format
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
    // Estimate binary size
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
    const ALLOWED_MIME_TYPES = [
        "audio/webm",
        "audio/mp3",
        "audio/wav",
        "audio/mpeg",
        "audio/ogg",
        "audio/x-m4a",
        "audio/m4a",
    ];
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        return { isValid: false, error: "Unsupported audio format. Allowed formats: WEBM, MP3, WAV, OGG, M4A." };
    }
    const binarySizeEstimate = Math.floor((rawData.length * 3) / 4) - (rawData.endsWith("==") ? 2 : rawData.endsWith("=") ? 1 : 0);
    if (binarySizeEstimate > maxSizeBytes) {
        return { isValid: false, error: "Audio size exceeds the 10MB limit." };
    }
    return { isValid: true };
};
