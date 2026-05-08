import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../lib/utils.js";
import cloudinary from "../lib/cloudinary.js";
export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User.findOne({ email });
        if (user) { return res.status(400).json({ message: "User already exists" }); }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name: name, email: email, password: hashedPassword });
        await newUser.save();

        generateTokenAndSetCookie(newUser._id, res);
        res.status(201).json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            profilePicture: newUser.profilePicture,
            message: "User created successfully"
        });
    } catch (error) { console.log(error); res.status(500).json({ message: "Internal server error" }); }

}
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid credentials" });

        generateTokenAndSetCookie(user._id, res);
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            message: "User logged in successfully hehe"
        });
    } catch (error) { console.log(error); res.status(500).json({ message: "Internal server error" }); }

}
export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", { maxAge: 0 });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) { console.log(error); res.status(500).json({ message: "Internal server error" }); }
}
export const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const updateFields = {};
        if (name) updateFields.name = name;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(updatedUser);
    } catch (error) { console.log(error); res.status(500).json({ message: "Internal server error" }); }
}
export const updateProfilePicture = async (req, res) => {
    try {
        const { profilePicture } = req.body;
        if (!profilePicture) { return res.status(400).json({ message: "Profile picture is required" }); }
        const user = await User.findById(req.userId);
        if (!user) { return res.status(404).json({ message: "User not found" }); }

        const uploadResult = await cloudinary.uploader.upload(profilePicture);
        user.profilePicture = uploadResult.secure_url;
        await user.save();
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilePicture: user.profilePicture,
            message: "Profile picture updated successfully"
        });
    } catch (error) { console.log(error); res.status(500).json({ message: "Internal server error" }); }
}
export const checkAuth = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) { console.log(error); res.status(500).json({ message: "Internal server error" }); }
}