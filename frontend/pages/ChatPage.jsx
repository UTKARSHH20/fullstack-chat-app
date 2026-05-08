import { useEffect, useRef, useState } from "react"
import { Image, Send, X, MessageSquare, Search } from "lucide-react"
import useAuthStore from "../src/store/useAuthStore"
import useChatStore from "../src/store/useChatStore"
import { getSocket } from "../lib/socket"

// ── Helpers ────────────────────────────────────────────────────────
const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

const Avatar = ({ user, size = "md", isOnline = false }) => {
    const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
    return (
        <div className="relative shrink-0">
            {user?.profilePicture
                ? <img src={user.profilePicture} alt={user.name} className={`${sz} rounded-full object-cover`} />
                : <div className={`${sz} rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary`}>
                    {user?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
            }
            <span className={`
                absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-base-100
                ${isOnline ? "bg-success" : "bg-base-300"}
            `} />
        </div>
    )
}

// ── Sidebar ─────────────────────────────────────────────────────────
function Sidebar({ selectedUser, onSelectUser }) {
    const { users, getUsers, isUsersLoading } = useChatStore()
    const { onlineUsers } = useAuthStore()
    const [search, setSearch] = useState("")

    useEffect(() => { getUsers() }, [getUsers])

    // listen for online users updates
    useEffect(() => {
        const socket = getSocket()
        if (!socket) return
        socket.on("getOnlineUsers", (userIds) => {
            useAuthStore.getState().setOnlineUsers(userIds)
        })
        return () => socket.off("getOnlineUsers")
    }, [])

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <aside className="w-72 shrink-0 flex flex-col border-r border-base-200 bg-base-100 h-full">
            <div className="p-4 border-b border-base-200">
                <h2 className="font-bold text-lg mb-3">
                    Messages
                    {onlineUsers.length > 0 && (
                        <span className="ml-2 badge badge-success badge-sm">{onlineUsers.length} online</span>
                    )}
                </h2>
                <label className="input input-bordered input-sm flex items-center gap-2 w-full">
                    <Search className="w-3.5 h-3.5 text-base-content/40" />
                    <input
                        type="text"
                        placeholder="Search people…"
                        className="grow bg-transparent outline-none text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </label>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isUsersLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <span className="loading loading-spinner loading-md text-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-base-content/40 text-sm py-8">No users found</p>
                ) : (
                    filtered.map(user => {
                        const isOnline = onlineUsers.includes(user._id)
                        return (
                            <button
                                key={user._id}
                                onClick={() => onSelectUser(user)}
                                onDoubleClick={(e) => e.preventDefault()}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 text-left
                                    hover:bg-base-200 transition-colors
                                    ${selectedUser?._id === user._id
                                        ? "bg-base-200 border-l-2 border-primary"
                                        : "border-l-2 border-transparent"}
                                `}
                            >
                                <Avatar user={user} isOnline={isOnline} />
                                <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{user.name}</p>
                                    <p className={`text-xs truncate ${isOnline ? "text-success" : "text-base-content/40"}`}>
                                        {isOnline ? "Online" : "Offline"}
                                    </p>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </aside>
    )
}

// ── Chat window ──────────────────────────────────────────────────────
function ChatWindow({ selectedUser }) {
    const {
        messages, getMessages, sendMessage, isMessagesLoading,
        subscribeToMessages, unsubscribeFromMessages,
    } = useChatStore()
    const { authUser, onlineUsers } = useAuthStore()

    const [text, setText] = useState("")
    const [imagePreview, setImagePreview] = useState(null)
    const [imageBase64, setImageBase64] = useState(null)
    const [sending, setSending] = useState(false)
    const bottomRef = useRef(null)
    const fileRef = useRef(null)

    useEffect(() => {
        if (selectedUser?._id) {
            getMessages(selectedUser._id)
            subscribeToMessages()
        }
        return () => unsubscribeFromMessages()
    }, [selectedUser, getMessages, subscribeToMessages, unsubscribeFromMessages])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleImage = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(URL.createObjectURL(file))
            setImageBase64(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleSend = async () => {
        if (!text.trim() && !imageBase64) return
        setSending(true)
        await sendMessage({ message: text.trim(), image: imageBase64 || "" })
        setText("")
        setImagePreview(null)
        setImageBase64(null)
        setSending(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const isOnline = selectedUser && onlineUsers.includes(selectedUser._id)

    if (!selectedUser) return (
        <div className="flex-1 flex flex-col items-center justify-center bg-base-200 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary/50" />
            </div>
            <div className="text-center">
                <h3 className="font-bold text-lg">Select a conversation</h3>
                <p className="text-base-content/40 text-sm mt-1">
                    Choose someone from the sidebar to start chatting
                </p>
            </div>
        </div>
    )

    return (
        <div className="flex-1 flex flex-col bg-base-100 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-base-200 shadow-sm">
                <Avatar user={selectedUser} isOnline={isOnline} />
                <div>
                    <p className="font-semibold text-sm">{selectedUser.name}</p>
                    <p className={`text-xs ${isOnline ? "text-success" : "text-base-content/40"}`}>
                        {isOnline ? "Online" : "Offline"}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {isMessagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="loading loading-spinner loading-md text-primary" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-base-content/30 text-sm">No messages yet — say hi! 👋</p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMine = msg.senderId === authUser?._id
                        const prev = messages[i - 1]
                        const showTime = !prev || Math.abs(
                            new Date(msg.createdAt) - new Date(prev.createdAt)
                        ) > 3 * 60 * 1000

                        return (
                            <div key={msg._id}>
                                {showTime && (
                                    <p className="text-center text-xs text-base-content/30 my-3">
                                        {formatTime(msg.createdAt)}
                                    </p>
                                )}
                                <div className={`chat ${isMine ? "chat-end" : "chat-start"}`}>
                                    {!isMine && (
                                        <div className="chat-image">
                                            <Avatar user={selectedUser} size="sm" isOnline={isOnline} />
                                        </div>
                                    )}
                                    <div className={`
                                        chat-bubble shadow-sm max-w-xs lg:max-w-md break-words
                                        ${isMine ? "chat-bubble-primary" : ""}
                                    `}>
                                        {msg.image && (
                                            <img
                                                src={msg.image}
                                                alt="attachment"
                                                className="max-w-full rounded-lg mb-1 cursor-pointer"
                                                onClick={() => window.open(msg.image, "_blank")}
                                            />
                                        )}
                                        {msg.message && <p className="text-sm">{msg.message}</p>}
                                    </div>
                                    {isMine && (
                                        <div className="chat-image">
                                            <Avatar user={authUser} size="sm" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Image preview strip */}
            {imagePreview && (
                <div className="px-4 pb-2">
                    <div className="relative inline-block">
                        <img
                            src={imagePreview}
                            alt="preview"
                            className="h-20 w-auto rounded-lg object-cover border border-base-300"
                        />
                        <button
                            onClick={() => { setImagePreview(null); setImageBase64(null) }}
                            className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-base-200 flex items-end gap-2">
                <button
                    onClick={() => fileRef.current?.click()}
                    className="btn btn-ghost btn-sm btn-square shrink-0"
                    title="Attach image"
                >
                    <Image className="w-4 h-4 text-base-content/50" />
                </button>
                <input
                    type="file"
                    ref={fileRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImage}
                />

                <textarea
                    rows={1}
                    placeholder="Type a message…"
                    className="textarea textarea-bordered textarea-sm flex-1 resize-none leading-relaxed"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <button
                    onClick={handleSend}
                    disabled={(!text.trim() && !imageBase64) || sending}
                    className="btn btn-primary btn-sm btn-square shrink-0"
                >
                    {sending
                        ? <span className="loading loading-spinner loading-xs" />
                        : <Send className="w-4 h-4" />
                    }
                </button>
            </div>
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────────────
export default function ChatPage() {
    const { setSelectedUser, selectedUser } = useChatStore()

    return (
        <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-base-200">
            <Sidebar selectedUser={selectedUser} onSelectUser={setSelectedUser} />
            <ChatWindow selectedUser={selectedUser} />
        </div>
    )
}