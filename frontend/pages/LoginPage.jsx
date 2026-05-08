import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import useAuthStore from "../src/store/useAuthStore"

export default function LoginPage() {
    const navigate = useNavigate()
    const { login, isLoading } = useAuthStore()
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({ email: "", password: "" })

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await login(formData)
            navigate("/")
        } catch {
            // toast already shown in store
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left – Form */}
            <div className="flex flex-col justify-center items-center p-8 sm:p-12 bg-base-100">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center gap-3 group">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg group-hover:bg-primary/20 transition-colors">
                                <MessageSquare className="w-7 h-7 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold mt-2 tracking-tight">Welcome back</h1>
                            <p className="text-base-content/60 text-sm">Sign in to your chatter-box account</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="form-control">
                            <label className="label" htmlFor="login-email">
                                <span className="label-text font-medium">Email</span>
                            </label>
                            <label className="input input-bordered flex items-center gap-2 w-full">
                                <Mail className="h-4 w-4 text-base-content/40 shrink-0" />
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className="grow bg-transparent outline-none"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </label>
                        </div>

                        {/* Password */}
                        <div className="form-control">
                            <label className="label" htmlFor="login-password">
                                <span className="label-text font-medium">Password</span>
                            </label>
                            <label className="input input-bordered flex items-center gap-2 w-full">
                                <Lock className="h-4 w-4 text-base-content/40 shrink-0" />
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="grow bg-transparent outline-none"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    id="toggle-password-visibility"
                                    className="shrink-0"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword
                                        ? <EyeOff className="h-4 w-4 text-base-content/40 hover:text-base-content transition-colors" />
                                        : <Eye className="h-4 w-4 text-base-content/40 hover:text-base-content transition-colors" />
                                    }
                                </button>
                            </label>
                        </div>

                        <button
                            id="login-submit"
                            type="submit"
                            className="btn btn-primary w-full mt-2"
                            disabled={isLoading}
                        >
                            {isLoading
                                ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing in...</>
                                : "Sign In"
                            }
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-base-content/60">
                            Don&apos;t have an account?{" "}
                            <Link to="/signup" className="link link-primary font-medium">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right – Illustration panel */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-primary/5 p-12 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-md text-center">
                    <div className="chat chat-start mb-4">
                        <div className="chat-bubble chat-bubble-primary shadow-lg">Hey! How are you? 👋</div>
                    </div>
                    <div className="chat chat-end mb-4">
                        <div className="chat-bubble shadow-lg">Doing great! Just using chatter-box 💬</div>
                    </div>
                    <div className="chat chat-start mb-8">
                        <div className="chat-bubble chat-bubble-secondary shadow-lg">Me too! It&apos;s so smooth 🚀</div>
                    </div>

                    <h2 className="text-2xl font-bold mb-3">Stay connected</h2>
                    <p className="text-base-content/60 leading-relaxed">
                        Chat in real-time with your friends and teams. Fast, secure, and always available.
                    </p>

                    <div className="flex flex-wrap justify-center gap-2 mt-6">
                        {["Real-time messaging", "Secure & private", "Works everywhere"].map((f) => (
                            <span key={f} className="badge badge-primary badge-outline px-3 py-3 text-xs font-medium">{f}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}