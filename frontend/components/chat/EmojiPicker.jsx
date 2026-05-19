import { useEffect, useRef, useState } from "react"
import { EMOJI_CATEGORIES } from "./emojiData"

// Emoji picker panel with category tabs
export default function EmojiPicker({ onSelect, onClose }) {
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
            className="absolute bottom-full mb-2 left-0 z-50 bg-base-200 border border-base-300 rounded-2xl shadow-2xl w-72 max-w-[calc(100vw-1rem)] flex flex-col overflow-hidden"
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
