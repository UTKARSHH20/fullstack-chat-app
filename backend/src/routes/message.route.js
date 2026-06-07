import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";
import {
    getUsers, searchUsers, getMessages, sendMessage, deleteMessage, markMessagesAsSeen, reactToMessage, searchTextMessages
} from "../controllers/message.controller.js";

const router = express.Router();

const sendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { message: "Spam prevention: Too many messages sent. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get("/users",     protectRoute, getUsers);
router.get("/search",    protectRoute, searchUsers);
router.get("/search-text/:id", protectRoute, searchTextMessages);
router.put("/mark-seen", protectRoute, markMessagesAsSeen);
router.get("/:id",       protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendLimiter, sendMessage);
router.post("/:id/react", protectRoute, reactToMessage);
router.delete("/:id",    protectRoute, deleteMessage);

export default router;
