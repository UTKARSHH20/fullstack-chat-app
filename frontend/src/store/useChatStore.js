import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../../lib/axios";
import { getSocket } from "../../lib/socket";
import useAuthStore from "./useAuthStore";
import { encryptMessage, decryptMessage } from "../../lib/crypto";

// MEMORY LOCK QUEUE: Prevents async race conditions on rapid emoji clicks
const reactionQueues = {};

const decryptSingleMessage = async (msg, userId, otherPublicKey) => {
    if (msg.isEncrypted && msg.message && msg.iv && otherPublicKey) {
        try {
            const decrypted = await decryptMessage(userId, msg.message, msg.iv, otherPublicKey);
            return { ...msg, message: decrypted };
        } catch (err) {
            console.error("Decryption failed for message", msg._id, err);
            return { ...msg, message: "[Decryption Error: Key mismatch or missing key]" };
        }
    }
    return msg;
};

const decryptMessages = async (messagesList, userId, otherPublicKey) => {
    return await Promise.all(messagesList.map(m => decryptSingleMessage(m, userId, otherPublicKey)));
};

const useChatStore = create((set, get) => ({
    users: [],
    selectedUser: null,
    messages: [],
    typingUsers: [],
    isUsersLoading: false,
    isMessagesLoading: false,
    hasMore: false,
    isLoadingMore: false,

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
            const { authUser } = useAuthStore.getState();
            const { selectedUser } = get();
            const decrypted = await decryptMessages(res.data.messages, authUser?._id, selectedUser?.publicKey);
            set({
                messages: decrypted,
                hasMore: res.data.hasMore,
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load messages");
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    loadMoreMessages: async (userId) => {
        const { messages, isLoadingMore, hasMore } = get();
        if (isLoadingMore || !hasMore || messages.length === 0) return;

        set({ isLoadingMore: true });
        try {
            const oldestId = messages[0]._id;
            const res = await axiosInstance.get(
                `/messages/${userId}?before=${oldestId}&limit=30`
            );
            const { authUser } = useAuthStore.getState();
            const { selectedUser } = get();
            const decrypted = await decryptMessages(res.data.messages, authUser?._id, selectedUser?.publicKey);
            set({
                messages: [...decrypted, ...messages],
                hasMore: res.data.hasMore,
            });
        } catch {
            toast.error("Failed to load older messages");
        } finally {
            set({ isLoadingMore: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        const { authUser } = useAuthStore.getState();
        if (!selectedUser || !authUser) return;

        // Optimistic UI Update using plaintext message
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

        let finalMessageData = { ...messageData };
        const hasE2EE = !!selectedUser.publicKey && !!authUser.publicKey;

        if (hasE2EE && messageData.message) {
            try {
                const encrypted = await encryptMessage(authUser._id, messageData.message, selectedUser.publicKey);
                finalMessageData.message = encrypted.ciphertext;
                finalMessageData.iv = encrypted.iv;
                finalMessageData.isEncrypted = true;
            } catch (err) {
                console.error("E2EE Encryption failed, falling back to plaintext", err);
            }
        }

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, finalMessageData);
            
            const decryptedMsg = await decryptSingleMessage(res.data, authUser._id, selectedUser.publicKey);

            // Replace temporary message with the real decrypted one from the server
            set((state) => ({
                messages: state.messages.map(m => m._id === tempId ? decryptedMsg : m)
            }));

            // Update sidebar: lastMessage for this user
            set((state) => ({
                users: state.users.map((u) =>
                    u._id === selectedUser._id
                        ? {
                              ...u,
                              lastMessage: {
                                  _id: decryptedMsg._id,
                                  message: decryptedMsg.message,
                                  image: !!decryptedMsg.image,
                                  audio: !!decryptedMsg.audio,
                                  senderId: decryptedMsg.senderId,
                                  createdAt: decryptedMsg.createdAt,
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

    deleteMessage: async (messageId) => {
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            set({ messages: get().messages.filter((m) => m._id !== messageId) });
            toast.success("Message deleted");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete");
        }
    },

    // ATOMIC ACTION: Safely locks the thread per-message so rapid clicks process sequentially.
    addReaction: async (messageId, emoji) => {
        if (!reactionQueues[messageId]) {
            reactionQueues[messageId] = [];
        }

        const executeReactionTask = async () => {
            try {
                const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
                set((state) => ({
                    messages: state.messages.map((msg) =>
                        msg._id === messageId ? { ...msg, reactions: res.data } : msg
                    ),
                }));
            } catch {
                toast.error("Failed to add reaction");
            }
        };

        reactionQueues[messageId].push(executeReactionTask);

        if (reactionQueues[messageId].length === 1) {
            while (reactionQueues[messageId].length > 0) {
                const currentTask = reactionQueues[messageId][0];
                await currentTask(); 
                reactionQueues[messageId].shift(); 
            }
            delete reactionQueues[messageId];
        }
    },

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

    subscribeToMessages: () => {
        const socket = getSocket();
        if (!socket) return;

        socket.on("newMessage", async (message) => {
            const { selectedUser, messages, users } = get();
            const authUser = useAuthStore.getState().authUser;
            if (!authUser) return;

            // Normalize all IDs to strings to avoid ObjectId vs string mismatches
            const msgSenderId   = message.senderId?.toString();
            const msgReceiverId = message.receiverId?.toString();
            const selUserId     = selectedUser?._id?.toString();
            const authUserId2   = authUser?._id?.toString();
            const iSentThis     = msgSenderId === authUserId2;

            // Get the appropriate public key to derive secret
            const senderUser = users.find((u) => u._id?.toString() === msgSenderId);
            const otherUserPublicKey = iSentThis 
                ? selectedUser?.publicKey 
                : senderUser?.publicKey;

            const decryptedMsg = await decryptSingleMessage(message, authUser._id, otherUserPublicKey);

            // If message is from the selected user OR sent by me to the selected user (from another device)
            const isFromSelectedUser = !!selUserId && msgSenderId === selUserId;
            const isToSelectedUser   = !!selUserId && msgSenderId === authUserId2 && msgReceiverId === selUserId;
            
            if (isFromSelectedUser || isToSelectedUser) {
                // Prevent duplicate optimistic messages on the sending device
                const msgExists = messages.some(m => m._id?.toString() === decryptedMsg._id?.toString());
                if (!msgExists) {
                    set({ messages: [...messages, decryptedMsg] });
                }
                
                // Mark as seen if it's from them (and chat is open)
                if (isFromSelectedUser) {
                    get().markMessagesAsSeen(selectedUser._id);
                }
            }

            // --- Sidebar update ---
            // Identify the "other person" in the conversation regardless of who sent it.
            const otherUserId = iSentThis ? msgReceiverId : msgSenderId;
            const otherUserInSidebar = users.find((u) => u._id?.toString() === otherUserId);

            if (otherUserInSidebar) {
                set((state) => ({
                    users: state.users.map((u) =>
                        u._id?.toString() === otherUserId
                            ? {
                                  ...u,
                                  lastMessage: {
                                      _id: decryptedMsg._id,
                                      message: decryptedMsg.message,
                                      image: !!decryptedMsg.image,
                                      audio: !!decryptedMsg.audio,
                                      senderId: decryptedMsg.senderId,
                                      createdAt: decryptedMsg.createdAt,
                                  },
                                  // Increment unread only if:
                                  //   - I did NOT send this message
                                  //   - AND this is not the currently open chat
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
                const body = decryptedMsg.message || (decryptedMsg.audio ? "🎤 Voice message" : "📷 Image");
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
            // receiverId is the person who saw our messages
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

        socket.on("statusMoodUpdated", ({ userId, statusMood }) => {
            const authUser = useAuthStore.getState().authUser;
            if (authUser?._id === userId) {
                useAuthStore.setState({ authUser: { ...authUser, statusMood } });
            }
            set((state) => ({
                users: state.users.map((user) =>
                    user._id === userId ? { ...user, statusMood } : user
                ),
                selectedUser: state.selectedUser?._id === userId
                    ? { ...state.selectedUser, statusMood }
                    : state.selectedUser,
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
            socket.off("messagesDelivered");
            socket.off("messageReacted");
        }
    },

    searchTextMessages: async (userId, query) => {
        try {
            const res = await axiosInstance.get(`/messages/search-text/${userId}?q=${encodeURIComponent(query)}`);
            return res.data;
        } catch {
            toast.error("Text search failed");
            return [];
        }
    },

    setSelectedUser: (user) => {
        if (!user) return set({ selectedUser: null, messages: [] });
        const current = get().selectedUser;
        if (current?._id === user?._id) return;

        // Clear unread count for this user when selecting them
        set((state) => ({
            selectedUser: user,
            messages: [],
            users: state.users.map((u) =>
                u._id === user._id ? { ...u, unreadCount: 0 } : u
            ),
        }));
    },
}));

export default useChatStore;