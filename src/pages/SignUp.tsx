import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function SignUp() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    const result = await signUp(email.trim(), password)
    setLoading(false)
    if (result.error) {
      const msg = result.error.message ?? ''
      const isAlreadyRegistered =
        /already registered|already exists|user already|email already/i.test(msg) ||
        result.error.message?.includes('already been registered')
      setError(
        isAlreadyRegistered
          ? 'This email is already registered. Please sign in instead.'
          : msg || 'Sign up failed'
      )
      return
    }
    if (result.existingUser) {
      setError('This email is already registered. Please sign in instead.')
      return
    }
    setMessage('Check your email to confirm your account, then sign in.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wide text-white">MISSION FLOW</h1>
          <p className="mt-2 text-sm text-gray-400">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-800 bg-slate-900/60 p-6 shadow-xl">
          {error && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
              <p className="font-medium">{error}</p>
              {/already registered|sign in instead/i.test(error) && (
                <p className="mt-2">
                  <Link to="/signin" className="font-medium text-cyan-400 underline hover:text-cyan-300">
                    Go to Sign in →
                  </Link>
                </p>
              )}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {message}
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
            <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-gray-400">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-600 py-3 font-semibold text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-cyan-400 hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
