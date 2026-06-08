import BookmarkItem from "./BookmarkItem"

export default function SavedMessagesPanel({ bookmarks, onOpenBookmark, onRemoveBookmark }) {
  return (
    <section className="h-full flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <h1 className="text-2xl font-bold">Saved Messages</h1>
            <p className="text-sm text-base-content/60">Bookmark important messages to keep them handy.</p>
          </div>
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 rounded-3xl border border-dashed border-base-300 bg-base-200 p-10">
          <p className="text-4xl">⭐</p>
          <h2 className="text-xl font-semibold">No bookmarked messages yet.</h2>
          <p className="max-w-md text-base-content/60">Bookmark important messages to access them later from this panel.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              onOpen={() => onOpenBookmark(bookmark)}
              onRemove={() => onRemoveBookmark(bookmark.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
