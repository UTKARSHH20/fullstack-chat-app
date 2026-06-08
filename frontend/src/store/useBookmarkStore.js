import { create } from "zustand"

const STORAGE_KEY = "chatter_box_bookmarks"

const loadBookmarksFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const bookmarks = raw ? JSON.parse(raw) : []
    return Array.isArray(bookmarks) ? bookmarks : []
  } catch {
    return []
  }
}

const saveBookmarksToStorage = (bookmarks) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
  } catch {
    // ignore write errors
  }
}

const useBookmarkStore = create((set, get) => ({
  bookmarks: loadBookmarksFromStorage(),
  pendingBookmarkTarget: null,

  addBookmark: (bookmark) => {
    set((state) => {
      const next = [
        ...state.bookmarks.filter((item) => item.id !== bookmark.id),
        { ...bookmark, bookmarkedAt: new Date().toISOString() },
      ]
      saveBookmarksToStorage(next)
      return { bookmarks: next }
    })
  },

  removeBookmark: (id) => {
    set((state) => {
      const next = state.bookmarks.filter((item) => item.id !== id)
      saveBookmarksToStorage(next)
      return { bookmarks: next }
    })
  },

  isBookmarked: (id) => {
    return get().bookmarks.some((item) => item.id === id)
  },

  loadBookmarks: () => {
    const bookmarks = loadBookmarksFromStorage()
    set({ bookmarks })
  },

  setPendingBookmarkTarget: (target) => set({ pendingBookmarkTarget: target }),
  clearPendingBookmarkTarget: () => set({ pendingBookmarkTarget: null }),
}))

export default useBookmarkStore
