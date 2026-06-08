import { Star } from "lucide-react"

export default function BookmarkButton({ isBookmarked, onClick, className, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-ghost btn-sm gap-2 ${className || ""}`}
      aria-pressed={isBookmarked}
      aria-label={label || (isBookmarked ? "Remove bookmark" : "Bookmark message")}
    >
      <Star className="w-4 h-4" />
      <span className="hidden sm:inline">{label || (isBookmarked ? "Remove Bookmark" : "Bookmark Message")}</span>
    </button>
  )
}
