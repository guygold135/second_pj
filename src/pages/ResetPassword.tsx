import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
        <div className="text-gray-400">Loading…</div>
      </div>
    )
  }

  if (!hasRecoverySession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-800 bg-slate-900/60 p-6 text-center">
          <p className="text-gray-300">Invalid or expired reset link. Request a new one from the sign in page.</p>
          <Link to="/signin" className="inline-block font-medium text-cyan-400 hover:text-cyan-300">
            Back to Sign in
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <p className="text-emerald-200">Password updated. Redirecting to sign in…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wide text-white">MISSION FLOW</h1>
          <p className="mt-2 text-sm text-gray-400">Set a new password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-800 bg-slate-900/60 p-6 shadow-xl">
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
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
              className="mt-1.5 w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
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
              className="mt-1.5 w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
          <p className="text-center text-sm text-gray-400">
            <Link to="/signin" className="font-medium text-cyan-400 hover:text-cyan-300">
              Back to Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
