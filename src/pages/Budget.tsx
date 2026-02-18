import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Budget, BudgetCategory, BudgetTransaction } from '../types'
import { getRandomQuoteForPage } from '../utils/quotes'
import { buildDefaultCategories } from '../components/budget/defaultCategories'
import { useCurrency } from '../contexts/CurrencyContext'
import {
  getMonthStartEnd,
  getQuarterStartEnd,
  getYearStartEnd,
  addMonth,
  addQuarter,
  addYear,
  formatPeriodLabel,
  computeSummary,
  spentByCategory,
  executionPercent,
  totalPlannedBudget,
} from '../components/budget/budgetUtils'
import { BudgetSummaryCards } from '../components/budget/BudgetSummaryCards'
import { getCategoryColorHex } from '../components/budget/categoryColors'
import { CategoryCard } from '../components/budget/CategoryCard'
import { TransactionForm } from '../components/budget/TransactionForm'
import { TransactionList } from '../components/budget/TransactionList'
import { CategoryManager } from '../components/budget/CategoryManager'

const STORAGE_KEY = 'budget_app_data'

type PeriodType = 'month' | 'quarter' | 'year'

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

function loadBudgets(): { budgets: Budget[]; currentId: string } {
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

function saveBudgets(budgets: Budget[], currentId: string) {
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

export default function Budget() {
  const { formatMoney } = useCurrency()
  const [motivationQuote] = useState(() => getRandomQuoteForPage('finance'))
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [currentId, setCurrentId] = useState('')
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<BudgetTransaction | null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const transactionFormRef = useRef<HTMLElement | null>(null)

  const currentBudget = budgets.find((b) => b.id === currentId)
  const summary = currentBudget ? computeSummary(currentBudget.transactions) : { incomeTotal: 0, expensesTotal: 0, surplus: 0 }
  const spent = currentBudget ? spentByCategory(currentBudget.transactions) : {}
  const execPct = currentBudget ? executionPercent(currentBudget.transactions, currentBudget.categories) : 0
  const expenseCategories = currentBudget ? currentBudget.categories.filter((c) => c.name.toLowerCase() !== 'income') : []
  const categoriesNoIncome = currentBudget ? currentBudget.categories.filter((c) => c.name.toLowerCase() !== 'income') : []
  const totalBudget = currentBudget ? categoriesNoIncome.reduce((sum, c) => sum + (c.budget || 0), 0) : 0
  const categorySegments =
    currentBudget && summary.expensesTotal > 0
      ? expenseCategories
          .filter((c) => (spent[c.id] ?? 0) > 0)
          .map((c) => ({ spentAmount: spent[c.id] ?? 0, colorHex: getCategoryColorHex(c.color ?? 'text-white'), name: c.name }))
          .sort((a, b) => b.spentAmount - a.spentAmount)
      : []

  useEffect(() => {
    const { budgets: loaded, currentId: loadedId } = loadBudgets()
    if (loaded.length > 0 && loadedId && loaded.some((b) => b.id === loadedId)) {
      setBudgets(loaded)
      setCurrentId(loadedId)
      const b = loaded.find((x) => x.id === loadedId)!
      setPeriodStart(b.startDate)
      setPeriodEnd(b.endDate)
      return
    }
    setBudgets(loaded)
    const now = new Date()
    const r =
      periodType === 'month'
        ? getMonthStartEnd(now)
        : periodType === 'quarter'
          ? getQuarterStartEnd(now)
          : getYearStartEnd(now)
    const start = r.start
    const end = r.end
    setPeriodStart(start)
    setPeriodEnd(end)
    const existing = loaded.find((b) => b.startDate === start && b.endDate === end)
    if (existing) setCurrentId(existing.id)
    else {
      const newBudget = createBudgetForRange(start, end, () => uuidv4())
      setBudgets((prev) => [...prev, newBudget])
      setCurrentId(newBudget.id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- init once

  useEffect(() => {
    if (budgets.length > 0 && currentId) saveBudgets(budgets, currentId)
  }, [budgets, currentId])

  useEffect(() => {
    if (!showTransactionForm) return
    // When editing from the list, scroll a bit ABOVE the form so it's clearly visible.
    const el = transactionFormRef.current
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 96
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }, [showTransactionForm, editingTransaction?.id])

  const goPeriod = (delta: number) => {
    let next: { start: string; end: string }
    if (periodType === 'month') next = addMonth(periodStart, delta)
    else if (periodType === 'quarter') next = addQuarter(periodStart, delta)
    else next = addYear(periodStart, delta)
    setPeriodStart(next.start)
    setPeriodEnd(next.end)
    const existing = budgets.find((b) => b.startDate === next.start && b.endDate === next.end)
    if (existing) setCurrentId(existing.id)
    else {
      const newBudget = createBudgetForRange(next.start, next.end, () => uuidv4())
      setBudgets((prev) => [...prev, newBudget])
      setCurrentId(newBudget.id)
    }
  }

  const changePeriodType = (type: PeriodType) => {
    setPeriodType(type)
    const d = periodStart ? new Date(periodStart + 'T12:00:00') : new Date()
    let start: string
    let end: string
    if (type === 'month') {
      const r = getMonthStartEnd(d)
      start = r.start
      end = r.end
    } else if (type === 'quarter') {
      const r = getQuarterStartEnd(d)
      start = r.start
      end = r.end
    } else {
      const r = getYearStartEnd(d)
      start = r.start
      end = r.end
    }
    setPeriodStart(start)
    setPeriodEnd(end)
    const existing = budgets.find((b) => b.startDate === start && b.endDate === end)
    if (existing) setCurrentId(existing.id)
    else {
      const newBudget = createBudgetForRange(start, end, () => uuidv4())
      setBudgets((prev) => [...prev, newBudget])
      setCurrentId(newBudget.id)
    }
  }

  const updateBudget = (updates: Partial<Budget>) => {
    if (!currentId) return
    setBudgets((prev) => prev.map((b) => (b.id === currentId ? { ...b, ...updates } : b)))
  }

  const addTransaction = (tx: Omit<BudgetTransaction, 'id'>) => {
    if (editingTransaction) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === currentId
            ? { ...b, transactions: b.transactions.map((t) => (t.id === editingTransaction.id ? { ...t, ...tx, id: t.id } : t)) }
            : b
        )
      )
      setEditingTransaction(null)
    } else {
      const newTx: BudgetTransaction = { ...tx, id: uuidv4(), createdAt: Date.now() }
      setBudgets((prev) =>
        prev.map((b) => (b.id === currentId ? { ...b, transactions: [...b.transactions, newTx] } : b))
      )
    }
    setShowTransactionForm(false)
  }

  const deleteTransaction = (id: string) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === currentId ? { ...b, transactions: b.transactions.filter((t) => t.id !== id) } : b))
    )
    if (editingTransaction?.id === id) {
      setEditingTransaction(null)
      setShowTransactionForm(false)
    }
  }

  const addCategory = (name: string, budget: number) => {
    const newCat: BudgetCategory = { id: uuidv4(), name, budget }
    updateBudget({ categories: [...(currentBudget?.categories ?? []), newCat] })
  }

  const editCategory = (id: string, updates: { name?: string; budget?: number; color?: string }) => {
    updateBudget({
      categories: (currentBudget?.categories ?? []).map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })
  }

  const deleteCategory = (id: string) => {
    const hasTx = currentBudget?.transactions.some((t) => t.categoryId === id)
    if (hasTx) {
      if (!confirm('This category has transactions. Delete anyway? Transactions will keep the category id.')) return
    }
    updateBudget({ categories: (currentBudget?.categories ?? []).filter((c) => c.id !== id) })
  }

  const today = new Date().toISOString().slice(0, 10)
  const defaultTransactionDate =
    currentBudget && today >= currentBudget.startDate && today <= currentBudget.endDate
      ? today
      : currentBudget?.endDate ?? today

  const getRangeForOffset = (delta: number): { start: string; end: string } => {
    if (!periodStart) return { start: '', end: '' }
    if (periodType === 'month') return addMonth(periodStart, delta)
    if (periodType === 'quarter') return addQuarter(periodStart, delta)
    return addYear(periodStart, delta)
  }

  const timeframeOffsets = [-3, -2, -1, 0, 1] as const
  const timeframeBars = periodStart
    ? timeframeOffsets.map((delta) => {
        const r = getRangeForOffset(delta)
        const b = budgets.find((x) => x.startDate === r.start && x.endDate === r.end)
        const spentAmount = b ? computeSummary(b.transactions).expensesTotal : 0
        const plannedBudget = b ? totalPlannedBudget(b.categories) : 0
        const label = r.start ? formatPeriodLabel(periodType, r.start) : '—'
        return { delta, start: r.start, end: r.end, label, spentAmount, plannedBudget }
      })
    : []
  const timeframeMax = Math.max(
    1,
    ...timeframeBars.map((x) => Math.max(x.spentAmount, x.plannedBudget))
  )

  const selectedPeriodLabel = periodStart ? formatPeriodLabel(periodType, periodStart) : ''
  const nowRange =
    periodType === 'month'
      ? getMonthStartEnd(new Date())
      : periodType === 'quarter'
        ? getQuarterStartEnd(new Date())
        : getYearStartEnd(new Date())
  const isCurrentTimeframe = !!periodStart && periodStart === nowRange.start && periodEnd === nowRange.end
  const summaryTitle = isCurrentTimeframe
    ? `Total expenses & budget this ${periodType}`
    : `Total expenses & budget in ${selectedPeriodLabel}`

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-3 rounded-lg border border-emerald-300/40 bg-slate-900 px-4 py-3">
        <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className="flex-1 bg-transparent text-white" aria-hidden="true">
          {motivationQuote}
        </span>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={periodType}
          onChange={(e) => changePeriodType(e.target.value as PeriodType)}
          className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
          aria-label="Budget period type"
        >
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
          <option value="year">Year</option>
        </select>
        <div className="flex rounded-lg border border-gray-700 bg-slate-900">
          <button
            type="button"
            onClick={() => goPeriod(-1)}
            className="px-3 py-2 text-gray-300 hover:bg-slate-800 hover:text-white"
            aria-label="Previous period"
          >
            ←
          </button>
          <span className="flex min-w-[140px] items-center justify-center px-3 py-2 text-sm font-medium text-white">
            {periodStart ? formatPeriodLabel(periodType, periodStart) : '—'}
          </span>
          <button
            type="button"
            onClick={() => goPeriod(1)}
            className="px-3 py-2 text-gray-300 hover:bg-slate-800 hover:text-white"
            aria-label="Next period"
          >
            →
          </button>
        </div>
        <p className="text-xs text-gray-500">
          {periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : ''}
        </p>
      </div>

      {currentBudget && (
        <>
          {/* Timeframe graphs */}
          {timeframeBars.length > 0 && (
            <section
              aria-label="Timeframe graphs"
              className="rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 transition-colors"
            >
              <div className="overflow-x-auto">
                <div className="grid min-w-[520px] grid-cols-5 gap-3">
                  {timeframeBars.map((t) => {
                    const baseOrange = Math.min(t.spentAmount, t.plannedBudget)
                    const delta = Math.abs(t.plannedBudget - t.spentAmount)
                    const orangePct = (baseOrange / timeframeMax) * 100
                    const deltaPct = (delta / timeframeMax) * 100
                    const deltaBg =
                      t.plannedBudget >= t.spentAmount
                        ? 'bg-emerald-500/38 ring-1 ring-inset ring-emerald-300/60'
                        : 'bg-red-500/65'
                    const active = t.delta === 0

                    return (
                      <button
                        key={`${t.start}:${t.end}`}
                        type="button"
                        onClick={() => {
                          if (t.delta === 0) return
                          goPeriod(t.delta)
                        }}
                        className={`group flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-left transition hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                          active ? 'bg-slate-800/60 ring-1 ring-cyan-500/30' : ''
                        }`}
                        title={`Spent: ${formatMoney(t.spentAmount)} | Budget: ${formatMoney(t.plannedBudget)} (${t.start}–${t.end})`}
                        aria-label={`Select timeframe ${t.label}`}
                      >
                        <div className="flex h-16 items-end justify-center">
                          <div className="flex h-16 w-[25px] flex-col justify-end">
                            {deltaPct > 0 && <div className={`${deltaBg}`} style={{ height: `${deltaPct}%` }} />}
                            {orangePct > 0 && <div className="bg-orange-300/90" style={{ height: `${orangePct}%` }} />}
                          </div>
                        </div>
                        <div className="w-full truncate text-center text-[11px] font-medium text-gray-300 group-hover:text-white">
                          {t.label}
                        </div>
                        <div className="w-full text-center text-[10px] leading-tight">
                          <div className="truncate text-orange-200/90">
                            {formatMoney(t.spentAmount)} <span className="text-orange-200/70">spent</span>
                          </div>
                          <div className="truncate text-gray-400">
                            {formatMoney(t.plannedBudget)} <span className="text-gray-500">budget</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Spent is shown in light orange. The extra segment shows the gap to your planned budget (green if under, red if over).
              </p>
            </section>
          )}

          <BudgetSummaryCards
            title={summaryTitle}
            summary={summary}
            totalBudget={totalBudget}
            executionPercent={execPct}
            categorySegments={categorySegments}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null)
                setShowCategoryManager(false)
                setShowTransactionForm(true)
              }}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 py-2.5 px-4 font-medium text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add expense
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTransactionForm(false)
                setShowCategoryManager((v) => !v)
                setEditingCategoryId(null)
              }}
              className="rounded-lg border border-gray-600 bg-slate-800 py-2.5 px-4 font-medium text-gray-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {showCategoryManager ? 'Hide categories' : 'Manage categories'}
            </button>
          </div>

          {showCategoryManager && (
            <section className="rounded-xl border border-gray-800 bg-slate-900/60 p-4" aria-label="Category management">
              <CategoryManager
                categories={categoriesNoIncome}
                initialEditId={editingCategoryId}
                onCloseSingleEdit={() => { setEditingCategoryId(null); setShowCategoryManager(false) }}
                onAdd={addCategory}
                onEdit={editCategory}
                onDelete={deleteCategory}
              />
            </section>
          )}

          {showTransactionForm && (
            <section ref={transactionFormRef} aria-label="Add or edit transaction">
              <TransactionForm
                key={editingTransaction?.id ?? 'new'}
                categories={categoriesNoIncome}
                defaultDate={defaultTransactionDate}
                minDate={currentBudget.startDate}
                maxDate={currentBudget.endDate}
                onSubmit={addTransaction}
                onCancel={() => { setShowTransactionForm(false); setEditingTransaction(null) }}
                initial={editingTransaction ?? undefined}
              />
            </section>
          )}

          {expenseCategories.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-300">Category breakdown</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {expenseCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    spent={spent[cat.id] ?? 0}
                    onEdit={(c) => { setEditingCategoryId(c.id); setShowCategoryManager(true) }}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-300">Transactions</h2>
            {currentBudget.transactions.length === 0 && !showTransactionForm ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-16 text-center text-gray-300">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gray-800">
                  <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="mb-2">No transactions yet.</p>
                <p className="text-sm text-gray-500">Click &quot;Add Entry&quot; to add your first income or expense.</p>
              </div>
            ) : (
              <TransactionList
                transactions={currentBudget.transactions}
                categories={currentBudget.categories}
                onEdit={(tx) => { setShowCategoryManager(false); setEditingTransaction(tx); setShowTransactionForm(true) }}
                onDelete={deleteTransaction}
              />
            )}
          </section>
        </>
      )}

      {!currentBudget && (
        <div className="rounded-xl border border-gray-800 bg-slate-900/40 py-12 text-center text-gray-400">
          Loading budget…
        </div>
      )}
    </div>
  )
}
