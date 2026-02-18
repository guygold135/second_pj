import { useCurrency } from '../../contexts/CurrencyContext'
import type { BudgetCategory } from '../../types'
import { getCategoryColorHex } from './categoryColors'

interface CategoryCardProps {
  category: BudgetCategory
  spent: number
  onEdit?: (category: BudgetCategory) => void
}

export function CategoryCard({ category, spent, onEdit }: CategoryCardProps) {
  const { formatMoney } = useCurrency()
  const budget = category.budget || 0
  const percent = budget > 0 ? (spent / budget) * 100 : 0
  const overBy = spent - budget
  const isOverBudget = overBy > 0 && (budget > 0 ? percent > 100 : true)
  const textColor = category.color ?? 'text-white'
  const fillHex = getCategoryColorHex(category.color ?? 'text-white')

  return (
    <div
      className="rounded-xl border border-gray-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 transition hover:border-gray-700"
      role="article"
      aria-label={`Category ${category.name}: ${spent} of ${budget} spent`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`font-medium ${textColor}`}>{category.name}</span>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="rounded p-1 text-gray-500 hover:bg-slate-800 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            aria-label={`Edit ${category.name}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      <div className="mb-1 flex justify-between text-xs text-gray-400">
        <span>{formatMoney(spent)} / {formatMoney(budget)}</span>
        <span>{budget > 0 ? `${Math.round(Math.min(999, percent))}%` : '—'}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
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
