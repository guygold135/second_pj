/**
 * Dashboard — owe it
 * Linear/Notion style: fixed layout, information at a glance.
 * No widget drag/editor. Three columns: Missions | Goals | Counters
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMissions } from '../contexts/MissionsContext'
import { useGoals } from '../contexts/GoalsContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { supabase } from '../lib/supabase'
import { getRandomQuoteForPage } from '../utils/quotes'
import { OnboardingOverlay, shouldShowOnboarding } from '../components/OnboardingOverlay'
import { useToast } from '../components/Toast'
import { v4 as uuidv4 } from 'uuid'
import { NeonCheckbox } from '../components/ui/animated-check-box'

interface ActiveStake {
  stakeId: string; itemId: string; itemType: string; itemTitle: string
  amount: number; currency: string; dueDate: string; status: string
}

function getGreeting(h: number) {
  if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'
}
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function goalProgress(
  g: { id: string; trackingMode?: string; progressPercent?: number; targetHours?: number; loggedHours?: number; targetCount?: number; currentCount?: number },
  missions: { goalId?: string; isCompleted: boolean; weightPercent?: number }[]
) {
  const mode = g.trackingMode ?? 'missions_equal'
  if (mode === 'time' && g.targetHours) return Math.min(100, ((g.loggedHours ?? 0) / g.targetHours) * 100)
  if (mode === 'count' && g.targetCount) return Math.min(100, ((g.currentCount ?? 0) / g.targetCount) * 100)
  const gm = missions.filter((m) => m.goalId === g.id)
  if (!gm.length) return g.progressPercent ?? 0
  if (mode === 'missions_weighted') return Math.min(100, gm.filter((m) => m.isCompleted).reduce((s, m) => s + (m.weightPercent ?? 0), 0))
  return Math.min(100, (gm.filter((m) => m.isCompleted).length / gm.length) * 100)
}

function ProgressRing({ pct, size = 36, stroke = 3 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="-rotate-90 progress-ring-svg" aria-hidden>
      <circle className="progress-ring-track" cx={size/2} cy={size/2} r={r} fill="none" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct > 0 ? '#10b981' : '#334155'}
        strokeWidth={stroke} strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.min(1, pct / 100))}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
    </svg>
  )
}

function QuickAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [active, setActive] = useState(false)
  const [val, setVal] = useState('')
  const commit = () => { const t = val.trim(); if (t) onAdd(t); setVal(''); setActive(false) }
  if (!active) return (
    <button type="button" onClick={() => setActive(true)}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition hover:bg-slate-800/60 hover:text-gray-400">
      <span>+</span> Add mission…
    </button>
  )
  return (
    <input autoFocus type="text" value={val} onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setActive(false); setVal('') } }}
      onBlur={commit} placeholder="Mission title… Enter to save"
      className="w-full rounded-lg border border-gray-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30" />
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { missions, setMissions, isLoading: mLoad } = useMissions()
  const { goals, isLoading: gLoad } = useGoals()
  const { formatMoney } = useCurrency()
  const { toast } = useToast()

  const [stakes, setStakes] = useState<ActiveStake[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [quote] = useState(() => getRandomQuoteForPage('general'))

  const now = useMemo(() => new Date(), [])
  const displayName = user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'there'

  useEffect(() => {
    const t = setTimeout(() => { if (shouldShowOnboarding()) setShowOnboarding(true) }, 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!supabase || !user?.id) return
    ;(async () => {
      const [{ data: mr }, { data: gr }] = await Promise.all([
        supabase.from('stakes').select('id,amount,currency,due_date,status,item_id').eq('user_id', user.id).eq('item_type', 'mission').eq('status', 'active'),
        supabase.from('stakes').select('id,amount,currency,due_date,status,item_id').eq('user_id', user.id).eq('item_type', 'goal').eq('status', 'active'),
      ])
      const list: ActiveStake[] = []
      for (const r of mr ?? []) { const m = missions.find((x) => x.id === r.item_id); list.push({ stakeId: r.id as string, itemId: r.item_id as string, itemType: 'mission', itemTitle: m?.title ?? 'Mission', amount: Number(r.amount), currency: (r.currency as string) ?? 'USD', dueDate: r.due_date ? new Date(r.due_date as string).toISOString().slice(0, 10) : '', status: (r.status as string) }) }
      for (const r of gr ?? []) { const g = goals.find((x) => x.id === r.item_id); list.push({ stakeId: r.id as string, itemId: r.item_id as string, itemType: 'goal', itemTitle: g?.title ?? 'Goal', amount: Number(r.amount), currency: (r.currency as string) ?? 'USD', dueDate: r.due_date ? new Date(r.due_date as string).toISOString().slice(0, 10) : '', status: (r.status as string) }) }
      setStakes(list)
    })()
  }, [user?.id, missions, goals])

  /** Only stakes whose mission or goal still exists (same as what Goals displays). */
  const activeStakes = useMemo(
    () =>
      stakes.filter((s) =>
        s.itemType === 'mission'
          ? missions.some((m) => m.id === s.itemId)
          : goals.some((g) => g.id === s.itemId),
      ),
    [stakes, missions, goals],
  )
  const stakedMIds = useMemo(() => { const m = new Map<string, number>(); for (const s of activeStakes) if (s.itemType === 'mission') m.set(s.itemId, s.amount); return m }, [activeStakes])
  const today = now.toISOString().slice(0, 10)
  /** Missions that are defined in Goals (standalone or goal exists). */
  const missionsInSync = useMemo(
    () => missions.filter((m) => !m.goalId || goals.some((g) => g.id === m.goalId)),
    [missions, goals],
  )
  const todayMissions = useMemo(
    () =>
      missionsInSync
        .filter((m) => m.recurrence === 'daily' || m.createdAt?.slice(0, 10) === today)
        .slice(0, 14),
    [missionsInSync, today],
  )
  /** Only active (incomplete) and relevant missions for today — what we display in the list. */
  const todayMissionsActive = useMemo(
    () => todayMissions.filter((m) => !m.isCompleted),
    [todayMissions],
  )
  const todayLeft = useMemo(() => todayMissionsActive.length, [todayMissionsActive])
  const completedToday = useMemo(() => missionsInSync.filter((m) => m.completedAt?.slice(0, 10) === today).length, [missionsInSync, today])
  const activeMissions = useMemo(() => missionsInSync.filter((m) => !m.isCompleted), [missionsInSync])
  const goalList = useMemo(() => goals.map((g) => ({ ...g, pct: goalProgress(g, missionsInSync) })).sort((a, b) => b.pct - a.pct), [goals, missionsInSync])

  const handleToggle = useCallback((id: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m

        // Allow simple one-click toggle both ways (like NeonCheckbox).
        if (m.isCompleted) {
          return {
            ...m,
            isCompleted: false,
            completedAt: undefined,
            progressCount: m.targetCount ? 0 : m.progressCount,
          }
        }

        const completedAt = new Date().toISOString()
        if (!m.targetCount || m.targetCount <= 1) return { ...m, isCompleted: true, completedAt }
        const next = (m.progressCount ?? 0) + 1
        return next >= m.targetCount
          ? { ...m, progressCount: next, isCompleted: true, completedAt }
          : { ...m, progressCount: next }
      }),
    )
  }, [setMissions, toast])

  const handleAdd = useCallback((title: string) => {
    const createdAt = new Date().toISOString()
    const id = uuidv4()
    const m = { id, title, category: 'General', recurrence: 'none' as const, duration: '', isCompleted: false, createdAt }
    setMissions((prev) => [m, ...prev])
    // Persistence: MissionsContext syncs to Supabase (single source of truth for mission row structure)
    toast.success('Mission added')
  }, [setMissions, toast])

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      {showOnboarding && <OnboardingOverlay onDone={() => setShowOnboarding(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{getGreeting(now.getHours())}, {displayName}</h1>
          <p className="mt-0.5 text-xs text-gray-500">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Motivational quote — lake image background, clear and bright */}
      <div
        className="relative mb-6 flex w-full items-center gap-3 overflow-hidden rounded-lg border border-cyan-500/20 px-4 py-3"
        style={{
          backgroundImage: 'url(/quote-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <span className="relative z-10 shrink-0 quote-banner-text text-lg" aria-hidden="true">✦</span>
        <span className="relative z-10 flex-1 text-center quote-banner-text quote-banner-quote" aria-hidden="true">
          {quote}
        </span>
      </div>

      {/* 3-column grid */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Missions */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-gray-800 bg-slate-900/50">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Today's Missions</p>
                <p className="text-xs text-gray-500">{completedToday} done · {todayLeft} left</p>
              </div>
              <Link to="/goals" className="text-xs text-gray-600 hover:text-white">All →</Link>
            </div>
            <div className="p-2">
              {mLoad ? (
                <p className="px-3 py-4 text-sm text-gray-500">Loading…</p>
              ) : todayMissionsActive.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500">No missions today.</p>
              ) : (
                <div className="space-y-0.5">
                  {todayMissionsActive.map((m) => {
                    const hasStake = stakedMIds.has(m.id)
                    const amt = stakedMIds.get(m.id)
                    return (
                      <div key={m.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${hasStake ? 'bg-amber-500/5 hover:bg-amber-500/8' : 'hover:bg-slate-800/50'}`}>
                        {m.targetCount && m.targetCount > 1 ? (
                          m.isCompleted ? (
                            <NeonCheckbox
                              checked
                              onChange={() => handleToggle(m.id)}
                              aria-label="Completed"
                              className="shrink-0"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggle(m.id)}
                              className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded border border-[#00ffaa] bg-black/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                              aria-label={`Progress ${m.progressCount ?? 0} of ${m.targetCount}`}
                              aria-pressed={false}
                            >
                              <span
                                className="absolute bottom-0 left-0 right-0 bg-[#00ffaa] transition-[height] duration-150"
                                style={{ height: `${((m.progressCount ?? 0) / m.targetCount) * 100}%` }}
                              />
                              {(m.progressCount ?? 0) > 0 && (
                                <svg
                                  className="relative z-10 h-3 w-3 mission-progress-check"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth={3}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          )
                        ) : (
                          <NeonCheckbox
                            checked={m.isCompleted}
                            onChange={() => handleToggle(m.id)}
                            aria-label={m.isCompleted ? 'Completed' : 'Mark complete'}
                            className="shrink-0"
                          />
                        )}
                        <span className={`flex-1 truncate text-sm ${m.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{m.title}</span>
                        {m.targetCount && m.targetCount > 1 && (
                          <span className="shrink-0 text-xs text-gray-400">
                            {m.progressCount ?? 0}/{m.targetCount}
                          </span>
                        )}
                        {hasStake && <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">💰 {amt}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="mt-1 border-t border-gray-800/50 pt-1">
                <QuickAdd onAdd={handleAdd} />
              </div>
            </div>
          </div>

          {activeStakes.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center justify-between border-b border-amber-500/10 px-4 py-2.5">
                <p className="text-sm font-semibold text-amber-300">Stakes</p>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">{activeStakes.length}</span>
              </div>
              <div className="divide-y divide-amber-500/10 px-2 py-1">
                {activeStakes.slice(0, 4).map((s) => (
                  <div key={s.stakeId} className="flex items-center justify-between py-2 px-1">
                    <p className="max-w-[130px] truncate text-xs text-gray-300">{s.itemTitle}</p>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-300">{s.amount} {s.currency.toUpperCase()}</p>
                      <p className="text-[10px] text-gray-600">{s.dueDate ? fmtDate(s.dueDate) : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-slate-900/50">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Goals</p>
              <p className="text-xs text-gray-500">{goals.length} total · {goalList.filter((g) => g.pct >= 100).length} complete</p>
            </div>
            <Link to="/goals" className="text-xs text-gray-600 hover:text-white">All →</Link>
          </div>
          <div className="p-3 space-y-1">
            {gLoad ? <p className="px-2 py-4 text-sm text-gray-500">Loading…</p>
              : goalList.length === 0 ? <p className="px-2 py-4 text-sm text-gray-500">No goals. <Link to="/goals" className="text-cyan-500 hover:underline">Create one →</Link></p>
              : goalList.slice(0, 9).map((g) => (
                <div key={g.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-800/50">
                  <ProgressRing pct={g.pct} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-200">{g.title}</p>
                    <p className="text-xs text-gray-600">{Math.round(g.pct)}%</p>
                  </div>
                </div>
              ))}
            {goalList.length > 9 && <Link to="/goals" className="block px-2 py-1 text-xs text-gray-600 hover:text-white">+{goalList.length - 9} more →</Link>}
          </div>
        </div>

        {/* Counters */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-800 bg-slate-900/50 px-4 py-3">
              <p className="text-xs text-gray-500">Active</p>
              <p className="mt-0.5 text-2xl font-bold theme-text">{activeMissions.length}</p>
              <p className="text-[11px] text-gray-600">missions</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-slate-900/50 px-4 py-3">
              <p className="text-xs text-gray-500">Done today</p>
              <p className="mt-0.5 text-2xl font-bold text-emerald-400">{completedToday}</p>
              <p className="text-[11px] text-gray-600">missions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}