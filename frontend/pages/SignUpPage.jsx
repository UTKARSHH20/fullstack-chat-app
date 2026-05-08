import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { MessageSquare, User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import useAuthStore from "../src/store/useAuthStore"

export default function SignUpPage() {
    const navigate = useNavigate()
    const { signup, isLoading } = useAuthStore()
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({ name: "", email: "", password: "" })

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (formData.password.length < 6) return
        try {
            await signup(formData)
            navigate("/")
        } catch {
            // toast already shown in store
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left – Illustration panel */}
            <div className="hidden lg:flex flex-col items-center justify-center bg-secondary/5 p-12 relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-md text-center">
                    <div className="grid grid-cols-3 gap-4 mb-10">
                        {[
                            { label: "Active Users", value: "10K+" },
                            { label: "Messages/Day", value: "500K+" },
                            { label: "Uptime", value: "99.9%" },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-base-100/80 backdrop-blur-sm rounded-2xl p-4 shadow-md border border-base-200">
                                <div className="text-2xl font-bold text-primary">{value}</div>
                                <div className="text-xs text-base-content/60 mt-1">{label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="chat chat-start mb-3">
                        <div className="chat-bubble chat-bubble-secondary shadow-lg">Just joined chatter-box! 🎉</div>
                    </div>
                    <div className="chat chat-end mb-3">
                        <div className="chat-bubble shadow-lg">Welcome aboard! 🙌</div>
                    </div>
                    <div className="chat chat-start mb-8">
                        <div className="chat-bubble chat-bubble-primary shadow-lg">Let&apos;s chat! 💬</div>
                    </div>

                    <h2 className="text-2xl font-bold mb-3">Join the conversation</h2>
                    <p className="text-base-content/60 leading-relaxed">
                        Create your free account and start messaging with anyone, anywhere, instantly.
                    </p>
                </div>
            </div>

            {/* Right – Form */}
            <div className="flex flex-col justify-center items-center p-8 sm:p-12 bg-base-100">
                <div className="w-full max-w-md space-y-8">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center gap-3 group">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg group-hover:bg-primary/20 transition-colors">
                                <MessageSquare className="w-7 h-7 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold mt-2 tracking-tight">Create account</h1>
                            <p className="text-base-content/60 text-sm">Get started with your free account</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div className="form-control">
                            <label className="label" htmlFor="signup-name">
                                <span className="label-text font-medium">Full Name</span>
                            </label>
                            <label className="input input-bordered flex items-center gap-2 w-full">
                                <User className="h-4 w-4 text-base-content/40 shrink-0" />
                                <input
                                    id="signup-name"
                                    type="text"
                                    placeholder="John Doe"
                                    className="grow bg-transparent outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </label>
                        </div>

                        {/* Email */}
                        <div className="form-control">
                            <label className="label" htmlFor="signup-email">
                                <span className="label-text font-medium">Email</span>
                            </label>
                            <label className="input input-bordered flex items-center gap-2 w-full">
                                <Mail className="h-4 w-4 text-base-content/40 shrink-0" />
                                <input
                                    id="signup-email"
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
                            <label className="label" htmlFor="signup-password">
                                <span className="label-text font-medium">Password</span>
                                <span className="label-text-alt text-base-content/40">min. 6 characters</span>
                            </label>
                            <label className="input input-bordered flex items-center gap-2 w-full">
                                <Lock className="h-4 w-4 text-base-content/40 shrink-0" />
                                <input
                                    id="signup-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="grow bg-transparent outline-none"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    minLength={6}
                                    required
                                />
                                <button
                                    type="button"
                                    id="signup-toggle-password"
                                    className="shrink-0"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword
                                        ? <EyeOff className="h-4 w-4 text-base-content/40 hover:text-base-content transition-colors" />
                                        : <Eye className="h-4 w-4 text-base-content/40 hover:text-base-content transition-colors" />
                                    }
                                </button>
                            </label>

                            {/* Password strength bar */}
                            {formData.password.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <div className="h-1.5 w-full bg-base-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${formData.password.length < 4
                                                    ? "w-1/4 bg-error"
                                                    : formData.password.length < 6
                                                        ? "w-1/2 bg-warning"
                                                        : formData.password.length < 10
                                                            ? "w-3/4 bg-success"
                                                            : "w-full bg-success"
                                                }`}
                                        />
                                    </div>
                                    <p className="text-xs text-base-content/50">
                                        {formData.password.length < 4
                                            ? "Too short"
                                            : formData.password.length < 6
                                                ? "Almost there"
                                                : formData.password.length < 10
                                                    ? "Good password"
                                                    : "Strong password ✓"}
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            id="signup-submit"
                            type="submit"
                            className="btn btn-primary w-full mt-2"
                            disabled={isLoading}
                        >
                            {isLoading
                                ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating account...</>
                                : "Create Account"
                            }
                        </button>
                    </form>

                    <div className="text-center">
                        <p className="text-base-content/60">
                            Already have an account?{" "}
                            <Link to="/login" className="link link-primary font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}