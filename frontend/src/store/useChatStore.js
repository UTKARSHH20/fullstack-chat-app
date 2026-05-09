import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../../lib/axios";
import { getSocket } from "../../lib/socket";

const useChatStore = create((set, get) => ({
    users: [],
    selectedUser: null,
    messages: [],
    typingUsers: [],
    isUsersLoading: false,
    isMessagesLoading: false,

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

    searchUsers: async (query) => {
        try {
            const res = await axiosInstance.get(`/messages/search?q=${encodeURIComponent(query)}`);
            return res.data;
        } catch {
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

    markMessagesAsSeen: async (senderId) => {
        try {
            await axiosInstance.put("/messages/mark-seen", { senderId });
            set((state) => ({
                messages: state.messages.map(msg => 
                    msg.senderId === senderId ? { ...msg, status: "seen" } : msg
                )
            }));
        } catch (error) {
            console.log("Failed to mark messages as seen", error);
        }
    },

    subscribeToMessages: () => {
        const socket = getSocket();
        if (!socket) return;
        socket.on("newMessage", (message) => {
            const { selectedUser, messages, users } = get();
            if (selectedUser && message.senderId === selectedUser._id) {
                set({ messages: [...messages, message] });
            }

            if (document.visibilityState !== "visible" && Notification.permission === "granted") {
                const sender = users.find(u => u._id === message.senderId);
                const senderName = sender?.name || "Someone";
                const body = message.message || (message.audio ? "🎤 Voice message" : "📷 Image");
                const n = new Notification(`New message from ${senderName}`, {
                    body,
                    icon: "/favicon.png",
                });
                n.onclick = () => window.focus();
            }
        });
        socket.on("deleteMessage", (messageId) => {
            set({ messages: get().messages.filter(m => m._id !== messageId) });
        });
        socket.on("userTyping", ({ senderId }) => {
            set((state) => ({ typingUsers: [...new Set([...state.typingUsers, senderId])] }));
        });
        socket.on("userStoppedTyping", ({ senderId }) => {
            set((state) => ({ typingUsers: state.typingUsers.filter(id => id !== senderId) }));
        });
        socket.on("messagesSeen", ({ receiverId }) => {
            // receiverId is the person who saw our messages
            set((state) => ({
                messages: state.messages.map(msg => 
                    msg.receiverId === receiverId ? { ...msg, status: "seen" } : msg
                )
            }));
        });
    },

    unsubscribeFromMessages: () => {
        const socket = getSocket();
        if (socket) {
            socket.off("newMessage");
            socket.off("deleteMessage");
            socket.off("userTyping");
            socket.off("userStoppedTyping");
            socket.off("messagesSeen");
        }
    },

    setSelectedUser: (user) => {
        if (!user) return set({ selectedUser: null, messages: [] });
        const current = get().selectedUser;
        if (current?._id === user?._id) return;
        set({ selectedUser: user, messages: [] });
    },
}));

export default useChatStore;