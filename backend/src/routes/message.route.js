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
// Media Gallery Route
router.get("/:id/media", protectRoute, async (req, res) => {
  try {
    const myId = req.user._id;
    const theirId = req.params.id;

    const mediaMessages = await Message.find({
      $or: [
        { senderId: myId, receiverId: theirId },
        { senderId: theirId, receiverId: myId },
      ],
      image: { $ne: null, $exists: true },
    })
      .select("image createdAt senderId")
      .sort({ createdAt: -1 });

    res.status(200).json(mediaMessages);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;

