export default function BookmarkBadge({ type }) {
  const labels = {
    text: "📄 Text",
    image: "🖼 Image",
    audio: "🎤 Voice Note",
  }
  return (
    <span className="badge badge-outline badge-sm text-xs px-2 py-1">
      {labels[type] || "📄 Message"}
    </span>
  )
}
