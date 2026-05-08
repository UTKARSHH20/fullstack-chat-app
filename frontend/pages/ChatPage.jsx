import { useEffect, useRef, useState, useCallback } from "react"
import {
    Image, Send, X, MessageSquare, Search,
    Reply, Copy, Trash2, Forward, Pin, Star,
    ArrowLeft, PenSquare, Smile,
} from "lucide-react"
import toast from "react-hot-toast"
import useAuthStore from "../src/store/useAuthStore"
import useChatStore from "../src/store/useChatStore"
import { getSocket } from "../lib/socket"

// ── Helpers ───────────────────────────────────────────────────────
const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

const EMOJI_CATEGORIES = [
    {
        label: "😊", name: "Smileys",
        emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😇","😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒","😓","😔","😕","😖","😗","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧","😨","😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳","😴","😵","😶","😷","🙂","🙃","🙄","🤐","🤑","🤒","🤓","🤔","🤕","🤗","🤠","🤡","🥰","🥳","🥺","🤩"],
    },
    {
        label: "👋", name: "Gestures",
        emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🦷","👀","👁","👅","👄"],
    },
    {
        label: "❤️", name: "Hearts",
        emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳"],
    },
    {
        label: "⚽", name: "Activities",
        emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🤿","🎯","🎱","🎮","🎰","🎲","🧩","🪀","🪁","🎭","🎨","🖼","🎪","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🎬","🏆","🥇","🥈","🥉","🏅","🎖"],
    },
    {
        label: "🍕", name: "Food",
        emojis: ["🍕","🍔","🌮","🌯","🥙","🧆","🥚","🍳","🥘","🍲","🫕","🥣","🥗","🍿","🧈","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🦪","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥤","🧋"],
    },
    {
        label: "🌸", name: "Nature",
        emojis: ["🌸","🌼","🌻","🌺","🌹","🥀","🌷","🌱","🌿","☘️","🍀","🎋","🎍","🍃","🍂","🍁","🍄","🐚","🪸","🪨","🌾","💐","🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦅","🦆","🦉","🦇","🐝","🦋"],
    },
]

// ── Emoji Picker ─────────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
    const ref = useRef(null)
    const [tab, setTab] = useState(0)

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
        const t = setTimeout(() => window.addEventListener("click", handler), 10)
        return () => { clearTimeout(t); window.removeEventListener("click", handler) }
    }, [onClose])

    return (
        <div
            ref={ref}
            className="absolute bottom-16 left-2 z-50 bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-72 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            {/* Category tabs */}
            <div className="flex border-b border-base-300">
                {EMOJI_CATEGORIES.map((cat, i) => (
                    <button
                        key={cat.name}
                        onClick={() => setTab(i)}
                        title={cat.name}
                        className={`flex-1 py-2 text-lg hover:bg-base-300 transition-colors ${
                            tab === i ? "border-b-2 border-primary bg-base-300/50" : ""
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
            {/* Emoji grid */}
            <div className="overflow-y-auto h-48 p-2">
                <div className="grid grid-cols-8 gap-0.5">
                    {EMOJI_CATEGORIES[tab].emojis.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => onSelect(emoji)}
                            className="text-xl p-1 rounded-lg hover:bg-base-300 active:scale-90 transition-all"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── Avatar ────────────────────────────────────────────────────────
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
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-base-100 ${isOnline ? "bg-success" : "bg-base-300"}`} />
        </div>
    )
}

// ── Context menu ──────────────────────────────────────────────────
function ContextMenu({ menu, onClose, onReply, onCopy, onDelete }) {
    const ref = useRef(null)
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
        const t = setTimeout(() => window.addEventListener("click", handler), 10)
        return () => { clearTimeout(t); window.removeEventListener("click", handler) }
    }, [onClose])

    if (!menu.visible) return null

    const actions = [
        { icon: Reply,   label: "Reply",   fn: onReply },
        { icon: Copy,    label: "Copy",    fn: onCopy,   hide: !menu.message?.message },
        { icon: Forward, label: "Forward", fn: () => { toast("Forward — coming soon 🔜"); onClose() } },
        { icon: Pin,     label: "Pin",     fn: () => { toast("Pin — coming soon 📌");     onClose() } },
        { icon: Star,    label: "Star",    fn: () => { toast("Star — coming soon ⭐");    onClose() } },
        { icon: Trash2,  label: "Delete",  fn: onDelete, hide: !menu.isMine, danger: true },
    ].filter(a => !a.hide)

    return (
        <div
            ref={ref}
            style={{ position: "fixed", top: menu.y, left: menu.x, zIndex: 9999 }}
            className="bg-base-200 border border-base-300 rounded-2xl shadow-2xl overflow-hidden w-52"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-around px-3 py-2.5 border-b border-base-300">
                {EMOJIS.map(e => (
                    <button key={e} onClick={() => { toast(`Reacted ${e}`, { duration: 1200 }); onClose() }}
                        className="text-xl hover:scale-125 active:scale-150 transition-transform">{e}</button>
                ))}
                <button onClick={() => { toast("More reactions — coming soon"); onClose() }}
                    className="w-6 h-6 rounded-full bg-base-300 text-xs flex items-center justify-center hover:bg-base-content/20">+</button>
            </div>
            {actions.map(({ icon: Icon, label, fn, danger }) => (
                <button key={label} onClick={fn}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-base-300 transition-colors ${danger ? "text-error" : "text-base-content"}`}>
                    <Icon className="w-4 h-4 shrink-0" />{label}
                </button>
            ))}
        </div>
    )
}

// ── Reply preview inside bubble ───────────────────────────────────
function ReplyPreview({ replyTo, isMine }) {
    return (
        <div className={`mb-1.5 px-2 py-1.5 rounded-lg text-xs border-l-[3px]
            ${isMine ? "bg-white/10 border-white/50 text-white/80" : "bg-base-300/60 border-primary text-base-content/70"}`}>
            <p className={`font-bold mb-0.5 ${isMine ? "text-white" : "text-primary"}`}>{replyTo.senderName}</p>
            <p className="truncate opacity-80">{replyTo.message || "📎 Attachment"}</p>
        </div>
    )
}

// ── Reply bar above input ─────────────────────────────────────────
function ReplyBar({ replyTo, authUser, selectedUser, onCancel }) {
    const name = replyTo.senderId === authUser?._id ? "You" : selectedUser?.name
    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-base-200 border-t border-base-300">
            <div className="w-0.5 self-stretch bg-primary rounded-full" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary">{name}</p>
                <p className="text-xs text-base-content/50 truncate">{replyTo.message || "📎 Attachment"}</p>
            </div>
            <button onClick={onCancel} className="btn btn-ghost btn-xs btn-circle shrink-0">
                <X className="w-3 h-3" />
            </button>
        </div>
    )
}

// ── New Chat Modal ────────────────────────────────────────────────
function NewChatModal({ onSelectUser, onClose }) {
    const { searchUsers } = useChatStore()
    const { onlineUsers } = useAuthStore()
    const [query, setQuery] = useState("")
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!query.trim()) { setResults([]); return }
        const t = setTimeout(async () => {
            setLoading(true)
            const data = await searchUsers(query)
            setResults(data)
            setLoading(false)
        }, 300)
        return () => clearTimeout(t)
    }, [query, searchUsers])

    return (
        <div className="absolute inset-0 bg-base-100 z-20 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-base-200">
                <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <label className="input input-bordered input-sm flex items-center gap-2 flex-1">
                    <Search className="w-3.5 h-3.5 text-base-content/40" />
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search by name…"
                        className="grow bg-transparent outline-none text-sm"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </label>
            </div>
            {/* Results */}
            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-md text-primary" />
                    </div>
                )}
                {!loading && query && results.length === 0 && (
                    <p className="text-center text-base-content/40 text-sm py-8">No users found</p>
                )}
                {!loading && !query && (
                    <p className="text-center text-base-content/40 text-sm py-8">Type a name to search</p>
                )}
                {results.map(user => {
                    const isOnline = onlineUsers.includes(user._id)
                    return (
                        <button key={user._id}
                            onClick={() => { onSelectUser(user); onClose() }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-base-200 transition-colors">
                            <Avatar user={user} isOnline={isOnline} />
                            <div className="min-w-0 text-left">
                                <p className="font-medium text-sm truncate">{user.name}</p>
                                <p className={`text-xs ${isOnline ? "text-success" : "text-base-content/40"}`}>
                                    {isOnline ? "Online" : "Offline"}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ selectedUser, onSelectUser, isMobileHidden }) {
    const { users, getUsers, isUsersLoading } = useChatStore()
    const { onlineUsers } = useAuthStore()
    const [search, setSearch] = useState("")
    const [showNewChat, setShowNewChat] = useState(false)

    useEffect(() => { getUsers() }, [getUsers])

    useEffect(() => {
        const socket = getSocket()
        if (!socket) return
        socket.on("getOnlineUsers", (ids) => useAuthStore.getState().setOnlineUsers(ids))
        return () => socket.off("getOnlineUsers")
    }, [])

    const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <aside className={`
            ${isMobileHidden ? "hidden md:flex" : "flex"}
            w-full md:w-72 shrink-0 flex-col border-r border-base-200 bg-base-100 h-full relative
        `}>
            {/* Header */}
            <div className="p-4 border-b border-base-200">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-lg">
                        Messages
                        {onlineUsers.length > 0 && (
                            <span className="ml-2 badge badge-success badge-sm">{onlineUsers.length} online</span>
                        )}
                    </h2>
                    <button
                        onClick={() => setShowNewChat(true)}
                        className="btn btn-ghost btn-sm btn-circle"
                        title="New chat"
                    >
                        <PenSquare className="w-4 h-4" />
                    </button>
                </div>
                <label className="input input-bordered input-sm flex items-center gap-2 w-full">
                    <Search className="w-3.5 h-3.5 text-base-content/40" />
                    <input
                        type="text"
                        placeholder="Search conversations…"
                        className="grow bg-transparent outline-none text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </label>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto">
                {isUsersLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <span className="loading loading-spinner loading-md text-primary" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                        <PenSquare className="w-10 h-10 text-base-content/20" />
                        <p className="text-base-content/40 text-sm">No conversations yet</p>
                        <button onClick={() => setShowNewChat(true)} className="btn btn-primary btn-sm">
                            Start a new chat
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="text-center text-base-content/40 text-sm py-8">No results</p>
                ) : (
                    filtered.map(user => {
                        const isOnline = onlineUsers.includes(user._id)
                        return (
                            <button
                                key={user._id}
                                onClick={() => onSelectUser(user)}
                                onDoubleClick={e => e.preventDefault()}
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
                                    <p className={`text-xs ${isOnline ? "text-success" : "text-base-content/40"}`}>
                                        {isOnline ? "Online" : "Offline"}
                                    </p>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>

            {/* New Chat Modal (overlays sidebar) */}
            {showNewChat && (
                <NewChatModal
                    onSelectUser={onSelectUser}
                    onClose={() => setShowNewChat(false)}
                />
            )}
        </aside>
    )
}

// ── Chat window ───────────────────────────────────────────────────
function ChatWindow({ selectedUser, onBack, isMobileHidden }) {
    const {
        messages, getMessages, sendMessage, deleteMessage,
        isMessagesLoading, subscribeToMessages, unsubscribeFromMessages,
    } = useChatStore()
    const { authUser, onlineUsers } = useAuthStore()

    const [text, setText] = useState("")
    const [imagePreview, setImagePreview] = useState(null)
    const [imageBase64, setImageBase64] = useState(null)
    const [sending, setSending] = useState(false)
    const [replyTo, setReplyTo] = useState(null)
    const [contextMenu, setContextMenu] = useState({ visible: false })
    const [showEmoji, setShowEmoji] = useState(false)

    const bottomRef = useRef(null)
    const fileRef   = useRef(null)
    const textareaRef = useRef(null)

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

    const closeMenu = useCallback(() => setContextMenu({ visible: false }), [])

    const handleContextMenu = (e, msg, isMine) => {
        e.preventDefault()
        const W = 210, H = 320
        const x = Math.min(e.clientX, window.innerWidth  - W - 8)
        const y = Math.min(e.clientY, window.innerHeight - H - 8)
        setContextMenu({ visible: true, x, y, message: msg, isMine })
    }

    const handleReply  = () => { setReplyTo(contextMenu.message); closeMenu() }
    const handleCopy   = () => {
        if (contextMenu.message?.message) {
            navigator.clipboard.writeText(contextMenu.message.message)
            toast.success("Copied!")
        }
        closeMenu()
    }
    const handleDelete = async () => { await deleteMessage(contextMenu.message._id); closeMenu() }

    const handleImage = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => { setImagePreview(URL.createObjectURL(file)); setImageBase64(reader.result) }
        reader.readAsDataURL(file)
    }

    const handleSend = async () => {
        if (!text.trim() && !imageBase64) return
        setSending(true)
        setShowEmoji(false)
        await sendMessage({
            message: text.trim(),
            image: imageBase64 || "",
            replyTo: replyTo ? {
                _id: replyTo._id,
                message: replyTo.message,
                senderName: replyTo.senderId === authUser._id ? authUser.name : selectedUser.name,
            } : null,
        })
        setText(""); setImagePreview(null); setImageBase64(null); setReplyTo(null)
        setSending(false)
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const isOnline = selectedUser && onlineUsers.includes(selectedUser._id)

    // Empty state
    if (!selectedUser) return (
        <div className={`${isMobileHidden ? "hidden md:flex" : "flex"} flex-1 flex-col items-center justify-center bg-base-200 gap-4`}>
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary/50" />
            </div>
            <div className="text-center">
                <h3 className="font-bold text-lg">Select a conversation</h3>
                <p className="text-base-content/40 text-sm mt-1">Choose someone from the sidebar to start chatting</p>
            </div>
        </div>
    )

    return (
        <div className={`${isMobileHidden ? "hidden md:flex" : "flex"} flex-1 flex-col bg-base-100 min-w-0`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-base-200 shadow-sm">
                {/* Back button — mobile only */}
                <button
                    onClick={onBack}
                    className="md:hidden btn btn-ghost btn-sm btn-circle shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar user={selectedUser} isOnline={isOnline} />
                <div>
                    <p className="font-semibold text-sm">{selectedUser.name}</p>
                    <p className={`text-xs ${isOnline ? "text-success" : "text-base-content/40"}`}>
                        {isOnline ? "Online" : "Offline"}
                    </p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1">
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
                        const prev   = messages[i - 1]
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
                                <div className={`chat w-full ${isMine ? "chat-end" : "chat-start"}`}>
                                    {!isMine && (
                                        <div className="chat-image">
                                            <Avatar user={selectedUser} size="sm" isOnline={isOnline} />
                                        </div>
                                    )}
                                    <div
                                        className={`chat-bubble shadow-sm max-w-[75%] break-words cursor-pointer select-none ${isMine ? "chat-bubble-primary" : ""}`}
                                        onContextMenu={e => handleContextMenu(e, msg, isMine)}
                                    >
                                        {msg.replyTo?.message && <ReplyPreview replyTo={msg.replyTo} isMine={isMine} />}
                                        {msg.image && (
                                            <img
                                                src={msg.image} alt="attachment"
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

            {/* Context menu */}
            <ContextMenu menu={contextMenu} onClose={closeMenu} onReply={handleReply} onCopy={handleCopy} onDelete={handleDelete} />

            {/* Reply bar */}
            {replyTo && (
                <ReplyBar replyTo={replyTo} authUser={authUser} selectedUser={selectedUser} onCancel={() => setReplyTo(null)} />
            )}

            {/* Image preview */}
            {imagePreview && (
                <div className="px-4 pb-2">
                    <div className="relative inline-block">
                        <img src={imagePreview} alt="preview" className="h-20 w-auto rounded-lg object-cover border border-base-300" />
                        <button onClick={() => { setImagePreview(null); setImageBase64(null) }}
                            className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Input bar */}
            <div className="px-3 py-3 border-t border-base-200 flex items-end gap-2 relative">
                {showEmoji && (
                    <EmojiPicker
                        onSelect={(emoji) => {
                            const el = textareaRef.current
                            if (el) {
                                const start = el.selectionStart
                                const end   = el.selectionEnd
                                setText(prev => prev.slice(0, start) + emoji + prev.slice(end))
                                // restore cursor after emoji
                                setTimeout(() => {
                                    el.focus()
                                    el.setSelectionRange(start + emoji.length, start + emoji.length)
                                }, 0)
                            } else {
                                setText(prev => prev + emoji)
                            }
                        }}
                        onClose={() => setShowEmoji(false)}
                    />
                )}
                <button onClick={() => fileRef.current?.click()}
                    className="btn btn-ghost btn-sm btn-square shrink-0" title="Attach image">
                    <Image className="w-4 h-4 text-base-content/50" />
                </button>
                <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImage} />
                {/* Emoji button */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowEmoji(v => !v) }}
                    className={`btn btn-ghost btn-sm btn-square shrink-0 ${showEmoji ? "text-primary" : "text-base-content/50"}`}
                    title="Emoji"
                >
                    <Smile className="w-4 h-4" />
                </button>
                <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Type a message…"
                    className="textarea textarea-bordered textarea-sm flex-1 resize-none leading-relaxed"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={handleSend} disabled={(!text.trim() && !imageBase64) || sending}
                    className="btn btn-primary btn-sm btn-square shrink-0">
                    {sending ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-4 h-4" />}
                </button>
            </div>
        </div>
    )
}

// ── Page ──────────────────────────────────────────────────────────
export default function ChatPage() {
    const { setSelectedUser, selectedUser } = useChatStore()

    // On mobile: if user selected → hide sidebar, show chat
    // On desktop: always show both
    const chatSelected = !!selectedUser

    return (
        <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-base-200 relative">
            <Sidebar
                selectedUser={selectedUser}
                onSelectUser={setSelectedUser}
                isMobileHidden={chatSelected}  // hide sidebar on mobile when chat open
            />
            <ChatWindow
                selectedUser={selectedUser}
                onBack={() => setSelectedUser(null)}
                isMobileHidden={!chatSelected} // hide chat on mobile when no user selected
            />
        </div>
    )
}