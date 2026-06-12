import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { deleteProfile, updateStatusMood } from "../controllers/user.controller.js";

const router = express.Router();

router.patch("/status-mood", protectRoute, updateStatusMood);
router.delete("/delete-account", protectRoute, deleteProfile);

export default router;
