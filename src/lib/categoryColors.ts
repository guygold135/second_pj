/**
 * Category colors for calendar event chips (missions and goals).
 * Shared palette for category colors (e.g. goals/missions).
 */

const CATEGORY_TO_HEX: Record<string, string> = {
  Work: '#06b6d4',
  Personal: '#8b5cf6',
  Health: '#10b981',
  Study: '#f59e0b',
}

const GOAL_COLORS = ['#6366f1', '#4f46e5', '#7c3aed', '#2563eb']
const DEFAULT_HEX = '#64748b'

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

/** Get background color hex for a mission/goal category (for calendar pills). */
export function getCalendarCategoryColor(category: string): string {
  if (CATEGORY_TO_HEX[category]) return CATEGORY_TO_HEX[category]
  if (category.startsWith('goal:')) {
    const id = category.slice(5)
    return GOAL_COLORS[hashId(id) % GOAL_COLORS.length]
  }
  return DEFAULT_HEX
}
