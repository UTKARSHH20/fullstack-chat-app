import { useEffect, useRef, useState, useCallback } from "react"
import {
    Image, Send, X, MessageSquare,
    ArrowLeft, Smile, Mic, Square,
    Loader2, Phone, Video, Trash2
} from "lucide-react"
import toast from "react-hot-toast"
import useAuthStore from "../../src/store/useAuthStore"
import useChatStore from "../../src/store/useChatStore"
import useCallStore from "../../src/store/useCallStore"
import useRecording from "../../hooks/useRecording"
import useTypingIndicator from "../../hooks/useTypingIndicator"
import useContextMenu from "../../hooks/useContextMenu"
import Avatar from "./Avatar"
import ContextMenu from "./ContextMenu"
import ReplyBar from "./ReplyBar"
import EmojiPicker from "./EmojiPicker"
import MessageBubble from "./MessageBubble"

const formatRecordingTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

const formatLastSeen = (dateString) => {
    if (!dateString) return "Offline";
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) return `Last seen today at ${time}`;
    const nowCopy = new Date();
    const isYesterday = new Date(nowCopy.setDate(nowCopy.getDate() - 1)).toDateString() === date.toDateString();
    if (isYesterday) return `Last seen yesterday at ${time}`;
    return `Last seen ${date.toLocaleDateString()} at ${time}`;
};

// Main chat window with message list, input bar, and media features
export default function ChatWindow({ selectedUser, onBack, isMobileHidden }) {
    const {
        messages, getMessages, sendMessage, deleteMessage, addReaction,
        isMessagesLoading, subscribeToMessages, unsubscribeFromMessages,
        typingUsers, markMessagesAsSeen,
        hasMore, isLoadingMore, loadMoreMessages
    } = useChatStore()
    const { authUser, onlineUsers } = useAuthStore()
    const { startOutgoingCall } = useCallStore()

    const [text, setText] = useState("")
    const [imagePreview, setImagePreview] = useState(null)
    const [imageBase64, setImageBase64] = useState(null)
    const [sending, setSending] = useState(false)
    const [replyTo, setReplyTo] = useState(null)
    const [showEmoji, setShowEmoji] = useState(false)

    // Custom hooks
    const { isRecording, recordingTime, audioBase64, startRecording, stopRecording, cancelRecording, clearAudio } = useRecording()
    const { emitTyping } = useTypingIndicator(selectedUser?._id)
    const { menu: contextMenu, openMenu, openMenuTouch, cancelTouch, closeMenu } = useContextMenu()

    const bottomRef = useRef(null)
    const fileRef = useRef(null)
    const textareaRef = useRef(null)

    useEffect(() => {
        if (selectedUser?._id) {
            getMessages(selectedUser._id)
            subscribeToMessages()
        }
        return () => unsubscribeFromMessages()
    }, [selectedUser, getMessages, subscribeToMessages, unsubscribeFromMessages])

    useEffect(() => {
        if (selectedUser?._id && messages.length > 0) {
            const hasUnseen = messages.some(m => m.senderId === selectedUser._id && m.status !== "seen");
            if (hasUnseen) markMessagesAsSeen(selectedUser._id);
        }
    }, [selectedUser?._id, messages.length]);

    // Scroll to bottom on new messages — but NOT when older messages are prepended by loadMore
    const prevMsgCountRef = useRef(0)
    useEffect(() => {
        const added = messages.length - prevMsgCountRef.current
        // isLoadingMore = we just prepended older messages; skip auto-scroll
        if (added > 0 && !isLoadingMore) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        }
        prevMsgCountRef.current = messages.length
    }, [messages.length, isLoadingMore])

    // Scroll handler for loading older messages
    const chatContainerRef = useRef(null)
    const handleScroll = useCallback(() => {
        const el = chatContainerRef.current
        if (!el || !hasMore || isLoadingMore) return
        if (el.scrollTop < 80) {
            const prevHeight = el.scrollHeight
            loadMoreMessages(selectedUser._id).then(() => {
                // Restore scroll position after prepending
                requestAnimationFrame(() => {
                    el.scrollTop = el.scrollHeight - prevHeight
                })
            })
        }
    }, [hasMore, isLoadingMore, selectedUser, loadMoreMessages])

    const handleReply = () => { setReplyTo(contextMenu.message); closeMenu() }
    const handleCopy = () => {
        if (contextMenu.message?.message) {
            navigator.clipboard.writeText(contextMenu.message.message)
            toast.success("Copied!")
        }
        closeMenu()
    }
    const handleDelete = async () => { await deleteMessage(contextMenu.message._id); closeMenu() }
    const handleReact = (messageId, emoji) => { addReaction(messageId, emoji) }

    const handleImage = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onloadend = () => { setImagePreview(URL.createObjectURL(file)); setImageBase64(reader.result) }
        reader.readAsDataURL(file)
    }

    const handleSend = async () => {
        if (!text.trim() && !imageBase64 && !audioBase64) return
        
        const payload = {
            message: text.trim(),
            image: imageBase64 || "",
            audio: audioBase64 || "",
            replyTo: replyTo ? {
                _id: replyTo._id,
                message: replyTo.message,
                senderName: replyTo.senderId === authUser._id ? authUser.name : selectedUser.name,
            } : null,
        }

        setSending(true)
        setShowEmoji(false)
        setText("")
        setImagePreview(null)
        setImageBase64(null)
        clearAudio()
        setReplyTo(null)

        await sendMessage(payload)
        
        setSending(false)
    }

    const handleTyping = (e) => {
        setText(e.target.value)
        // Auto-resize textarea up to ~4 lines
        const ta = textareaRef.current
        if (ta) {
            ta.style.height = "auto"
            ta.style.height = Math.min(ta.scrollHeight, 120) + "px"
        }
        emitTyping()
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const isOnline = selectedUser && onlineUsers.includes(selectedUser._id)

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
        <div className={`${isMobileHidden ? "hidden md:flex" : "flex"} flex-1 flex-col bg-base-100 min-w-0 h-full overflow-hidden`}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-base-200 shadow-sm shrink-0 sticky top-0 z-10 bg-base-100">
                <button
                    onClick={onBack}
                    className="md:hidden btn btn-ghost btn-sm btn-circle shrink-0"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar user={selectedUser} isOnline={isOnline} />
                <div>
                    <p className="font-semibold text-sm">{selectedUser.name}</p>
                    <p className={`text-xs ${isOnline ? "text-success font-medium" : "text-base-content/70"}`}>
                        {typingUsers.includes(selectedUser._id) ? (
                            <span className="text-success font-bold animate-pulse inline-block">typing...</span>
                        ) : isOnline ? (
                            "Online"
                        ) : (
                            formatLastSeen(selectedUser.lastSeen)
                        )}
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <button 
                        onClick={() => startOutgoingCall(selectedUser._id, selectedUser.name, "audio")}
                        className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary transition-colors"
                        title="Voice Call"
                    >
                        <Phone className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => startOutgoingCall(selectedUser._id, selectedUser.name, "video")}
                        className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary transition-colors"
                        title="Video Call"
                    >
                        <Video className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1 overscroll-contain">
                {isMessagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="loading loading-spinner loading-md text-primary" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-base-content/30 text-sm">No messages yet — say hi! 👋</p>
                    </div>
                ) : (
                    <>
                    {isLoadingMore && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                    )}
                    {messages.map((msg, i) => {
                        const isMine = msg.senderId === authUser?._id
                        const prev = messages[i - 1]
                        const showTime = !prev || Math.abs(
                            new Date(msg.createdAt) - new Date(prev.createdAt)
                        ) > 3 * 60 * 1000

                        return (
                            <MessageBubble
                                key={msg._id}
                                msg={msg}
                                isMine={isMine}
                                showTime={showTime}
                                selectedUser={selectedUser}
                                isOnline={isOnline}
                                authUser={authUser}
                                onContextMenu={openMenu}
                                onTouchStart={openMenuTouch}
                                onTouchEnd={cancelTouch}
                                onReact={handleReact}
                            />
                        )
                    })}
                    </>
                )}
                <div ref={bottomRef} />
            </div>

            <ContextMenu menu={contextMenu} onClose={closeMenu} onReply={handleReply} onCopy={handleCopy} onDelete={handleDelete} onReact={handleReact} />

            {replyTo && (
                <ReplyBar replyTo={replyTo} authUser={authUser} selectedUser={selectedUser} onCancel={() => setReplyTo(null)} />
            )}

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

            <div className="px-3 py-3 border-t border-base-200 flex items-end gap-2 relative shrink-0 safe-bottom">
                {showEmoji && (
                    <EmojiPicker
                        onSelect={(emoji) => {
                            const el = textareaRef.current
                            if (el) {
                                const start = el.selectionStart
                                const end   = el.selectionEnd
                                setText(prev => prev.slice(0, start) + emoji + prev.slice(end))
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

                {isRecording ? (
                    <div className="flex-1 flex items-center justify-between bg-error/10 text-error rounded-xl px-4 py-2 h-10">
                        <div className="flex items-center gap-2 animate-pulse">
                            <Mic className="w-4 h-4" />
                            <span className="text-sm font-medium">{formatRecordingTime(recordingTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={cancelRecording} className="btn btn-ghost btn-xs btn-circle hover:bg-error/20">
                                <X className="w-4 h-4" />
                            </button>
                            <button onClick={stopRecording} className="btn btn-error btn-xs btn-circle text-white">
                                <Square className="w-3 h-3 fill-current" />
                            </button>
                        </div>
                    </div>
                ) : audioBase64 ? (
                    <div className="flex-1 flex items-center gap-2 bg-base-200 rounded-xl px-2 py-1 h-10">
                        <button onClick={clearAudio} className="btn btn-ghost btn-sm btn-circle text-error shrink-0">
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <audio src={audioBase64} controls className="h-8 flex-1 min-w-0" />
                    </div>
                ) : (
                    <>
                        <button onClick={() => fileRef.current?.click()}
                            className="btn btn-ghost btn-sm btn-square shrink-0" title="Attach image">
                            <Image className="w-4 h-4 text-base-content/50" />
                        </button>
                        <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImage} />
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
                            className="textarea textarea-bordered textarea-sm flex-1 resize-none leading-relaxed overflow-y-auto"
                            style={{ maxHeight: "120px" }}
                            value={text}
                            onChange={handleTyping}
                            onKeyDown={handleKeyDown}
                        />
                    </>
                )}

                {!isRecording && (
                    text.trim() || imageBase64 || audioBase64 || sending ? (
                        <button onClick={handleSend} disabled={sending}
                            className="btn btn-primary btn-sm btn-square shrink-0">
                            {sending ? <span className="loading loading-spinner loading-xs" /> : <Send className="w-4 h-4" />}
                        </button>
                    ) : (
                        <button onClick={startRecording} className="btn btn-primary btn-sm btn-square shrink-0 rounded-full">
                            <Mic className="w-4 h-4" />
                        </button>
                    )
                )}
            </div>
        </div>
    )
}
