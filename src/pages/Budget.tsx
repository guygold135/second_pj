import { useState, useEffect, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Budget, BudgetCategory, BudgetTransaction } from '../types'
import { buildDefaultCategories } from '../components/budget/defaultCategories'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAuth } from '../contexts/AuthContext'
import { useBudget } from '../contexts/BudgetContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
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
import { ColorSelect, PRESET_COLOR_VALUES } from '../components/budget/CategoryManager'
import { btn, emptyState, loadingState, modal, pageContainer } from '../styles/designSystem'
import OpportunityCost, {
  getBlendedRateAndHorizon,
  compoundGrowth,
  type OpportunityCostSaved,
} from './OpportunityCost'

const STORAGE_KEY_OPPORTUNITY = 'opportunity_cost_data'

type PeriodType = 'month' | 'quarter' | 'year'

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
  const { user } = useAuth()
  const { formatMoney } = useCurrency()
  const { theme } = useTheme()
  const { budgets, setBudgets, currentId, setCurrentId, periodStart, setPeriodStart, periodEnd, setPeriodEnd } = useBudget()
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<BudgetTransaction | null>(null)
  const [categoryIdAddingExpense, setCategoryIdAddingExpense] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<string | null>(null)
  const [showAddCategoryInline, setShowAddCategoryInline] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatNameError, setNewCatNameError] = useState(false)
  const [newCatBudget, setNewCatBudget] = useState('0')
  const [newCatColor, setNewCatColor] = useState('text-sky-500')
  const addCategoryFormRef = useRef<HTMLDivElement>(null)
  const addCategoryNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showAddCategoryInline) return
    const handleClickOutside = (e: MouseEvent) => {
      if (addCategoryFormRef.current && !addCategoryFormRef.current.contains(e.target as Node)) {
        setShowAddCategoryInline(false)
        setNewCatName('')
        setNewCatNameError(false)
        setNewCatBudget('0')
        setNewCatColor('text-sky-500')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddCategoryInline])

  useEffect(() => {
    if (showAddCategoryInline) {
      const t = setTimeout(() => addCategoryNameInputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [showAddCategoryInline])

  const [showInvestmentProfileModal, setShowInvestmentProfileModal] = useState(false)
  const [opportunityCostSaved, setOpportunityCostSaved] = useState<OpportunityCostSaved | null>(null)
  const prevModalOpenRef = useRef(false)

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

  const loadOpportunityCost = useCallback(async () => {
    if (supabase && user) {
      try {
        const { data } = await supabase
          .from('user_settings')
          .select('opportunity_cost')
          .eq('id', user.id)
          .maybeSingle()
        if (data?.opportunity_cost && typeof data.opportunity_cost === 'object') {
          setOpportunityCostSaved(data.opportunity_cost as OpportunityCostSaved)
          return
        }
      } catch (_) {}
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_OPPORTUNITY)
      if (raw) {
        const oc = JSON.parse(raw) as OpportunityCostSaved
        setOpportunityCostSaved(oc)
      } else {
        setOpportunityCostSaved(null)
      }
    } catch (_) {
      setOpportunityCostSaved(null)
    }
  }, [user?.id])

  useEffect(() => {
    loadOpportunityCost()
  }, [loadOpportunityCost])

  useEffect(() => {
    if (prevModalOpenRef.current && !showInvestmentProfileModal) {
      loadOpportunityCost()
    }
    prevModalOpenRef.current = showInvestmentProfileModal
  }, [showInvestmentProfileModal, loadOpportunityCost])

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

  const addCategory = (name: string, budget: number, color?: string) => {
    const newCat: BudgetCategory = { id: uuidv4(), name, budget, ...(color && { color }) }
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
    <div className={`${pageContainer} mx-auto max-w-4xl`}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowInvestmentProfileModal(true)}
          className={btn.outline}
        >
          Set my investment profile
        </button>
        <p className="text-sm text-gray-400">
          We&apos;ll use this to show you the long-term impact of your spending.
        </p>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={periodType}
          onChange={(e) => changePeriodType(e.target.value as PeriodType)}
          className="rounded-lg border border-gray-700 bg-slate-800 px-3 py-2 text-white transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
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
                    const spentPct = timeframeMax > 0 ? (t.spentAmount / timeframeMax) * 100 : 0
                    const budgetPct = timeframeMax > 0 ? (t.plannedBudget / timeframeMax) * 100 : 0
                    const active = t.delta === 0
                    const diffPct = Math.abs(spentPct - budgetPct)
                    const underBudget = t.plannedBudget >= t.spentAmount
                    const diffAmount = Math.abs(t.plannedBudget - t.spentAmount)
                    const hasDiff = diffAmount >= 0.01
                    const exec = t.plannedBudget > 0 ? (t.spentAmount / t.plannedBudget) * 100 : 0
                    const overBudgetFillColor =
                      exec >= 175 ? '#ef4444'
                      : exec >= 125 ? '#f97316'
                      : exec >= 110 ? '#fb923c'
                      : exec >= 100 ? '#facc15'
                      : '#ef4444'

                    return (
                      <button
                        key={`${t.start}:${t.end}`}
                        type="button"
                        onClick={() => {
                          if (t.delta === 0) return
                          goPeriod(t.delta)
                        }}
                        className={`group flex flex-col items-center gap-1.5 rounded-lg px-2 py-2 text-left transition hover:bg-slate-800/60 focus:outline-none focus:ring-0 ${
                          active ? 'bg-slate-800/60' : ''
                        }`}
                        title={`Budget: ${formatMoney(t.plannedBudget)} | Spent: ${formatMoney(t.spentAmount)} (${t.start}–${t.end})`}
                        aria-label={`Select timeframe ${t.label}`}
                      >
                        <div className="relative mx-auto flex-shrink-0" style={{ width: '105px', height: '120px' }}>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 27,
                              width: '21px',
                              height: `${budgetPct}%`,
                              background: 'linear-gradient(to top, #0891b2, #06b6d4)',
                              borderRadius: '4px 4px 0 0',
                              zIndex: 1,
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 57,
                              width: '21px',
                              height: `${spentPct}%`,
                              background: 'linear-gradient(to top, #84cc16, #eab308)',
                              borderRadius: '4px 4px 0 0',
                              zIndex: 1,
                            }}
                          />
                          {hasDiff && diffPct > 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 57,
                                width: '21px',
                                bottom: `${Math.min(budgetPct, spentPct)}%`,
                                height: `${diffPct}%`,
                                backgroundColor: underBudget ? 'rgba(0,128,0,0.25)' : overBudgetFillColor,
                                zIndex: 2,
                              }}
                            />
                          )}
                          {budgetPct > 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 48,
                                width: '30px',
                                top: `${100 - budgetPct}%`,
                                height: '2px',
                                background: theme === 'dark'
                                  ? 'repeating-linear-gradient(90deg, #fff 0px, #fff 4px, transparent 4px, transparent 8px)'
                                  : 'repeating-linear-gradient(90deg, #06b6d4 0px, #06b6d4 4px, transparent 4px, transparent 8px)',
                                zIndex: 10,
                              }}
                            />
                          )}
                        </div>
                        <div className="w-full truncate text-center text-[11px] font-medium text-gray-300 group-hover:text-white">
                          {t.label}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          <BudgetSummaryCards
            title={summaryTitle}
            summary={summary}
            totalBudget={totalBudget}
            executionPercent={execPct}
            categorySegments={categorySegments}
          />

          {isCurrentTimeframe && (() => {
            const delta = totalBudget - summary.expensesTotal
            const amount = Math.abs(delta)
            if (amount < 0.01) return null
            const isSurplus = delta > 0
            const blend = getBlendedRateAndHorizon(opportunityCostSaved)
            const projected = blend && amount > 0 ? compoundGrowth(amount, blend.rate, blend.horizonYears) : null
            return (
              <div className={`rounded-xl border p-5 ${isSurplus ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-xl">{isSurplus ? '🎯' : '⚠️'}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {isSurplus ? (
                        <>Under budget by <span className="text-emerald-400">{formatMoney(amount)}</span> this period</>
                      ) : (
                        <>Over budget by <span className="text-red-400">{formatMoney(amount)}</span> this period</>
                      )}
                    </p>
                    {blend && projected != null && projected > 0 ? (
                      <p className="mt-2 text-sm text-gray-400">
                        {isSurplus ? (
                          <>If you invested this surplus, it could grow to{' '}
                            <span className="font-bold text-emerald-400">{formatMoney(Math.round(projected))}</span>
                            {' '}in {blend.horizonYears} years.</>
                        ) : (
                          <>That overspend would have been worth{' '}
                            <span className="font-bold text-red-300">{formatMoney(Math.round(projected))}</span>
                            {' '}in {blend.horizonYears} years if invested. Every overspend has a future cost.</>
                        )}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowInvestmentProfileModal(true)}
                        className="mt-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        Set your investment profile to see the real long-term cost →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {showTransactionForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => { setShowTransactionForm(false); setEditingTransaction(null) }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-expense-modal-title"
            >
              <div
                className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-gray-800 bg-slate-900 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-3">
                  <h2 id="add-expense-modal-title" className="text-lg font-semibold text-white">
                    {editingTransaction ? 'Edit expense' : 'Add expense'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setShowTransactionForm(false); setEditingTransaction(null) }}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    Close
                  </button>
                </div>
                <div className="min-h-0 overflow-y-auto p-4">
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
                </div>
              </div>
            </div>
          )}

          {categoryIdToDelete && (
            <div
              className={modal.backdrop}
              onClick={() => setCategoryIdToDelete(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-category-title"
            >
              <div
                className={`${modal.box} max-w-sm`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`${modal.header} justify-center relative`}>
                  <h2 id="delete-category-title" className={modal.title}>
                    Delete category?
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCategoryIdToDelete(null)}
                    className={`${modal.closeBtn} absolute right-0 top-1/2 -translate-y-1/2`}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className={`${modal.footer} justify-center`}>
                  <button
                    type="button"
                    onClick={() => setCategoryIdToDelete(null)}
                    className={btn.secondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteCategory(categoryIdToDelete)
                      setCategoryIdToDelete(null)
                    }}
                    className={btn.danger}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-300">Category breakdown</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {expenseCategories.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  spent={spent[cat.id] ?? 0}
                  onAddExpense={() => setCategoryIdAddingExpense(cat.id)}
                  onEdit={(c) => setEditingCategoryId(c.id)}
                  onDelete={(id) => setCategoryIdToDelete(id)}
                  isEditing={editingCategoryId === cat.id}
                  isAddingExpense={categoryIdAddingExpense === cat.id}
                  onCancelAddExpense={() => setCategoryIdAddingExpense(null)}
                  onAddExpenseSubmit={(tx) => {
                    addTransaction(tx)
                    setCategoryIdAddingExpense(null)
                  }}
                  defaultDate={defaultTransactionDate}
                  minDate={currentBudget.startDate}
                  maxDate={currentBudget.endDate}
                  onSave={(id, updates) => {
                    editCategory(id, updates)
                    setEditingCategoryId(null)
                  }}
                  onCancelEdit={() => setEditingCategoryId(null)}
                  colorsUsedByOtherCategories={expenseCategories.filter((c) => c.id !== cat.id).map((c) => c.color ?? 'text-white')}
                />
              ))}
              {showAddCategoryInline ? (
                <div
                  ref={addCategoryFormRef}
                  className="rounded-xl border border-gray-800 bg-slate-900/60 p-3 shadow-lg shadow-black/20 transition hover:border-gray-700"
                  role="article"
                  aria-label="Add category"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const name = newCatName.trim()
                      if (!name) {
                        setNewCatNameError(true)
                        return
                      }
                      setNewCatNameError(false)
                      addCategory(name, parseFloat(newCatBudget) || 0, newCatColor)
                      setNewCatName('')
                      setNewCatBudget('0')
                      setNewCatColor('text-sky-500')
                      setShowAddCategoryInline(false)
                    }
                  }}
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <input
                      ref={addCategoryNameInputRef}
                      type="text"
                      value={newCatName}
                      onChange={(e) => { setNewCatName(e.target.value); setNewCatNameError(false) }}
                      placeholder="Category name"
                      className={`min-w-0 flex-1 rounded border px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 ${newCatNameError ? 'border-red-500 bg-slate-900 ring-2 ring-red-500' : 'border-gray-700 bg-slate-900 focus:border-cyan-500'}`}
                    />
                    <ColorSelect value={newCatColor} onChange={setNewCatColor} className="shrink-0 [&_button]:min-w-0 [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-xs" disabledColors={expenseCategories.map((c) => c.color ?? 'text-white')} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">budget</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newCatBudget}
                      onChange={(e) => setNewCatBudget(e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="Budget"
                      className="w-20 rounded border border-gray-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const name = newCatName.trim()
                          if (!name) {
                            setNewCatNameError(true)
                            return
                          }
                          setNewCatNameError(false)
                          addCategory(name, parseFloat(newCatBudget) || 0, newCatColor)
                          setNewCatName('')
                          setNewCatBudget('0')
                          setNewCatColor('text-sky-500')
                          setShowAddCategoryInline(false)
                        }}
                        className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryInline(false)
                          setNewCatName('')
                          setNewCatNameError(false)
                          setNewCatBudget('0')
                          setNewCatColor('text-sky-500')
                        }}
                        className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const used = expenseCategories.map((c) => c.color ?? 'text-white')
                    const firstUnused = PRESET_COLOR_VALUES.find((v) => !used.includes(v)) ?? PRESET_COLOR_VALUES[0]
                    setNewCatColor(firstUnused ?? 'text-white')
                    setNewCatNameError(false)
                    setShowAddCategoryInline(true)
                  }}
                  className="flex min-h-[94px] items-center justify-center rounded-xl border border-gray-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 transition hover:border-gray-700 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  aria-label="Add category"
                >
                  <span className="text-3xl font-light text-gray-500">+</span>
                </button>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-300">Expenses history</h2>
            {currentBudget.transactions.length === 0 && !showTransactionForm ? (
              <div className={emptyState.wrapper}>
                <div className={emptyState.icon}>
                  <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className={emptyState.title}>No transactions yet.</p>
                <p className={emptyState.subtitle}>Use the + on a category card to add a transaction.</p>
              </div>
            ) : (
              <TransactionList
                transactions={currentBudget.transactions}
                categories={currentBudget.categories}
                onEdit={(tx) => { setEditingTransaction(tx); setShowTransactionForm(true) }}
                onDelete={deleteTransaction}
              />
            )}
          </section>
        </>
      )}

      {!currentBudget && (
        <div className={loadingState.box}>
          <div className={loadingState.spinner} aria-hidden />
          <span>Loading budget…</span>
        </div>
      )}

      {/* Investment profile modal */}
      {showInvestmentProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowInvestmentProfileModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="investment-profile-modal-title"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-[700px] flex-col rounded-xl border border-gray-800 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-3">
              <h2 id="investment-profile-modal-title" className="text-lg font-semibold text-white">
                My Investment Profile
              </h2>
              <button
                type="button"
                onClick={() => setShowInvestmentProfileModal(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-4 text-white">
              <OpportunityCost embedded />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}