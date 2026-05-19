import { create } from "zustand"
import { persist } from "zustand/middleware"

const defaults = {
    notifications: { messages: true, mentions: true, sounds: true, desktop: false },
    chat: { enterSend: true, receipts: true, typing: true, timestamps: true, compact: false },
    privacy: { online: true, lastSeen: true, photo: true },
}

const useSettingsStore = create(
    persist(
        (set) => ({
            ...structuredClone(defaults),

            updateNotification: (key, value) =>
                set((s) => ({ notifications: { ...s.notifications, [key]: value } })),

            updateChat: (key, value) =>
                set((s) => ({ chat: { ...s.chat, [key]: value } })),

            updatePrivacy: (key, value) =>
                set((s) => ({ privacy: { ...s.privacy, [key]: value } })),

            resetAll: () => set(structuredClone(defaults)),
        }),
        { name: "chatter-box-settings" }
    )
)

export default useSettingsStore
