import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { OnboardingOverlay, shouldShowOnboarding } from '../components/OnboardingOverlay'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../contexts/AuthContext'
import { useMissions, GOAL_FILTER_PREFIX } from '../contexts/MissionsContext'
import { useGoals, type GoalTrackingMode } from '../contexts/GoalsContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { getRandomQuoteForPage } from '../utils/quotes'
import { card, btn, pageContainer } from '../styles/designSystem'
import { getMonthStartEnd, computeSummary, totalPlannedBudget, spentByCategory } from '../components/budget/budgetUtils'
import { getCategoryColorHex } from '../components/budget/categoryColors'
import type { Budget, BudgetSummary } from '../types'
import { supabase } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const BUDGET_STORAGE_KEY = 'budget_app_data'
const DASHBOARD_CONFIG_KEY = 'dashboard_config_v1'

// ─── Types (exported) ─────────────────────────────────────────────────────
export type WidgetSize = 'small' | 'medium' | 'large' | 'full'

export type WidgetType =
  | 'greeting'
  | 'motivation_quote'
  | 'missions_summary'
  | 'goals_summary'
  | 'budget_summary'
  | 'todays_missions'
  | 'goals_progress'
  | 'active_stakes'
  | 'missions_by_category'
  | 'budget_categories'
  | 'recent_completions'
  | 'goals_at_risk'

export interface Widget {
  id: string
  type: WidgetType
  size: WidgetSize
  position: number
}

export type DashboardConfig = Widget[]

const WIDGET_LABELS: Record<WidgetType, string> = {
  greeting: 'Greeting',
  motivation_quote: 'Motivation Quote',
  missions_summary: 'Missions Summary',
  goals_summary: 'Goals Summary',
  budget_summary: 'Budget Summary',
  todays_missions: "Today's Missions",
  goals_progress: 'Goals Progress',
  active_stakes: 'Active Stakes',
  missions_by_category: 'Missions by Category',
  budget_categories: 'Budget Categories',
  recent_completions: 'Recent Completions',
  goals_at_risk: 'Goals at Risk',
}

const WIDGET_SIZES: Record<WidgetType, WidgetSize[]> = {
  greeting: ['small', 'medium', 'full'],
  motivation_quote: ['small', 'medium', 'full'],
  missions_summary: ['small', 'medium'],
  goals_summary: ['small', 'medium'],
  budget_summary: ['small', 'medium', 'large'],
  todays_missions: ['medium', 'large', 'full'],
  goals_progress: ['medium', 'large', 'full'],
  active_stakes: ['small', 'medium', 'full'],
  missions_by_category: ['large', 'full'],
  budget_categories: ['large', 'full'],
  recent_completions: ['medium', 'large'],
  goals_at_risk: ['medium', 'large'],
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = [
  { id: uuidv4(), type: 'greeting', size: 'full', position: 0 },
  { id: uuidv4(), type: 'motivation_quote', size: 'full', position: 1 },
  { id: uuidv4(), type: 'missions_summary', size: 'small', position: 2 },
  { id: uuidv4(), type: 'goals_summary', size: 'small', position: 3 },
  { id: uuidv4(), type: 'budget_summary', size: 'medium', position: 4 },
  { id: uuidv4(), type: 'todays_missions', size: 'medium', position: 5 },
  { id: uuidv4(), type: 'goals_progress', size: 'medium', position: 6 },
]

const KNOWN_WIDGET_TYPES: WidgetType[] = [
  'greeting', 'motivation_quote', 'missions_summary', 'goals_summary', 'budget_summary',
  'todays_missions', 'goals_progress', 'active_stakes', 'missions_by_category', 'budget_categories',
  'recent_completions', 'goals_at_risk',
]

/** Column units per size (row has max 3 units). */
function getColUnits(size: WidgetSize): number {
  switch (size) {
    case 'small': return 1
    case 'medium': return 2
    case 'large': return 3
    case 'full': return 3
    default: return 1
  }
}

/** Greedy bin-pack widgets into rows (each row ≤ 3 units). Full-size widgets get their own row. */
function packWidgetsIntoRows(widgets: Widget[]): Widget[][] {
  const rows: Widget[][] = []
  let currentRow: Widget[] = []
  let currentUnits = 0
  for (const w of widgets) {
    const units = getColUnits(w.size)
    if (w.size === 'full' && currentRow.length > 0) {
      rows.push(currentRow)
      currentRow = []
      currentUnits = 0
    }
    if (w.size === 'full' || currentUnits + units > 3) {
      if (currentRow.length > 0) {
        rows.push(currentRow)
        currentRow = []
        currentUnits = 0
      }
    }
    if (w.size === 'full') {
      rows.push([w])
      continue
    }
    currentRow.push(w)
    currentUnits += units
  }
  if (currentRow.length > 0) rows.push(currentRow)
  return rows
}

/** Width for view mode: left-aligned, natural size (no stretch). */
function getWidgetWidthClass(size: WidgetSize): string {
  switch (size) {
    case 'small': return 'w-[calc(33.33%-0.67rem)] max-w-[calc(33.33%-0.67rem)] flex-shrink-0'
    case 'medium': return 'w-[calc(66.66%-0.33rem)] max-w-[calc(66.66%-0.33rem)] flex-shrink-0'
    case 'large':
    case 'full': return 'w-full flex-shrink-0'
    default: return 'flex-shrink-0'
  }
}

/** Flex basis for edit mode row (by units). */
function getWidgetFlexStyle(size: WidgetSize): { flex: string } {
  const u = getColUnits(size)
  return { flex: `${u} 0 0` }
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getGoalProgressFromMissions(
  goal: {
    id: string
    trackingMode?: string
    progressPercent?: number
    targetHours?: number
    loggedHours?: number
    targetCount?: number
    currentCount?: number
  },
  missions: { goalId?: string; isCompleted: boolean; weightPercent?: number }[],
): number {
  const mode = goal.trackingMode ?? 'missions_equal'
  if (mode === 'time' && goal.targetHours != null && goal.targetHours > 0 && goal.loggedHours != null) {
    return Math.min(100, (goal.loggedHours / goal.targetHours) * 100)
  }
  if (mode === 'count' && goal.targetCount != null && goal.targetCount > 0) {
    const current = goal.currentCount ?? 0
    return Math.min(100, (current / goal.targetCount) * 100)
  }
  const goalMissions = missions.filter((m) => m.goalId === goal.id)
  if (goalMissions.length === 0) return goal.progressPercent ?? 0
  if (mode === 'missions_equal' || mode === 'missions_weighted') {
    if (mode === 'missions_weighted') {
      const completedWeight = goalMissions
        .filter((m) => m.isCompleted)
        .reduce((sum, m) => sum + (m.weightPercent ?? 0), 0)
      return Math.min(100, completedWeight)
    }
    const completed = goalMissions.filter((m) => m.isCompleted).length
    return Math.min(100, (completed / goalMissions.length) * 100)
  }
  return goal.progressPercent ?? 0
}

function GoalIcon({ mode }: { mode?: GoalTrackingMode }) {
  const m = mode ?? 'missions_equal'
  if (m === 'time') {
    return (
      <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    )
  }
  if (m === 'count') {
    return (
      <svg className="h-4 w-4 shrink-0 text-orange-400" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="16" width="4" height="6" rx="0.5" fill="currentColor" />
        <rect x="8" y="12" width="4" height="10" rx="0.5" fill="currentColor" />
        <rect x="13" y="8" width="4" height="14" rx="0.5" fill="currentColor" />
        <rect x="18" y="4" width="4" height="18" rx="0.5" fill="currentColor" />
      </svg>
    )
  }
  return <span className="text-base leading-none" aria-hidden>🎯</span>
}

function stripIncomeCategory(budget: Budget): Budget {
  return { ...budget, categories: budget.categories.filter((c) => c.name.toLowerCase() !== 'income') }
}
function normalizeCategoryBudget(c: Budget['categories'][0]): Budget['categories'][0] {
  const n = typeof c.budget === 'number' ? c.budget : Number(c.budget)
  return { ...c, budget: Number.isFinite(n) ? n : 0 }
}
function normalizeBudget(b: Budget): Budget {
  return { ...b, categories: (b.categories ?? []).map(normalizeCategoryBudget) }
}
function loadBudgetFromLocalStorage(): Budget[] {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as { budgets?: Budget[]; currentId?: string }
    return (data.budgets ?? []).map(stripIncomeCategory).map(normalizeBudget)
  } catch { return [] }
}

// ─── Persistence ──────────────────────────────────────────────────────────
async function loadDashboardConfig(userId: string | undefined): Promise<DashboardConfig> {
  let parsed: unknown[] = []
  if (supabase && userId) {
    try {
      const { data, error } = await supabase.from('user_settings').select('dashboard_config').eq('id', userId).maybeSingle()
      if (!error && data?.dashboard_config != null) {
        const raw = typeof data.dashboard_config === 'string' ? JSON.parse(data.dashboard_config) : data.dashboard_config
        if (Array.isArray(raw)) parsed = raw
      }
    } catch (_) {}
  }
  if (parsed.length === 0) {
    try {
      const raw = localStorage.getItem(DASHBOARD_CONFIG_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p)) parsed = p
      }
    } catch (_) {}
  }
  if (parsed.length === 0) return DEFAULT_DASHBOARD_CONFIG
  const known = (parsed as Widget[]).filter((w) => w && typeof w.id === 'string' && KNOWN_WIDGET_TYPES.includes(w.type as WidgetType))
  const sorted = known.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return sorted.map((w, i) => ({ ...w, position: i }))
}

function saveDashboardConfig(config: DashboardConfig, userId: string | undefined): void {
  const payload = JSON.stringify(config)
  if (supabase && userId) {
    supabase
      .from('user_settings')
      .upsert({ id: userId, dashboard_config: config, user_id: userId }, { onConflict: 'id' })
      .then(({ error }) => { if (error) console.error('[Dashboard] Save config failed', error) })
  }
  try { localStorage.setItem(DASHBOARD_CONFIG_KEY, payload) } catch (_) {}
}

// ─── Shared data for widgets ───────────────────────────────────────────────
interface MissionForDashboard {
  id: string
  title: string
  category: string
  recurrence: string
  isCompleted: boolean
  createdAt?: string
  targetCount?: number
  progressCount?: number
}

interface DashboardData {
  displayName: string
  greeting: string
  dateLabel: string
  motivationQuote: string
  now: Date
  activeMissions: MissionForDashboard[]
  completedTodayCount: number
  missionsLoading: boolean
  goals: { id: string; title: string; trackingMode?: GoalTrackingMode }[]
  goalsLoading: boolean
  goalProgressMap: Map<string, number>
  avgGoalProgress: number
  goalsAt100: number
  todaysMissions: MissionForDashboard[]
  goalsByProgress: { id: string; title: string; trackingMode?: GoalTrackingMode }[]
  budgetSummary: BudgetSummary
  budgetPlannedTotal: number
  budgetCategorySegments: { spentAmount: number; colorHex: string; name?: string }[]
  activeStakesFromSupabase: { stakeId: string; itemId: string; itemType: string; itemTitle: string; amount: number; currency: string; dueDate: string; status: string }[]
  missionsGroupedByCategory: { category: string; categoryDisplay: string; missions: { id: string; title: string; isCompleted: boolean }[] }[]
  budgetCategoriesWithSpent: { name: string; planned: number; spent: number; colorHex: string }[]
  recentCompletions: { id: string; title: string; category: string; completedAt?: string }[]
  goalsAtRisk: { id: string; title: string; trackingMode?: GoalTrackingMode; progress: number }[]
  formatMoney: (n: number) => string
  getCategoryDisplayName: (category: string) => string
  onToggleMission?: (missionId: string) => void
}

// ─── Widget components ────────────────────────────────────────────────────
const GreetingWidget = ({ data }: { widget: Widget; data: DashboardData }) => {
  const initial = (data.displayName || 'U').charAt(0).toUpperCase()
  return (
    <header className={`flex items-center gap-4 ${card} p-5`}>
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-700 text-lg font-semibold text-white">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-white">{data.greeting}, {data.displayName}</h1>
        <p className="mt-1 text-sm text-gray-400">{data.dateLabel}</p>
      </div>
    </header>
  )
}

const MotivationQuoteWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/60 px-4 py-3">
    <svg className="h-5 w-5 shrink-0 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
    <span className="flex-1 text-white">{data.motivationQuote}</span>
  </div>
)

const MissionsSummaryWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className={`${card} p-5`}>
    <div className="flex items-start justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Missions</span>
      <svg className="h-5 w-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    </div>
    {!data.missionsLoading ? (
      <>
        <p className="mt-2 text-sm text-gray-400">Active missions</p>
        <p className="text-lg font-semibold text-white">{data.activeMissions.length}</p>
        <p className="text-sm text-emerald-300">Completed today: {data.completedTodayCount}</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300" style={{ width: `${data.activeMissions.length > 0 ? Math.min(100, (data.completedTodayCount / data.activeMissions.length) * 100) : 0}%` }} />
        </div>
        <Link to="/my-missions" className="mt-3 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
      </>
    ) : (
      <p className="mt-2 text-sm text-gray-500">Loading…</p>
    )}
  </div>
)

const GoalsSummaryWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className={`${card} p-5`}>
    <div className="flex items-start justify-between">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Goals</span>
      <svg className="h-5 w-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
    </div>
    {!data.goalsLoading ? (
      <>
        <p className="mt-2 text-sm text-gray-400">Total goals</p>
        <p className="text-lg font-semibold text-white">{data.goals.length}</p>
        <p className="text-sm text-purple-400">Avg progress: {Math.round(data.avgGoalProgress)}%</p>
        <p className="text-sm text-gray-300">At 100%: {data.goalsAt100}</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, data.avgGoalProgress))}%` }} />
        </div>
        <Link to="/goals" className="mt-3 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
      </>
    ) : (
      <p className="mt-2 text-sm text-gray-500">Loading…</p>
    )}
  </div>
)

const BudgetSummaryWidget = ({ data }: { widget: Widget; data: DashboardData }) => {
  const execPct = data.budgetPlannedTotal > 0 ? (data.budgetSummary.expensesTotal / data.budgetPlannedTotal) * 100 : 0
  const expenseColor = execPct >= 175 ? 'text-red-500' : execPct >= 125 ? 'text-orange-500' : execPct >= 110 ? 'text-orange-400' : execPct >= 100 ? 'text-yellow-400' : 'text-cyan-400'
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Budget</span>
        <svg className="h-5 w-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <p className="mt-2 text-sm text-gray-400">This month</p>
      <p className="text-sm text-gray-400">
        {data.budgetPlannedTotal > 0 ? (
          <> <span className={`font-semibold ${expenseColor}`}>{data.formatMoney(data.budgetSummary.expensesTotal)}</span> spent out of <span className="font-semibold text-cyan-400">{data.formatMoney(data.budgetPlannedTotal)}</span> </>
        ) : (
          <span className="font-semibold text-orange-500">{data.formatMoney(data.budgetSummary.expensesTotal)}</span>
        )}
      </p>
      {data.budgetPlannedTotal > 0 ? (
        <p className={`text-sm font-medium ${data.budgetSummary.expensesTotal <= data.budgetPlannedTotal ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.budgetSummary.expensesTotal <= data.budgetPlannedTotal ? `Remaining: ${data.formatMoney(data.budgetPlannedTotal - data.budgetSummary.expensesTotal)}` : `Over budget by ${data.formatMoney(data.budgetSummary.expensesTotal - data.budgetPlannedTotal)}`}
        </p>
      ) : (
        <p className={`text-sm font-medium ${data.budgetSummary.surplus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.budgetSummary.surplus >= 0 ? 'Surplus' : 'Deficit'}: {data.formatMoney(Math.abs(data.budgetSummary.surplus))}
        </p>
      )}
      {data.budgetPlannedTotal > 0 && (
        <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-700">
          {data.budgetCategorySegments.length > 0 && data.budgetSummary.expensesTotal > 0 ? (
            <div className="flex h-full w-full" style={{ width: `${Math.min(100, (data.budgetSummary.expensesTotal / data.budgetPlannedTotal) * 100)}%` }}>
              {data.budgetCategorySegments.map((seg, i) => {
                const widthPct = (seg.spentAmount / data.budgetSummary.expensesTotal) * 100
                const showLabel = seg.name && widthPct >= 12
                return (
                  <div key={i} className="relative flex h-full min-w-0 items-center justify-center border-r border-slate-600/80 transition-[width] duration-300 first:rounded-l-full last:rounded-r-full last:border-r-0" style={{ width: `${widthPct}%`, backgroundColor: seg.colorHex, minWidth: widthPct > 0 ? 2 : 0 }}>
                    {showLabel && <span className="overflow-hidden text-ellipsis whitespace-nowrap px-1 text-[10px] font-medium text-slate-900 drop-shadow-sm">{seg.name}</span>}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300" style={{ width: `${Math.min(100, (data.budgetSummary.expensesTotal / data.budgetPlannedTotal) * 100)}%` }} />
          )}
        </div>
      )}
      <Link to="/budget" className="mt-2 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
    </div>
  )
}

const TodaysMissionsWidget = ({ data }: { widget: Widget; data: DashboardData }) => {
  const onToggle = data.onToggleMission
  // Build a quick lookup: missionId -> stake amount (if any active stake)
  const stakedMissionIds = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of data.activeStakesFromSupabase) {
      if (s.itemType === 'mission') map.set(s.itemId, s.amount)
    }
    return map
  }, [data.activeStakesFromSupabase])

  return (
    <div className={`${card} p-5`}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Today&apos;s Missions</h2>
      {data.todaysMissions.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No missions for today.</p>
      ) : (
        <ul className="space-y-2">
          {data.todaysMissions.slice(0, 10).map((m) => {
            const stakeAmount = stakedMissionIds.get(m.id)
            const hasStake = stakeAmount !== undefined
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  hasStake
                    ? 'border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/10'
                    : 'border-gray-800 bg-slate-800/50'
                }`}
              >
                {onToggle ? (
                  <button
                    type="button"
                    onClick={() => onToggle(m.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-500 bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    aria-label={m.isCompleted ? 'Completed' : 'Mark complete'}
                  >
                    {m.isCompleted && <span className="text-green-400">✓</span>}
                  </button>
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-600">{m.isCompleted ? '✓' : ''}</span>
                )}
                <span className={`min-w-0 flex-1 truncate text-sm ${m.isCompleted ? 'text-gray-500 line-through' : hasStake ? 'font-medium text-white' : 'text-white'}`}>
                  {m.title}
                </span>
                {hasStake && (
                  <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    💰 {stakeAmount}
                  </span>
                )}
                <span className="shrink-0 rounded border border-gray-600 px-2 py-0.5 text-xs text-gray-400">{m.category}</span>
                <span className="shrink-0 text-xs text-gray-500">{m.recurrence !== 'none' ? m.recurrence : 'One-time'}</span>
              </li>
            )
          })}
        </ul>
      )}
      <Link to="/my-missions" className="mt-4 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
    </div>
  )
}

const GoalsProgressWidget = ({ data }: { widget: Widget; data: DashboardData }) => {
  const [showAll, setShowAll] = useState(false)
  const goalsList = data.goalsByProgress
  const visible = showAll ? goalsList : goalsList.slice(0, 5)
  const hasMore = goalsList.length > 5
  return (
    <div className={`${card} p-5`}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Goals Progress</h2>
      {goalsList.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No goals yet.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {visible.map((goal) => {
              const progress = data.goalProgressMap.get(goal.id) ?? 0
              return (
                <li key={goal.id} className="rounded-lg border border-gray-800 bg-slate-800/50 p-3">
                  <div className="flex items-center gap-2">
                    <GoalIcon mode={goal.trackingMode} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{goal.title}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-cyan-400">{Math.round(Math.min(100, Math.max(0, progress)))}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          {hasMore && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium text-cyan-400 hover:underline">
              {showAll ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}
      <Link to="/goals" className="mt-4 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
    </div>
  )
}

const ActiveStakesWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className={`${card} border-amber-500/30 p-5`}>
    <div className="mb-3 flex items-center gap-2">
      <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400">Active Stakes</h2>
    </div>
    {data.activeStakesFromSupabase.length === 0 ? (
      <div className="py-4 text-center">
        <p className="mb-2 text-sm text-gray-500">No active stakes.</p>
        <p className="text-xs text-gray-600">Add a stake to a mission to see it here. Stakes make the difference.</p>
        <Link to="/my-missions" className="mt-3 inline-block text-sm font-medium text-amber-400 hover:underline">
          Go to My Missions →
        </Link>
      </div>
    ) : (
      <div className="space-y-3">
        {data.activeStakesFromSupabase.map((s) => (
          <div
            key={s.stakeId}
            className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 ring-1 ring-amber-500/10"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{s.itemTitle}</p>
              <p className="text-xs text-gray-500">
                Due: {s.dueDate ? new Date(s.dueDate).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-amber-300">{s.amount} {s.currency}</p>
              <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                {s.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)

const MissionsByCategoryWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className={`${card} p-5`}>
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Missions by Category</h2>
    {data.missionsGroupedByCategory.length === 0 ? (
      <p className="py-6 text-center text-sm text-gray-500">No missions yet.</p>
    ) : (
      <ul className="space-y-4">
        {data.missionsGroupedByCategory.map(({ category, categoryDisplay, missions }) => {
          const completed = missions.filter((m) => m.isCompleted).length
          const total = missions.length
          const pct = total > 0 ? (completed / total) * 100 : 0
          return (
            <li key={category} className="rounded-lg border border-gray-800 bg-slate-800/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-white">{categoryDisplay}</span>
                <span className="text-gray-400">{completed}/{total}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    )}
    <Link to="/my-missions" className="mt-4 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
  </div>
)

const BudgetCategoriesWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className={`${card} p-5`}>
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Budget Categories</h2>
    {data.budgetCategoriesWithSpent.length === 0 ? (
      <p className="py-6 text-center text-sm text-gray-500">No budget categories.</p>
    ) : (
      <div className="space-y-2">
        {data.budgetCategoriesWithSpent.map((row, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-slate-800/50 px-3 py-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.colorHex }} />
            <span className="min-w-0 flex-1 truncate text-white">{row.name}</span>
            <span className="text-gray-400">Planned: {data.formatMoney(row.planned)}</span>
            <span className="text-orange-400">Spent: {data.formatMoney(row.spent)}</span>
            <span className={row.planned - row.spent >= 0 ? 'text-emerald-400' : 'text-red-400'}>{data.formatMoney(row.planned - row.spent)} left</span>
          </div>
        ))}
      </div>
    )}
    <Link to="/budget" className="mt-4 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
  </div>
)

function timeAgo(dateStr: string, now: Date): string {
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString()
}

const RecentCompletionsWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className={`${card} p-5`}>
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Recent Completions</h2>
    {data.recentCompletions.length === 0 ? (
      <p className="py-6 text-center text-sm text-gray-500">No completed missions yet.</p>
    ) : (
      <ul className="space-y-2">
        {data.recentCompletions.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-slate-800/50 px-3 py-2 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400" aria-hidden>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-white">{m.title}</span>
            <span className="shrink-0 text-gray-400">{data.getCategoryDisplayName(m.category)}</span>
            <span className="shrink-0 text-xs text-gray-500">{m.completedAt ? timeAgo(m.completedAt, data.now) : ''}</span>
          </li>
        ))}
      </ul>
    )}
    <Link to="/my-missions" className="mt-4 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
  </div>
)

const GoalsAtRiskWidget = ({ data }: { widget: Widget; data: DashboardData }) => (
  <div className={`${card} p-5`}>
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Goals at Risk</h2>
    {data.goalsAtRisk.length === 0 ? (
      <p className="py-6 text-center text-sm text-gray-500">No goals below 30%.</p>
    ) : (
      <ul className="space-y-3">
        {data.goalsAtRisk.map((g) => (
          <li key={g.id} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-slate-800/50 p-3">
            <GoalIcon mode={g.trackingMode} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{g.title}</span>
            <span className="shrink-0 text-xs font-semibold text-red-400">{Math.round(g.progress)}%</span>
          </li>
        ))}
      </ul>
    )}
    <Link to="/goals" className="mt-4 inline-block text-sm font-medium text-cyan-400 hover:underline">View all</Link>
  </div>
)

const WIDGET_COMPONENTS: Record<WidgetType, (props: { widget: Widget; data: DashboardData }) => JSX.Element | null> = {
  greeting: GreetingWidget,
  motivation_quote: MotivationQuoteWidget,
  missions_summary: MissionsSummaryWidget,
  goals_summary: GoalsSummaryWidget,
  budget_summary: BudgetSummaryWidget,
  todays_missions: TodaysMissionsWidget,
  goals_progress: GoalsProgressWidget,
  active_stakes: ActiveStakesWidget,
  missions_by_category: MissionsByCategoryWidget,
  budget_categories: BudgetCategoriesWidget,
  recent_completions: RecentCompletionsWidget,
  goals_at_risk: GoalsAtRiskWidget,
}

// ─── Sortable widget wrapper (floating toolbar in edit mode) ─────────────────
function SortableWidgetWrapper({
  widget,
  data,
  editMode,
  onRemove,
  onResize,
  isDragging: externalDragging,
  justMoved,
}: {
  widget: Widget
  data: DashboardData
  editMode: boolean
  onRemove: (id: string) => void
  onResize: (id: string, size: WidgetSize) => void
  isDragging?: boolean
  justMoved?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const allowedSizes = WIDGET_SIZES[widget.type]
  const displaySizes = allowedSizes.filter((s) => s !== 'full' || getColUnits('full') !== getColUnits('large') || !allowedSizes.includes('large'))
  const Comp = WIDGET_COMPONENTS[widget.type]
  const content = Comp({ widget, data })
  const dragging = externalDragging ?? isDragging
  const widthClass = editMode ? '' : getWidgetWidthClass(widget.size)
  const flexStyle = editMode ? getWidgetFlexStyle(widget.size) : undefined
  return (
    <div
      ref={setNodeRef}
      data-widget-id={widget.id}
      style={{ ...style, ...flexStyle }}
      className={`relative min-w-0 ${widthClass} ${editMode ? 'min-h-[100px] rounded-xl border-2 border-dashed border-cyan-500/60 bg-slate-900/70' : ''} ${dragging ? 'z-50 opacity-40 pointer-events-none' : ''} ${editMode && !dragging ? 'opacity-95' : ''} ${justMoved ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0f172a]' : ''}`}
    >
      {editMode && (
        <div
          className="z-10 flex h-9 shrink-0 items-center gap-2 rounded-t-xl border border-b-0 border-cyan-500/40 bg-slate-800/95 px-2 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" /></svg>
          <span className="min-w-0 flex-1 truncate text-xs text-gray-400">{WIDGET_LABELS[widget.type]}</span>
          {displaySizes.map((s) => {
            const isActive = widget.size === s || (s === 'large' && widget.size === 'full')
            return (
              <button
                key={s}
                type="button"
                onClick={(e) => { e.stopPropagation(); onResize(widget.id, s) }}
                className={`rounded px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
              >
                {s === 'full' ? 'L' : s.charAt(0).toUpperCase()}
              </button>
            )
          })}
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(widget.id) }} className="ml-auto rounded p-1 text-red-400 hover:bg-red-500/20" aria-label="Remove widget">
            ×
          </button>
        </div>
      )}
      <div className={editMode ? 'rounded-b-xl border border-t-0 border-gray-700/50 bg-slate-900/50' : ''}>
        <div className={editMode ? 'p-1' : ''}>{content}</div>
      </div>
    </div>
  )
}

// ─── Add Widget Panel (grouped by category) ─────────────────────────────────
const WIDGET_DESCRIPTIONS: Record<WidgetType, string> = {
  greeting: 'Time-based greeting and today\'s date.',
  motivation_quote: 'Daily motivation quote.',
  missions_summary: 'Active missions count and completed today.',
  goals_summary: 'Goals count, average progress, and at 100%.',
  budget_summary: 'This month spent vs budget with category bar.',
  todays_missions: 'Daily missions and missions created today.',
  goals_progress: 'All goals with progress bars.',
  active_stakes: 'Active financial stakes from missions or goals.',
  missions_by_category: 'Missions grouped by category with progress.',
  budget_categories: 'Planned vs spent per category.',
  recent_completions: 'Last completed missions.',
  goals_at_risk: 'Goals with progress below 30%.',
}

const WIDGET_GROUPS: { label: string; types: WidgetType[] }[] = [
  { label: 'Overview', types: ['greeting', 'motivation_quote'] },
  { label: 'Missions', types: ['missions_summary', 'todays_missions', 'missions_by_category', 'recent_completions'] },
  { label: 'Goals', types: ['goals_summary', 'goals_progress', 'goals_at_risk'] },
  { label: 'Budget', types: ['budget_summary', 'budget_categories'] },
  { label: 'Finance', types: ['active_stakes'] },
]

function AddWidgetPanel({
  onAdd,
  onClose,
  widgetTypesOnDashboard,
}: {
  onAdd: (type: WidgetType) => void
  onClose: () => void
  widgetTypesOnDashboard: Set<WidgetType>
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-slate-900/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Add Widget</h2>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">×</button>
      </div>
      <div className="space-y-6">
        {WIDGET_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">{group.label}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.types.map((type) => {
                const onDashboard = widgetTypesOnDashboard.has(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onAdd(type)}
                    className="relative rounded-xl border border-gray-700 bg-slate-800/80 p-4 text-left transition hover:border-cyan-500 cursor-pointer"
                  >
                    {onDashboard && (
                      <span className="absolute right-2 top-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">✓ On dashboard</span>
                    )}
                    <p className="font-medium text-white">{WIDGET_LABELS[type]}</p>
                    <p className="mt-1 text-xs text-gray-400">{WIDGET_DESCRIPTIONS[type]}</p>
                    <p className="mt-2 text-xs text-gray-500">Sizes: {WIDGET_SIZES[type].map((s) => (s === 'full' ? 'L' : s)).join(', ')}</p>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const { formatMoney } = useCurrency()
  const { missions, setMissions, isLoading: missionsLoading } = useMissions()
  const { goals, getGoalById, isLoading: goalsLoading } = useGoals()

  const [showOnboarding, setShowOnboarding] = useState(false)
  const [widgets, setWidgets] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG)
  const [editMode, setEditMode] = useState(false)
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [isConfigLoaded, setIsConfigLoaded] = useState(false)
  const [motivationQuote] = useState(() => getRandomQuoteForPage('general'))
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({ incomeTotal: 0, expensesTotal: 0, surplus: 0 })
  const [budgetPlannedTotal, setBudgetPlannedTotal] = useState(0)
  const [budgetCategorySegments, setBudgetCategorySegments] = useState<{ spentAmount: number; colorHex: string; name?: string }[]>([])
  const [activeStakesFromSupabase, setActiveStakesFromSupabase] = useState<{ stakeId: string; itemId: string; itemType: string; itemTitle: string; amount: number; currency: string; dueDate: string; status: string }[]>([])
  const [currentMonthBudget, setCurrentMonthBudget] = useState<Budget | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [justMovedId, setJustMovedId] = useState<string | null>(null)
  const [addPanelInsertIndex, setAddPanelInsertIndex] = useState<number | null>(null)
  const [scrollToWidgetId, setScrollToWidgetId] = useState<string | null>(null)
  const addPanelRef = useRef<HTMLDivElement>(null)

  const now = useMemo(() => new Date(), [])
  const displayName = user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email ?? 'there'
  const greeting = getGreeting(now.getHours())
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const activeMissions = useMemo(() => missions.filter((m) => !m.isCompleted), [missions])
  const completedTodayCount = useMemo(() => {
    const today = now.toISOString().slice(0, 10)
    return missions.filter((m) => m.completedAt && m.completedAt.slice(0, 10) === today).length
  }, [missions, now])
  const goalProgressMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of goals) map.set(g.id, getGoalProgressFromMissions(g, missions))
    return map
  }, [goals, missions])
  const avgGoalProgress = useMemo(() => (goals.length === 0 ? 0 : goals.reduce((acc, g) => acc + (goalProgressMap.get(g.id) ?? 0), 0) / goals.length), [goals, goalProgressMap])
  const goalsAt100 = useMemo(() => goals.filter((g) => (goalProgressMap.get(g.id) ?? 0) >= 100).length, [goals, goalProgressMap])
  const todaysMissions = useMemo((): MissionForDashboard[] => {
    const today = now.toISOString().slice(0, 10)
    return missions
      .filter((m) => !m.isCompleted && (m.recurrence === 'daily' || (m.createdAt && m.createdAt.slice(0, 10) === today)))
      .slice(0, 10)
      .map((m) => ({ id: m.id, title: m.title, category: m.category, recurrence: m.recurrence ?? 'none', isCompleted: m.isCompleted, createdAt: m.createdAt, targetCount: m.targetCount, progressCount: m.progressCount }))
  }, [missions, now])
  const goalsByProgress = useMemo(() => [...goals].sort((a, b) => (goalProgressMap.get(b.id) ?? 0) - (goalProgressMap.get(a.id) ?? 0)), [goals, goalProgressMap])

  const handleToggleMission = useCallback((missionId: string) => {
    setMissions((prev) =>
      prev.map((mission) => {
        if (mission.id !== missionId) return mission
        if (mission.isCompleted) return mission
        const completedAt = new Date().toISOString()
        if (!mission.targetCount) return { ...mission, isCompleted: true, completedAt }
        const current = mission.progressCount ?? 0
        if (current >= mission.targetCount) return { ...mission, isCompleted: true, progressCount: mission.targetCount, completedAt }
        const next = current + 1
        if (next >= mission.targetCount) return { ...mission, progressCount: next, isCompleted: true, completedAt }
        return { ...mission, progressCount: next }
      })
    )
  }, [setMissions])
  const missionsGroupedByCategory = useMemo(() => {
    const byCat = new Map<string, typeof missions>()
    for (const m of missions) {
      const list = byCat.get(m.category) ?? []
      list.push(m)
      byCat.set(m.category, list)
    }
    return Array.from(byCat.entries()).map(([category, list]) => {
      const categoryDisplay =
        category.startsWith(GOAL_FILTER_PREFIX) && getGoalById
          ? getGoalById(category.slice(GOAL_FILTER_PREFIX.length))?.title ?? category
          : category
      return { category, categoryDisplay, missions: list }
    })
  }, [missions, getGoalById])
  const budgetCategoriesWithSpent = useMemo(() => {
    if (!currentMonthBudget) return []
    const spent = spentByCategory(currentMonthBudget.transactions)
    return currentMonthBudget.categories
      .filter((c) => c.name.toLowerCase() !== 'income')
      .map((c) => ({ name: c.name, planned: Number(c.budget) || 0, spent: spent[c.id] ?? 0, colorHex: getCategoryColorHex(c.color ?? 'text-white') }))
  }, [currentMonthBudget])
  const recentCompletions = useMemo(
    () => missions.filter((m) => m.isCompleted && m.completedAt).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 5),
    [missions],
  )
  const goalsAtRisk = useMemo(() => goals.filter((g) => (goalProgressMap.get(g.id) ?? 0) < 30).map((g) => ({ ...g, progress: goalProgressMap.get(g.id) ?? 0 })), [goals, goalProgressMap])

  useEffect(() => {
    let cancelled = false
    loadDashboardConfig(user?.id).then((config) => {
      if (!cancelled) {
        setWidgets(config)
        setIsConfigLoaded(true)
        // Show onboarding for first-time users
        if (shouldShowOnboarding()) setShowOnboarding(true)
      }
    })
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    if (!isConfigLoaded) return
    saveDashboardConfig(widgets, user?.id)
  }, [widgets, isConfigLoaded, user?.id])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (supabase && user) {
        try {
          const { data, error } = await supabase.from('budget_data').select('budgets').eq('id', user.id).maybeSingle()
          if (cancelled) return
          if (error) throw error
          if (data?.budgets && Array.isArray(data.budgets)) {
            const budgets = (data.budgets as Budget[]).map(stripIncomeCategory).map(normalizeBudget)
            const { start, end } = getMonthStartEnd(new Date())
            const current = budgets.find((b) => b.startDate <= end && b.endDate >= start)
            if (!cancelled && current) {
              setCurrentMonthBudget(current)
              setBudgetSummary(computeSummary(current.transactions))
              setBudgetPlannedTotal(totalPlannedBudget(current.categories))
              const expenseCats = current.categories.filter((c) => c.name.toLowerCase() !== 'income')
              const spent = spentByCategory(current.transactions)
              const summary = computeSummary(current.transactions)
              setBudgetCategorySegments(summary.expensesTotal > 0 ? expenseCats.filter((c) => (spent[c.id] ?? 0) > 0).map((c) => ({ spentAmount: spent[c.id] ?? 0, colorHex: getCategoryColorHex(c.color ?? 'text-white'), name: c.name })).sort((a, b) => b.spentAmount - a.spentAmount) : [])
            }
            return
          }
        } catch (_) {}
      }
      if (cancelled) return
      const budgets = loadBudgetFromLocalStorage()
      const { start, end } = getMonthStartEnd(new Date())
      const current = budgets.find((b) => b.startDate <= end && b.endDate >= start)
      if (current) {
        setCurrentMonthBudget(current)
        setBudgetSummary(computeSummary(current.transactions))
        setBudgetPlannedTotal(totalPlannedBudget(current.categories))
        const expenseCats = current.categories.filter((c) => c.name.toLowerCase() !== 'income')
        const spent = spentByCategory(current.transactions)
        const summary = computeSummary(current.transactions)
        setBudgetCategorySegments(summary.expensesTotal > 0 ? expenseCats.filter((c) => (spent[c.id] ?? 0) > 0).map((c) => ({ spentAmount: spent[c.id] ?? 0, colorHex: getCategoryColorHex(c.color ?? 'text-white'), name: c.name })).sort((a, b) => b.spentAmount - a.spentAmount) : [])
      }
    }
    run()
    return () => { cancelled = true }
  }, [user?.id])

  useEffect(() => {
    const client = supabase
    if (!client || !user?.id) return
    const load = async () => {
      const { data: missionRows } = await client.from('stakes').select('id, amount, currency, due_date, status, item_id').eq('user_id', user.id).eq('item_type', 'mission').eq('status', 'active')
      const { data: goalRows } = await client.from('stakes').select('id, amount, currency, due_date, status, item_id').eq('user_id', user.id).eq('item_type', 'goal').eq('status', 'active')
      const list: { stakeId: string; itemId: string; itemType: string; itemTitle: string; amount: number; currency: string; dueDate: string; status: string }[] = []
      for (const row of missionRows ?? []) {
        const mission = missions.find((m) => m.id === row.item_id)
        list.push({ stakeId: row.id as string, itemId: row.item_id as string, itemType: 'mission', itemTitle: mission?.title ?? 'Mission', amount: Number(row.amount), currency: (row.currency as string) ?? 'USD', dueDate: row.due_date ? new Date(row.due_date as string).toISOString().slice(0, 10) : '', status: (row.status as string) ?? 'active' })
      }
      for (const row of goalRows ?? []) {
        const goal = getGoalById?.(row.item_id as string)
        list.push({ stakeId: row.id as string, itemId: row.item_id as string, itemType: 'goal', itemTitle: goal?.title ?? 'Goal', amount: Number(row.amount), currency: (row.currency as string) ?? 'USD', dueDate: row.due_date ? new Date(row.due_date as string).toISOString().slice(0, 10) : '', status: (row.status as string) ?? 'active' })
      }
      setActiveStakesFromSupabase(list)
    }
    load()
  }, [user?.id, missions, goals, getGoalById])

  const dashboardData: DashboardData = useMemo(
    () => ({
      displayName,
      greeting,
      dateLabel,
      motivationQuote,
      now,
      activeMissions: activeMissions.map((m) => ({ id: m.id, title: m.title, category: m.category, recurrence: m.recurrence ?? 'none', isCompleted: m.isCompleted, createdAt: m.createdAt, targetCount: m.targetCount, progressCount: m.progressCount })),
      completedTodayCount,
      missionsLoading,
      goals,
      goalsLoading,
      goalProgressMap,
      avgGoalProgress,
      goalsAt100,
      todaysMissions,
      goalsByProgress,
      budgetSummary,
      budgetPlannedTotal,
      budgetCategorySegments,
      activeStakesFromSupabase,
      missionsGroupedByCategory,
      budgetCategoriesWithSpent,
      recentCompletions,
      goalsAtRisk,
      formatMoney,
      getCategoryDisplayName: (category: string) =>
        category.startsWith(GOAL_FILTER_PREFIX) && getGoalById
          ? getGoalById(category.slice(GOAL_FILTER_PREFIX.length))?.title ?? category
          : category,
      onToggleMission: handleToggleMission,
    }),
    [displayName, greeting, dateLabel, motivationQuote, now, activeMissions, completedTodayCount, missionsLoading, goals, goalsLoading, goalProgressMap, avgGoalProgress, goalsAt100, todaysMissions, goalsByProgress, budgetSummary, budgetPlannedTotal, budgetCategorySegments, activeStakesFromSupabase, missionsGroupedByCategory, budgetCategoriesWithSpent, recentCompletions, goalsAtRisk, formatMoney, getGoalById, handleToggleMission],
  )

  const sortedWidgets = useMemo(() => [...widgets].sort((a, b) => a.position - b.position), [widgets])
  const displayWidgets = sortedWidgets
  const rows = useMemo(() => packWidgetsIntoRows(displayWidgets), [displayWidgets])
  const widgetTypesOnDashboard = useMemo(() => new Set(displayWidgets.map((w) => w.type)), [displayWidgets])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragId(null)
    if (over && active.id !== over.id) {
      const oldIndex = sortedWidgets.findIndex((w) => w.id === active.id)
      const newIndex = sortedWidgets.findIndex((w) => w.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(sortedWidgets, oldIndex, newIndex)
        setWidgets(reordered.map((w, i) => ({ ...w, position: i })))
        setJustMovedId(active.id as string)
        setTimeout(() => setJustMovedId(null), 200)
      }
    }
  }, [sortedWidgets])

  const handleRemove = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id).map((w, i) => ({ ...w, position: i })))
  }, [])

  const handleResize = useCallback((id: string, size: WidgetSize) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, size } : w)))
    setScrollToWidgetId(id)
  }, [])

  const handleAddWidget = useCallback((type: WidgetType) => {
    const sizes = WIDGET_SIZES[type]
    const newId = uuidv4()
    const insertAt = addPanelInsertIndex
    setWidgets((prev) => {
      const at = insertAt != null && insertAt >= 0 && insertAt <= prev.length ? insertAt : prev.length
      const next = [...prev.slice(0, at), { id: newId, type, size: sizes[0], position: at }, ...prev.slice(at)].map((w, i) => ({ ...w, position: i }))
      return next
    })
    setShowAddPanel(false)
    setAddPanelInsertIndex(null)
    setScrollToWidgetId(newId)
  }, [addPanelInsertIndex])

  useEffect(() => {
    if (showAddPanel && addPanelRef.current) {
      addPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showAddPanel])

  useEffect(() => {
    if (!scrollToWidgetId) return
    const tScroll = setTimeout(() => {
      const el = document.querySelector(`[data-widget-id="${scrollToWidgetId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
    const tClear = setTimeout(() => setScrollToWidgetId(null), 600)
    return () => { clearTimeout(tScroll); clearTimeout(tClear) }
  }, [scrollToWidgetId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor))

  // ─── Priority Mission: nearest-deadline active stake ──────────────
  const priorityStake = useMemo(() => {
    if (activeStakesFromSupabase.length === 0) return null
    const withDue = activeStakesFromSupabase.filter((s) => s.dueDate && s.status === 'active')
    if (withDue.length === 0) return null
    return withDue.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  }, [activeStakesFromSupabase])

  return (
    <div className={`${pageContainer} mx-auto max-w-5xl`}>
      {/* Onboarding overlay — shows once for new users */}
      {showOnboarding && (
        <OnboardingOverlay onDone={() => setShowOnboarding(false)} />
      )}

      {/* ── PRIORITY MISSION ─────────────────────────────────────── */}
      {priorityStake && (
        <section className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-slate-900/60 p-5 shadow-lg shadow-amber-900/20">
          <div className="mb-2 flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              What's at stake right now
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">{priorityStake.itemTitle}</h2>
              <p className="mt-1 text-sm text-gray-400">
                Due{' '}
                <span className="font-semibold text-amber-300">
                  {new Date(priorityStake.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                {' · '}
                <span className="font-semibold text-amber-300">
                  {priorityStake.amount} {priorityStake.currency}
                </span>{' '}
                on the line
              </p>
            </div>
            <Link
              to="/my-missions"
              className="rounded-lg border border-amber-500/50 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              View Mission →
            </Link>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button type="button" onClick={() => { setAddPanelInsertIndex(null); setShowAddPanel((v) => !v) }} className={btn.secondary}>
                Add Widget
              </button>
              <button type="button" onClick={() => { setEditMode(false); setShowAddPanel(false) }} className={btn.primary}>
                Done
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setEditMode(true)} className={btn.secondary}>
              Edit Dashboard
            </button>
          )}
        </div>
      </div>

      {editMode && showAddPanel && (
        <div ref={addPanelRef}>
          <AddWidgetPanel
            onAdd={handleAddWidget}
            onClose={() => { setShowAddPanel(false); setAddPanelInsertIndex(null) }}
            widgetTypesOnDashboard={widgetTypesOnDashboard}
          />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveDragId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={displayWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className={editMode ? 'space-y-6' : 'space-y-4'}>
            {rows.map((rowWidgets, rowIndex) => {
              const rowUnits = rowWidgets.reduce((s, w) => s + getColUnits(w.size), 0)
              const emptySlots = editMode ? 3 - rowUnits : 0
              const insertIndex = rows.slice(0, rowIndex).reduce((s, r) => s + r.length, 0) + rowWidgets.length
              return (
                <div key={rowIndex}>
                  <div className="flex flex-wrap items-stretch gap-4">
                    {rowWidgets.map((widget) => (
                      <SortableWidgetWrapper
                        key={widget.id}
                        widget={widget}
                        data={dashboardData}
                        editMode={editMode}
                        onRemove={handleRemove}
                        onResize={handleResize}
                        isDragging={activeDragId === widget.id}
                        justMoved={justMovedId === widget.id}
                      />
                    ))}
                    {emptySlots > 0 && (
                      <button
                        type="button"
                        onClick={() => { setAddPanelInsertIndex(insertIndex); setShowAddPanel(true) }}
                        style={{ flex: `${emptySlots} 0 0` }}
                        className="flex min-h-[120px] min-w-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-slate-800/40 text-sm text-gray-500 transition hover:border-cyan-500 hover:bg-slate-800/60 hover:text-gray-400"
                      >
                        + Add widget here
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}>
          {activeDragId ? (() => {
            const widget = displayWidgets.find((w) => w.id === activeDragId)
            if (!widget) return null
            const Comp = WIDGET_COMPONENTS[widget.type]
            const content = Comp({ widget, data: dashboardData })
            if (!content) return null
            const overlayWidth = { small: 200, medium: 380, large: 560, full: 560 }[widget.size] ?? 280
            return (
              <div
                className="rounded-xl border-2 border-cyan-500 bg-slate-900/95 p-4 opacity-95 shadow-xl pointer-events-none"
                style={{ width: overlayWidth, maxWidth: 'min(560px, 95vw)' }}
              >
                {content}
              </div>
            )
          })() : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}