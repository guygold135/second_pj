import { useState, useEffect, useRef } from 'react'
import { useCurrency } from '../../contexts/CurrencyContext'
import type { BudgetCategory, BudgetTransaction } from '../../types'
import { btn } from '../../styles/designSystem'
import { getCategoryColorHex } from './categoryColors'
import { ColorSelect } from './CategoryManager'

interface CategoryCardProps {
  category: BudgetCategory
  spent: number
  onAddExpense?: (category: BudgetCategory) => void
  onEdit?: (category: BudgetCategory) => void
  onDelete?: (categoryId: string) => void
  isEditing?: boolean
  isAddingExpense?: boolean
  onCancelAddExpense?: () => void
  onAddExpenseSubmit?: (tx: Omit<BudgetTransaction, 'id'>) => void
  defaultDate?: string
  minDate?: string
  maxDate?: string
  onSave?: (id: string, updates: { name?: string; budget?: number; color?: string }) => void
  onCancelEdit?: () => void
  colorsUsedByOtherCategories?: string[]
}

export function CategoryCard({ category, spent, onAddExpense, onEdit, onDelete, isEditing, isAddingExpense, onCancelAddExpense, onAddExpenseSubmit, defaultDate = '', minDate = '', maxDate = '', onSave, onCancelEdit, colorsUsedByOtherCategories = [] }: CategoryCardProps) {
  const { formatMoney } = useCurrency()
  const [editName, setEditName] = useState(category.name)
  const [editBudget, setEditBudget] = useState(String(category.budget ?? 0))
  const [editColor, setEditColor] = useState(category.color ?? 'text-white')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(defaultDate)
  const [expenseAmountError, setExpenseAmountError] = useState('')
  const addExpenseBlockRef = useRef<HTMLDivElement>(null)
  const expenseAmountInputRef = useRef<HTMLInputElement>(null)
  const expenseDescriptionRef = useRef<HTMLTextAreaElement>(null)

  const [editNameError, setEditNameError] = useState(false)

  useEffect(() => {
    if (isEditing) {
      setEditName(category.name)
      setEditBudget(String(category.budget ?? 0))
      setEditColor(category.color ?? 'text-white')
      setEditNameError(false)
    }
  }, [isEditing, category.id, category.name, category.budget, category.color])

  useEffect(() => {
    if (isAddingExpense) {
      const d = new Date()
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      setExpenseDate(today)
      setExpenseAmount('')
      setExpenseDescription('')
      setExpenseAmountError('')
      const t = setTimeout(() => {
        expenseAmountInputRef.current?.focus()
        if (expenseDescriptionRef.current) expenseDescriptionRef.current.style.height = 'auto'
      }, 0)
      return () => clearTimeout(t)
    }
  }, [isAddingExpense])

  useEffect(() => {
    if (!isAddingExpense || !onCancelAddExpense) return
    const handleClickOutside = (e: MouseEvent) => {
      if (addExpenseBlockRef.current && !addExpenseBlockRef.current.contains(e.target as Node)) {
        onCancelAddExpense()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isAddingExpense, onCancelAddExpense])

  const budget = category.budget || 0
  const percent = budget > 0 ? (spent / budget) * 100 : 0
  const overBy = spent - budget
  const isOverBudget = overBy > 0 && (budget > 0 ? percent > 100 : true)
  const textColor = category.color ?? 'text-white'
  const fillHex = getCategoryColorHex(category.color ?? 'text-white')

  const editBlockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isEditing || !onCancelEdit) return
    const handleClickOutside = (e: MouseEvent) => {
      if (editBlockRef.current && !editBlockRef.current.contains(e.target as Node)) {
        onCancelEdit()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, onCancelEdit])

  const handleAddExpenseSubmit = () => {
    const num = parseFloat(expenseAmount.replace(/,/g, ''))
    if (!onAddExpenseSubmit || Number.isNaN(num) || num <= 0) {
      if (onAddExpenseSubmit) setExpenseAmountError('Enter a valid positive amount')
      return
    }
    setExpenseAmountError('')
    onAddExpenseSubmit({
      type: 'expense',
      amount: num,
      categoryId: category.id,
      description: expenseDescription.trim() || undefined,
      date: expenseDate,
    })
  }

  const handleSave = () => {
    if (!onSave) return
    if (!editName.trim()) {
      setEditNameError(true)
      return
    }
    setEditNameError(false)
    onSave(category.id, {
      name: editName.trim() || undefined,
      budget: parseFloat(editBudget) || 0,
      color: editColor || undefined,
    })
  }

  if (isEditing && onSave && onCancelEdit) {
    return (
      <div
        ref={editBlockRef}
        className="rounded-xl border border-gray-800 bg-slate-900/60 p-3 shadow-lg shadow-black/20 transition hover:border-gray-700"
        role="article"
        aria-label={`Editing ${category.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSave()
          }
        }}
      >
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <input
            type="text"
            value={editName}
            onChange={(e) => { setEditName(e.target.value); setEditNameError(false) }}
            placeholder="Category name"
            className={`min-w-0 flex-1 rounded border px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 ${editNameError ? 'border-red-500 bg-slate-900 ring-2 ring-red-500' : 'border-gray-700 bg-slate-900 focus:border-cyan-500'}`}
          />
          <ColorSelect value={editColor} onChange={setEditColor} className="shrink-0 [&_button]:min-w-0 [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-xs" disabledColors={colorsUsedByOtherCategories} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400">budget</span>
          <input
            type="text"
            inputMode="decimal"
            value={editBudget}
            onChange={(e) => setEditBudget(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="Budget"
            className="w-20 rounded border border-gray-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={handleSave} className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900">
              Done
            </button>
            <button type="button" onClick={onCancelEdit} className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900">
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isAddingExpense && onAddExpenseSubmit && onCancelAddExpense) {
    return (
      <div
        ref={addExpenseBlockRef}
        className="rounded-xl border border-gray-800 bg-slate-900/60 p-3 shadow-lg shadow-black/20 transition hover:border-gray-700"
        role="article"
        aria-label={`Add expense to ${category.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleAddExpenseSubmit()
          }
        }}
      >
        <div className="mb-1.5 space-y-1.5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <input
                ref={expenseAmountInputRef}
                type="text"
                inputMode="decimal"
                value={expenseAmount}
                onChange={(e) => {
                  setExpenseAmount(e.target.value.replace(/[^\d.]/g, ''))
                  if (expenseAmountError) setExpenseAmountError('')
                }}
                placeholder="0.00"
                className={`w-full rounded border px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 ${expenseAmountError ? 'border-red-500 bg-slate-900 ring-2 ring-red-500' : 'border-gray-700 bg-slate-900 focus:border-cyan-500'}`}
              />
            </div>
            <div className="shrink-0">
              <input
                type="date"
                value={expenseDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded border border-gray-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none min-w-[8rem]"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-1.5">
            <textarea
              ref={expenseDescriptionRef}
              value={expenseDescription}
              rows={1}
              onChange={(e) => {
                setExpenseDescription(e.target.value)
                const el = e.target
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }}
              placeholder="description"
              className="min-w-0 flex-1 resize-none overflow-hidden rounded border border-gray-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddExpenseSubmit}
              className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 shrink-0"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onCancelAddExpense}
              className="rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-gray-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 transition hover:border-gray-700"
      role="article"
      aria-label={`Category ${category.name}: ${spent} of ${budget} spent`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-medium ${textColor}`}>{category.name}</span>
        <div className="flex shrink-0 items-center gap-0.5">
          {onAddExpense && (
            <button
              type="button"
              onClick={() => onAddExpense(category)}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-orange-500/10 hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              aria-label={`Add expense to ${category.name}`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(category)}
              className={btn.iconEdit}
              aria-label={`Edit ${category.name}`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(category.id)}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50"
              aria-label={`Delete ${category.name}`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className={`mb-1 flex justify-between text-xs ${budget > 0 ? 'font-medium text-gray-300' : 'text-gray-400'}`}>
        <span>{formatMoney(spent)} / {formatMoney(budget)}</span>
        <span>{budget > 0 ? `${Math.round(percent)}%` : '—'}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700 category-card-progress-track">
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${Math.min(100, percent)}%`, backgroundColor: fillHex }}
        />
      </div>
      {isOverBudget && (
        <p className="mt-1 text-xs text-red-400">Over budget by {formatMoney(overBy)}</p>
      )}
    </div>
  )
}
