import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../../lib/axios";

const useAnalyticsStore = create((set) => ({
    heatmap: null,
    isLoadingHeatmap: false,

    fetchConversationHeatmap: async () => {
        set({ isLoadingHeatmap: true });
        try {
            const res = await axiosInstance.get("/analytics/conversation-heatmap");
            set({ heatmap: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load conversation heatmap.");
        } finally {
            set({ isLoadingHeatmap: false });
        }
    },
}));

export default useAnalyticsStore;
