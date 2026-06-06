import { useEffect, useRef, useState, useCallback } from "react"
import {
    Image, Images, Send, X, MessageSquare,
    ArrowLeft, Smile, Mic, Square,Loader2, 
    Phone, Video, Trash2,Search, FileText,
    NotebookPen, BarChart3
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
        hasMore, isLoadingMore, loadMoreMessages, searchTextMessages
    } = useChatStore()
    const { authUser, onlineUsers } = useAuthStore()
    const { startOutgoingCall } = useCallStore()

    const [text, setText] = useState("")
    const [imagePreview, setImagePreview] = useState(null)
    const [imageBase64, setImageBase64] = useState(null)
    const [sending, setSending] = useState(false)
    const [replyTo, setReplyTo] = useState(null)
    const [showEmoji, setShowEmoji] = useState(false)
    const [showSpamWarning, setShowSpamWarning] = useState(false)
    const [showInsights, setShowInsights] = useState(false)
    const [showPoll, setShowPoll] = useState(false)
    const [showNotes, setShowNotes] = useState(false)
    const [sharedNotes, setSharedNotes] = useState("")
    const [showGallery, setShowGallery] = useState(false)

    // Search state
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [recentSearches, setRecentSearches] = useState([])

    // Debounced search trigger
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
    const results = await searchTextMessages(
        selectedUser._id,
        searchQuery
    );

    setSearchResults(results || []);

    const updatedSearches = [
        searchQuery,
        ...recentSearches.filter(
            item => item !== searchQuery
        )
    ].slice(0, 5);

    setRecentSearches(updatedSearches);

    localStorage.setItem(
        "recentSearches",
        JSON.stringify(updatedSearches)
    );
}, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedUser?._id]);
    useEffect(() => {
    const savedSearches = JSON.parse(
        localStorage.getItem("recentSearches") || "[]"
    );

    setRecentSearches(savedSearches);
}, []);

    const scrollToMessage = (msgId) => {
        const msgElement = document.getElementById(`msg-${msgId}`);
        if (msgElement) {
            msgElement.scrollIntoView({ behavior: "smooth", block: "center" });
            const bubble = msgElement.querySelector(".chat-bubble");
            if (bubble) {
                bubble.classList.add("flash-highlight");
                setTimeout(() => {
                    bubble.classList.remove("flash-highlight");
                }, 1500);
            }
        } else {
            toast.error("Message is not loaded in current view. Scroll up to load older messages.");
        }
    }

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
        const value = e.target.value
setText(value)

const suspiciousWords = ["spam", "scam", "fake", "hack"]

setShowSpamWarning(
    suspiciousWords.some(word =>
        value.toLowerCase().includes(word)
    )
)
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
    const totalMessages = messages.length

const myMessages = messages.filter(
    msg => msg.senderId === authUser?._id
).length

const receivedMessages =
    totalMessages - myMessages

const mediaMessages = messages.filter(
    msg => msg.image || msg.audio
).length
    const sharedMedia = messages.filter(msg => msg.image)

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
                        onClick={() => { setSearchOpen(!searchOpen); setSearchResults([]); setSearchQuery(""); }}
                        className={`btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary transition-colors ${searchOpen ? "text-primary bg-base-200" : ""}`}
                        title="Search Messages"
                    >
                        <Search className="w-5 h-5" />
                    </button>
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

                    <button
    onClick={() => setShowGallery(!showGallery)}
    className={`btn btn-ghost btn-circle btn-sm ${
        showGallery
            ? "text-primary"
            : "text-base-content/70"
    }`}
    title="Media Gallery"
>
    <Images className="w-5 h-5" />
</button>

                    <button
    onClick={() => setShowPoll(!showPoll)}
    className={`btn btn-ghost btn-circle btn-sm ${
        showPoll ? "text-primary" : "text-base-content/70"
    }`}
    title="Polls"
>
    <BarChart3 className="w-5 h-5" />
</button>
                    <button
    className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-primary transition-colors"
    title="Generate Conversation Summary"
>
    <FileText className="w-5 h-5" />
    <button
    onClick={() => setShowNotes(!showNotes)}
    className={`btn btn-ghost btn-circle btn-sm ${
        showNotes ? "text-primary" : "text-base-content/70"
    }`}
    title="Shared Notes"
>
    <NotebookPen className="w-5 h-5" />
</button>
</button>
                </div>
            </div>

            {searchOpen && (
                <div className="flex flex-col border-b border-base-200 bg-base-100 shrink-0 sticky top-14 z-10">
                    <div className="flex items-center gap-2 px-4 py-2 bg-base-200 border-b border-base-300 shadow-inner">
                        <input
                            type="text"
                            placeholder="Search messages in this chat..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input input-sm input-bordered flex-1 focus:outline-none"
                            autoFocus
                        />
                        <button onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchQuery(""); }} className="btn btn-sm btn-ghost btn-circle">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {searchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto py-1.5 px-3 border-t border-base-300 space-y-1">
                            <p className="text-xs text-base-content/40 mb-1">{searchResults.length} results found:</p>
                            {searchResults.map((res) => (
                                <button
                                    key={res._id}
                                    onClick={() => scrollToMessage(res._id)}
                                    className="w-full text-left text-xs p-1.5 rounded hover:bg-base-200 block truncate"
                                >
                                    <span className="font-semibold text-primary">{res.senderId === authUser._id ? "You" : selectedUser.name}: </span>
                                    <span>{res.message}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {searchQuery && searchResults.length === 0 && (
                        <div className="px-4 py-2 text-xs text-base-content/40">
                            No results found
                        </div>
                    )}
                </div>
            )}

            {showGallery && (
    <div className="border-b border-base-200 bg-base-100 p-3">
        <h3 className="font-semibold text-sm mb-3">
            Shared Media Gallery
        </h3>

        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {sharedMedia.map(media => (
                <img
                    key={media._id}
                    src={media.image}
                    alt="shared media"
                    className="rounded-lg object-cover h-24 w-full cursor-pointer hover:scale-105 transition"
                    onClick={() =>
                        window.open(media.image, "_blank")
                    }
                />
            ))}
        </div>

        {sharedMedia.length === 0 && (
            <p className="text-xs text-base-content/50">
                No shared media found
            </p>
        )}
    </div>
)}

            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1 overscroll-contain">
                {showNotes && (
    <div className="border-b border-base-200 p-3 bg-base-200">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-sm">
                Collaborative Notes
            </h3>

            <span className="badge badge-primary badge-sm">
                Shared
            </span>
        </div>

        <textarea
            value={sharedNotes}
            onChange={(e) =>
                setSharedNotes(e.target.value)
            }
            placeholder="Write shared notes here..."
            className="textarea textarea-bordered w-full h-32"
        />

        <div className="text-xs text-base-content/50 mt-2">
            Changes are visible to all participants
        </div>
    </div>
)}
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

            {showPoll && (
    <div className="mx-4 mb-3 p-4 rounded-xl border border-base-300 bg-base-200">
        <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">
                Active Poll
            </h3>
        </div>

        <p className="text-sm mb-3">
            Which feature should be added next?
        </p>

        <div className="space-y-2">
            <button className="btn btn-outline btn-sm w-full justify-start">
                🌙 Dark Mode (12 votes)
            </button>

            <button className="btn btn-outline btn-sm w-full justify-start">
                🎤 Voice Notes (8 votes)
            </button>

            <button className="btn btn-outline btn-sm w-full justify-start">
                📊 Poll System (15 votes)
            </button>
        </div>

        <div className="mt-3 text-xs opacity-60">
            Poll expires in 24 hours
        </div>
    </div>
)}

            <ContextMenu menu={contextMenu} onClose={closeMenu} onReply={handleReply} onCopy={handleCopy} onDelete={handleDelete} onReact={handleReact} />

            {replyTo && (
                <ReplyBar replyTo={replyTo} authUser={authUser} selectedUser={selectedUser} onCancel={() => setReplyTo(null)} />
            )}

            <div className="px-4 py-2 flex flex-wrap gap-2">
    {["👍 Sounds good", "Thanks!", "I'll check", "Okay"].map((reply) => (
        <button
            key={reply}
            onClick={() => setText(reply)}
            className="btn btn-xs btn-outline"
        >
            {reply}
        </button>
    ))}
</div>

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

            {showSpamWarning && (
    <div className="mx-3 mb-2 alert alert-warning py-2 text-sm">
        ⚠️ This message may contain potentially harmful or spam-related content.
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
                            <button
    onClick={() =>
        toast.success("Message scheduling coming soon!")
    }
    className="btn btn-ghost btn-sm btn-square shrink-0"
    title="Schedule Message"
>
    <Clock className="w-4 h-4 text-base-content/50" />
</button>
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
