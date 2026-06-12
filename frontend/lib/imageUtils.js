/**
 * imageUtils.js — Client-side image compression utilities (Fix #573)
 *
 * Uses the `browser-image-compression` library to reduce image payload size
 * before uploading to Cloudinary. This prevents unnecessary bandwidth usage,
 * speeds up uploads, and reduces Cloudinary storage costs.
 *
 * Previously, profile pictures were uploaded as raw, uncompressed base64 strings
 * (sometimes 5–15 MB). This utility enforces a max size of 1 MB and 1920px dimension.
 */

import imageCompression from "browser-image-compression";

/**
 * Compresses a File object and returns a Base64 data URL.
 * Used for profile picture uploads.
 *
 * @param {File} file - The raw image File from an <input type="file">
 * @param {Object} [options] - Optional override for compression settings
 * @returns {Promise<string>} - Base64 data URL of the compressed image
 */
export const compressImageToBase64 = async (file, options = {}) => {
    const defaultOptions = {
        maxSizeMB: 1,              // Max output size: 1 MB
        maxWidthOrHeight: 1024,    // Max dimension: 1024px (sufficient for avatars)
        useWebWorker: true,        // Non-blocking compression via Web Worker
        fileType: "image/webp",    // WebP yields best size/quality ratio
        initialQuality: 0.8,       // 80% quality — visually lossless for avatars
        ...options,
    };

    const compressedFile = await imageCompression(file, defaultOptions);
    return await fileToBase64(compressedFile);
};

/**
 * Compresses a File object and returns a preview Object URL + Base64 string.
 * Used when you need both a local preview and an uploadable payload.
 *
 * @param {File} file - The raw image File
 * @param {Object} [options] - Optional compression overrides
 * @returns {Promise<{ previewUrl: string, base64: string }>}
 */
export const compressImageForPreviewAndUpload = async (file, options = {}) => {
    const defaultOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,   // Higher res for chat images
        useWebWorker: true,
        ...options,
    };

    const compressedFile = await imageCompression(file, defaultOptions);
    const previewUrl = URL.createObjectURL(compressedFile);
    const base64 = await fileToBase64(compressedFile);
    return { previewUrl, base64 };
};

/**
 * Reads a File object into a Base64 data URL string.
 * @param {File} file
 * @returns {Promise<string>}
 */
const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Failed to read image file"));
        reader.readAsDataURL(file);
    });

/**
 * Validates that a file is an accepted image type and under the size limit.
 * @param {File} file
 * @param {number} [maxMB=5] - Max allowed size in MB before compression
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateImageFile = (file, maxMB = 5) => {
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: "Unsupported format. Use JPEG, PNG, WebP, or GIF." };
    }
    if (file.size > maxMB * 1024 * 1024) {
        return { valid: false, error: `Image must be under ${maxMB}MB` };
    }
    return { valid: true };
};
