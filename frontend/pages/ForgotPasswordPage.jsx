import { useState } from "react"
import { Link } from "react-router-dom"
import { MessageSquare, Mail, Loader2, ArrowLeft } from "lucide-react"
import useAuthStore from "../src/store/useAuthStore"

export default function ForgotPasswordPage() {
    const { forgotPassword, isLoading } = useAuthStore()
    const [email, setEmail] = useState("")
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await forgotPassword(email)
            setSubmitted(true)
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
                            <h1 className="text-3xl font-bold mt-2 tracking-tight">Recover Password</h1>
                            <p className="text-base-content/60 text-sm">
                                {submitted 
                                    ? "Check your email for reset instructions" 
                                    : "Enter your email to receive a password reset link"
                                }
                            </p>
                        </div>
                    </div>

                    {submitted ? (
                        <div className="space-y-6 text-center">
                            <div className="bg-success/10 text-success p-4 rounded-xl text-sm border border-success/20">
                                An email has been sent to <span className="font-semibold">{email}</span> with instructions to reset your password. Please check your inbox and spam folders.
                            </div>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="btn btn-outline btn-primary w-full"
                            >
                                Try another email
                            </button>
                            <Link to="/login" className="flex items-center justify-center gap-2 text-sm link link-primary font-medium hover:underline">
                                <ArrowLeft className="w-4 h-4" /> Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="form-control">
                                <label className="label" htmlFor="forgot-email">
                                    <span className="label-text font-medium">Email Address</span>
                                </label>
                                <label className="input input-bordered flex items-center gap-2 w-full">
                                    <Mail className="h-4 w-4 text-base-content/40 shrink-0" />
                                    <input
                                        id="forgot-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        className="grow bg-transparent outline-none"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </label>
                            </div>

                            <button
                                id="forgot-submit"
                                type="submit"
                                className="btn btn-primary w-full mt-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Sending link...
                                    </>
                                ) : (
                                    "Send Reset Link"
                                )}
                            </button>

                            <div className="text-center mt-4">
                                <Link to="/login" className="inline-flex items-center gap-2 text-sm link link-primary font-medium hover:underline">
                                    <ArrowLeft className="w-4 h-4" /> Back to Sign In
                                </Link>
                            </div>
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
                    <h2 className="text-2xl font-bold mb-3">Forgot your password?</h2>
                    <p className="text-base-content/60 leading-relaxed">
                        Don't worry, it happens to the best of us. Just provide your email address, and we'll help you secure and regain access to your account.
                    </p>
                </div>
            </div>
        </div>
    )
}
