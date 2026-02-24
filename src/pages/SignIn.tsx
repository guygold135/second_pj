import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function SignIn() {
  const { signIn, resetPasswordForEmail, checkEmailExists } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Sign in failed')
      return
    }
    navigate('/', { replace: true })
  }

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setResetSent(false)
    setLoading(true)
    const { exists, error: checkErr } = await checkEmailExists(email.trim())
    if (!checkErr && !exists) {
      setLoading(false)
      setError('Email not found.')
      return
    }
    // If RPC failed (e.g. function not deployed), send reset anyway so valid emails still work
    const { error: err } = await resetPasswordForEmail(email.trim())
    setLoading(false)
    if (err) {
      const msg = err.message ?? ''
      const isRateLimit = /rate limit|too many requests/i.test(msg)
      if (isRateLimit) {
        setResetSent(true)
        return
      }
      setError(msg || 'Failed to send reset email')
      return
    }
    setResetSent(true)
  }

  if (showForgotPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-wide text-white">MISSION FLOW</h1>
            <p className="mt-2 text-sm text-gray-400">Reset your password</p>
          </div>
          <form onSubmit={handleForgotSubmit} className="space-y-5 rounded-2xl border border-gray-800 bg-slate-900/60 p-6 shadow-xl">
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            {resetSent && (
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Check your email for a link to reset your password.
              </div>
            )}
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false)
                setError(null)
                setResetSent(false)
              }}
              className="w-full text-center text-sm text-gray-400 hover:text-white"
            >
              ← Back to sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wide text-white">MISSION FLOW</h1>
          <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-800 bg-slate-900/60 p-6 shadow-xl">
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 pr-11 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" aria-hidden />
                ) : (
                  <Eye className="h-5 w-5" aria-hidden />
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-medium text-cyan-400 hover:text-cyan-300">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
