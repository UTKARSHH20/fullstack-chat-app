import { Link, useNavigate } from "react-router-dom"
import { MessageSquare, Settings, User, LogOut, Sun, Moon } from "lucide-react"
import useAuthStore from "../src/store/useAuthStore"
import useThemeStore from "../src/store/useThemeStore"

const Navbar = () => {
    const { authUser, logout } = useAuthStore()
    const { theme, setTheme } = useThemeStore()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate("/login")
    }

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    return (
        <div className="navbar bg-base-100 border-b border-base-200 px-4 sticky top-0 z-50 backdrop-blur-sm bg-base-100/90 shadow-sm">
            <div className="flex-1">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">chatter-box  </span>
                </Link>
            </div>

            <div className="flex-none flex items-center gap-1">
                {/* Day / Night toggle */}
                <button
                    id="theme-toggle"
                    onClick={toggleTheme}
                    className="btn btn-ghost btn-sm btn-circle"
                    aria-label="Toggle theme"
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {theme === "dark"
                        ? <Sun className="w-4 h-4" />
                        : <Moon className="w-4 h-4" />
                    }
                </button>

                {authUser && (
                    <>
                        <Link to="/settings" id="nav-settings" className="btn btn-ghost btn-sm gap-2">
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </Link>
                        <Link to="/profile" id="nav-profile" className="btn btn-ghost btn-sm gap-2">
                            <User className="w-4 h-4" />
                            <span className="hidden sm:inline">Profile</span>
                        </Link>
                        <button id="nav-logout" onClick={handleLogout} className="btn btn-ghost btn-sm gap-2 text-error hover:bg-error/10">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default Navbar