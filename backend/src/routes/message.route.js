import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import {
    getUsers, searchUsers, getMessages, sendMessage, deleteMessage, markMessagesAsSeen
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users",     protectRoute, getUsers);
router.get("/search",    protectRoute, searchUsers);
router.put("/mark-seen", protectRoute, markMessagesAsSeen);
router.get("/:id",       protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.delete("/:id",    protectRoute, deleteMessage);

export default router;
