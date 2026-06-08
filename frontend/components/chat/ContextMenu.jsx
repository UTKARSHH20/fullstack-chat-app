import { useEffect, useRef } from "react"
import { Reply, Copy, Trash2, Star } from "lucide-react"
import toast from "react-hot-toast"
import { EMOJIS } from "./emojiData"

// Right-click / long-press context menu for messages
export default function ContextMenu({ menu, onClose, onReply, onCopy, onDelete, onReact, onBookmark, isBookmarked }) {
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
        { icon: Star,    label: isBookmarked ? "Remove Bookmark" : "Bookmark Message", fn: onBookmark },
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
                    <button key={e} onClick={() => { onReact(menu.message._id, e); onClose() }}
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
