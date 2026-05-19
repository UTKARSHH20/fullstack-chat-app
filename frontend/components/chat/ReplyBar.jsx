import { X } from "lucide-react"

// Bar shown above the message input when replying to a message
export default function ReplyBar({ replyTo, authUser, selectedUser, onCancel }) {
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
