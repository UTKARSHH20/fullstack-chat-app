import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import useAuthStore from '../src/store/useAuthStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, googleLogin, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(formData)
      navigate('/')
    } catch {
      // toast already shown in store
    }
  }

  const googleclientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const githubclientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  const isGoogleConfigured = googleclientId !== 'your_google_client_id_here'
  const isGithubConfigured = githubclientId !== 'your_github_client_id_here'

  useEffect(() => {
    if (!isGoogleConfigured) return

    let interval
    const initGoogleBtn = () => {
      const btnEl = document.getElementById('google-signin-button')
      if (window.google?.accounts?.id && btnEl) {
        clearInterval(interval)
        window.google.accounts.id.initialize({
          client_id: googleclientId,
          callback: async (response) => {
            try {
              await googleLogin(response.credential)
              navigate('/')
            } catch {
              // toast already shown in store
            }
          },
        })
        window.google.accounts.id.renderButton(btnEl, {
          theme: 'outline',
          size: 'large',
          width: btnEl.clientWidth || 380,
          text: 'continue_with',
          shape: 'rectangular',
        })
      }
    }

    interval = setInterval(initGoogleBtn, 100)
    initGoogleBtn()

    return () => clearInterval(interval)
  }, [isGoogleConfigured, googleclientId, googleLogin, navigate])

  const handleGoogleLogin = () => {
    toast.error('Google Sign-In is not configured')
  }

  const handleGithubLogin = () => {
    if (!isGithubConfigured) {
      toast.error('Github Sign-In is not configured')
      return
    }
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`
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
              <h1 className="text-3xl font-bold mt-2 tracking-tight">
                Welcome back
              </h1>
              <p className="text-base-content/60 text-sm">
                Sign in to your chatter-box account
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </label>
            </div>

            <div className="form-control">
              <label className="label" htmlFor="login-password">
                <span className="label-text font-medium">Password</span>
              </label>
              <label className="input input-bordered flex items-center gap-2 w-full">
                <Lock className="h-4 w-4 text-base-content/40 shrink-0" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="grow bg-transparent outline-none"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  className="shrink-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-base-content/40 hover:text-base-content transition-colors" />
                  ) : (
                    <Eye className="h-4 w-4 text-base-content/40 hover:text-base-content transition-colors" />
                  )}
                </button>
              </label>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="divider text-xs text-base-content/40">OR</div>
            {isGoogleConfigured ? (
              <div className="w-full flex justify-center min-h-[44px]">
                <div
                  id="google-signin-button"
                  className="w-full max-w-sm flex justify-center"
                ></div>
              </div>
            ) : (
              <button
                type="button"
                id="google-login-btn"
                className="btn btn-outline w-full gap-2"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            )}

            <div className="w-full flex justify-center min-h-[44px]">
              <div
                id="github-signin-button"
                className="w-full max-w-sm flex justify-center"
              >
                <button
                  type="button"
                  className="btn btn-outline w-full gap-2"
                  onClick={handleGithubLogin}
                  disabled={isLoading}
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.95.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.45.11-3.02 0 0 .97-.31 3.17 1.17a10.95 10.95 0 015.77 0c2.2-1.48 3.17-1.17 3.17-1.17.62 1.57.23 2.73.11 3.02.73.8 1.18 1.82 1.18 3.07 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56A11.5 11.5 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
                  </svg>
                  Continue with GitHub
                </button>
              </div>
            </div>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="link link-primary font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-col items-center justify-center bg-primary/5 p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Stay connected</h2>
          <p className="text-base-content/60 leading-relaxed">
            Chat in real-time with friends and teams. Fast, secure, and
            available on any device.
          </p>
        </div>
      </div>
    </div>
  )
}
