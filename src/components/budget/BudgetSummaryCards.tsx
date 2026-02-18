import { useCurrency } from '../../contexts/CurrencyContext'
import type { BudgetSummary } from '../../types'

export interface CategorySegment {
  spentAmount: number
  colorHex: string
  name?: string
}

interface BudgetSummaryCardsProps {
  summary: BudgetSummary
  totalBudget?: number
  executionPercent?: number
  categorySegments?: CategorySegment[]
  title?: string
}

export function BudgetSummaryCards({
  summary,
  totalBudget = 0,
  executionPercent,
  categorySegments = [],
  title = 'Total expenses & budget',
}: BudgetSummaryCardsProps) {
  const { formatMoney } = useCurrency()
  const exec = executionPercent ?? 0
  const remaining = totalBudget - summary.expensesTotal
  const totalSpent = summary.expensesTotal
  const hasSegments = categorySegments.length > 0 && totalSpent > 0
  const execTextColor =
    exec >= 175 ? 'text-red-500'
    : exec >= 125 ? 'text-orange-500'
    : exec >= 110 ? 'text-orange-400'
    : exec >= 100 ? 'text-yellow-400'
    : 'text-cyan-400'

  return (
    <div className="rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30 transition-colors">
      <div className="grid grid-cols-[1fr_auto] gap-6">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{title}</p>
          <div className="mt-1 space-y-1">
            <p className="text-xl text-gray-400">
              <span className="font-semibold text-orange-500">{formatMoney(summary.expensesTotal)}</span>
              {' spent out of '}
              <span className="font-semibold text-blue-400">{formatMoney(totalBudget)}</span>
            </p>
            <p className="text-sm text-gray-400">
              {remaining >= 0 ? 'Remaining:' : 'Over budget:'}{' '}
              <span className={remaining >= 0 ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>
                {formatMoney(remaining)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end">
          <p className={`whitespace-nowrap text-xl font-bold ${execTextColor}`}>{formatPercent(exec)} spent</p>
        </div>
      </div>
      <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-700">
        {hasSegments ? (
          <div className="flex h-full w-full" style={{ width: `${Math.min(100, exec)}%` }}>
            {categorySegments.map((seg, i) => {
              const widthPct = totalSpent > 0 ? (seg.spentAmount / totalSpent) * 100 : 0
              const showLabel = seg.name && widthPct >= 12
              return (
                <div
                  key={i}
                  className="relative flex h-full min-w-0 items-center justify-center border-r border-slate-600/80 transition-[width] duration-300 first:rounded-l-full last:rounded-r-full last:border-r-0"
                  style={{ width: `${widthPct}%`, backgroundColor: seg.colorHex, minWidth: widthPct > 0 ? 2 : 0 }}
                >
                  {showLabel && (
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap px-1 text-[10px] font-medium text-slate-900 drop-shadow-sm">
                      {seg.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300"
            style={{ width: `${Math.min(100, exec)}%` }}
          />
        )}
      </div>
    </div>
  )
}

function formatPercent(n: number): string {
  return `${Math.round(Math.min(999, Math.max(0, n)))}%`
}
