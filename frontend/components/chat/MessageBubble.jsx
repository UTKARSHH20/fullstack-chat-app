import { Check, CheckCheck, Pin, Languages} from "lucide-react"
import Avatar from "./Avatar"
import { useState, useEffect, useRef } from "react"
import ReplyPreview from "./ReplyPreview"
import useChatStore from "../../src/store/useChatStore"

const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

// Single message bubble with avatar, media, reactions, and read receipts
export default function MessageBubble({ msg, isMine, showTime, selectedUser, isOnline, authUser, onContextMenu, onTouchStart, onTouchEnd, onReact }) {

    const [showTranslation, setShowTranslation] = useState(false)
    const [isSelected, setIsSelected] = useState(false)

    const activeAudioId = useChatStore((state) => state.activeAudioId)
    const setActiveAudioId = useChatStore((state) => state.setActiveAudioId)
    const audioRef = useRef(null)

    useEffect(() => {
        if (activeAudioId && activeAudioId !== msg._id && audioRef.current) {
            audioRef.current.pause()
        }
    }, [activeAudioId, msg._id])

    const getTranslatedText = (text) => {
    const translations = {
        hello: "hola",
        thanks: "gracias",
        yes: "sí",
        no: "no",
        good: "bueno",
        welcome: "bienvenido",
        friend: "amigo"
    }

    return text
        .split(" ")
        .map(word => translations[word.toLowerCase()] || word)
        .join(" ")
}

    return (
        <div key={msg._id} id={`msg-${msg._id}`}>
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
    onDoubleClick={() => setIsSelected(!isSelected)}
    className={`chat-bubble shadow-sm max-w-[75%] break-words cursor-pointer select-none ${
        isMine ? "chat-bubble-primary" : ""
    } ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onContextMenu={e => onContextMenu(e, msg, isMine)}
                    onTouchStart={e => onTouchStart(e, msg, isMine)}
                    onTouchEnd={onTouchEnd}
                    onTouchMove={onTouchEnd}
                >
                    {msg.isPinned && (

                        
                        
    <div className="flex items-center gap-1 text-warning text-xs mb-1">
        <Pin className="w-3 h-3" />
        <span>Pinned Message</span>
    </div>
    
)}
                    {msg.replyTo?.message && (
    <>
        <div className="text-[10px] text-info font-semibold mb-1">
            🧵 Reply Thread
        </div>

        <ReplyPreview
            replyTo={msg.replyTo}
            isMine={isMine}
        />

        <div className="text-[10px] text-primary cursor-pointer hover:underline mb-1">
    Jump to parent message
</div>

        <div className="text-[10px] text-primary cursor-pointer hover:underline mb-1">
            Jump to parent message
        </div>
    </>
)}
                    {msg.starred && (
                        <div className="flex items-center gap-1 text-[10px] text-warning font-semibold mb-1">
                            ⭐ Starred
                            </div>
                        )}
                    {msg.image && (
    <img
        src={msg.image}
        alt="attachment"
        className="max-w-full rounded-lg mb-1 cursor-pointer hover:opacity-90 transition"
        onClick={() => window.open(msg.image, "_blank")}
    />
)}
                    
{msg.audio && (
    <>
        <div className="flex items-center gap-2 text-[10px] text-info font-semibold mb-1">
            <span>🎤 Voice Note</span>
            <span className="badge badge-xs">1x</span>
        </div>

        <audio
            ref={audioRef}
            src={msg.audio}
            controls
            className="max-w-full h-10 mb-1"
            onPlay={() => setActiveAudioId(msg._id)}
            onPause={() => {
                if (activeAudioId === msg._id) {
                    setActiveAudioId(null);
                }
            }}
            onEnded={() => {
                if (activeAudioId === msg._id) {
                    setActiveAudioId(null);
                }
            }}
        />
    </>
)}
                    {/* GSSoC Issue #41 Fix */}
{msg.message && (
    <div>
        <p className="text-sm">
            {showTranslation
                ? getTranslatedText(String(msg.message))
                : String(msg.message)}
        </p>

        <button 
            onClick={(e) => { e.stopPropagation(); setShowTranslation(!showTranslation); }}
            className={`text-xs px-1.5 py-0.5 rounded-full shadow-sm hover:scale-110 hover:shadow-md transition-all ${isMine ? "bg-primary-focus text-primary-content border border-white/20" : "bg-base-100 text-base-content border border-base-300"}`}
        >
            <Languages className="w-3 h-3 inline mr-1" />
            {showTranslation ? "Show Original" : "Translate"}
        </button>

        {msg.edited && (
            <span className="text-[10px] italic opacity-70">
                (edited)
            </span>
        )}
    </div>
)}

{msg.reactions && msg.reactions.length >= 3 && (
    <div className="text-[10px] text-warning font-semibold mb-1">
        🔥 Highly Reacted Message ({msg.reactions.length} reactions)
    </div>
)}
                    
                    {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            {Object.entries(msg.reactions.reduce((acc, curr) => {
                                acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                return acc;
                            }, {})).map(([emoji, count]) => (
                                <button 
                                    key={emoji} 
                                    onClick={(e) => { e.stopPropagation(); onReact(msg._id, emoji); }}
                                    className={`text-xs px-1.5 py-0.5 rounded-full shadow-sm hover:scale-110 transition-transform ${isMine ? "bg-primary-focus text-primary-content border border-white/20" : "bg-base-100 text-base-content border border-base-300"}`}
                                >
                                    {emoji} {count > 1 && <span className="opacity-70 ml-0.5">{count}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                    {msg.expiresAt && (
    <div className="text-[10px] text-warning font-medium mb-1">
        ⏳ Expires Soon
    </div>
)}

                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMine ? "text-primary-content/70" : "text-base-content/50"}`}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMine && (
    <span
        title={
            msg.status === "seen"
                ? "Read"
                : msg.status === "delivered"
                ? "Delivered"
                : "Sent"
        }
    >
        {msg.status === "seen" ? (
            <CheckCheck className="w-3.5 h-3.5 text-info" />
        ) : msg.status === "delivered" ? (
            <CheckCheck className="w-3.5 h-3.5" />
        ) : (
            <Check className="w-3.5 h-3.5" />
        )}
    </span>
)}
                    </div>
                </div>
                {isMine && (
                    <div className="chat-image">
                        <Avatar user={authUser} size="sm" />
                    </div>
                )}
            </div>
        </div>
    )
}
