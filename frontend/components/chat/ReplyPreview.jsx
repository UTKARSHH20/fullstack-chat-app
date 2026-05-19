// Inline reply preview shown inside a message bubble
export default function ReplyPreview({ replyTo, isMine }) {
    return (
        <div className={`mb-1.5 px-2 py-1.5 rounded-lg text-xs border-l-[3px]
            ${isMine ? "bg-white/10 border-white/50 text-white/80" : "bg-base-300/60 border-primary text-base-content/70"}`}>
            <p className={`font-bold mb-0.5 ${isMine ? "text-white" : "text-primary"}`}>{replyTo.senderName}</p>
            <p className="truncate opacity-80">{replyTo.message || "📎 Attachment"}</p>
        </div>
    )
}
