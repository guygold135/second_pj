import { useState, useId, useEffect, useRef } from 'react'
import type { BudgetCategory, BudgetTransaction } from '../../types'
import { card, input, btn } from '../../styles/designSystem'

interface TransactionFormProps {
  categories: BudgetCategory[]
  defaultDate: string
  minDate: string
  maxDate: string
  onSubmit: (tx: Omit<BudgetTransaction, 'id'>) => void
  onCancel?: () => void
  initial?: Partial<BudgetTransaction>
}

export function TransactionForm({
  categories,
  defaultDate,
  minDate,
  maxDate,
  onSubmit,
  onCancel,
  initial,
}: TransactionFormProps) {
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [date, setDate] = useState(initial?.date ?? defaultDate)
  const [amountError, setAmountError] = useState('')

  const amountRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  const amountId = useId()
  const categoryIdId = useId()
  const descId = useId()
  const dateId = useId()

  const safeCategoryId = categoryId && categories.some((c) => c.id === categoryId)
    ? categoryId
    : categories[0]?.id ?? ''

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id)
    }
  }, [categories])

  useEffect(() => {
    // When opening add/edit, start at amount for fast entry.
    amountRef.current?.focus()
    amountRef.current?.select()
  }, [])

  const focusByIndex = (idx: number) => {
    const order: Array<HTMLInputElement | HTMLSelectElement | null> = [
      amountRef.current,
      categoryRef.current,
      descRef.current,
      dateRef.current,
    ]
    const el = order[Math.max(0, Math.min(order.length - 1, idx))]
    if (!el) return
    el.focus()
    // Select amount text to allow quick overwrite.
    if (el === amountRef.current && 'select' in el) (el as HTMLInputElement).select()
  }

  const handleArrowNav = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    idx: number
  ) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return

    e.preventDefault()
    focusByIndex(e.key === 'ArrowDown' ? idx + 1 : idx - 1)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount.replace(/,/g, ''))
    if (Number.isNaN(num) || num <= 0) {
      setAmountError('Enter a valid positive amount')
      return
    }
    setAmountError('')
    onSubmit({
      type: 'expense',
      amount: num,
      categoryId: safeCategoryId,
      description: description.trim() || undefined,
      date,
    })
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${card} p-4`}>
      <div>
        <label htmlFor={amountId} className="mb-1 block text-xs font-medium text-gray-400">
          Amount *
        </label>
        <input
          id={amountId}
          type="text"
          inputMode="decimal"
          value={amount}
          ref={amountRef}
          onChange={(e) => {
            setAmount(e.target.value.replace(/[^\d.]/g, ''))
            if (amountError) setAmountError('')
          }}
          onKeyDown={(e) => handleArrowNav(e, 0)}
          className={amountError ? input.error : input.base}
          placeholder="0.00"
          aria-invalid={!!amountError}
          aria-describedby={amountError ? `${amountId}-error` : undefined}
        />
        {amountError && (
          <p id={`${amountId}-error`} className="mt-1 text-xs text-red-400">
            {amountError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={categoryIdId} className="mb-1 block text-xs font-medium text-gray-400">
          Category *
        </label>
        <select
          id={categoryIdId}
          value={safeCategoryId}
          ref={categoryRef}
          onChange={(e) => setCategoryId(e.target.value)}
          onKeyDown={(e) => handleArrowNav(e, 1)}
          className={input.select}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={descId} className="mb-1 block text-xs font-medium text-gray-400">
          Description (optional)
        </label>
        <input
          id={descId}
          type="text"
          value={description}
          ref={descRef}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => handleArrowNav(e, 2)}
          className={input.base}
          placeholder="e.g. Weekly groceries"
        />
      </div>

      <div>
        <label htmlFor={dateId} className="mb-1 block text-xs font-medium text-gray-400">
          Date *
        </label>
        <input
          id={dateId}
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          ref={dateRef}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={(e) => handleArrowNav(e, 3)}
          className={input.base}
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" className={`flex-1 ${btn.primary}`}>
          Save
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btn.secondary}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
