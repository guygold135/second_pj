import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loadingState, card, input, btn, alert } from '../styles/designSystem'

export default function ResetPassword() {
  const { updatePassword, session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null)

  useEffect(() => {
    if (session?.user) {
      setHasRecoverySession(true)
      return
    }
    const t = setTimeout(() => setHasRecoverySession(false), 1500)
    return () => clearTimeout(t)
  }, [session])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) {
      setError(err.message ?? 'Failed to update password')
      return
    }
    setSuccess(true)
    setTimeout(() => navigate('/signin', { replace: true }), 2000)
  }

  if (hasRecoverySession === null) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#0f172a] px-4 py-12">
        <div className={loadingState.spinner} aria-hidden />
        <span className={loadingState.inline}>Loading…</span>
      </div>
    )
  }

  if (!hasRecoverySession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
        <div className={`w-full max-w-sm space-y-6 ${card} p-6 text-center`}>
          <p className="text-gray-300">Invalid or expired reset link. Request a new one from the sign in page.</p>
          <Link to="/signin" className="inline-block font-medium text-cyan-400 transition-colors hover:text-cyan-300">
            Back to Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
        <div className={`w-full max-w-sm space-y-6 ${card} border-emerald-500/30 bg-emerald-500/10 p-6 text-center`}>
          <p className="text-emerald-200">Password updated. Redirecting to sign in…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Mission Flow</h1>
          <p className="mt-2 text-sm text-gray-400">Set a new password</p>
        </div>
        <form onSubmit={handleSubmit} className={`space-y-5 ${card} p-6`}>
          {error && <div className={alert.error}>{error}</div>}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={input.base}
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className={input.base}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className={`w-full ${btn.primary} py-3`}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
          <p className="text-center text-sm text-gray-400">
            <Link to="/signin" className="font-medium text-cyan-400 transition-colors hover:text-cyan-300">
              Back to Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
