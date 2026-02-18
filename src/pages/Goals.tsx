import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { useGoals, type Goal, type GoalTrackingMode } from '../contexts/GoalsContext'
import { useMissions, GOAL_FILTER_PREFIX, type Mission, type Recurrence } from '../contexts/MissionsContext'
import { getRandomQuoteForPage } from '../utils/quotes'
import { v4 as uuidv4 } from 'uuid'

function GoalIcon({ mode }: { mode?: GoalTrackingMode }) {
  const m = mode ?? 'missions_equal'
  const emojiClass = 'text-xl leading-none'
  if (m === 'time') {
    return (
      <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  if (m === 'count') {
    return (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="goalBarsGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
        {/* Ascending bars */}
        <rect x={3} y={16} width={4} height={6} rx={0.5} fill="url(#goalBarsGradient)" />
        <rect x={8} y={12} width={4} height={10} rx={0.5} fill="url(#goalBarsGradient)" />
        <rect x={13} y={8} width={4} height={14} rx={0.5} fill="url(#goalBarsGradient)" />
        <rect x={18} y={4} width={4} height={18} rx={0.5} fill="url(#goalBarsGradient)" />
      </svg>
    )
  }
  if (m === 'missions_weighted') {
    return <span className={emojiClass} aria-hidden>🎯</span>
  }
  // missions_equal (default) – same as MyMissions
  return <span className={emojiClass} aria-hidden>🎯</span>
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

const TIMER_STORAGE_KEY = (goalId: string) => `timer_${goalId}`

function formatTimerElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

/** Format number with commas between every 3 digits when it has 4+ digits (e.g. 1,000). */
function formatTargetCount(n: number): string {
  if (n < 1000) return String(n)
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const ITEM_HEIGHT = 40
const VISIBLE_COUNT = 5

const WheelColumn = forwardRef(function WheelColumn({
  label,
  value,
  min,
  max,
  onChange,
  onFocus,
  onKeyDown,
  focused,
  format = (n) => String(n),
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  onFocus: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  focused: boolean
  format?: (n: number) => string
}, ref: React.Ref<HTMLDivElement>) {
  const touchStartY = useRef(0)
  const touchStartValue = useRef(0)

  const count = max - min + 1
  const padding = 2
  const totalItems = padding * 2 + count
  const listHeight = totalItems * ITEM_HEIGHT
  const translateY = -(value - min + padding) * ITEM_HEIGHT

  const clamp = (n: number) => Math.max(min, Math.min(max, n))

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    onChange(clamp(value + (e.deltaY > 0 ? 1 : -1)))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartValue.current = value
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = touchStartY.current - e.touches[0].clientY
    const step = Math.round(delta / ITEM_HEIGHT)
    onChange(clamp(touchStartValue.current + step))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(clamp(value - 1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(clamp(value + 1))
    } else {
      onKeyDown(e)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="mb-1 text-xs font-medium text-gray-500">{label}</span>
      <div
        ref={ref}
        className={`relative w-14 overflow-hidden rounded-lg border bg-slate-800/80 ${
          focused ? 'border-cyan-500/70 ring-2 ring-cyan-500/30' : 'border-gray-600'
        }`}
        style={{ height: VISIBLE_COUNT * ITEM_HEIGHT }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        tabIndex={0}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className="absolute left-0 right-0 top-0 z-0 h-[40px] shrink-0 bg-gradient-to-b from-slate-900 to-transparent"
          style={{ height: ITEM_HEIGHT * 2 }}
          aria-hidden
        />
        <div
          className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center bg-cyan-500/20"
          style={{
            top: ITEM_HEIGHT * 2,
            height: ITEM_HEIGHT,
          }}
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 right-0 z-0 h-[80px] shrink-0 bg-gradient-to-t from-slate-900 to-transparent"
          style={{ height: ITEM_HEIGHT * 2 }}
          aria-hidden
        />
        <div
          className="relative z-[1] flex flex-col transition-transform duration-150 ease-out"
          style={{
            transform: `translateY(${translateY}px)`,
            height: listHeight,
          }}
        >
          {Array.from({ length: padding }, (_, i) => (
            <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} className="flex items-center justify-center text-gray-500 opacity-20" aria-hidden>
              –
            </div>
          ))}
          {Array.from({ length: count }, (_, i) => {
            const n = min + i
            const isSelected = n === value
            return (
              <div
                key={n}
                style={{ height: ITEM_HEIGHT }}
                className={`flex items-center justify-center text-center transition-all duration-150 ${
                  isSelected
                    ? 'text-lg font-semibold text-white'
                    : 'text-sm text-gray-500 opacity-25'
                }`}
              >
                {format(n)}
              </div>
            )
          })}
          {Array.from({ length: padding }, (_, i) => (
            <div key={`pad-bottom-${i}`} style={{ height: ITEM_HEIGHT }} className="flex items-center justify-center text-gray-500 opacity-20" aria-hidden>
              –
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default function Goals() {
  const [motivationQuote] = useState(() => getRandomQuoteForPage('goals'))
  const { goals, addGoal: addGoalToContext, updateGoal, deleteGoal } = useGoals()
  const { missions, setMissions } = useMissions()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>('missions_equal')
  /** After adding a goal, we show measurement step or add-mission panel; null when done. */
  const [justAddedGoal, setJustAddedGoal] = useState<Goal | null>(null)
  // Time mode: measurement step
  const [targetHours, setTargetHours] = useState(0)
  const [timeLabel, setTimeLabel] = useState('')
  // Count mode: measurement step
  const [goalTargetCount, setGoalTargetCount] = useState(1)
  const [milestoneLabel, setMilestoneLabel] = useState('')
  const [countMilestoneError, setCountMilestoneError] = useState(false)
  const [countTargetError, setCountTargetError] = useState(false)
  const [countTargetInputString, setCountTargetInputString] = useState('')
  const [timeTargetError, setTimeTargetError] = useState(false)
  // Missions mode: add-mission form (no category selector; goal is fixed)
  const [newMissionTitle, setNewMissionTitle] = useState('')
  const [newMissionRecurrence, setNewMissionRecurrence] = useState<Recurrence>('none')
  const [newMissionHours, setNewMissionHours] = useState(0)
  const [newMissionMinutes, setNewMissionMinutes] = useState(30)
  const [newMissionTargetCount, setNewMissionTargetCount] = useState(1)
  const [newMissionWeightPercent, setNewMissionWeightPercent] = useState(0)
  const [showMissionDuration, setShowMissionDuration] = useState(false)
  const [showMissionTargetCount, setShowMissionTargetCount] = useState(false)
  /** Mission IDs added in this session for the current goal (shown below the form). */
  const [sessionMissionIds, setSessionMissionIds] = useState<string[]>([])
  /** When set, form is editing this mission instead of adding new. */
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null)
  // Time tracking: manual log modal (wheel picker: 0-999h, 0-59m, 0-59s)
  const [logTimeModalGoalId, setLogTimeModalGoalId] = useState<string | null>(null)
  const [logTimeHours, setLogTimeHours] = useState(0)
  const [logTimeMinutes, setLogTimeMinutes] = useState(0)
  const [logTimeSeconds, setLogTimeSeconds] = useState(0)
  const [logTimeFocusedWheel, setLogTimeFocusedWheel] = useState<'h' | 'm' | 's'>('h')
  const logTimeDigitBufferRef = useRef({ digits: '', time: 0 })
  const logTimeFlushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logTimeWheelRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const [successFlashGoalId, setSuccessFlashGoalId] = useState<string | null>(null)
  // Milestone/count goals: inline "Update count" editor
  const [updateCountGoalId, setUpdateCountGoalId] = useState<string | null>(null)
  const [updateCountInput, setUpdateCountInput] = useState('')
  // Time tracking: live timer (one at a time)
  const [activeTimer, setActiveTimer] = useState<{ goalId: string; startTime: number; elapsedSeconds: number } | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [addGoalTitleError, setAddGoalTitleError] = useState(false)

  const openAddForm = () => {
    setShowAddForm(true)
    setNewGoalTitle('')
    setJustAddedGoal(null)
    setAddGoalTitleError(false)
  }

  const addGoal = () => {
    const title = newGoalTitle.trim()
    if (!title) {
      setAddGoalTitleError(true)
      return
    }
    setAddGoalTitleError(false)
    const newGoal = addGoalToContext(title, trackingMode)
    setNewGoalTitle('')
    setShowAddForm(false)
    if (newGoal) setJustAddedGoal(newGoal)
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setNewGoalTitle('')
    setJustAddedGoal(null)
    setAddGoalTitleError(false)
  }

  const closeJustAdded = () => {
    setJustAddedGoal(null)
    setTargetHours(0)
    setTimeLabel('')
    setGoalTargetCount(1)
    setMilestoneLabel('')
    setCountMilestoneError(false)
    setCountTargetError(false)
    setCountTargetInputString('')
    setTimeTargetError(false)
    setNewMissionTitle('')
    setNewMissionRecurrence('none')
    setNewMissionHours(0)
    setNewMissionMinutes(30)
    setNewMissionTargetCount(1)
    setNewMissionWeightPercent(0)
    setSessionMissionIds([])
    setEditingMissionId(null)
  }

  const saveTimeMeasurement = () => {
    if (!justAddedGoal) return
    if (targetHours <= 0) {
      setTimeTargetError(true)
      return
    }
    setTimeTargetError(false)
    updateGoal(justAddedGoal.id, { targetHours, timeLabel })
    closeJustAdded()
  }

  const saveCountMeasurement = () => {
    if (!justAddedGoal) return
    const label = milestoneLabel.trim()
    const targetInvalid = goalTargetCount <= 0
    const labelInvalid = !label
    if (targetInvalid) setCountTargetError(true)
    if (labelInvalid) setCountMilestoneError(true)
    if (targetInvalid || labelInvalid) return
    setCountMilestoneError(false)
    setCountTargetError(false)
    updateGoal(justAddedGoal.id, { targetCount: goalTargetCount, milestoneLabel: label })
    closeJustAdded()
  }

  const openUpdateCount = useCallback((goal: Goal) => {
    if (goal.trackingMode !== 'count') return
    setUpdateCountGoalId(goal.id)
    const cur = goal.currentCount ?? 0
    setUpdateCountInput(cur === 0 ? '' : String(cur))
  }, [])

  const saveUpdateCount = useCallback(
    (goalId: string) => {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal || goal.trackingMode !== 'count') return
      const parsed = parseFloat(updateCountInput.trim())
      const value = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
      const target = goal.targetCount ?? 1
      const newProgress = target > 0 ? Math.min(100, (value / target) * 100) : 0
      updateGoal(goalId, { currentCount: value, progressPercent: newProgress })
      setUpdateCountGoalId(null)
      setUpdateCountInput('')
    },
    [goals, updateCountInput, updateGoal],
  )

  const isWeighted = justAddedGoal?.trackingMode === 'missions_weighted'
  const categoryForGoal = justAddedGoal ? `${GOAL_FILTER_PREFIX}${justAddedGoal.id}` : ''
  const missionsForThisGoal = missions.filter((m) => m.goalId === justAddedGoal?.id)
  const sessionMissions = missionsForThisGoal.filter((m) => sessionMissionIds.includes(m.id))
  const totalWeightUsed = missionsForThisGoal.reduce((sum, m) => sum + (m.weightPercent ?? 0), 0)
  const freePercent = Math.max(0, 100 - totalWeightUsed)

  const addMissionForGoal = (andOpenNew: boolean) => {
    if (!justAddedGoal) return
    const title = newMissionTitle.trim()
    if (!title) return
    const category = categoryForGoal
    const durationStr = showMissionDuration ? `${newMissionHours}h ${newMissionMinutes}m` : '0h 0m'
    const weight = isWeighted ? Math.min(100, Math.max(0, newMissionWeightPercent)) : undefined
    const targetCount = showMissionTargetCount ? newMissionTargetCount : undefined

    if (editingMissionId) {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === editingMissionId
            ? {
                ...m,
                title,
                recurrence: newMissionRecurrence,
                duration: durationStr,
                targetCount,
                progressCount: m.progressCount ?? (targetCount ? 0 : undefined),
                weightPercent: weight,
              }
            : m,
        ),
      )
      setEditingMissionId(null)
    } else {
      const inCategory = missions.filter((m) => m.category === category)
      const nextOrder = inCategory.length === 0 ? 0 : Math.max(...inCategory.map((m) => m.orderInCategory ?? 0)) + 1
      const id = uuidv4()
      setMissions((prev) => [
        {
          id,
          title,
          category,
          recurrence: newMissionRecurrence,
          duration: durationStr,
          targetCount,
          progressCount: targetCount ? 0 : undefined,
          createdAt: new Date().toISOString(),
          isCompleted: false,
          orderInCategory: nextOrder,
          goalId: justAddedGoal.id,
          weightPercent: weight,
        },
        ...prev,
      ])
      setSessionMissionIds((prev) => [...prev, id])
    }

    setNewMissionTitle('')
    setNewMissionRecurrence('none')
    setNewMissionHours(0)
    setNewMissionMinutes(30)
    setNewMissionTargetCount(1)
    setNewMissionWeightPercent(0)
    setShowMissionDuration(false)
    setShowMissionTargetCount(false)
    if (!andOpenNew) closeJustAdded()
  }

  const loadMissionIntoForm = (mission: Mission) => {
    setNewMissionTitle(mission.title)
    setNewMissionRecurrence(mission.recurrence)
    setNewMissionWeightPercent(mission.weightPercent ?? 0)
    const match = mission.duration.match(/(\d+)h\s*(\d+)m/)
    const h = match ? parseInt(match[1], 10) : 0
    const m = match ? parseInt(match[2], 10) : 30
    setNewMissionHours(h)
    setNewMissionMinutes(m)
    setShowMissionDuration(h > 0 || m > 0)
    setNewMissionTargetCount(mission.targetCount ?? 1)
    setShowMissionTargetCount(mission.targetCount != null && mission.targetCount > 0)
    setEditingMissionId(mission.id)
  }

  const doneMissionsForGoal = () => {
    if (isWeighted && totalWeightUsed < 100) {
      alert('There is not enough percentage. Total weight must equal 100%.')
      return
    }
    const title = newMissionTitle.trim()
    if (title) addMissionForGoal(false)
    else closeJustAdded()
  }

  // --- Time tracking: manual log + live timer ---
  const openLogTimeModal = useCallback((goalId: string) => {
    setLogTimeModalGoalId(goalId)
    setLogTimeHours(0)
    setLogTimeMinutes(0)
    setLogTimeSeconds(0)
    setLogTimeFocusedWheel('h')
    logTimeDigitBufferRef.current = { digits: '', time: 0 }
    if (logTimeFlushTimeoutRef.current) {
      clearTimeout(logTimeFlushTimeoutRef.current)
      logTimeFlushTimeoutRef.current = null
    }
    setTimeout(() => logTimeWheelRefs[0].current?.focus(), 100)
  }, [])

  const saveLogTime = useCallback(() => {
    if (!logTimeModalGoalId) return
    const goal = goals.find((g) => g.id === logTimeModalGoalId)
    if (!goal || goal.trackingMode !== 'time') return
    const toAdd = logTimeHours + logTimeMinutes / 60 + logTimeSeconds / 3600
    if (toAdd <= 0) return
    const target = goal.targetHours ?? 0
    const newLogged = (goal.loggedHours ?? 0) + toAdd
    const newProgress = target > 0 ? Math.min(100, (newLogged / target) * 100) : goal.progressPercent
    updateGoal(logTimeModalGoalId, { loggedHours: newLogged, progressPercent: newProgress })
    setLogTimeModalGoalId(null)
    setLogTimeHours(0)
    setLogTimeMinutes(0)
    setLogTimeSeconds(0)
    setSuccessFlashGoalId(logTimeModalGoalId)
    setTimeout(() => setSuccessFlashGoalId(null), 2000)
  }, [logTimeModalGoalId, logTimeHours, logTimeMinutes, logTimeSeconds, goals, updateGoal])

  const applyDigitInput = useCallback((wheel: 'h' | 'm' | 's', digit: string) => {
    const buf = logTimeDigitBufferRef.current
    buf.digits += digit
    if (logTimeFlushTimeoutRef.current) clearTimeout(logTimeFlushTimeoutRef.current)

    const flushAndAdvance = (w: 'h' | 'm' | 's', nextIndex: number) => {
      const maxVal = w === 'h' ? 999 : 59
      const v = Math.min(maxVal, parseInt(buf.digits, 10) || 0)
      if (w === 'h') setLogTimeHours(v)
      else if (w === 'm') setLogTimeMinutes(v)
      else setLogTimeSeconds(v)
      buf.digits = ''
      if (w === 'h') setLogTimeFocusedWheel('m')
      else if (w === 'm') setLogTimeFocusedWheel('s')
      else setLogTimeFocusedWheel('h')
      logTimeFlushTimeoutRef.current = null
      setTimeout(() => logTimeWheelRefs[nextIndex].current?.focus(), 0)
    }

    if (wheel === 'h') {
      const v = Math.min(999, parseInt(buf.digits, 10) || 0)
      setLogTimeHours(v)
      logTimeFlushTimeoutRef.current = setTimeout(() => {
        flushAndAdvance('h', 1)
      }, 400)
    } else {
      const maxVal = 59
      if (buf.digits.length >= 2) {
        const v = Math.min(maxVal, parseInt(buf.digits.slice(0, 2), 10) || 0)
        if (wheel === 'm') setLogTimeMinutes(v)
        else setLogTimeSeconds(v)
        buf.digits = ''
        const nextIndex = wheel === 'm' ? 2 : 0
        if (wheel === 'm') setLogTimeFocusedWheel('s')
        else setLogTimeFocusedWheel('h')
        setTimeout(() => logTimeWheelRefs[nextIndex].current?.focus(), 0)
      } else {
        logTimeFlushTimeoutRef.current = setTimeout(() => {
          const v = Math.min(maxVal, parseInt(buf.digits, 10) || 0)
          if (wheel === 'm') setLogTimeMinutes(v)
          else setLogTimeSeconds(v)
          buf.digits = ''
          const nextIndex = wheel === 'm' ? 2 : 0
          if (wheel === 'm') setLogTimeFocusedWheel('s')
          else setLogTimeFocusedWheel('h')
          logTimeFlushTimeoutRef.current = null
          setTimeout(() => logTimeWheelRefs[nextIndex].current?.focus(), 0)
        }, 400)
      }
    }
  }, [])

  const startTimer = useCallback((goalId: string) => {
    if (activeTimer) return
    setActiveTimer({ goalId, startTime: Date.now(), elapsedSeconds: 0 })
  }, [activeTimer])

  const stopTimer = useCallback(() => {
    if (!activeTimer) return
    const goal = goals.find((g) => g.id === activeTimer.goalId)
    if (goal && goal.trackingMode === 'time') {
      const totalSeconds = activeTimer.elapsedSeconds
      const hoursToAdd = totalSeconds / 3600
      const target = goal.targetHours ?? 0
      const newLogged = (goal.loggedHours ?? 0) + hoursToAdd
      const newProgress = target > 0 ? Math.min(100, (newLogged / target) * 100) : goal.progressPercent
      updateGoal(activeTimer.goalId, { loggedHours: newLogged, progressPercent: newProgress })
      setSuccessFlashGoalId(activeTimer.goalId)
      setTimeout(() => setSuccessFlashGoalId(null), 2000)
    }
    try {
      localStorage.removeItem(TIMER_STORAGE_KEY(activeTimer.goalId))
    } catch (_) {}
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setActiveTimer(null)
  }, [activeTimer, goals, updateGoal])

  // Timer tick: update elapsed every second
  useEffect(() => {
    if (!activeTimer) return
    timerIntervalRef.current = setInterval(() => {
      setActiveTimer((prev) =>
        prev ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 } : null,
      )
    }, 1000)
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [activeTimer?.goalId, activeTimer?.startTime])

  // Persist running timer to localStorage (on unload / unmount)
  const persistTimer = useCallback(() => {
    if (!activeTimer) return
    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY(activeTimer.goalId),
        JSON.stringify({ startTime: activeTimer.startTime, elapsedSeconds: activeTimer.elapsedSeconds }),
      )
    } catch (_) {}
  }, [activeTimer])

  useEffect(() => {
    const onBeforeUnload = () => {
      persistTimer()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      persistTimer()
    }
  }, [persistTimer])

  useEffect(() => {
    if (!logTimeModalGoalId && logTimeFlushTimeoutRef.current) {
      clearTimeout(logTimeFlushTimeoutRef.current)
      logTimeFlushTimeoutRef.current = null
    }
  }, [logTimeModalGoalId])

  // Restore timer from localStorage on mount (first stored timer only)
  useEffect(() => {
    for (const goal of goals) {
      if (goal.trackingMode !== 'time') continue
      try {
        const raw = localStorage.getItem(TIMER_STORAGE_KEY(goal.id))
        if (!raw) continue
        const data = JSON.parse(raw) as { startTime: number; elapsedSeconds: number }
        if (data && typeof data.startTime === 'number' && typeof data.elapsedSeconds === 'number') {
          const elapsed = data.elapsedSeconds + Math.floor((Date.now() - data.startTime) / 1000)
          setActiveTimer({ goalId: goal.id, startTime: Date.now(), elapsedSeconds: Math.max(0, elapsed) })
          break
        }
      } catch (_) {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-purple-500/40 bg-slate-900 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className="flex-1 bg-transparent text-white" aria-hidden="true">
          {motivationQuote}
        </span>
      </div>

      {!showAddForm && !justAddedGoal && (
        <button
          type="button"
          onClick={openAddForm}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 sm:w-auto sm:px-6"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Goal
        </button>
      )}

      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-20 text-center text-gray-300">
        {justAddedGoal ? (
          <div className="w-full max-w-md space-y-4 px-4">
            {(justAddedGoal.trackingMode === 'missions_equal' || justAddedGoal.trackingMode === 'missions_weighted') ? (
              <>
                <p className="text-left text-sm font-medium text-gray-300">
                  Add missions for &quot;{justAddedGoal.title}&quot; (stays under this goal)
                </p>
                <div className="space-y-3 rounded-lg border border-gray-800 bg-slate-900/70 p-3 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Mission title</label>
                  <input
                    type="text"
                    value={newMissionTitle}
                    onChange={(e) => setNewMissionTitle(e.target.value)}
                    placeholder="What do you want to do?"
                    className="w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Repeated</label>
                  <select
                    value={newMissionRecurrence}
                    onChange={(e) => setNewMissionRecurrence(e.target.value as Recurrence)}
                    className="w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="none">One-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-800/50 px-3 py-2.5 text-sm text-gray-200 hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={showMissionDuration}
                      onChange={(e) => setShowMissionDuration(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500"
                    />
                    <span>Add duration (optional)</span>
                  </label>
                  {showMissionDuration && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Duration</span>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={newMissionHours}
                        onChange={(e) => setNewMissionHours(Math.max(0, Number(e.target.value) || 0))}
                        className="w-16 rounded-lg border border-gray-700 bg-slate-900 px-2 py-1.5 text-center text-white"
                      />
                      <span className="text-gray-400">h</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={newMissionMinutes}
                        onChange={(e) => setNewMissionMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                        className="w-16 rounded-lg border border-gray-700 bg-slate-900 px-2 py-1.5 text-center text-white"
                      />
                      <span className="text-gray-400">m</span>
                      <button
                        type="button"
                        onClick={() => setShowMissionDuration(false)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-400 rounded px-1.5"
                        aria-label="Cancel duration"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-800/50 px-3 py-2.5 text-sm text-gray-200 hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={showMissionTargetCount}
                      onChange={(e) => setShowMissionTargetCount(e.target.checked)}
                      className="h-4 w-4 accent-cyan-500"
                    />
                    <span>Set target count (optional)</span>
                  </label>
                  {showMissionTargetCount && (
                    <label className="flex items-center gap-2 text-sm text-gray-400">
                      <span>Target count</span>
                      <input
                        type="number"
                        min={1}
                        value={newMissionTargetCount}
                        onChange={(e) => setNewMissionTargetCount(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 rounded-lg border border-gray-700 bg-slate-900 px-2 py-1 text-center text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMissionTargetCount(false)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-400 rounded px-1.5"
                        aria-label="Cancel target count"
                      >
                        Cancel
                      </button>
                    </label>
                  )}
                  {isWeighted && (
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Weight (% of goal) — total should be 100
                    </label>
                  )}
                  {isWeighted && (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newMissionWeightPercent}
                      onChange={(e) => setNewMissionWeightPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-20 rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0–100"
                    />
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => addMissionForGoal(true)}
                    disabled={!newMissionTitle.trim()}
                    className="flex-1 rounded-lg border border-blue-500 bg-slate-800 py-2.5 font-medium text-white hover:bg-blue-500/80 disabled:opacity-50"
                  >
                    {editingMissionId ? 'Update mission' : 'Add more mission'}
                  </button>
                  <button
                    type="button"
                    onClick={doneMissionsForGoal}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500"
                  >
                    Done
                  </button>
                </div>

                {sessionMissions.length > 0 && (
                  <div className="space-y-3 border-t border-gray-800 pt-4 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Missions added this session</p>
                    <ul className="space-y-2">
                      {sessionMissions.map((m) => (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-700 bg-slate-800/60 px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-white" title={m.title}>{m.title}</span>
                          {isWeighted && (
                            <span className="text-sm tabular-nums text-gray-400">{m.weightPercent ?? 0}%</span>
                          )}
                          <button
                            type="button"
                            onClick={() => loadMissionIntoForm(m)}
                            className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-gray-300 hover:bg-slate-600 hover:text-white"
                          >
                            Edit
                          </button>
                        </li>
                      ))}
                    </ul>
                    {isWeighted && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Weight used (total 100%)</p>
                        <div className="flex h-6 w-full overflow-hidden rounded-lg bg-slate-800">
                          {sessionMissions.map((m, i) => {
                            const pct = m.weightPercent ?? 0
                            if (pct <= 0) return null
                            return (
                              <div
                                key={m.id}
                                className="shrink-0 border-r border-slate-900 last:border-r-0"
                                style={{ width: `${pct}%`, minWidth: pct > 0 ? '4px' : 0, backgroundColor: `hsl(${220 + i * 40}, 50%, 45%)` }}
                                title={`${m.title}: ${pct}%`}
                              />
                            )
                          })}
                          {freePercent > 0 && (
                            <div
                              className="min-w-0 flex-1 bg-slate-700/80"
                              style={{ width: `${freePercent}%` }}
                              title={`Free: ${freePercent}%`}
                            />
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Used: {totalWeightUsed}%</span>
                          <span>Free: {freePercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : justAddedGoal.trackingMode === 'time' ? (
              <>
                <p className="text-left text-sm font-medium text-gray-300">How much time for what?</p>
                <div className="space-y-3 rounded-lg border border-gray-800 bg-slate-900/70 p-3 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Target hours</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={targetHours}
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value) || 0)
                      setTargetHours(v)
                      if (timeTargetError && v > 0) setTimeTargetError(false)
                    }}
                    placeholder="e.g. 10"
                    className={`w-full rounded-lg border bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                      timeTargetError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">For what (e.g. practice, study)</label>
                  <input
                    type="text"
                    value={timeLabel}
                    onChange={(e) => setTimeLabel(e.target.value)}
                    placeholder="e.g. practice"
                    className="w-full rounded-lg border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveTimeMeasurement}
                  className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <p className="text-left text-sm font-medium text-gray-300">Number of doing what?</p>
                <div className="space-y-3 rounded-lg border border-gray-800 bg-slate-900/70 p-3 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">Target number</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={countTargetInputString !== '' ? countTargetInputString : (goalTargetCount === 0 ? '' : formatTargetCount(goalTargetCount))}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '')
                      const parts = v.split('.')
                      const sanitized = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : v
                      setCountTargetInputString(sanitized)
                      const parsed = parseFloat(sanitized)
                      const num = sanitized === '' || sanitized === '.' ? 0 : (Number.isNaN(parsed) ? 0 : Math.max(0, parsed))
                      setGoalTargetCount(num)
                      if (countTargetError && num > 0) setCountTargetError(false)
                    }}
                    className={`w-full rounded-lg border bg-slate-900 px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                      countTargetError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">What you’re counting (e.g. chapters read)</label>
                  <input
                    type="text"
                    value={milestoneLabel}
                    onChange={(e) => {
                      setMilestoneLabel(e.target.value)
                      if (countMilestoneError) setCountMilestoneError(false)
                    }}
                    placeholder="e.g. chapters to read"
                    className={`w-full rounded-lg border bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                      countMilestoneError
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveCountMeasurement}
                  className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500"
                >
                  Save
                </button>
              </>
            )}
          </div>
        ) : showAddForm ? (
          <div className="w-full max-w-md space-y-4 px-4">
            <label className="block text-left text-sm font-medium text-gray-300">
              Goal
            </label>
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => {
                setNewGoalTitle(e.target.value)
                if (addGoalTitleError) setAddGoalTitleError(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && addGoal()}
              placeholder="What do you want to achieve?"
              className={`w-full rounded-lg border bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                addGoalTitleError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-purple-500 focus:ring-purple-500'
              }`}
              autoFocus
            />
            <div className="space-y-3 rounded-lg border border-gray-800 bg-slate-900/70 p-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                How do you want to track this goal?
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setTrackingMode(trackingMode === 'missions_weighted' ? 'missions_weighted' : 'missions_equal')}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    trackingMode === 'missions_equal' || trackingMode === 'missions_weighted'
                      ? 'border-blue-500 bg-slate-800 text-white'
                      : 'border-gray-700 bg-slate-900 text-gray-300 hover:border-blue-500/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">By missions</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-400">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="missions-tracking"
                        checked={trackingMode === 'missions_equal'}
                        onChange={() => setTrackingMode('missions_equal')}
                        className="h-3 w-3 accent-blue-500"
                      />
                      <span>All missions are equally important (each mission contributes the same %).</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="missions-tracking"
                        checked={trackingMode === 'missions_weighted'}
                        onChange={() => setTrackingMode('missions_weighted')}
                        className="h-3 w-3 accent-blue-500"
                      />
                      <span>Weight each mission differently (you decide each mission&apos;s importance).</span>
                    </label>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTrackingMode('time')}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    trackingMode === 'time'
                      ? 'border-blue-500 bg-slate-800 text-white'
                      : 'border-gray-700 bg-slate-900 text-gray-300 hover:border-blue-500/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">By time tracking</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Track how many hours you invest toward this goal.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTrackingMode('count')}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    trackingMode === 'count'
                      ? 'border-blue-500 bg-slate-800 text-white'
                      : 'border-gray-700 bg-slate-900 text-gray-300 hover:border-blue-500/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">By Milestones</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    Track progress toward a numeric target.
                  </p>
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelAdd}
                className="flex-1 rounded-lg border border-gray-600 py-2.5 font-medium text-gray-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addGoal}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500"
              >
                Add Goal
              </button>
            </div>
          </div>
        ) : goals.length > 0 ? (
          <ul className="grid w-full grid-cols-1 gap-4 px-4 text-left sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const progress = getGoalProgressFromMissions(goal, missions)
              const goalMissions = missions
                .filter((m) => m.goalId === goal.id)
                .sort((a, b) => (a.orderInCategory ?? 0) - (b.orderInCategory ?? 0))
              const displayMissions = goalMissions.slice(0, 3)
              return (
              <li
                key={goal.id}
                className={`group relative rounded-xl border transition hover:border-gray-600 ${
                  successFlashGoalId === goal.id
                    ? 'border-emerald-500/70 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                    : 'border-gray-700 bg-slate-900/70 shadow-lg shadow-black/20'
                }`}
              >
                <div className="flex flex-col p-4">
                  {/* Goal Header */}
                  <div className="mb-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                        <GoalIcon mode={goal.trackingMode} />
                      </div>
                      <h3 className="min-w-0 flex-1 text-lg font-semibold text-white">{goal.title}</h3>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-gray-400">Progress</span>
                      <span className="font-semibold tabular-nums text-cyan-400">
                        {Math.round(Math.min(100, Math.max(0, progress)))}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-[width] duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                    {/* Time tracking: logged display + Log Time / Start Timer */}
                    {goal.trackingMode === 'time' && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-medium tabular-nums text-gray-300">
                          {Math.min(999, Math.round((goal.loggedHours ?? 0) * 10) / 10)}h / {(goal.targetHours ?? 0)}h logged
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openLogTimeModal(goal.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9" />
                              <path strokeLinecap="round" d="M12 7v5l3 2" />
                            </svg>
                            Log Time
                          </button>
                          {activeTimer?.goalId === goal.id ? (
                            <button
                              type="button"
                              onClick={stopTimer}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/60 bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            >
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="6" y="6" width="12" height="12" rx="2" />
                              </svg>
                              Stop Timer ({formatTimerElapsed(activeTimer.elapsedSeconds)})
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startTimer(goal.id)}
                              disabled={!!activeTimer}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:bg-slate-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            >
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7L8 5z" />
                              </svg>
                              Start Timer
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Milestone/count: current vs target + Update count button */}
                    {goal.trackingMode === 'count' && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-medium tabular-nums text-gray-300">
                          {formatTargetCount(goal.currentCount ?? 0)} / {formatTargetCount(goal.targetCount ?? 1)}{' '}
                          {(goal.milestoneLabel?.trim() || 'items')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {updateCountGoalId === goal.id ? (
                            <>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={updateCountInput}
                                onChange={(e) => {
                                  const v = e.target.value.replace(/[^\d.]/g, '')
                                  const parts = v.split('.')
                                  const sanitized = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('') : v
                                  setUpdateCountInput(sanitized)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveUpdateCount(goal.id)
                                  if (e.key === 'Escape') {
                                    setUpdateCountGoalId(null)
                                    setUpdateCountInput('')
                                  }
                                }}
                                className="w-24 rounded-lg border border-gray-600 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => saveUpdateCount(goal.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-600/60 bg-cyan-500/20 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUpdateCountGoalId(null)
                                  setUpdateCountInput('')
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openUpdateCount(goal)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-gray-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Update count
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Missions List */}
                  {goalMissions.length > 0 ? (
                    <div className="space-y-2 border-t border-gray-800 pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Missions ({goalMissions.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {displayMissions.map((mission) => (
                          <li
                            key={mission.id}
                            className="flex items-start gap-2 rounded-lg bg-slate-800/50 p-2 text-sm transition hover:bg-slate-800"
                          >
                            {/* Checkbox */}
                            <div
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                                mission.isCompleted
                                  ? 'border-emerald-500 bg-emerald-500'
                                  : 'border-gray-600'
                              }`}
                            >
                              {mission.isCompleted && (
                                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>

                            {/* Mission Title */}
                            <span className={`min-w-0 flex-1 truncate ${mission.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`} title={mission.title}>
                              {mission.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="border-t border-gray-800 pt-3 text-center text-xs text-gray-500">
                      No missions yet
                    </div>
                  )}
                </div>
                
                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => deleteGoal(goal.id)}
                  className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:opacity-100 focus:ring-2 focus:ring-red-400/50"
                  aria-label="Delete goal"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </li>
            );
            })}
          </ul>
        ) : (
          <>
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
              <svg className="h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <p className="mb-6">Start setting ambitious targets to achieve greatness</p>
            <button
              type="button"
              onClick={openAddForm}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500"
            >
              Create Your First Goal
            </button>
          </>
        )}
      </div>

      {/* Log Time modal — iOS-style wheel picker */}
      {logTimeModalGoalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setLogTimeModalGoalId(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-time-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-700 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                saveLogTime()
              }
            }}
          >
            <h3 id="log-time-title" className="mb-4 text-center text-base font-semibold text-white">Log time</h3>
            <div className="mb-5 flex gap-2">
              <WheelColumn
                ref={logTimeWheelRefs[0]}
                label="Hours"
                value={logTimeHours}
                min={0}
                max={999}
                onChange={setLogTimeHours}
                onFocus={() => setLogTimeFocusedWheel('h')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    setLogTimeFocusedWheel('s')
                    setTimeout(() => logTimeWheelRefs[2].current?.focus(), 0)
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    setLogTimeFocusedWheel('m')
                    setTimeout(() => logTimeWheelRefs[1].current?.focus(), 0)
                  } else if (/^[0-9]$/.test(e.key)) {
                    e.preventDefault()
                    applyDigitInput('h', e.key)
                  } else if (e.key === 'Tab' && !e.shiftKey) {
                    setLogTimeFocusedWheel('m')
                    setTimeout(() => logTimeWheelRefs[1].current?.focus(), 0)
                  }
                }}
                focused={logTimeFocusedWheel === 'h'}
              />
              <WheelColumn
                ref={logTimeWheelRefs[1]}
                label="Minutes"
                value={logTimeMinutes}
                min={0}
                max={59}
                format={(n) => String(n).padStart(2, '0')}
                onChange={setLogTimeMinutes}
                onFocus={() => setLogTimeFocusedWheel('m')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    setLogTimeFocusedWheel('h')
                    setTimeout(() => logTimeWheelRefs[0].current?.focus(), 0)
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    setLogTimeFocusedWheel('s')
                    setTimeout(() => logTimeWheelRefs[2].current?.focus(), 0)
                  } else if (/^[0-9]$/.test(e.key)) {
                    e.preventDefault()
                    applyDigitInput('m', e.key)
                  } else if (e.key === 'Tab' && !e.shiftKey) {
                    setLogTimeFocusedWheel('s')
                    setTimeout(() => logTimeWheelRefs[2].current?.focus(), 0)
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    setLogTimeFocusedWheel('h')
                    setTimeout(() => logTimeWheelRefs[0].current?.focus(), 0)
                  }
                }}
                focused={logTimeFocusedWheel === 'm'}
              />
              <WheelColumn
                ref={logTimeWheelRefs[2]}
                label="Seconds"
                value={logTimeSeconds}
                min={0}
                max={59}
                format={(n) => String(n).padStart(2, '0')}
                onChange={setLogTimeSeconds}
                onFocus={() => setLogTimeFocusedWheel('s')}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault()
                    setLogTimeFocusedWheel('m')
                    setTimeout(() => logTimeWheelRefs[1].current?.focus(), 0)
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault()
                    setLogTimeFocusedWheel('h')
                    setTimeout(() => logTimeWheelRefs[0].current?.focus(), 0)
                  } else if (/^[0-9]$/.test(e.key)) {
                    e.preventDefault()
                    applyDigitInput('s', e.key)
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    setLogTimeFocusedWheel('m')
                    setTimeout(() => logTimeWheelRefs[1].current?.focus(), 0)
                  }
                }}
                focused={logTimeFocusedWheel === 's'}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLogTimeModalGoalId(null)}
                className="flex-1 rounded-xl border border-gray-600 py-2.5 text-sm font-medium text-gray-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLogTime}
                className="flex-1 rounded-xl bg-cyan-600 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}