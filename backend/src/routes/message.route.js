import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import {
    getUsers, searchUsers, getMessages, sendMessage, deleteMessage, markMessagesAsSeen, reactToMessage, searchTextMessages, getMessageSuggestions
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users",     protectRoute, getUsers);
router.get("/search",    protectRoute, searchUsers);
router.get("/search-text/:id", protectRoute, searchTextMessages);
router.put("/mark-seen", protectRoute, markMessagesAsSeen);
router.get("/suggestions/:messageId", protectRoute, getMessageSuggestions);
router.get("/:id",       protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.post("/:id/react", protectRoute, reactToMessage);
router.delete("/:id",    protectRoute, deleteMessage);

export default router;

