import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { getConversationHeatmap } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/conversation-heatmap", protectRoute, getConversationHeatmap);

export default router;
