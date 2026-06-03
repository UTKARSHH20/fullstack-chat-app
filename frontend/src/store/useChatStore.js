import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../../lib/axios";
import { getSocket } from "../../lib/socket";
import useAuthStore from "./useAuthStore";

const useChatStore = create((set, get) => ({
    users: [],
    selectedUser: null,
    messages: [],
    typingUsers: [],
    isUsersLoading: false,
    isMessagesLoading: false,
    hasMore: false,
    isLoadingMore: false,

    /**
     * Fetches the list of users the current auth user has conversed with.
     * Updates the sidebar with recent messages and unread counts.
     */
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

    /**
     * Performs a global search for users by name.
     * @param {string} query - The search string.
     * @returns {Promise<Array>} List of matched users.
     */
    searchUsers: async (query) => {
        try {
            const res = await axiosInstance.get(`/messages/search?q=${encodeURIComponent(query)}`);
            return res.data;
        } catch {
            toast.error("Search failed");
            return [];
        }
    },

    /**
     * Initializes a chat by fetching the most recent batch of messages.
     * Sets the initial pagination `hasMore` state.
     * @param {string} userId - The ID of the selected user.
     */
    getMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({
                messages: res.data.messages,
                hasMore: res.data.hasMore,
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    /**
     * Cursor-based pagination: Fetches older messages when the user scrolls up.
     * Prepends the older messages to the current state array.
     * @param {string} userId - The ID of the selected user.
     */
    loadMoreMessages: async (userId) => {
        const { messages, isLoadingMore, hasMore } = get();
        
        // Prevent overlapping requests or fetching if history is exhausted
        if (isLoadingMore || !hasMore || messages.length === 0) return;

        set({ isLoadingMore: true });
        try {
            const oldestId = messages[0]._id;
            const res = await axiosInstance.get(
                `/messages/${userId}?before=${oldestId}&limit=30`
            );
            set({
                messages: [...res.data.messages, ...messages],
                hasMore: res.data.hasMore,
            });
        } catch (error) {
            toast.error("Failed to load older messages");
        } finally {
            set({ isLoadingMore: false });
        }
    },

    /**
     * Sends a new message with optimistic UI rendering.
     * Falls back and removes the temporary message if the server request fails.
     * @param {Object} messageData - Payload containing text, image, or audio.
     */
    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        const { authUser } = useAuthStore.getState();
        if (!selectedUser || !authUser) return;

        // Optimistic UI Update
        const tempId = "temp-" + Date.now();
        const optimisticMsg = {
            _id: tempId,
            senderId: authUser._id,
            receiverId: selectedUser._id,
            ...messageData,
            reactions: [],
            status: "sent",
            createdAt: new Date().toISOString()
        };

        set({ messages: [...messages, optimisticMsg] });

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            
            // Replace temporary message with the real one from the server
            set((state) => ({
                messages: state.messages.map(m => m._id === tempId ? res.data : m)
            }));

            // Update sidebar: lastMessage for this user
            set((state) => ({
                users: state.users.map((u) =>
                    u._id === selectedUser._id
                        ? {
                              ...u,
                              lastMessage: {
                                  _id: res.data._id,
                                  message: res.data.message,
                                  image: !!res.data.image,
                                  audio: !!res.data.audio,
                                  senderId: res.data.senderId,
                                  createdAt: res.data.createdAt,
                              },
                          }
                        : u
                ),
            }));
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
            // Revert optimistic update on failure
            set((state) => ({
                messages: state.messages.filter(m => m._id !== tempId)
            }));
        }
    },

    /**
     * Deletes a message for both users.
     * @param {string} messageId - ID of the message to delete.
     */
    deleteMessage: async (messageId) => {
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            set({ messages: get().messages.filter((m) => m._id !== messageId) });
            toast.success("Message deleted");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete");
        }
    },

    /**
     * Toggles an emoji reaction on a specific message.
     * @param {string} messageId - Target message ID.
     * @param {string} emoji - The emoji character to toggle.
     */
    addReaction: async (messageId, emoji) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === messageId ? { ...msg, reactions: res.data } : msg
                ),
            }));
        } catch (error) {
            toast.error("Failed to add reaction");
        }
    },

    /**
     * Marks all loaded messages from a specific sender as seen.
     * @param {string} senderId - The ID of the user who sent the messages.
     */
    markMessagesAsSeen: async (senderId) => {
        try {
            await axiosInstance.put("/messages/mark-seen", { senderId });
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg.senderId === senderId ? { ...msg, status: "seen" } : msg
                ),
            }));
        } catch (error) {
            console.log("Failed to mark messages as seen", error);
        }
    },

    /**
     * Binds WebSocket event listeners for real-time chat functionality.
     * Handles incoming messages, typing indicators, read receipts, and deletions.
     */
    subscribeToMessages: () => {
        const socket = getSocket();
        if (!socket) return;

        socket.on("newMessage", (message) => {
            const { selectedUser, messages, users } = get();
            const authUser = useAuthStore.getState().authUser;

            // Normalize all IDs to strings to avoid ObjectId vs string mismatches
            const msgSenderId   = message.senderId?.toString();
            const msgReceiverId = message.receiverId?.toString();
            const selUserId     = selectedUser?._id?.toString();
            const authUserId2   = authUser?._id?.toString();

            // If message is from the selected user OR sent by me to the selected user (from another device)
            const isFromSelectedUser = !!selUserId && msgSenderId === selUserId;
            const isToSelectedUser   = !!selUserId && msgSenderId === authUserId2 && msgReceiverId === selUserId;
            
            if (isFromSelectedUser || isToSelectedUser) {
                // Prevent duplicate optimistic messages on the sending device
                const msgExists = messages.some(m => m._id?.toString() === message._id?.toString());
                if (!msgExists) {
                    set({ messages: [...messages, message] });
                }
                
                // Mark as seen if it's from them (and chat is open)
                if (isFromSelectedUser) {
                    get().markMessagesAsSeen(selectedUser._id);
                }
            }

            // --- Sidebar update ---
            const iSentThis = msgSenderId === authUserId2;
            const otherUserId = iSentThis ? msgReceiverId : msgSenderId;
            const otherUserInSidebar = users.find((u) => u._id?.toString() === otherUserId);

            if (otherUserInSidebar) {
                set((state) => ({
                    users: state.users.map((u) =>
                        u._id?.toString() === otherUserId
                            ? {
                                  ...u,
                                  lastMessage: {
                                      _id: message._id,
                                      message: message.message,
                                      image: !!message.image,
                                      audio: !!message.audio,
                                      senderId: message.senderId,
                                      createdAt: message.createdAt,
                                  },
                                  unreadCount:
                                      iSentThis || state.selectedUser?._id?.toString() === otherUserId
                                          ? u.unreadCount
                                          : (u.unreadCount || 0) + 1,
                              }
                            : u
                    ),
                }));
            } else {
                // Other person not in sidebar yet → refetch to include them
                get().getUsers();
            }

            // In-app notification for messages when tab is hidden
            if (document.visibilityState !== "visible" && Notification.permission === "granted") {
                const sender = users.find((u) => u._id?.toString() === msgSenderId);
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
            set({ messages: get().messages.filter((m) => m._id !== messageId) });
        });

        socket.on("userTyping", ({ senderId }) => {
            set((state) => ({
                typingUsers: [...new Set([...state.typingUsers, senderId])],
            }));
        });

        socket.on("userStoppedTyping", ({ senderId }) => {
            set((state) => ({
                typingUsers: state.typingUsers.filter((id) => id !== senderId),
            }));
        });

        socket.on("messagesSeen", ({ receiverId }) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg.receiverId === receiverId ? { ...msg, status: "seen" } : msg
                ),
            }));
        });

        socket.on("messagesDelivered", ({ receiverId }) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg.receiverId === receiverId && msg.status === "sent" 
                    ? { ...msg, status: "delivered" } 
                    : msg
                ),
            }));
        });

        socket.on("messageReacted", ({ messageId, reactions }) => {
            set((state) => ({
                messages: state.messages.map((msg) =>
                    msg._id === messageId ? { ...msg, reactions } : msg
                ),
            }));
        });
    },

    /**
     * Cleans up WebSocket event listeners to prevent memory leaks on unmount.
     */
    unsubscribeFromMessages: () => {
        const socket = getSocket();
        if (socket) {
            socket.off("newMessage");
            socket.off("deleteMessage");
            socket.off("userTyping");
            socket.off("userStoppedTyping");
            socket.off("messagesSeen");
            socket.off("messagesDelivered");
            socket.off("messageReacted");
        }
    },

    /**
     * Searches within a specific conversation for text matches.
     * @param {string} userId - The partner's user ID.
     * @param {string} query - The text to search for.
     */
    searchTextMessages: async (userId, query) => {
        try {
            const res = await axiosInstance.get(`/messages/search-text/${userId}?q=${encodeURIComponent(query)}`);
            return res.data;
        } catch {
            toast.error("Text search failed");
            return [];
        }
    },

    /**
     * Sets the active chat user.
     * Crucially resets pagination state (hasMore, isLoadingMore) to prevent cross-chat scroll locking.
     * @param {Object|null} user - The user object to select, or null to close chat.
     */
    setSelectedUser: (user) => {
        if (!user) return set({ selectedUser: null, messages: [], hasMore: false, isLoadingMore: false });
        const current = get().selectedUser;
        if (current?._id === user?._id) return;

        // Clear unread count for this user when selecting them and reset pagination flags
        set((state) => ({
            selectedUser: user,
            messages: [],
            hasMore: false,
            isLoadingMore: false,
            users: state.users.map((u) =>
                u._id === user._id ? { ...u, unreadCount: 0 } : u
            ),
        }));
    },
}));

export default useChatStore;