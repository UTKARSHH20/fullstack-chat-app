import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../../lib/axios";

const useScheduledMessageStore = create((set, get) => ({
    scheduledMessages: [],
    isLoading: false,
    selectedMessage: null,

    // Fetch all scheduled messages
    fetchScheduledMessages: async (status = null) => {
        set({ isLoading: true });
        try {
            const query = status ? `?status=${status}` : "";
            const res = await axiosInstance.get(`/messages/scheduled${query}`);
            set({ scheduledMessages: res.data.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load scheduled messages.");
        } finally {
            set({ isLoading: false });
        }
    },

    // Schedule a new message
    scheduleMessage: async (payload) => {
        try {
            const res = await axiosInstance.post("/messages/schedule", payload);
            set((state) => ({
                scheduledMessages: [...state.scheduledMessages, res.data.data],
            }));
            toast.success("Message scheduled successfully!");
            return res.data.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to schedule message.");
            throw error;
        }
    },

    // Update a scheduled message
    updateScheduledMessage: async (id, payload) => {
        try {
            const res = await axiosInstance.patch(`/messages/scheduled/${id}`, payload);
            set((state) => ({
                scheduledMessages: state.scheduledMessages.map((msg) =>
                    msg._id === id ? res.data.data : msg
                ),
            }));
            toast.success("Message updated successfully!");
            return res.data.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update message.");
            throw error;
        }
    },

    // Cancel a scheduled message
    cancelScheduledMessage: async (id) => {
        try {
            const res = await axiosInstance.delete(`/messages/scheduled/${id}`);
            set((state) => ({
                scheduledMessages: state.scheduledMessages.map((msg) =>
                    msg._id === id ? res.data.data : msg
                ),
            }));
            toast.success("Message cancelled successfully!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to cancel message.");
            throw error;
        }
    },

    // Set selected message for detail view/editing
    setSelectedMessage: (message) => {
        set({ selectedMessage: message });
    },

    // Clear selected message
    clearSelectedMessage: () => {
        set({ selectedMessage: null });
    },
}));

export default useScheduledMessageStore;
