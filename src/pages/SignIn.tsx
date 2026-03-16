import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { card, input, btn, alert } from '../styles/designSystem'

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
            <h1 className="text-2xl font-bold tracking-tight text-white">owe it</h1>
            <p className="mt-2 text-sm text-gray-400">Reset your password</p>
          </div>
          <form onSubmit={handleForgotSubmit} className={`space-y-5 ${card} p-6`}>
            {error && <div className={alert.error}>{error}</div>}
            {resetSent && (
              <div className={alert.success}>
                Check your email for a link to reset your password.
              </div>
            )}
            <div>
              <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={input.base}
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={loading} className={`w-full ${btn.primary} py-3`}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false)
                setError(null)
                setResetSent(false)
              }}
              className="w-full text-center text-sm text-gray-400 transition-colors hover:text-white"
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
          <h1 className="text-2xl font-bold tracking-tight text-white">owe it</h1>
          <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className={`space-y-5 ${card} p-6`}>
          {error && <div className={alert.error}>{error}</div>}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={input.base}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-cyan-400 transition-colors hover:text-cyan-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${input.base} pr-11`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
          <button type="submit" disabled={loading} className={`w-full ${btn.primary} py-3`}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-medium text-cyan-400 transition-colors hover:text-cyan-300">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
