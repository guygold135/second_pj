import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  getStoredCurrency,
  setStoredCurrency as persistCurrency,
  formatMoneyWithCurrency,
  CURRENCIES,
} from '../utils/currencies'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface CurrencyContextValue {
  currencyCode: string
  setCurrencyCode: (code: string) => void
  formatMoney: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function isValidCurrency(code: string): boolean {
  return CURRENCIES.some((c) => c.code === code)
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currencyCode, setCurrencyCodeState] = useState(getStoredCurrency)
  const hasLoadedRef = useRef(false)

  // Load from Supabase or localStorage on mount
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('currency_code')
            .eq('id', user.id)
            .maybeSingle()
          if (cancelled) return
          if (!error && data?.currency_code && isValidCurrency(String(data.currency_code))) {
            setCurrencyCodeState(String(data.currency_code))
          }
        } catch (_) {
          // keep initial from getStoredCurrency
        }
      }
      if (!cancelled) setTimeout(() => { hasLoadedRef.current = true }, 0)
    }
    run()
    return () => { cancelled = true }
  }, [user?.id])

  // Persist to Supabase or localStorage on change (after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (!isValidCurrency(currencyCode)) return
    if (supabase && !user) return

    const client = supabase
    if (client && user) {
      const save = async () => {
        try {
          const userId = user.id
          const { data: row } = await client
            .from('user_settings')
            .select('opportunity_cost')
            .eq('id', userId)
            .maybeSingle()
          const { error } = await client
            .from('user_settings')
            .upsert(
              {
                id: userId,
                currency_code: currencyCode,
                opportunity_cost: row?.opportunity_cost ?? null,
                user_id: userId,
              },
              { onConflict: 'id' }
            )
          if (error) throw error
          if (import.meta.env.DEV) console.log('[CurrencyContext] Supabase: user_settings currency_code saved')
          const { data: existing } = await client.from('user_settings').select('id').eq('user_id', userId)
          const toDelete = (existing ?? []).filter((r: { id: string }) => r.id !== userId).map((r: { id: string }) => r.id)
          if (toDelete.length > 0) {
            await client.from('user_settings').delete().in('id', toDelete)
          }
        } catch (e) {
          console.error('[CurrencyContext] Save to Supabase failed:', e)
        }
      }
      save()
    } else {
      persistCurrency(currencyCode)
    }
  }, [currencyCode, user?.id])

  const setCurrencyCode = useCallback((code: string) => {
    if (isValidCurrency(code)) setCurrencyCodeState(code)
  }, [])

  const formatMoney = useCallback(
    (amount: number) => formatMoneyWithCurrency(amount, currencyCode),
    [currencyCode]
  )

  return (
    <CurrencyContext.Provider value={{ currencyCode, setCurrencyCode, formatMoney }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}

export function useCurrencyOptional(): CurrencyContextValue | null {
  return useContext(CurrencyContext)
}
