import { Check, CheckCheck } from "lucide-react"
import Avatar from "./Avatar"
import ReplyPreview from "./ReplyPreview"

const formatTime = (d) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

// Single message bubble with avatar, media, reactions, and read receipts
export default function MessageBubble({ msg, isMine, showTime, selectedUser, isOnline, authUser, onContextMenu, onTouchStart, onTouchEnd, onReact }) {
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
                    className={`chat-bubble shadow-sm max-w-[75%] break-words cursor-pointer select-none ${isMine ? "chat-bubble-primary" : ""}`}
                    onContextMenu={e => onContextMenu(e, msg, isMine)}
                    onTouchStart={e => onTouchStart(e, msg, isMine)}
                    onTouchEnd={onTouchEnd}
                    onTouchMove={onTouchEnd}
                >
                    {msg.replyTo?.message && <ReplyPreview replyTo={msg.replyTo} isMine={isMine} />}
                    {msg.image && (
                        <img
                            src={msg.image} alt="attachment"
                            className="max-w-full rounded-lg mb-1 cursor-pointer"
                            onClick={() => window.open(msg.image, "_blank")}
                        />
                    )}
                    {msg.audio && (
                        <audio src={msg.audio} controls className="max-w-full h-10 mb-1" />
                    )}
                    {/* GSSoC Issue #41 Fix */}
{msg.message ? <p className="text-sm">{String(msg.message)}</p> : null}
                    
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

                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMine ? "text-primary-content/70" : "text-base-content/50"}`}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMine && (
                            msg.status === "seen" ? (
                                <CheckCheck className="w-3.5 h-3.5 text-info" />
                            ) : msg.status === "delivered" ? (
                                <CheckCheck className="w-3.5 h-3.5" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )
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
