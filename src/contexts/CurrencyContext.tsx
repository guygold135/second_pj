import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getStoredCurrency,
  setStoredCurrency as persistCurrency,
  formatMoneyWithCurrency,
} from '../utils/currencies'

interface CurrencyContextValue {
  currencyCode: string
  setCurrencyCode: (code: string) => void
  formatMoney: (amount: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = useState(getStoredCurrency)

  useEffect(() => {
    persistCurrency(currencyCode)
  }, [currencyCode])

  const setCurrencyCode = useCallback((code: string) => {
    setCurrencyCodeState(code)
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
