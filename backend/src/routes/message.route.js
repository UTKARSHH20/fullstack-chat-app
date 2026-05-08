import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { getUsers, getMessages, sendMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users",    protectRoute, getUsers);      // sidebar users list
router.get("/:id",      protectRoute, getMessages);   // conversation history
router.post("/send/:id",protectRoute, sendMessage);   // send a message

export default router;
