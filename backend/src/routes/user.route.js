import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { updateStatusMood } from "../controllers/user.controller.js";

const router = express.Router();

router.patch("/status-mood", protectRoute, updateStatusMood);

export default router;
