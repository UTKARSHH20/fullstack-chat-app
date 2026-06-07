import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import {
    scheduleMessage,
    getScheduledMessages,
    getScheduledMessage,
    updateScheduledMessage,
    deleteScheduledMessage,
} from "../controllers/scheduledMessage.controller.js";

const router = express.Router();

router.post("/schedule", protectRoute, scheduleMessage);
router.get("/scheduled", protectRoute, getScheduledMessages);
router.get("/scheduled/:id", protectRoute, getScheduledMessage);
router.patch("/scheduled/:id", protectRoute, updateScheduledMessage);
router.delete("/scheduled/:id", protectRoute, deleteScheduledMessage);

export default router;
