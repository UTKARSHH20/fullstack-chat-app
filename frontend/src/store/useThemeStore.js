import { create } from "zustand"

const useThemeStore = create((set) => ({
    theme: localStorage.getItem("chatter-box-theme") || "dark",
    setTheme: (theme) => {
        localStorage.setItem("chatter-box-theme", theme)
        document.documentElement.setAttribute("data-theme", theme)
        set({ theme })
    },
}))

// Apply saved theme on load
document.documentElement.setAttribute(
    "data-theme",
    localStorage.getItem("chatter-box-theme") || "dark"
)

export default useThemeStore
