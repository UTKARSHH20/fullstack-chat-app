import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import toast from "react-hot-toast"
import useAuthStore from "../src/store/useAuthStore"
import useChatStore from "../src/store/useChatStore"
import useBookmarkStore from "../src/store/useBookmarkStore"
import SavedMessagesPanel from "../components/chat/SavedMessagesPanel"

export default function SavedMessagesPage() {
  const navigate = useNavigate()
  const authUser = useAuthStore((state) => state.authUser)
  const users = useChatStore((state) => state.users)
  const getUsers = useChatStore((state) => state.getUsers)
  const setSelectedUser = useChatStore((state) => state.setSelectedUser)

  const bookmarks = useBookmarkStore((state) => state.bookmarks)
  const removeBookmark = useBookmarkStore((state) => state.removeBookmark)
  const setPendingBookmarkTarget = useBookmarkStore((state) => state.setPendingBookmarkTarget)

  useEffect(() => {
    if (!authUser) {
      navigate("/login")
    }
  }, [authUser, navigate])

  const openBookmark = async (bookmark) => {
    const targetChatId = bookmark.chatId
    if (!targetChatId) {
      toast.error("Unable to open original conversation.")
      return
    }

    let partner = users.find((user) => user._id === targetChatId)
    if (!partner) {
      await getUsers()
      partner = useChatStore.getState().users.find((user) => user._id === targetChatId)
    }

    if (!partner) {
      toast.error("Conversation partner not found.")
      return
    }

    setSelectedUser(partner)
    setPendingBookmarkTarget({ chatId: targetChatId, messageId: bookmark.id })
    navigate("/")
  }

  return (
    <div className="min-h-screen bg-base-200 text-base-content">
      <SavedMessagesPanel bookmarks={bookmarks} onOpenBookmark={openBookmark} onRemoveBookmark={removeBookmark} />
    </div>
  )
}
