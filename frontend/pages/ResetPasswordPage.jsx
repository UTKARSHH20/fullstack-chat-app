import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { MessageSquare, Lock, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import useAuthStore from "../src/store/useAuthStore"
import toast from "react-hot-toast"

export default function ResetPasswordPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const { resetPassword, isLoading } = useAuthStore()

    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({ password: "", confirmPassword: "" })
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (formData.password !== formData.confirmPassword) {
            return toast.error("Passwords do not match")
        }
        if (formData.password.length < 6) {
            return toast.error("Password must be at least 6 characters long")
        }

        try {
            await resetPassword(token, formData.password)
            setSuccess(true)
            setTimeout(() => {
                navigate("/login")
            }, 3000)
        } catch {
            // Error handled by store
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div className="flex flex-col justify-center items-center p-8 sm:p-12 bg-base-100">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center gap-3 group">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg group-hover:bg-primary/20 transition-colors">
                                <MessageSquare className="w-7 h-7 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold mt-2 tracking-tight">Reset Password</h1>
                            <p className="text-base-content/60 text-sm">
                                {success 
                                    ? "Password updated successfully" 
                                    : "Enter your new password below"
                                }
                            </p>
                        </div>
                    </div>

                    {success ? (
                        <div className="space-y-6 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 bg-success/10 text-success p-6 rounded-xl border border-success/20">
                                <CheckCircle className="w-10 h-10 text-success animate-bounce" />
                                <span className="font-semibold text-lg">Password Changed!</span>
                                <p className="text-sm text-success/80 mt-1">
                                    Your password has been reset successfully. You will be redirected to the login page shortly.
                                </p>
                            </div>
                            <Link to="/login" className="btn btn-primary w-full">
                                Go to Sign In Now
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="form-control">
                                <label className="label" htmlFor="new-password">
                                    <span className="label-text font-medium">New Password</span>
                                </label>
                                <label className="input input-bordered flex items-center gap-2 w-full">
                                    <Lock className="h-4 w-4 text-base-content/40 shrink-0" />
                                    <input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="grow bg-transparent outline-none"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </label>
                            </div>

                            <div className="form-control">
                                <label className="label" htmlFor="confirm-password">
                                    <span className="label-text font-medium">Confirm New Password</span>
                                </label>
                                <label className="input input-bordered flex items-center gap-2 w-full">
                                    <Lock className="h-4 w-4 text-base-content/40 shrink-0" />
                                    <input
                                        id="confirm-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="grow bg-transparent outline-none"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="shrink-0 font-medium text-xs text-base-content/40 hover:text-base-content transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </label>
                            </div>

                            <button
                                id="reset-submit"
                                type="submit"
                                className="btn btn-primary w-full mt-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Resetting password...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <div className="hidden lg:flex flex-col items-center justify-center bg-primary/5 p-12 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-md text-center">
                    <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Set your new password</h2>
                    <p className="text-base-content/60 leading-relaxed">
                        Choose a strong, secure password that you don't use elsewhere. A strong password keeps your chats and personal data safe.
                    </p>
                </div>
            </div>
        </div>
    )
}
