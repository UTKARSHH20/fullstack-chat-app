import { Trash2, ArrowRight } from "lucide-react"
import BookmarkBadge from "./BookmarkBadge"

export default function BookmarkItem({ bookmark, onOpen, onRemove }) {
  const preview = bookmark.content || bookmark.image ? "Image message" : bookmark.audio ? "Voice note" : "No preview available"
  const dateLabel = new Date(bookmark.createdAt).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <article className="card card-compact bg-base-100 border border-base-200 shadow-sm">
      <div className="card-body p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <h3 className="font-semibold text-sm truncate">{bookmark.content || (bookmark.image ? "Image message" : bookmark.audio ? "Voice note" : "Untitled message")}</h3>
              <BookmarkBadge type={bookmark.audio ? "audio" : bookmark.image ? "image" : "text"} />
            </div>
            <p className="text-xs text-base-content/50 truncate">{bookmark.senderName}</p>
            <p className="text-[11px] text-base-content/40 mt-1">{dateLabel}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={onOpen}
              className="btn btn-outline btn-sm gap-2"
              aria-label={`Open original message from ${bookmark.senderName}`}
            >
              <ArrowRight className="w-4 h-4" />
              Open Original
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="btn btn-error btn-sm gap-2"
              aria-label={`Remove bookmark for message from ${bookmark.senderName}`}
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
