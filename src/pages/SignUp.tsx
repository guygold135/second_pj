import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { card, input, btn, alert } from '../styles/designSystem'

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
          <h1 className="text-2xl font-bold tracking-tight text-white">Mission Flow</h1>
          <p className="mt-2 text-sm text-gray-400">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className={`space-y-5 ${card} p-6`}>
          {error && (
            <div className={alert.warning}>
              <p className="font-medium">{error}</p>
              {/already registered|sign in instead/i.test(error) && (
                <p className="mt-2">
                  <Link to="/signin" className="font-medium text-cyan-400 underline transition-colors hover:text-cyan-300">
                    Go to Sign in →
                  </Link>
                </p>
              )}
            </div>
          )}
          {message && <div className={alert.success}>{message}</div>}
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
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
            <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
          </div>
          <button type="submit" disabled={loading} className={`w-full ${btn.primary} py-3`}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
          <p className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-cyan-400 transition-colors hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
