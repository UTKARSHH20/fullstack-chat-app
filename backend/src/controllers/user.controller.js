import User from "../models/user.model.js";
import { broadcastStatusMoodUpdate } from "../lib/socket.js";
import { catchAsync } from "../lib/utils.js";
import Message from "../models/message.model.js";
import bcrypt from "bcryptjs"

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


export const deleteProfile = catchAsync(async (req, res) => {
    const userId = req.userId;
    const { password } = req.body;

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).json({
            success: false,
            message: "Incorrect Password",
        });
    }

    // Delete user's messages
    await Message.deleteMany({
        $or: [
            { senderId: userId },
            { receiverId: userId },
        ],
    });

    // Delete user
    await User.findByIdAndDelete(userId);

    // Logout
    res.clearCookie("jwt");
    res.clearCookie("XSRF-TOKEN");

    return res.status(200).json({
        success: true,
        message: "Account deleted successfully",
    });
});