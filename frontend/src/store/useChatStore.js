import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../../lib/axios";
import { getSocket } from "../../lib/socket";

const useChatStore = create((set, get) => ({
    users:             [],
    selectedUser:      null,
    messages:          [],
    isUsersLoading:    false,
    isMessagesLoading: false,

    // Sidebar — only conversation partners
    getUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/users");
            set({ users: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load users");
        } finally {
            set({ isUsersLoading: false });
        }
    },

    // Search all users by name (for "New Chat")
    searchUsers: async (query) => {
        try {
            const res = await axiosInstance.get(`/messages/search?q=${encodeURIComponent(query)}`);
            return res.data;
        } catch (error) {
            toast.error("Search failed");
            return [];
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        if (!selectedUser) return;
        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            set({ messages: [...messages, res.data] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
        }
    },

    deleteMessage: async (messageId) => {
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            set({ messages: get().messages.filter(m => m._id !== messageId) });
            toast.success("Message deleted");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete");
        }
    },

    subscribeToMessages: () => {
        const socket = getSocket();
        if (!socket) return;
        socket.on("newMessage", (message) => {
            const { selectedUser, messages } = get();
            if (selectedUser && message.senderId === selectedUser._id) {
                set({ messages: [...messages, message] });
            }
        });
        socket.on("deleteMessage", (messageId) => {
            set({ messages: get().messages.filter(m => m._id !== messageId) });
        });
    },

    unsubscribeFromMessages: () => {
        const socket = getSocket();
        if (socket) {
            socket.off("newMessage");
            socket.off("deleteMessage");
        }
    },

    setSelectedUser: (user) => {
        if (!user) return set({ selectedUser: null, messages: [] });  // allow null (back button)
        const current = get().selectedUser;
        if (current?._id === user?._id) return;
        set({ selectedUser: user, messages: [] });
    },
}));

export default useChatStore;