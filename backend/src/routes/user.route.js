import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { updateStatusMood, updateListeningStatus, getListeningStatus } from "../controllers/user.controller.js";

const router = express.Router();

router.patch("/status-mood", protectRoute, updateStatusMood);
router.patch("/listening-status", protectRoute, updateListeningStatus);
router.get("/listening-status/:userId", protectRoute, getListeningStatus);

export default router;
