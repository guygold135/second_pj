import type { BudgetCategory, BudgetTransaction, BudgetSummary } from '../../types'

export function getMonthStartEnd(date: Date): { start: string; end: string } {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return {
    start: `${y}-${m}-01`,
    end: new Date(y, date.getMonth() + 1, 0).toISOString().slice(0, 10),
  }
}

export function getQuarterStartEnd(date: Date): { start: string; end: string } {
  const y = date.getFullYear()
  const q = Math.floor(date.getMonth() / 3) + 1
  const startM = (q - 1) * 3 + 1
  const endM = q * 3
  return {
    start: `${y}-${String(startM).padStart(2, '0')}-01`,
    end: new Date(y, endM, 0).toISOString().slice(0, 10),
  }
}

export function getYearStartEnd(date: Date): { start: string; end: string } {
  const y = date.getFullYear()
  return { start: `${y}-01-01`, end: `${y}-12-31` }
}

export function addMonth(start: string, delta: number): { start: string; end: string } {
  const d = new Date(start + 'T12:00:00')
  d.setMonth(d.getMonth() + delta)
  return getMonthStartEnd(d)
}

export function addQuarter(start: string, delta: number): { start: string; end: string } {
  const d = new Date(start + 'T12:00:00')
  d.setMonth(d.getMonth() + delta * 3)
  return getQuarterStartEnd(d)
}

export function addYear(start: string, delta: number): { start: string; end: string } {
  const d = new Date(start + 'T12:00:00')
  d.setFullYear(d.getFullYear() + delta)
  return getYearStartEnd(d)
}

export function formatPeriodLabel(type: 'month' | 'quarter' | 'year', start: string): string {
  const d = new Date(start + 'T12:00:00')
  if (type === 'month') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  if (type === 'quarter') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} ${d.getFullYear()}`
  }
  return String(d.getFullYear())
}

export function computeSummary(transactions: BudgetTransaction[]): BudgetSummary {
  const incomeTotal = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expensesTotal = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { incomeTotal, expensesTotal, surplus: incomeTotal - expensesTotal }
}

export function spentByCategory(transactions: BudgetTransaction[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount
  }
  return out
}

export function totalPlannedBudget(categories: BudgetCategory[]): number {
  return categories
    .filter((c) => c.name.toLowerCase() !== 'income')
    .reduce((s, c) => {
      const n = typeof c.budget === 'number' ? c.budget : Number(c.budget)
      return s + (Number.isFinite(n) ? n : 0)
    }, 0)
}

export function executionPercent(transactions: BudgetTransaction[], categories: BudgetCategory[]): number {
  const planned = totalPlannedBudget(categories)
  if (planned <= 0) return 0
  const spent = Object.values(spentByCategory(transactions)).reduce((a, b) => a + b, 0)
  return (spent / planned) * 100
}
