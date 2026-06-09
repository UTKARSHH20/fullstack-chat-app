import { useEffect, useRef, useState } from "react"
import { Search, PenSquare, MonitorSmartphone, Palette } from "lucide-react"
import useChatStore from "../../src/store/useChatStore"
import useAuthStore from "../../src/store/useAuthStore"
import { getSocket } from "../../lib/socket"
import Avatar from "./Avatar"
import NewChatModal from "./NewChatModal"
import { getStatusMoodLabel } from "../../src/lib/statusMoods"

const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

// Sidebar with conversation list, search, and new chat modal
export default function Sidebar({ selectedUser, onSelectUser, isMobileHidden }) {
    const { users, getUsers, isUsersLoading, typingUsers } = useChatStore()
    const { onlineUsers } = useAuthStore()
    const [search, setSearch] = useState("")
    const [showNewChat, setShowNewChat] = useState(false)
    const [selectedFolder, setSelectedFolder] = useState("All")

    const previousOnlineRef = useRef(onlineUsers)

    useEffect(() => {
        getUsers()
    }, [getUsers])

    useEffect(() => {
        const socket = getSocket()
        if (!socket) return
        socket.on("getOnlineUsers", (ids) => {
            const currentOnline = useAuthStore.getState().onlineUsers;
            const wentOffline = currentOnline.filter(id => !ids.includes(id));
            if (wentOffline.length > 0) {
                const now = new Date().toISOString();
                useChatStore.setState(state => ({
                    users: state.users.map(u => wentOffline.includes(u._id) ? { ...u, lastSeen: now } : u),
                    selectedUser: state.selectedUser && wentOffline.includes(state.selectedUser._id)
                        ? { ...state.selectedUser, lastSeen: now }
                        : state.selectedUser
                }));
            }
            useAuthStore.getState().setOnlineUsers(ids)
        })
        return () => socket.off("getOnlineUsers")
    }, [])

    const totalUnread = users.reduce(
    (sum, user) => sum + (user.unreadCount || 0),
    0
)

const activeChats = onlineUsers.length

    const filtered = users.filter(u =>
    (
        selectedFolder === "All" ||
        (selectedFolder === "Unread" && u.unreadCount > 0) ||
        u.folder === selectedFolder
    ) &&
    u.name.toLowerCase().includes(search.toLowerCase())
)

    return (
        <aside className={`
            ${isMobileHidden ? "hidden md:flex" : "flex"}
            w-full md:w-72 shrink-0 flex-col border-r border-base-200 bg-base-100 h-full relative
        `}>
            <div className="p-4 border-b border-base-200">
                <div className="flex items-center justify-between mb-3">
                    <div>
    <h2 className="font-bold text-lg">
        Messages
        {onlineUsers.length > 0 && (
            <span className="ml-2 badge badge-success badge-sm">
                {onlineUsers.length} online
            </span>
        )}
    </h2>

 <p
    className="text-[10px] text-base-content/40 underline decoration-dotted cursor-help"
    title="Your chat backup is not set up. Go to Settings to configure it."
>
    Backup status: Not configured
</p>
                    </div>
                    <div className="flex items-center gap-1">
    <button
        className="btn btn-ghost btn-sm btn-circle"
        title="Active Devices"
    >
        <MonitorSmartphone className="w-4 h-4" />
    </button>

    <button
        onClick={() => setShowNewChat(true)}
        className="btn btn-ghost btn-sm btn-circle"
        title="New chat"
    >
        <PenSquare className="w-4 h-4" />
    </button>
</div>
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

            <div className="flex gap-2 px-3 py-2 border-b border-base-200 overflow-x-auto">
    {["All", "Unread", "Work", "Friends", "Archived"].map(folder => (
        <button
            key={folder}
            onClick={() => setSelectedFolder(folder)}
            className={`btn btn-xs ${
                selectedFolder === folder
                    ? "btn-primary"
                    : "btn-outline"
            }`}
        >
            {folder}
        </button>
    ))}
</div>

<div className="px-3 py-2 border-b border-base-200">
    <div className="stats stats-vertical shadow w-full">
        <div className="stat py-2">
            <div className="stat-title text-xs">
                Active Chats
            </div>
            <div className="stat-value text-lg">
                {activeChats}
            </div>
        </div>

        <div className="stat py-2">
            <div className="stat-title text-xs">
                Unread Messages
            </div>
            <div className="stat-value text-lg">
                {totalUnread}
            </div>
        </div>
    </div>
</div>

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
                        const lm = user.lastMessage
                        const folder =
                        user.folder ||
                        (user.name.charCodeAt(0) % 2 === 0 
                        ? "Work": "Friends")
                        const preview = lm
                            ? (lm.message || (lm.audio ? "🎤 Voice" : lm.image ? "📷 Image" : ""))
                            : ""
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
                                <div
    title={
        isOnline
            ? "Currently Online"
            : user.lastSeen
            ? `Last active: ${formatTime(user.lastSeen)}`
            : "Offline"
    }
>
    <Avatar user={user} isOnline={isOnline} />
</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{user.name}</p>
                                            {folder === "Archived" && (
                                                <span className="badge badge-warning badge-xs">Archived</span>
                                            )}
                                        </div>
                                        {lm?.createdAt && (
                                            <span className="text-[10px] text-base-content/40 shrink-0 ml-2">
                                                {formatTime(lm.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-1 mt-1">
                                        <div className="text-xs text-base-content/50 truncate">
                                            {user.statusMood && getStatusMoodLabel(user.statusMood)}
                                        </div>
                                        <Palette
                                            className="w-3 h-3 text-primary shrink-0"
                                            title="Chat personalization available"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        {folder === "Archived" ? (
                                            <p className="text-xs text-warning truncate">
                                                Archived Conversation
                                            </p>
                                        ) : typingUsers.includes(user._id) ? (
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                                                <p className="text-xs text-success font-bold truncate">
                                                    typing...
                                                </p>
                                            </div>
                                        ) : preview ? (
                                            <p className="text-xs text-base-content/50 truncate">
                                                {preview}
                                            </p>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <span
                                                    className={`w-2 h-2 rounded-full ${
                                                        isOnline ? "bg-success" : "bg-base-300"
                                                    }`}
                                                />
                                                <p className={`text-xs ${isOnline ? "text-success" : "text-base-content/40"}`}>
                                                    {isOnline
                                                        ? "Active now"
                                                        : user.lastSeen
                                                        ? `Last active ${formatTime(user.lastSeen)}`
                                                        : "Offline"}
                                                </p>
                                            </div>
                                        )}

                                        {user.unreadCount > 0 && (
                                            <span className="badge badge-primary badge-xs ml-1 shrink-0">
                                                {user.unreadCount > 99 ? "99+" : user.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    }))
                }
            </div>

            {showNewChat && (
                <NewChatModal
                    onSelectUser={onSelectUser}
                    onClose={() => setShowNewChat(false)}
                />
            )}
        </aside>
    )
}
