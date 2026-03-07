import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const THEME_STORAGE_KEY = 'mission-flow-theme'
export type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

function applyThemeToDocument(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata as Record<string, unknown> | undefined
    const saved = meta?.theme
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved)
      localStorage.setItem(THEME_STORAGE_KEY, saved)
      applyThemeToDocument(saved)
    }
  }, [user?.id])

  const setTheme = useCallback(
    async (next: Theme) => {
      setThemeState(next)
      localStorage.setItem(THEME_STORAGE_KEY, next)
      applyThemeToDocument(next)
      if (supabase && user) {
        await supabase.auth.updateUser({ data: { theme: next } })
      }
    },
    [user],
  )

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
