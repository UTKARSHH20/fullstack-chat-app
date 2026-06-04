import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model.js";
import { generateTokenAndSetCookie } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";

let googleClient;
const getGoogleClient = () => {
    if (!googleClient) {
        const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
        if (!clientId) {
            console.warn("WARNING: GOOGLE_CLIENT_ID environment variable is not set!");
        }
        googleClient = new OAuth2Client(clientId);
    }
    return googleClient;
};

export async function signup(req, res) {
    const { name, email, password } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ message: "An account with this email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword });

        generateTokenAndSetCookie(user._id, res);
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
        });
    } catch (err) {
        console.error("signup:", err.message);
        res.status(500).json({ message: "Could not create account, please try again" });
    }
}

export async function login(req, res) {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.password) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: "Invalid email or password" });

        generateTokenAndSetCookie(user._id, res);
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
        });
    } catch (err) {
        console.error("login:", err.message);
        res.status(500).json({ message: "Login failed, please try again" });
    }
}

export async function googleAuth(req, res) {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "Google credential is required" });

    try {
        const client = getGoogleClient();
        const cleanClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: cleanClientId,
        });
        const { sub: googleId, email, name, picture } = ticket.getPayload();

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
            user = await User.create({
                googleId,
                name,
                email,
                password: null,
                profilePicture: picture || "",
            });
        } else if (!user.googleId) {
            user.googleId = googleId;
            if (!user.profilePicture && picture) user.profilePicture = picture;
            await user.save();
        }

        generateTokenAndSetCookie(user._id, res);
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
        });
    } catch (err) {
        console.error("googleAuth:", err.message);
        res.status(401).json({ message: "Google authentication failed" });
    }
}

export function logout(req, res) {
    res.cookie("jwt", "", {
        maxAge: 0,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV !== "development"
    });
    res.status(200).json({ message: "Logged out" });
}

export async function updateProfile(req, res) {
    const { name } = req.body;
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) {
        return res.status(400).json({ message: "Name must be between 2 and 50 characters" });
    }
    try {
        const updates = { name: name.trim() };

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: updates },
            { new: true }
        ).select("-password");

        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (err) {
        console.error("updateProfile:", err.message);
        res.status(500).json({ message: "Could not update profile" });
    }
}

export async function updateProfilePicture(req, res) {
    // GSSoC Issue #47 Fix
    if (!req.userId) {
        return res.status(401).json({ message: "Unauthorized: Invalid user session ID" });
    }
    const { profilePicture } = req.body;
    if (!profilePicture) return res.status(400).json({ message: "No image provided" });

    // Validate base64 payload size (roughly: length * 3/4) is under 5MB (5,242,880 bytes)
    const approximateSizeBytes = (profilePicture.length * 3) / 4;
    if (approximateSizeBytes > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "Image size exceeds the 5MB limit" });
    }

    try {
        const upload = await cloudinary.uploader.upload(profilePicture);
        const user = await User.findByIdAndUpdate(
            req.userId,
            { profilePicture: upload.secure_url },
            { new: true }
        ).select("-password");

        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (err) {
        console.error("updateProfilePicture:", err.message);
        res.status(500).json({ message: "Could not update profile picture" });
    }
}

export async function checkAuth(req, res) {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (err) {
        console.error("checkAuth:", err.message);
        res.status(500).json({ message: "Auth check failed" });
    }
}

export async function subscribeToPush(req, res) {
    try {
        const { subscription } = req.body;
        await User.findByIdAndUpdate(req.userId, { pushSubscription: subscription });
        res.status(200).json({ message: "Push subscription saved" });
    } catch (err) {
        console.error("subscribeToPush:", err.message);
        res.status(500).json({ message: "Could not save push subscription" });
    }
}