import mongoose from "mongoose";
import User from "../models/user.model.js";
import { broadcastStatusMoodUpdate, broadcastListeningStatusUpdate } from "../lib/socket.js";
import { catchAsync } from "../lib/utils.js";

const ALLOWED_STATUS_MOODS = new Set([
    "coding",
    "coffee_break",
    "studying",
    "gaming",
    "working",
    "sleeping",
    "music",
    "away",
]);

export const updateStatusMood = catchAsync(async (req, res) => {
    const { statusMood } = req.body;

    if (statusMood !== null && statusMood !== undefined && typeof statusMood !== "string") {
        return res.status(400).json({ message: "Status mood must be a valid string or null." });
    }

    const normalizedMood = statusMood ? statusMood.trim() : null;
    if (normalizedMood && !ALLOWED_STATUS_MOODS.has(normalizedMood)) {
        return res.status(400).json({ message: "Unsupported status mood." });
    }

    const user = await User.findByIdAndUpdate(
        req.userId,
        { statusMood: normalizedMood || null },
        { new: true }
    ).select("-password -__v");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    broadcastStatusMoodUpdate({
        userId: user._id.toString(),
        statusMood: user.statusMood,
    });

    res.status(200).json(user);
});

export const updateListeningStatus = catchAsync(async (req, res) => {
    const { currentTrack, currentArtist, isListening } = req.body;

    if (typeof isListening !== "boolean") {
        return res.status(400).json({ message: "isListening must be true or false." });
    }

    const normalizedTrack = currentTrack ? String(currentTrack).trim() : "";
    const normalizedArtist = currentArtist ? String(currentArtist).trim() : "";

    if (isListening && (!normalizedTrack || !normalizedArtist)) {
        return res.status(400).json({ message: "Both currentTrack and currentArtist are required when listening status is enabled." });
    }

    const updates = isListening
        ? { isListening: true, currentTrack: normalizedTrack, currentArtist: normalizedArtist }
        : { isListening: false, currentTrack: null, currentArtist: null };

    const user = await User.findByIdAndUpdate(
        req.userId,
        updates,
        { new: true }
    ).select("-password -__v");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    broadcastListeningStatusUpdate({
        userId: user._id.toString(),
        currentTrack: user.currentTrack,
        currentArtist: user.currentArtist,
        isListening: user.isListening,
    });

    res.status(200).json(user);
});

export const getListeningStatus = catchAsync(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user id." });
    }

    const user = await User.findById(userId)
        .select("name profilePicture currentTrack currentArtist isListening");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
        _id: user._id,
        name: user.name,
        profilePicture: user.profilePicture,
        currentTrack: user.currentTrack,
        currentArtist: user.currentArtist,
        isListening: user.isListening,
    });
});
