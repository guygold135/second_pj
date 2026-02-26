import { createContext, useContext, useState, useEffect, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Budget, BudgetCategory } from '../types'
import { buildDefaultCategories } from '../components/budget/defaultCategories'
import { getMonthStartEnd } from '../components/budget/budgetUtils'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'budget_app_data'

function stripIncomeCategory(budget: Budget): Budget {
  return {
    ...budget,
    categories: budget.categories.filter((c) => c.name.toLowerCase() !== 'income'),
  }
}

function normalizeCategoryBudget(c: BudgetCategory): BudgetCategory {
  const n = typeof c.budget === 'number' ? c.budget : Number(c.budget)
  return { ...c, budget: Number.isFinite(n) ? n : 0 }
}

function normalizeBudget(b: Budget): Budget {
  return { ...b, categories: (b.categories ?? []).map(normalizeCategoryBudget) }
}

function loadFromLocalStorage(): { budgets: Budget[]; currentId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { budgets: [], currentId: '' }
    const data = JSON.parse(raw) as { budgets: Budget[]; currentId: string }
    const budgets = (data.budgets ?? []).map(stripIncomeCategory).map(normalizeBudget)
    return { budgets, currentId: data.currentId ?? '' }
  } catch {
    return { budgets: [], currentId: '' }
  }
}

function saveToLocalStorage(budgets: Budget[], currentId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ budgets, currentId }))
  } catch (_) {}
}

function createBudgetForRange(start: string, end: string, createId: () => string): Budget {
  return {
    id: createId(),
    name: `${start} to ${end}`,
    startDate: start,
    endDate: end,
    categories: buildDefaultCategories(createId),
    transactions: [],
  }
}

function getInitialBudgetState(): { budgets: Budget[]; currentId: string; periodStart: string; periodEnd: string } {
  const loaded = loadFromLocalStorage()
  if (loaded.budgets.length > 0 && loaded.currentId && loaded.budgets.some((b) => b.id === loaded.currentId)) {
    const b = loaded.budgets.find((x) => x.id === loaded.currentId)!
    return { budgets: loaded.budgets, currentId: loaded.currentId, periodStart: b.startDate, periodEnd: b.endDate }
  }
  const { start, end } = getMonthStartEnd(new Date())
  const defaultBudget = createBudgetForRange(start, end, () => uuidv4())
  return { budgets: [defaultBudget], currentId: defaultBudget.id, periodStart: start, periodEnd: end }
}

export type BudgetContextValue = {
  budgets: Budget[]
  setBudgets: Dispatch<SetStateAction<Budget[]>>
  currentId: string
  setCurrentId: Dispatch<SetStateAction<string>>
  periodStart: string
  setPeriodStart: Dispatch<SetStateAction<string>>
  periodEnd: string
  setPeriodEnd: Dispatch<SetStateAction<string>>
}

const BudgetContext = createContext<BudgetContextValue | null>(null)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const initial = getInitialBudgetState()
  const [budgets, setBudgets] = useState<Budget[]>(initial.budgets)
  const [currentId, setCurrentId] = useState(initial.currentId)
  const [periodStart, setPeriodStart] = useState(initial.periodStart)
  const [periodEnd, setPeriodEnd] = useState(initial.periodEnd)
  const hasLoadedRef = useRef(false)

  // Prefetch from Supabase as soon as user is in the app (provider is in ProtectedLayout)
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('budget_data')
            .select('current_id, budgets')
            .eq('id', user.id)
            .maybeSingle()
          if (cancelled) return
          if (error) throw error
          if (data != null && Array.isArray(data.budgets)) {
            const loaded = (data.budgets as Budget[]).map(stripIncomeCategory).map(normalizeBudget)
            const loadedId = (data.current_id as string) ?? ''
            setBudgets(loaded)
            setCurrentId(loadedId || (loaded[0]?.id ?? ''))
            if (loaded.length > 0 && loadedId && loaded.some((b) => b.id === loadedId)) {
              const b = loaded.find((x) => x.id === loadedId)!
              setPeriodStart(b.startDate)
              setPeriodEnd(b.endDate)
            } else if (loaded[0]) {
              setPeriodStart(loaded[0].startDate)
              setPeriodEnd(loaded[0].endDate)
            }
            if (!cancelled) hasLoadedRef.current = true
            return
          }
        } catch (_) {}
      }
      if (!cancelled) {
        const { budgets: loaded, currentId: loadedId } = loadFromLocalStorage()
        if (loaded.length > 0 && loadedId && loaded.some((b) => b.id === loadedId)) {
          const b = loaded.find((x) => x.id === loadedId)!
          setBudgets(loaded)
          setCurrentId(loadedId)
          setPeriodStart(b.startDate)
          setPeriodEnd(b.endDate)
        }
        hasLoadedRef.current = true
      }
    }
    run()
    return () => { cancelled = true }
  }, [user?.id])

  // Persist when state changes (after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (supabase && !user) return
    const client = supabase
    if (client && user) {
      const save = async () => {
        try {
          await client
            .from('budget_data')
            .upsert(
              { id: user.id, current_id: currentId, budgets, user_id: user.id },
              { onConflict: 'id' }
            )
        } catch (e) {
          console.error('[Budget] Save to Supabase failed:', e)
        }
      }
      save()
    } else {
      saveToLocalStorage(budgets, currentId)
    }
  }, [budgets, currentId, user?.id])

  const value: BudgetContextValue = {
    budgets,
    setBudgets,
    currentId,
    setCurrentId,
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
  }

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext)
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider')
  return ctx
}
