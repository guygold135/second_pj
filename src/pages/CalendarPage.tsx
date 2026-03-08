'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useMissions, GOAL_FILTER_PREFIX, type Mission } from '../contexts/MissionsContext'
import { useGoals } from '../contexts/GoalsContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getCalendarCategoryColor } from '../lib/categoryColors'
import { btn, input, modal } from '../styles/designSystem'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Get weeks for month view: array of 7-day weeks (null for out-of-month). */
function getMonthWeeks(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = new Date(first)
  const dayOfWeek = start.getDay()
  start.setDate(start.getDate() - dayOfWeek)
  const weeks: (Date | null)[][] = []
  let current = new Date(start)
  while (weeks.length < 6) {
    const week: (Date | null)[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(current)
      week.push(d.getMonth() === month || (d >= first && d <= last) ? d : null)
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
    if (current > last && current.getDay() === 0) break
  }
  return weeks
}

/** Get 7 days for week view (Sun–Sat). */
function getWeekDays(center: Date): Date[] {
  const d = new Date(center)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  const out: Date[] = []
  for (let i = 0; i < 7; i++) {
    out.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}

function formatHour(i: number): string {
  return `${i.toString().padStart(2, '0')}:00`
}

/** Hour order: 01:00 … 23:00, then 00:00 at bottom with line above = midnight */
const HOUR_ORDER = [...Array.from({ length: 23 }, (_, i) => i + 1), 0]
const HOUR_ROW_HEIGHT = 52
const DEFAULT_EVENT_DURATION_MINUTES = 30
const MIN_EVENT_HEIGHT_PX = 20

/** Parse "Xh Ym" to minutes; returns 0 if unparseable. */
function parseDurationMinutes(duration: string): number {
  const match = duration?.match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/i)
  if (!match) return 0
  const h = parseInt(match[1] ?? '0', 10)
  const m = parseInt(match[2] ?? '0', 10)
  return h * 60 + m
}

/** From ISO date or datetime string, get fractional hours (0–24) for start of event in local time. */
function startTimeHoursFromIso(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
}

type CalendarEvent = {
  id: string
  title: string
  type: 'mission' | 'goal'
  category: string
  hasStake?: boolean
  stakeAmount?: number
  stakeCurrency?: string
  /** Fractional hours 0–24 for week/day positioning. */
  startTimeHours?: number
  /** Duration in minutes; used for event height in week/day. */
  durationMinutes?: number
}

const STAKED_PILL_COLOR = '#c2410c'
const GOAL_DEADLINE_PILL_COLOR = '#ea580c'

export default function CalendarPage() {
  const { missions, setMissions, categoriesOrder } = useMissions()
  const { goals } = useGoals()
  const { user } = useAuth()
  const [stakesByItemId, setStakesByItemId] = useState<Map<string, { amount: number; currency: string }>>(new Map())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [current, setCurrent] = useState(() => startOfDay(new Date()))
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addModalDate, setAddModalDate] = useState<Date | null>(null)
  const [addTitle, setAddTitle] = useState('')
  const [addCategory, setAddCategory] = useState('Personal')

  const today = useMemo(() => startOfDay(new Date()), [])

  useEffect(() => {
    if (!supabase || !user?.id) return
    const run = async () => {
      const [gr, mr] = await Promise.all([
        supabase.from('stakes').select('item_id, amount, currency').eq('user_id', user.id).eq('item_type', 'goal').eq('status', 'active'),
        supabase.from('stakes').select('item_id, amount, currency').eq('user_id', user.id).eq('item_type', 'mission').eq('status', 'active'),
      ])
      const map = new Map<string, { amount: number; currency: string }>()
      for (const r of gr.data ?? []) {
        const row = r as { item_id: string; amount: number; currency: string }
        map.set(row.item_id, { amount: Number(row.amount), currency: (row.currency || 'USD').toUpperCase() })
      }
      for (const r of mr.data ?? []) {
        const row = r as { item_id: string; amount: number; currency: string }
        map.set(row.item_id, { amount: Number(row.amount), currency: (row.currency || 'USD').toUpperCase() })
      }
      setStakesByItemId(map)
    }
    run()
  }, [user?.id])

  /** Missions that are defined in Goals (standalone or goal exists) — keep calendar in sync. */
  const missionsInSync = useMemo(
    () => missions.filter((m) => !m.goalId || goals.some((g) => g.id === m.goalId)),
    [missions, goals],
  )
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const m of missionsInSync) {
      if (!m.createdAt || m.isCompleted) continue
      const key = m.createdAt.slice(0, 10)
      const list = map.get(key) ?? []
      const stake = stakesByItemId.get(m.id)
      const durationMin = parseDurationMinutes(m.duration) || DEFAULT_EVENT_DURATION_MINUTES
      list.push({
        id: m.id,
        title: m.title,
        type: 'mission',
        category: m.category,
        hasStake: !!stake,
        stakeAmount: stake?.amount,
        stakeCurrency: stake?.currency,
        startTimeHours: startTimeHoursFromIso(m.createdAt),
        durationMinutes: durationMin,
      })
      map.set(key, list)
    }
    for (const g of goals) {
      const dateStr = g.deadlineTo ?? g.deadlineFrom
      if (!dateStr) continue
      const key = dateStr.slice(0, 10)
      const list = map.get(key) ?? []
      const stake = stakesByItemId.get(g.id)
      list.push({
        id: g.id,
        title: g.title,
        type: 'goal',
        category: `goal:${g.id}`,
        hasStake: !!stake,
        stakeAmount: stake?.amount,
        stakeCurrency: stake?.currency,
        startTimeHours: 0,
        durationMinutes: DEFAULT_EVENT_DURATION_MINUTES,
      })
      map.set(key, list)
    }
    return map
  }, [missionsInSync, goals, stakesByItemId])

  const monthWeeks = useMemo(
    () => getMonthWeeks(current.getFullYear(), current.getMonth()),
    [current]
  )
  const weekDays = useMemo(() => getWeekDays(current), [current])

  const getEvents = useCallback(
    (d: Date | null): CalendarEvent[] => {
      if (!d) return []
      return eventsByDate.get(toDateKey(d)) ?? []
    },
    [eventsByDate]
  )

  const handleDayClick = useCallback(
    (d: Date | null) => {
      if (!d) return
      setAddModalDate(d)
      setAddTitle('')
      setAddCategory('Personal')
      setAddModalOpen(true)
    },
    []
  )

  const handleAddSubmit = useCallback(() => {
    if (!addModalDate || !addTitle.trim()) return
    const dateStr = toDateKey(addModalDate) + 'T12:00:00.000Z'
    const category = addCategory
    const inCategory = missionsInSync.filter((m) => m.category === category)
    const nextOrder = inCategory.length === 0 ? 0 : Math.max(...inCategory.map((m) => m.orderInCategory ?? 0)) + 1
    const newMission: Mission = {
      id: uuidv4(),
      title: addTitle.trim(),
      category,
      recurrence: 'none',
      duration: '0h 0m',
      createdAt: dateStr,
      isCompleted: false,
      orderInCategory: nextOrder,
    }
    setMissions((prev) => [newMission, ...prev])
    setAddModalOpen(false)
    setAddModalDate(null)
  }, [addModalDate, addTitle, addCategory, missionsInSync, setMissions])

  return (
    <div className="flex h-full min-h-0 w-full flex-col theme-bg theme-text" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-gray-800/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-white">Calendar</h1>
          <div className="ml-2 flex rounded-lg border border-gray-700/80 bg-slate-800/50">
            <button
              type="button"
              onClick={() =>
                setCurrent((c) => {
                  const d = new Date(c)
                  if (view === 'day') d.setDate(d.getDate() - 1)
                  else if (view === 'week') d.setDate(d.getDate() - 7)
                  else d.setMonth(d.getMonth() - 1)
                  return d
                })
              }
              className="rounded-l-lg px-2 py-1.5 text-gray-400 transition-colors hover:bg-slate-700/80 hover:text-white"
              aria-label="Previous"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setCurrent(today)}
              className="border-x border-gray-700/80 px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-slate-700/80 hover:text-white"
              title="Go to today"
            >
              {current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </button>
            <button
              type="button"
              onClick={() =>
                setCurrent((c) => {
                  const d = new Date(c)
                  if (view === 'day') d.setDate(d.getDate() + 1)
                  else if (view === 'week') d.setDate(d.getDate() + 7)
                  else d.setMonth(d.getMonth() + 1)
                  return d
                })
              }
              className="rounded-r-lg px-2 py-1.5 text-gray-400 transition-colors hover:bg-slate-700/80 hover:text-white"
              aria-label="Next"
            >
              →
            </button>
          </div>
          <button
            type="button"
            onClick={() => setView('month')}
            className={`ml-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              view === 'month' ? 'bg-cyan-500/15 text-cyan-300' : 'text-gray-400 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              view === 'week' ? 'bg-cyan-500/15 text-cyan-300' : 'text-gray-400 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView('day')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              view === 'day' ? 'bg-cyan-500/15 text-cyan-300' : 'text-gray-400 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            Day
          </button>
        </div>
      </header>

      {/* Grid: scrollable week/day with fixed hour rows, or month view */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {view === 'week' || view === 'day'
          ? (
              <>
                <div
                  className="grid flex-shrink-0 border-b border-gray-800/60"
                  style={{
                    gridTemplateColumns: view === 'day' ? '56px minmax(0, 1fr)' : '56px repeat(7, minmax(0, 1fr))',
                  }}
                >
                  <div className="py-2" aria-hidden />
                  {view === 'day'
                    ? (
                        <div className="flex items-center justify-center py-2">
                          <span
                            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                              isSameDay(current, today) ? 'bg-cyan-500/15 text-cyan-300' : 'text-gray-500'
                            }`}
                          >
                            {WEEKDAYS[current.getDay()]} {current.getDate()}
                          </span>
                        </div>
                      )
                    : weekDays.map((d, i) => (
                        <div key={toDateKey(d)} className="flex items-center justify-center py-2">
                          <span
                            className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                              isSameDay(d, today) ? 'bg-cyan-500/15 text-cyan-300' : 'text-gray-500'
                            }`}
                          >
                            {WEEKDAYS[i]} {d.getDate()}
                          </span>
                        </div>
                      ))}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div
                    className="relative"
                    style={{ minHeight: 24 * HOUR_ROW_HEIGHT }}
                  >
                    <div className="absolute inset-0 flex flex-col pointer-events-none" aria-hidden>
                      {Array.from({ length: 24 }, (_, i) => (
                        <div
                          key={i}
                          className="shrink-0 border-t border-gray-700/50"
                          style={{ height: HOUR_ROW_HEIGHT, marginLeft: '40px' }}
                        />
                      ))}
                    </div>
                    <div
                      className="relative grid border-r border-gray-800/60 bg-slate-900/30"
                      style={{
                        gridTemplateColumns: view === 'day' ? '56px minmax(0, 1fr)' : '56px repeat(7, minmax(0, 1fr))',
                        gridTemplateRows: `repeat(24, ${HOUR_ROW_HEIGHT}px)`,
                      }}
                    >
                      {HOUR_ORDER.map((hour, i) => (
                        <div
                          key={hour}
                          className="relative flex justify-center border-r border-gray-800/60 bg-slate-900/30"
                          style={{ gridColumn: 1, gridRow: i + 1 }}
                        >
                          {hour !== 0 && (
                            <span
                              className="absolute left-1/2 bottom-0 text-xs text-gray-500"
                              style={{ transform: 'translate(-50%, 50%)' }}
                            >
                              {formatHour(hour)}
                            </span>
                          )}
                        </div>
                      ))}
                      {(view === 'day' ? [current] : weekDays).map((d, j) => (
                        <WeekDayColumn
                          key={toDateKey(d)}
                          date={d}
                          events={getEvents(d)}
                          isToday={isSameDay(d, today)}
                          onEmptyClick={handleDayClick}
                          style={{ gridColumn: 2 + j, gridRow: '1 / span 24' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )
          : (
              <div
                className="grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden"
                style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
              >
                {WEEKDAYS.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-center border-b border-gray-800/60 py-2 text-xs font-medium text-gray-500"
                  >
                    {name}
                  </div>
                ))}
                <div
                  className="col-span-7 grid min-h-0 overflow-hidden"
                  style={{
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gridTemplateRows: `repeat(${monthWeeks.length}, minmax(0, 1fr))`,
                  }}
                >
                  {monthWeeks.flatMap((week) =>
                    week.map((d, i) => (
                      <DayCell
                        key={d ? toDateKey(d) : `e-${i}`}
                        date={d}
                        events={getEvents(d)}
                        isToday={d !== null && isSameDay(d, today)}
                        onEmptyClick={handleDayClick}
                      />
                    )),
                  )}
                </div>
              </div>
            )}
      </div>

      {/* Add Mission modal */}
      {addModalOpen && addModalDate && (
        <div
          className={modal.backdrop}
          onClick={() => setAddModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-mission-calendar-title"
        >
          <div
            className={modal.box}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modal.header}>
              <h2 id="add-mission-calendar-title" className={modal.title}>
                Add mission
              </h2>
              <button type="button" onClick={() => setAddModalOpen(false)} className={modal.closeBtn} aria-label="Close">
                ×
              </button>
            </div>
            <div className={modal.body}>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Date</label>
                <p className="text-sm text-white">{addModalDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Title</label>
                <input
                  type="text"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="Mission title"
                  className={input.base}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Category</label>
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className={input.select}
                >
                  {categoriesOrder.filter((cat) => !cat.startsWith(GOAL_FILTER_PREFIX)).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={modal.footer}>
              <button type="button" onClick={() => setAddModalOpen(false)} className={btn.secondary}>
                Cancel
              </button>
              <button type="button" onClick={handleAddSubmit} disabled={!addTitle.trim()} className={btn.primary}>
                Add mission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Week/Day view: one column with fixed height; events positioned by time. */
function WeekDayColumn({
  date,
  events,
  isToday,
  onEmptyClick,
  style: gridStyle,
}: {
  date: Date
  events: CalendarEvent[]
  isToday: boolean
  onEmptyClick: (d: Date | null) => void
  style: React.CSSProperties
}) {
  const totalHeight = 24 * HOUR_ROW_HEIGHT
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-event-pill]')) return
    onEmptyClick(date)
  }

  return (
    <div
      className={`relative shrink-0 border-r border-gray-800/50 transition-colors duration-200 hover:bg-slate-800/30 ${
        isToday ? 'bg-cyan-500/10' : ''
      } cursor-pointer`}
      style={{ ...gridStyle, height: totalHeight }}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEmptyClick(date) } }}
    >
      {events.map((ev) => {
        const startHours = ev.startTimeHours ?? 0
        const durationMin = ev.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES
        const topPx = startHours * HOUR_ROW_HEIGHT
        const heightPx = Math.max(MIN_EVENT_HEIGHT_PX, (durationMin / 60) * HOUR_ROW_HEIGHT)
        const isGoal = ev.type === 'goal'
        const hasStake = ev.hasStake === true
        const bgColor = hasStake ? STAKED_PILL_COLOR : isGoal ? GOAL_DEADLINE_PILL_COLOR : getCalendarCategoryColor(ev.category)
        const label = isGoal ? `${ev.title} · deadline` : ev.title
        const showStakeAmount = hasStake && ev.stakeAmount != null
        return (
          <button
            key={ev.id}
            type="button"
            data-event-pill
            onClick={(e) => e.stopPropagation()}
            className="absolute left-[2px] right-[2px] flex items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-xs font-medium text-white transition-opacity duration-200 hover:opacity-90 min-w-0 overflow-hidden"
            style={{
              top: topPx,
              height: heightPx,
              backgroundColor: bgColor,
            }}
            title={showStakeAmount ? `${label} — ${ev.stakeAmount} ${ev.stakeCurrency ?? ''}` : label}
          >
            {hasStake && (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/90" aria-hidden>
                <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
                <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
                <path d="m2 16 6 6" />
                <circle cx="16" cy="9" r="2.9" />
                <circle cx="6" cy="5" r="3" />
              </svg>
            )}
            <span className="min-w-0 truncate">{label}</span>
            {showStakeAmount && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/60 px-1.5 py-0.5 text-[10px] text-gray-200">
                {ev.stakeAmount} {ev.stakeCurrency ?? 'USD'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function DayCell({
  date,
  events,
  isToday,
  onEmptyClick,
}: {
  date: Date | null
  events: CalendarEvent[]
  isToday: boolean
  onEmptyClick: (d: Date | null) => void
}) {
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-event-pill]')) return
    onEmptyClick(date)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (date && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onEmptyClick(date) } }}
      className={`flex min-h-0 flex-col border-b border-r border-gray-800/50 transition-colors duration-200 hover:bg-slate-800/30 ${
        isToday ? 'bg-cyan-500/10' : ''
      } ${date ? 'cursor-pointer' : 'cursor-default bg-slate-900/30'}`}
    >
      <div className="flex-shrink-0 px-1.5 py-1">
        <span className={`text-xs font-medium ${date ? (isToday ? 'text-cyan-400' : 'text-gray-400') : 'text-gray-600'}`}>
          {date ? date.getDate() : ''}
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1 pb-1">
        {events.map((ev) => {
          const isGoal = ev.type === 'goal'
          const hasStake = ev.hasStake === true
          const bgColor = hasStake ? STAKED_PILL_COLOR : isGoal ? GOAL_DEADLINE_PILL_COLOR : getCalendarCategoryColor(ev.category)
          const label = isGoal ? `${ev.title} · deadline` : ev.title
          const showStakeAmount = hasStake && ev.stakeAmount != null
          return (
            <button
              key={ev.id}
              type="button"
              data-event-pill
              onClick={(e) => { e.stopPropagation() }}
              className="flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-xs font-medium text-white transition-opacity duration-200 hover:opacity-90 min-w-0"
              style={{ backgroundColor: bgColor }}
              title={showStakeAmount ? `${label} — ${ev.stakeAmount} ${ev.stakeCurrency ?? ''}` : label}
            >
              {hasStake && (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-white/90" aria-hidden>
                  <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
                  <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
                  <path d="m2 16 6 6" />
                  <circle cx="16" cy="9" r="2.9" />
                  <circle cx="6" cy="5" r="3" />
                </svg>
              )}
              <span className="min-w-0 truncate">{label}</span>
              {showStakeAmount && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/60 px-1.5 py-0.5 text-[10px] text-gray-200">
                  {ev.stakeAmount} {ev.stakeCurrency ?? 'USD'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
