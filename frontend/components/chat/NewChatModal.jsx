import { useEffect, useState } from "react"
import { ArrowLeft, Search } from "lucide-react"
import useChatStore from "../../src/store/useChatStore"
import useAuthStore from "../../src/store/useAuthStore"
import Avatar from "./Avatar"

// Full-screen modal for searching and starting a new conversation
export default function NewChatModal({ onSelectUser, onClose }) {
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
