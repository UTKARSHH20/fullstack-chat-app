import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import {
    getUsers, searchUsers, getMessages, sendMessage, deleteMessage
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users",     protectRoute, getUsers);
router.get("/search",    protectRoute, searchUsers);   // NEW: find any user
router.get("/:id",       protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);
router.delete("/:id",    protectRoute, deleteMessage);

export default router;
