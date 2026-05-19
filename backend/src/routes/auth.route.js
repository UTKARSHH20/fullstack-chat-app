import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { validateSignup, validateLogin } from "../middleware/validate.js";
import { signup, login, logout, googleAuth, updateProfile, updateProfilePicture, checkAuth, subscribeToPush } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.post("/google", googleAuth);
router.post("/logout", logout);
router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-profile-picture", protectRoute, updateProfilePicture);
router.get("/check", protectRoute, checkAuth);
router.post("/push-subscribe", protectRoute, subscribeToPush);

export default router;