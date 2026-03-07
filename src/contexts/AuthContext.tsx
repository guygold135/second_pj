import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type SignUpResult = {
  error: Error | null
  /** True when Supabase returns success but the user already existed (no new identity created). */
  existingUser?: boolean
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, username?: string) => Promise<SignUpResult>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (password: string) => Promise<{ error: Error | null }>
  /** Returns whether an account exists for this email (requires public.email_exists_for_reset SQL function). */
  checkEmailExists: (email: string) => Promise<{ exists: boolean; error: Error | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setUser(null)
      setSession(null)
      setIsLoading(false)
      return
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setIsLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string, username?: string): Promise<SignUpResult> => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: username ? { data: { name: username } } : undefined,
    })
    if (error) return { error }
    // Supabase returns success for existing email but with no new identity (identities array empty)
    const existingUser = !!(data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    return { error: null, existingUser }
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
  }, [])

  const resetPasswordForEmail = useCallback(async (email: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    return { error: error ?? null }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') }
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ?? null }
  }, [])

  const checkEmailExists = useCallback(async (email: string): Promise<{ exists: boolean; error: Error | null }> => {
    if (!supabase) return { exists: false, error: new Error('Supabase not configured') }
    const { data, error } = await supabase.rpc('email_exists_for_reset', { check_email: email.trim() })
    if (error) return { exists: false, error }
    return { exists: Boolean(data), error: null }
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut, resetPasswordForEmail, updatePassword, checkEmailExists }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext)
}
