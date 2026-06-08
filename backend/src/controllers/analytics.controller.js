import { generateConversationHeatmap } from "../services/conversationHeatmap.service.js";

export async function getConversationHeatmap(req, res) {
    try {
        const heatmapData = await generateConversationHeatmap(req.userId);
        res.status(200).json(heatmapData);
    } catch (err) {
        console.error("getConversationHeatmap:", err.message || err);
        res.status(500).json({ message: "Could not generate conversation heatmap." });
    }
}
