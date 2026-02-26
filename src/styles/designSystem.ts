/**
 * Unified design system — single source of truth for spacing, colors, typography,
 * buttons, inputs, modals, progress bars, empty/loading states, and animations.
 * Use these class names across the app for a consistent, polished feel.
 */

// ─── Tokens (reference; actual values in Tailwind / index.css) ─────────────
// Primary: cyan-500/600. Accent links: cyan-400. Danger: red-500. Success: emerald-500.
// Border: gray-700/800. Background cards: slate-800/900. Text: white, gray-400/500.

// ─── Buttons ────────────────────────────────────────────────────────────────
export const btn = {
  primary:
    'rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-cyan-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
  secondary:
    'rounded-lg border border-gray-600 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-gray-200 transition-all duration-200 hover:border-gray-500 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
  danger:
    'rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-[0.98]',
  ghost:
    'rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-500/50',
  iconDanger:
    'rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50',
  outline:
    'rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition-all duration-200 hover:bg-cyan-500/20 hover:border-cyan-500/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
}

// ─── Form inputs ────────────────────────────────────────────────────────────
export const input = {
  base:
    'w-full rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:ring-offset-0',
  error:
    'w-full rounded-lg border border-red-500 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30',
  select:
    'w-full rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white transition-colors duration-200 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30',
}

// Error message (below a field)
export const fieldError = 'mt-1 text-xs text-red-400'

// ─── Alerts / messages ─────────────────────────────────────────────────────
export const alert = {
  error: 'rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200',
  success: 'rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200',
  warning: 'rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100',
}

// ─── Modal ──────────────────────────────────────────────────────────────────
export const modal = {
  backdrop:
    'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200',
  box: 'w-full max-w-md rounded-xl border border-gray-800 bg-slate-900 shadow-2xl transition-all duration-200',
  header: 'flex items-center justify-between border-b border-gray-800 px-5 py-4',
  title: 'text-base font-semibold text-white',
  body: 'px-5 py-4 space-y-4',
  footer: 'flex gap-3 border-t border-gray-800 px-5 py-4',
  closeBtn:
    'rounded-lg p-1.5 text-gray-400 transition-colors duration-200 hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
}

// ─── Progress bar ───────────────────────────────────────────────────────────
export const progress = {
  track: 'h-2 w-full overflow-hidden rounded-full bg-slate-700',
  fill:
    'h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300 ease-out',
}

// ─── Empty state ───────────────────────────────────────────────────────────
export const emptyState = {
  wrapper:
    'flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-16 text-center',
  icon: 'mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800 text-2xl text-gray-500',
  title: 'text-sm font-medium text-gray-300',
  subtitle: 'mt-1 text-xs text-gray-500',
}

// ─── Loading state ─────────────────────────────────────────────────────────
export const loadingState = {
  inline: 'text-sm text-gray-500',
  box:
    'flex items-center justify-center gap-2 rounded-xl border border-gray-800 bg-slate-900/40 py-12 text-sm text-gray-400',
  spinner:
    'h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-cyan-500',
}

// ─── Drag handle ───────────────────────────────────────────────────────────
export const dragHandle =
  'cursor-grab touch-none shrink-0 rounded p-1 text-gray-500 transition-colors duration-200 hover:text-gray-300 active:cursor-grabbing'

// ─── Card ──────────────────────────────────────────────────────────────────
export const card =
  'rounded-xl border border-gray-800/60 bg-slate-900/50 p-5 shadow-xl shadow-black/40 transition-colors duration-200 hover:border-gray-700/80'

// ─── Page container (main content wrapper) ─────────────────────────────────
export const pageContainer =
  'mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'

// ─── Section title ─────────────────────────────────────────────────────────
export const sectionTitle =
  'text-sm font-semibold uppercase tracking-wider text-gray-400'

// ─── Focus ring (utility) ───────────────────────────────────────────────────
export const focusRing = 'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900'
