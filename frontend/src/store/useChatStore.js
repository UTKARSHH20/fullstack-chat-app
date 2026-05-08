import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../../lib/axios";
import { getSocket } from "../../lib/socket";

const useChatStore = create((set, get) => ({
    users:              [],
    selectedUser:       null,
    messages:           [],
    isUsersLoading:     false,
    isMessagesLoading:  false,

    // ── Fetch sidebar users ──────────────────────────────────────
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

    // ── Fetch conversation ───────────────────────────────────────
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

    // ── Send a message ───────────────────────────────────────────
    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        if (!selectedUser) return;
        try {
            const res = await axiosInstance.post(
                `/messages/send/${selectedUser._id}`,
                messageData
            );
            set({ messages: [...messages, res.data] });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
        }
    },

    // ── Socket: listen for incoming messages ─────────────────────
    subscribeToMessages: () => {
        const socket = getSocket();
        if (!socket) return;

        socket.on("newMessage", (message) => {
            const { selectedUser, messages } = get();
            // Only add if it's from the currently open chat
            if (selectedUser && message.senderId === selectedUser._id) {
                set({ messages: [...messages, message] });
            }
        });
    },

    unsubscribeFromMessages: () => {
        const socket = getSocket();
        if (socket) socket.off("newMessage");
    },

    // ── Select user (clears messages only if switching to a different user) ──
    setSelectedUser: (user) => {
        const current = get().selectedUser
        if (current?._id === user?._id) return   // already selected — do nothing
        set({ selectedUser: user, messages: [] })
    },
}));

export default useChatStore;