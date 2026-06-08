import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minLength: 2,
        maxLength: 50,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    password: {
        type: String,
        default: null,
    },
    googleId: {
        type: String,
        default: null,
        sparse: true,
    },
    profilePicture: {
        type: String,
        default: "",
    },
    pushSubscription: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    statusMood: {
        type: String,
        enum: [
            "coding",
            "coffee_break",
            "studying",
            "gaming",
            "working",
            "sleeping",
            "music",
            "away",
        ],
        default: null,
        trim: true,
    },
    currentTrack: {
        type: String,
        default: null,
        trim: true,
    },
    currentArtist: {
        type: String,
        default: null,
        trim: true,
    },
    isListening: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

userSchema.index({ name: "text" });

const User = mongoose.model("User", userSchema);
export default User;