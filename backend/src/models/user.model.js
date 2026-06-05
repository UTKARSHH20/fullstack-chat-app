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
        type: new mongoose.Schema({
            endpoint: { type: String, required: true, trim: true },
            expirationTime: { type: Date, default: null },
            keys: {
                p256dh: { type: String, required: true, trim: true },
                auth: { type: String, required: true, trim: true }
            }
        }, { _id: false }),
        default: null,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

userSchema.index({ name: "text" });

const User = mongoose.model("User", userSchema);
export default User;