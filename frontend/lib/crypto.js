/**
 * crypto.js — Client-side End-to-End Encryption (E2EE) using Web Crypto API
 *
 * Implements ECDH key exchange (Curve P-256) and AES-GCM (256-bit) encryption.
 * Keys are persisted securely in IndexedDB so they survive page reloads.
 */

const DB_NAME = "e2ee-keys-db";
const STORE_NAME = "keypairs";

// Helper to open IndexedDB
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

// Save key pair to IndexedDB
const saveKeyPair = async (userId, keyPair) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(keyPair, userId);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
};

// Retrieve key pair from IndexedDB
const getKeyPair = async (userId) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(userId);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

// Helper: ArrayBuffer to Base64
const bufferToBase64 = (buf) => {
    const binstr = Array.prototype.map.call(new Uint8Array(buf), (ch) => String.fromCharCode(ch)).join("");
    return btoa(binstr);
};

// Helper: Base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
    const binstr = atob(base64);
    const buf = new Uint8Array(binstr.length);
    for (let i = 0; i < binstr.length; i++) {
        buf[i] = binstr.charCodeAt(i);
    }
    return buf.buffer;
};

/**
 * Initializes/Loads E2EE Keys for the user.
 * Generates an ECDH (P-256) keypair if none exists.
 * Returns the public key exported in SPKI format (Base64).
 */
export const initE2EEKeys = async (userId) => {
    try {
        let keyPair = await getKeyPair(userId);
        if (!keyPair) {
            // Generate ECDH P-256 keypair
            keyPair = await window.crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                false, // Private key not extractable (highly secure)
                ["deriveKey", "deriveBits"]
            );
            await saveKeyPair(userId, keyPair);
        }

        // Export public key as SPKI Base64
        const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        return bufferToBase64(exportedPublic);
    } catch (err) {
        console.error("Failed to initialize E2EE keys:", err);
        return null;
    }
};

/**
 * Derives a symmetric AES-GCM (256-bit) key from a local private key and remote public key.
 */
const deriveAesKey = async (userId, otherPublicKeySpkiBase64) => {
    const keyPair = await getKeyPair(userId);
    if (!keyPair) throw new Error("Local E2EE key pair not initialized");

    const importedOtherPublic = await window.crypto.subtle.importKey(
        "spki",
        base64ToBuffer(otherPublicKeySpkiBase64),
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
    );

    return await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: importedOtherPublic },
        keyPair.privateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
};

/**
 * Encrypts plain text for a recipient.
 */
export const encryptMessage = async (userId, plainText, otherPublicKeySpkiBase64) => {
    try {
        if (!otherPublicKeySpkiBase64) {
            throw new Error("Recipient does not have E2EE public key");
        }

        const aesKey = await deriveAesKey(userId, otherPublicKeySpkiBase64);
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            new TextEncoder().encode(plainText)
        );

        return {
            ciphertext: bufferToBase64(encryptedBuffer),
            iv: bufferToBase64(iv),
        };
    } catch (err) {
        console.error("Encryption failed:", err);
        throw err;
    }
};

/**
 * Decrypts a ciphertext using a sender's public key.
 */
export const decryptMessage = async (userId, ciphertextBase64, ivBase64, senderPublicKeySpkiBase64) => {
    try {
        if (!senderPublicKeySpkiBase64) {
            throw new Error("Sender does not have E2EE public key");
        }

        const aesKey = await deriveAesKey(userId, senderPublicKeySpkiBase64);
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: base64ToBuffer(ivBase64) },
            aesKey,
            base64ToBuffer(ciphertextBase64)
        );

        return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
        console.error("Decryption failed:", err);
        return "[Decryption Error: Key mismatch or tampered message]";
    }
};
