import type { BudgetCategory } from '../../types'

/** Default category names for new budgets. */
export const DEFAULT_CATEGORY_NAMES = [
  'Fuel',
  'Groceries',
  'Electricity',
  'Water',
  'Property tax',
  'Clothing',
  'Entertainment',
  'Restaurants',
  'Health',
  'Transportation',
  'Insurance',
  'Phone & Internet',
  'Subscriptions',
  'Other',
] as const

const CATEGORY_COLORS = [
  // High-contrast defaults so new budgets are easier to scan.
  'text-sky-500',
  'text-orange-500',
  'text-blue-500',
  'text-amber-500',
  'text-indigo-500',
  'text-yellow-500',
  'text-violet-500',
  'text-lime-500',
  'text-fuchsia-500',
  'text-green-500',
  'text-pink-500',
  'text-emerald-500',
  'text-teal-500',
  'text-stone-500',
]

/**
 * Build default categories with ids and colors. Call with uuid to generate ids.
 */
export function buildDefaultCategories(createId: () => string): BudgetCategory[] {
  return DEFAULT_CATEGORY_NAMES.map((name, i) => ({
    id: createId(),
    name,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    budget: 0,
  }))
}
