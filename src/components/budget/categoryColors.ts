/** Map Tailwind text color class to hex for category bars and swatches. */
export const CATEGORY_COLOR_HEX: Record<string, string> = {
  // New high-contrast palette (preferred)
  'text-white': '#ffffff',
  'text-red-500': '#ef4444',
  'text-orange-500': '#f97316',
  'text-amber-500': '#f59e0b',
  'text-yellow-500': '#eab308',
  'text-lime-500': '#84cc16',
  'text-green-500': '#22c55e',
  'text-emerald-500': '#10b981',
  'text-teal-500': '#14b8a6',
  'text-cyan-500': '#06b6d4',
  'text-sky-500': '#0ea5e9',
  'text-blue-500': '#3b82f6',
  'text-indigo-500': '#6366f1',
  'text-violet-500': '#8b5cf6',
  'text-purple-500': '#a855f7',
  'text-fuchsia-500': '#d946ef',
  'text-pink-500': '#ec4899',
  'text-rose-500': '#f43f5e',
  'text-stone-500': '#78716c',
  'text-slate-400': '#94a3b8',

  // Backward compatibility (already-saved categories)
  'text-amber-400': '#fbbf24',
  'text-emerald-400': '#34d399',
  'text-blue-400': '#60a5fa',
  'text-cyan-400': '#22d3ee',
  'text-violet-400': '#a78bfa',
  'text-pink-400': '#f472b6',
  'text-rose-400': '#fb7185',
  'text-orange-400': '#fb923c',
  'text-lime-400': '#a3e635',
  'text-teal-400': '#2dd4bf',
  'text-indigo-400': '#818cf8',
  'text-sky-400': '#38bdf8',
  'text-fuchsia-400': '#e879f9',
  'text-red-400': '#f87171',
  'text-yellow-400': '#facc15',
  'text-green-400': '#4ade80',
  'text-purple-400': '#c084fc',
  'text-gray-400': '#9ca3af',
}

const DEFAULT_HEX = '#9ca3af'

export function getCategoryColorHex(tailwindClass?: string | null): string {
  if (!tailwindClass) return DEFAULT_HEX
  return CATEGORY_COLOR_HEX[tailwindClass] ?? DEFAULT_HEX
}
