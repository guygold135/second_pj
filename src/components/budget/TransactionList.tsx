import { useState, useMemo } from 'react'
import { useCurrency } from '../../contexts/CurrencyContext'
import type { BudgetCategory, BudgetTransaction } from '../../types'
import { btn, input } from '../../styles/designSystem'

type SortKey = 'date' | 'amount' | 'category'

interface TransactionListProps {
  transactions: BudgetTransaction[]
  categories: BudgetCategory[]
  onEdit: (tx: BudgetTransaction) => void
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, categories, onEdit, onDelete }: TransactionListProps) {
  const { formatMoney } = useCurrency()
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const [sortDesc, setSortDesc] = useState(true)
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [search, setSearch] = useState('')

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'

  const filtered = useMemo(() => {
    let list = transactions
    if (filterCategoryId) list = list.filter((t) => t.categoryId === filterCategoryId)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (t) =>
          categoryName(t.categoryId).toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false)
      )
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'date') {
        const aMs = Date.parse(a.date)
        const bMs = Date.parse(b.date)
        const aTime = Number.isFinite(aMs) ? aMs : 0
        const bTime = Number.isFinite(bMs) ? bMs : 0
        cmp = aTime - bTime

        // Stable + consistent placement for same-day transactions:
        // newer createdAt should appear first in descending mode.
        if (cmp === 0) {
          const aCreated = a.createdAt ?? 0
          const bCreated = b.createdAt ?? 0
          cmp = aCreated - bCreated
        }
      }
      else if (sortBy === 'amount') cmp = a.amount - b.amount
      else cmp = categoryName(a.categoryId).localeCompare(categoryName(b.categoryId))
      return sortDesc ? -cmp : cmp
    })
  }, [transactions, filterCategoryId, search, sortBy, sortDesc, categories])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className={input.base}
          aria-label="Search transactions"
        />
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className={input.select}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-gray-700 bg-slate-900">
          <label htmlFor="sort-select" className="sr-only">
            Sort by
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => {
              const next = e.target.value as SortKey
              setSortBy(next)
              // Keep Date as default (newest first) and make Amount default to highest first.
              if (next === 'date' || next === 'amount') setSortDesc(true)
              if (next === 'category') setSortDesc(false)
            }}
            className="cursor-pointer rounded-l-lg border-0 bg-slate-900 px-3 py-2 text-sm text-white focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="category">Category</option>
          </select>
          <button
            type="button"
            onClick={() => setSortDesc((d) => !d)}
            className="border-l border-gray-700 px-2 py-2 text-gray-400 hover:text-white"
            aria-label={sortDesc ? 'Sort ascending' : 'Sort descending'}
          >
            {sortDesc ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-slate-900/60">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-gray-400">No transactions match.</p>
        ) : (
          <ul className="divide-y divide-gray-800" role="list">
            {filtered.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3 transition hover:bg-slate-800/50"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-red-400">
                    -{formatMoney(tx.amount)}
                  </span>
                  <span className="ml-2 text-gray-400">{categoryName(tx.categoryId)}</span>
                  {tx.description && (
                    <p className="truncate text-sm text-gray-500">{tx.description}</p>
                  )}
                  <p className="text-xs text-gray-500">{formatDate(tx.date)}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(tx)}
                    className={btn.iconEdit}
                    aria-label="Edit transaction"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tx.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    aria-label="Delete transaction"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}
