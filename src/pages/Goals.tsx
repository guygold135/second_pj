import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'
import { useGoals, type Goal, type GoalTrackingMode } from '../contexts/GoalsContext'
import { useMissions, GOAL_FILTER_PREFIX, type Mission, type Recurrence } from '../contexts/MissionsContext'
import { v4 as uuidv4 } from 'uuid'
import { StakeSetupModal, StakeBadge, type StakeInfo } from '../components/StakeSetupModal'
import { GlowButton } from '../components/ui/glow-button'
import { NeonCheckbox } from '../components/ui/animated-check-box'
import { Calendar } from '../components/ui/calendar'
import { ArrowLeft, ArrowRight, RefreshCcw } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { supabase } from '../lib/supabase'
import { toLocalDateString } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { btn, input, modal, pageContainer } from '../styles/designSystem'

/** Nav icon for goal date range calendar: ArrowRight (next month), ArrowLeft (prev month). */
function GoalCalendarChevron({
  orientation,
  className,
  size = 24,
}: {
  orientation?: 'left' | 'right' | 'up' | 'down'
  className?: string
  size?: number
}) {
  if (orientation === 'left') return <ArrowLeft size={size} className={className} strokeWidth={1.75} aria-hidden />
  if (orientation === 'up') return <ArrowRight size={size} className={className} strokeWidth={1.75} aria-hidden style={{ transform: 'rotate(-90deg)' }} />
  if (orientation === 'down') return <ArrowRight size={size} className={className} strokeWidth={1.75} aria-hidden style={{ transform: 'rotate(90deg)' }} />
  return <ArrowRight size={size} className={className} strokeWidth={1.75} aria-hidden />
}

/** Start of day at 00:00:00 for date comparison. */
function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
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

/** Format goal deadline as single date (end of range), e.g. "Mar 16" or "Mar 16, 2025" if not current year. */
function formatDeadlineRange(deadlineFrom?: string, deadlineTo?: string): string | null {
  const dateStr = deadlineTo ?? deadlineFrom
  if (!dateStr) return null
  try {
    const d = new Date(dateStr + 'T12:00:00')
    if (Number.isNaN(d.getTime())) return null
    const currentYear = new Date().getFullYear()
    const showYear = d.getFullYear() !== currentYear
    const opts: Intl.DateTimeFormatOptions = showYear
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric' }
    return d.toLocaleDateString('en-US', opts)
  } catch {
    return null
  }
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

function DurationCombobox({
  value,
  onChange,
  options,
  min,
  max,
  label,
  ariaLabel,
}: {
  value: number
  onChange: (n: number) => void
  options: number[]
  min: number
  max: number
  label: string
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        onFocus={(e) => {
          setOpen(true)
          ;(e.target as HTMLInputElement).select()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onChange(Math.min(max, Math.max(min, Number((e.target as HTMLInputElement).value) || 0)))
            setOpen(false)
          }
        }}
        className="w-14 rounded-lg border border-gray-600 bg-slate-900 px-2 py-1 text-center text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        placeholder="0"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <ul
          className="absolute left-0 top-full z-10 mt-1 max-h-40 w-14 overflow-auto rounded-lg border border-gray-600 bg-slate-900 py-1 shadow-lg"
          role="listbox"
        >
          {options.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className="cursor-pointer px-2 py-1 text-center text-white hover:bg-slate-700"
            >
              {String(opt).padStart(2, '0')}{label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Goals() {
  const { goals, addGoal: addGoalToContext, updateGoal, deleteGoal, getGoalById } = useGoals()
  const { missions, setMissions } = useMissions()
  const { toast } = useToast()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>('missions_equal')
  /** After adding a goal, we show measurement step or add-mission panel; null when done. */
  const [justAddedGoal, setJustAddedGoal] = useState<Goal | null>(null)
  /** When set, user is in add-missions flow but goal not created yet; goal is created only on Done. */
  const [pendingGoalCreation, setPendingGoalCreation] = useState<{
    title: string
    trackingMode: 'missions_equal' | 'missions_weighted'
    dateRange?: DateRange
  } | null>(null)
  /** Missions to add when user presses Done (only when pendingGoalCreation is set). */
  const [pendingMissions, setPendingMissions] = useState<Array<{ id: string; title: string; recurrence: Recurrence; duration: string; targetCount?: number; weightPercent?: number; deadline?: string }>>([])
  /** Goal currently being edited in the modal (separate from creation flow). */
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showEditGoalModal, setShowEditGoalModal] = useState(false)
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
  const [newMissionDeadline, setNewMissionDeadline] = useState('')
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
  const [stakeModalForGoalId, setStakeModalForGoalId] = useState<string | null>(null)
  const [stakeModalForMissionId, setStakeModalForMissionId] = useState<string | null>(null)
  const [goalStakes, setGoalStakes] = useState<Record<string, StakeInfo>>({})
  const [missionStakes, setMissionStakes] = useState<Record<string, StakeInfo>>({})
  const [chargeSuccessMessage, setChargeSuccessMessage] = useState<string | null>(null)
  /** Which goal card is expanded (accordion). Single id or '__standalone__' or null. */
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)
  /** When set, we're adding a mission to this goal (inline modal). */
  const [addMissionForGoalId, setAddMissionForGoalId] = useState<string | null>(null)
  /** Guard to prevent double-add when submitting new mission (e.g. double-click). */
  const isAddingMissionRef = useRef(false)
  /** Calendar modal shown after clicking Add Goal (date range for goal). */
  const [showGoalCalendarModal, setShowGoalCalendarModal] = useState(false)
  const [goalDateRange, setGoalDateRange] = useState<DateRange | undefined>(undefined)
  const { user, session } = useAuth()

  // Reset calendar selection every time the modal is opened
  useEffect(() => {
    if (showGoalCalendarModal) setGoalDateRange(undefined)
  }, [showGoalCalendarModal])

  const [addGoalTitleError, setAddGoalTitleError] = useState(false)

  const openAddForm = () => {
    setShowAddForm(true)
    setNewGoalTitle('')
    setJustAddedGoal(null)
    setPendingGoalCreation(null)
    setPendingMissions([])
    setAddGoalTitleError(false)
  }

  const addGoal = () => {
    const title = newGoalTitle.trim()
    if (!title) {
      setAddGoalTitleError(true)
      return
    }
    setAddGoalTitleError(false)
    setNewGoalTitle('')
    setShowAddForm(false)
    const isMissionsMode = trackingMode === 'missions_equal' || trackingMode === 'missions_weighted'
    const range =
      goalDateRange?.from && goalDateRange?.to
        ? { from: goalDateRange.from, to: goalDateRange.to }
        : undefined
    if (isMissionsMode) {
      setPendingGoalCreation({ title, trackingMode, dateRange: goalDateRange })
    } else {
      const newGoal = addGoalToContext(title, trackingMode, range)
      if (newGoal) {
        setJustAddedGoal(newGoal)
        persistGoalAndMissionsToSupabase(newGoal, []).catch((e) => console.error('[Goals] Persist goal failed:', e))
      }
    }
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setNewGoalTitle('')
    setJustAddedGoal(null)
    setPendingGoalCreation(null)
    setPendingMissions([])
    setAddGoalTitleError(false)
  }

  const closeJustAdded = () => {
    if (justAddedGoal) deleteGoal(justAddedGoal.id)
    setJustAddedGoal(null)
    setPendingGoalCreation(null)
    setPendingMissions([])
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
    setNewMissionDeadline('')
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

  // Load goal stakes from Supabase (item_type = 'goal', user_id = current user)
  useEffect(() => {
    const client = supabase
    if (!user?.id || !client) return
    const load = async () => {
      const { data: rows, error } = await client
        .from('stakes')
        .select('id, amount, currency, due_date, failure_mode, status, item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'goal')
      if (error) return
      const map: Record<string, StakeInfo> = {}
      for (const row of rows ?? []) {
        const itemId = row.item_id as string
        map[itemId] = {
          stakeId: row.id as string,
          amount: Number(row.amount),
          currency: (row.currency as string) ?? 'usd',
          dueDate: row.due_date ? new Date(row.due_date as string).toISOString().slice(0, 10) : '',
          failureMode: (row.failure_mode as StakeInfo['failureMode']) ?? 'both',
          status: (row.status as StakeInfo['status']) ?? 'pending_card',
        }
      }
      setGoalStakes(map)
    }
    load()
  }, [user?.id])

  // Load mission stakes from Supabase (item_type = 'mission')
  useEffect(() => {
    const client = supabase
    if (!user?.id || !client) return
    const load = async () => {
      const { data: rows, error } = await client
        .from('stakes')
        .select('id, amount, currency, due_date, failure_mode, status, item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'mission')
      if (error) return
      const map: Record<string, StakeInfo> = {}
      for (const row of rows ?? []) {
        const itemId = row.item_id as string
        map[itemId] = {
          stakeId: row.id as string,
          amount: Number(row.amount),
          currency: (row.currency as string) ?? 'usd',
          dueDate: row.due_date ? new Date(row.due_date as string).toISOString().slice(0, 10) : '',
          failureMode: (row.failure_mode as StakeInfo['failureMode']) ?? 'both',
          status: (row.status as StakeInfo['status']) ?? 'pending_card',
        }
      }
      setMissionStakes(map)
    }
    load()
  }, [user?.id])

  const stakeFunctionUrl =
    (typeof import.meta.env.VITE_SUPABASE_URL === 'string' && import.meta.env.VITE_SUPABASE_URL
      ? import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')
      : '') + '/functions/v1/stripe-stake'
  const stakeToken = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY

  const handleGoalStakeAttached = useCallback((goalId: string, info: StakeInfo) => {
    setGoalStakes((prev) => ({ ...prev, [goalId]: info }))
  }, [])

  const handleGoalStakeSuccess = useCallback(
    async (goalId: string) => {
      const stake = goalStakes[goalId]
      if (!stake?.stakeId) return
      try {
        const res = await fetch(stakeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(stakeToken ? { Authorization: `Bearer ${stakeToken}` } : {}),
          },
          body: JSON.stringify({ action: 'succeed_stake', stakeId: stake.stakeId }),
        })
        if (res.ok) setGoalStakes((prev) => ({ ...prev, [goalId]: { ...stake, status: 'succeeded' } }))
      } catch {
        // keep UI consistent on network error
      }
    },
    [goalStakes, stakeFunctionUrl, stakeToken],
  )

  const handleGoalStakeFailure = useCallback(
    async (goalId: string) => {
      const stake = goalStakes[goalId]
      if (!stake?.stakeId) return
      try {
        const res = await fetch(stakeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(stakeToken ? { Authorization: `Bearer ${stakeToken}` } : {}),
          },
          body: JSON.stringify({ action: 'charge_stake', stakeId: stake.stakeId }),
        })
        if (res.ok) {
          setGoalStakes((prev) => ({ ...prev, [goalId]: { ...stake, status: 'charged' } }))
          const msg = `Charged ${stake.amount} ${(stake.currency || 'usd').toUpperCase()} from your card. Check Stripe Dashboard → Payments to verify.`
          setChargeSuccessMessage(msg)
          setTimeout(() => setChargeSuccessMessage(null), 8000)
        }
      } catch {
        // keep UI consistent on network error
      }
    },
    [goalStakes, stakeFunctionUrl, stakeToken],
  )

  const handleMissionStakeAttached = useCallback((missionId: string, info: StakeInfo) => {
    setMissionStakes((prev) => ({ ...prev, [missionId]: info }))
  }, [])

  const handleMissionStakeSuccess = useCallback(
    async (missionId: string) => {
      const stake = missionStakes[missionId]
      if (!stake?.stakeId) return
      try {
        const res = await fetch(stakeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(stakeToken ? { Authorization: `Bearer ${stakeToken}` } : {}),
          },
          body: JSON.stringify({ action: 'succeed_stake', stakeId: stake.stakeId }),
        })
        if (res.ok) setMissionStakes((prev) => ({ ...prev, [missionId]: { ...stake, status: 'succeeded' } }))
      } catch {
        // keep UI consistent on network error
      }
    },
    [missionStakes, stakeFunctionUrl, stakeToken],
  )

  const handleMissionStakeFailure = useCallback(
    async (missionId: string) => {
      const stake = missionStakes[missionId]
      if (!stake?.stakeId) return
      try {
        const res = await fetch(stakeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(stakeToken ? { Authorization: `Bearer ${stakeToken}` } : {}),
          },
          body: JSON.stringify({ action: 'charge_stake', stakeId: stake.stakeId }),
        })
        if (res.ok) {
          setMissionStakes((prev) => ({ ...prev, [missionId]: { ...stake, status: 'charged' } }))
          const msg = `Charged ${stake.amount} ${(stake.currency || 'usd').toUpperCase()} from your card.`
          setChargeSuccessMessage(msg)
          setTimeout(() => setChargeSuccessMessage(null), 8000)
        }
      } catch {
        // keep UI consistent on network error
      }
    },
    [missionStakes, stakeFunctionUrl, stakeToken],
  )

  /** Toggle mission complete (from MyMissions logic: completedAt, orderInCategoryBeforeComplete). */
  const handleMissionToggle = useCallback(
    (missionId: string) => {
      setMissions((prev) => {
        const mission = prev.find((m) => m.id === missionId)
        if (!mission) return prev

        if (mission.isCompleted) {
          const restoredOrder = mission.orderInCategoryBeforeComplete ?? 0
          return prev.map((m) => {
            if (m.id !== missionId) {
              if (m.category === mission.category && (m.orderInCategory ?? 0) >= restoredOrder) {
                return { ...m, orderInCategory: (m.orderInCategory ?? 0) + 1 }
              }
              if (m.repeatLocked && m.title === mission.title && m.category === mission.category) {
                return { ...m, repeatCompletedCount: Math.max(0, (m.repeatCompletedCount ?? 0) - 1) }
              }
              return m
            }
            const { orderInCategoryBeforeComplete: _, ...rest } = m
            return {
              ...rest,
              isCompleted: false,
              completedAt: undefined,
              orderInCategory: restoredOrder,
              progressCount: m.targetCount ? 0 : m.progressCount,
            }
          })
        }

        const completedAt = new Date().toISOString()
        const inCategory = prev.filter((m) => m.category === mission.category)
        const maxOrder = Math.max(0, ...inCategory.map((m) => m.orderInCategory ?? 0))
        const orderAtBottom = maxOrder + 1
        const previousOrder = mission.orderInCategory ?? 0
        const currentProgress = mission.progressCount ?? 0
        const nextProgress = currentProgress + 1
        const didCompleteCounter = !mission.targetCount || nextProgress >= (mission.targetCount ?? 0)

        return prev.map((m) => {
          if (m.id !== missionId) {
            if (m.repeatLocked && m.title === mission.title && m.category === mission.category && didCompleteCounter) {
              return { ...m, repeatCompletedCount: (m.repeatCompletedCount ?? 0) + 1 }
            }
            return m
          }
          if (!m.targetCount) {
            return { ...m, isCompleted: true, completedAt, orderInCategory: orderAtBottom, orderInCategoryBeforeComplete: previousOrder }
          }
          const current = m.progressCount ?? 0
          if (current >= m.targetCount) {
            return { ...m, isCompleted: true, progressCount: m.targetCount, completedAt, orderInCategory: orderAtBottom, orderInCategoryBeforeComplete: previousOrder }
          }
          const next = current + 1
          if (next >= m.targetCount) {
            return { ...m, progressCount: next, isCompleted: true, completedAt, orderInCategory: orderAtBottom, orderInCategoryBeforeComplete: previousOrder }
          }
          return { ...m, progressCount: next }
        })
      })
    },
    [setMissions],
  )

  // Repeat engine: same logic as MyMissions (setMissions for recurrence)
  useEffect(() => {
    const getIntervalMs = (m: Mission): number | null => {
      if (m.recurrence === 'none') return null
      const value = m.repeatValue && m.repeatValue > 0 ? m.repeatValue : 1
      const unit = m.repeatUnit ?? (m.recurrence === 'daily' ? 'days' : m.recurrence === 'weekly' ? 'weeks' : m.recurrence === 'monthly' ? 'months' : 'days')
      const base = value * 60 * 1000
      if (unit === 'minutes') return base
      if (unit === 'hours') return base * 60
      if (unit === 'days') return base * 60 * 24
      if (unit === 'weeks') return base * 60 * 24 * 7
      if (unit === 'months') return base * 60 * 24 * 30
      return null
    }
    const runRepeatEngine = () => {
      setMissions((prev) => {
        const now = Date.now()
        const updated: Mission[] = []
        const repeatKey = (t: string, c: string) => `${t}\0${c}`
        const hasExistingLocked = (title: string, category: string) =>
          prev.some((x) => x.repeatLocked && x.title === title && x.category === category)
        const lockedKeyAddedThisRun = new Set<string>()
        const mergedCountByKey = new Map<string, number>()

        for (const m of prev) {
          if (m.recurrence === 'none') {
            updated.push(m)
            continue
          }
          const intervalMs = getIntervalMs(m)
          if (!intervalMs) {
            updated.push(m)
            continue
          }
          const lastTs = m.repeatLastEvaluatedAt ? new Date(m.repeatLastEvaluatedAt).getTime() : new Date(m.createdAt).getTime()
          if (now - lastTs < intervalMs) {
            updated.push(m)
            continue
          }
          const intervalsPassed = Math.floor((now - lastTs) / intervalMs)
          const nextEval = new Date(lastTs + intervalsPassed * intervalMs).toISOString()
          const key = repeatKey(m.title, m.category)

          if (m.isCompleted && !m.repeatLocked) {
            const alreadyHasLocked = hasExistingLocked(m.title, m.category) || lockedKeyAddedThisRun.has(key)
            const newMission: Mission = {
              ...m,
              id: uuidv4(),
              isCompleted: false,
              completedAt: undefined,
              createdAt: new Date().toISOString(),
              missedRepeats: 0,
              repeatLocked: false,
              repeatLastEvaluatedAt: new Date().toISOString(),
              progressCount: (m.targetCount != null && m.targetCount > 0) ? 0 : m.progressCount,
            }
            if (alreadyHasLocked) {
              mergedCountByKey.set(key, (mergedCountByKey.get(key) ?? 0) + 1)
              updated.push(newMission)
            } else {
              lockedKeyAddedThisRun.add(key)
              const locked: Mission = {
                ...m,
                repeatLocked: true,
                repeatLastEvaluatedAt: nextEval,
                repeatCompletedCount: (m.repeatCompletedCount ?? 0) + 1,
              }
              updated.push(locked, newMission)
            }
          } else if (!m.isCompleted) {
            updated.push({
              ...m,
              missedRepeats: (m.missedRepeats ?? 0) + intervalsPassed,
              repeatLastEvaluatedAt: nextEval,
              progressCount: (m.targetCount != null && m.targetCount > 0) ? 0 : (m.progressCount ?? 0),
            })
          } else {
            const extra = mergedCountByKey.get(key) ?? 0
            updated.push({
              ...m,
              repeatLastEvaluatedAt: nextEval,
              repeatCompletedCount: (m.repeatCompletedCount ?? 0) + extra,
            })
          }
        }
        return updated
      })
    }
    runRepeatEngine()
    const t = setTimeout(runRepeatEngine, 1500)
    const interval = setInterval(runRepeatEngine, 15000)
    return () => {
      clearInterval(interval)
      clearTimeout(t)
    }
  }, [setMissions])

  const formGoal = pendingGoalCreation ?? justAddedGoal
  const isWeighted = formGoal?.trackingMode === 'missions_weighted'
  const categoryForGoal = justAddedGoal ? `${GOAL_FILTER_PREFIX}${justAddedGoal.id}` : ''

  // Auto-select the goal's deadline as the mission deadline when the add-mission form is shown
  const formGoalKey = formGoal ? ('id' in formGoal ? formGoal.id : 'pending') : null
  useEffect(() => {
    if (!formGoalKey || !formGoal) return
    if (formGoal.trackingMode !== 'missions_equal' && formGoal.trackingMode !== 'missions_weighted') return
    let dateStr = ''
    if ('deadlineTo' in formGoal && formGoal.deadlineTo) dateStr = formGoal.deadlineTo
    else if ('deadlineFrom' in formGoal && formGoal.deadlineFrom) dateStr = formGoal.deadlineFrom
    else if ('dateRange' in formGoal && formGoal.dateRange) {
      const r = formGoal.dateRange
      dateStr = r.to ? toLocalDateString(r.to) : r.from ? toLocalDateString(r.from) : ''
    }
    if (dateStr) setNewMissionDeadline(dateStr)
  }, [formGoalKey, formGoal])

  const missionsForThisGoal = missions.filter((m) => m.goalId === justAddedGoal?.id)
  const sessionMissionsFromContext = missionsForThisGoal.filter((m) => sessionMissionIds.includes(m.id))
  const sessionMissions = pendingGoalCreation ? pendingMissions : sessionMissionsFromContext
  const totalWeightUsed = pendingGoalCreation
    ? pendingMissions.reduce((sum, m) => sum + (m.weightPercent ?? 0), 0)
    : missionsForThisGoal.reduce((sum, m) => sum + (m.weightPercent ?? 0), 0)
  const freePercent = Math.max(0, 100 - totalWeightUsed)

  const addMissionForGoal = (andOpenNew: boolean) => {
    if (!formGoal) return
    const title = newMissionTitle.trim()
    if (!title) return
    const durationStr = showMissionDuration ? `${newMissionHours}h ${newMissionMinutes}m` : '0h 0m'
    const weight = isWeighted ? Math.min(100, Math.max(0, newMissionWeightPercent)) : undefined
    const targetCount = showMissionTargetCount ? newMissionTargetCount : undefined
    const deadline = newMissionDeadline.trim() || undefined

    if (pendingGoalCreation) {
      if (editingMissionId && pendingMissions.some((m) => m.id === editingMissionId)) {
        setPendingMissions((prev) =>
          prev.map((m) =>
            m.id === editingMissionId
              ? { ...m, title, recurrence: newMissionRecurrence, duration: durationStr, targetCount, weightPercent: weight, deadline }
              : m,
          ),
        )
        setEditingMissionId(null)
      } else {
        setPendingMissions((prev) => [
          { id: uuidv4(), title, recurrence: newMissionRecurrence, duration: durationStr, targetCount, weightPercent: weight, deadline },
          ...prev,
        ])
      }
      setNewMissionTitle('')
      setNewMissionRecurrence('none')
      setNewMissionHours(0)
      setNewMissionMinutes(30)
      setNewMissionTargetCount(1)
      setNewMissionWeightPercent(0)
      setNewMissionDeadline('')
      setShowMissionDuration(false)
      setShowMissionTargetCount(false)
      return
    }

    if (!justAddedGoal) return
    const category = categoryForGoal
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
                deadline,
              }
            : m,
        ),
      )
      setEditingMissionId(null)
    } else {
      if (isAddingMissionRef.current) return
      isAddingMissionRef.current = true
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
          deadline,
        },
        ...prev,
      ])
      setSessionMissionIds((prev) => [...prev, id])
      isAddingMissionRef.current = false
    }

    setNewMissionTitle('')
    setNewMissionRecurrence('none')
    setNewMissionHours(0)
    setNewMissionMinutes(30)
    setNewMissionTargetCount(1)
    setNewMissionWeightPercent(0)
    setNewMissionDeadline('')
    setShowMissionDuration(false)
    setShowMissionTargetCount(false)
    if (!andOpenNew) closeJustAdded()
  }

  /** Open inline "Add mission" form for a goal card. */
  const openAddMissionInCard = useCallback((goalId: string) => {
    const goal = getGoalById(goalId)
    const goalDeadline = goal?.deadlineTo ?? goal?.deadlineFrom ?? ''
    setAddMissionForGoalId(goalId)
    setNewMissionTitle('')
    setNewMissionRecurrence('none')
    setNewMissionHours(0)
    setNewMissionMinutes(30)
    setNewMissionTargetCount(1)
    setNewMissionWeightPercent(0)
    setNewMissionDeadline(goalDeadline)
    setShowMissionDuration(false)
    setShowMissionTargetCount(false)
  }, [getGoalById])

  /** Submit new mission from inline "Add mission" in a goal card. */
  const submitAddMissionInCard = useCallback(() => {
    if (isAddingMissionRef.current) return
    const goalId = addMissionForGoalId
    if (!goalId) return
    const goal = getGoalById(goalId)
    if (!goal) return
    const title = newMissionTitle.trim()
    if (!title) return
    isAddingMissionRef.current = true
    const category = `${GOAL_FILTER_PREFIX}${goalId}`
    const durationStr = showMissionDuration ? `${newMissionHours}h ${newMissionMinutes}m` : '0h 0m'
    const weight = goal.trackingMode === 'missions_weighted' ? Math.min(100, Math.max(0, newMissionWeightPercent)) : undefined
    const targetCount = showMissionTargetCount ? newMissionTargetCount : undefined
    const inCategory = missions.filter((m) => m.category === category)
    const nextOrder = inCategory.length === 0 ? 0 : Math.max(...inCategory.map((m) => m.orderInCategory ?? 0)) + 1
    setMissions((prev) => [
      {
        id: uuidv4(),
        title,
        category,
        recurrence: newMissionRecurrence,
        duration: durationStr,
        targetCount,
        progressCount: targetCount ? 0 : undefined,
        createdAt: new Date().toISOString(),
        isCompleted: false,
        orderInCategory: nextOrder,
        goalId,
        weightPercent: weight,
      },
      ...prev,
    ])
    setAddMissionForGoalId(null)
    setNewMissionTitle('')
    setNewMissionRecurrence('none')
    setNewMissionHours(0)
    setNewMissionMinutes(30)
    setNewMissionTargetCount(1)
    setNewMissionWeightPercent(0)
    setNewMissionDeadline('')
    setShowMissionDuration(false)
    setShowMissionTargetCount(false)
    isAddingMissionRef.current = false
  }, [addMissionForGoalId, getGoalById, newMissionTitle, newMissionRecurrence, newMissionHours, newMissionMinutes, showMissionDuration, newMissionTargetCount, newMissionWeightPercent, showMissionTargetCount, missions, setMissions])

  const loadMissionIntoForm = (mission: Mission | { id: string; title: string; recurrence: Recurrence; duration: string; targetCount?: number; weightPercent?: number; deadline?: string }) => {
    setNewMissionTitle(mission.title)
    setNewMissionRecurrence(mission.recurrence)
    setNewMissionWeightPercent(mission.weightPercent ?? 0)
    setNewMissionDeadline('deadline' in mission && mission.deadline ? mission.deadline : '')
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

  /** Persist a new goal and its missions to Supabase immediately so they survive refresh. */
  const persistGoalAndMissionsToSupabase = useCallback(
    async (goal: Goal, missionList: Mission[]) => {
      if (!supabase || !user?.id) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('[Goals] No Supabase session, cannot persist (sign in required)')
        toast.error('Not signed in — goal and missions not saved to cloud.')
        return
      }
      const now = new Date().toISOString()
      const goalRow = {
        id: goal.id,
        title: goal.title,
        tracking_mode: goal.trackingMode ?? null,
        progress_percent: goal.progressPercent ?? null,
        target_hours: goal.targetHours ?? null,
        logged_hours: goal.loggedHours ?? null,
        time_label: goal.timeLabel ?? null,
        target_count: goal.targetCount ?? null,
        current_count: goal.currentCount ?? null,
        milestone_label: goal.milestoneLabel ?? null,
        deadline_from: goal.deadlineFrom ?? null,
        deadline_to: goal.deadlineTo ?? null,
        created_at: goal.createdAt ?? now,
        updated_at: now,
        user_id: user.id,
      }
      let goalErr = (await supabase.from('goals').upsert([goalRow], { onConflict: 'id' })).error
      if (goalErr && /column.*does not exist|undefined column|deadline_from|deadline_to/i.test(goalErr.message)) {
        const minimalRow: Record<string, unknown> = {
          id: goal.id,
          user_id: user.id,
          title: goal.title,
          tracking_mode: goal.trackingMode ?? null,
          created_at: goal.createdAt ?? now,
          updated_at: now,
        }
        const retry = await supabase.from('goals').upsert([minimalRow], { onConflict: 'id' })
        goalErr = retry.error
      }
      if (goalErr) {
        const msg = goalErr.message || String(goalErr)
        console.error('[Goals] Failed to persist goal to Supabase:', goalErr.code, msg, goalErr, 'row:', goalRow)
        toast.error(`Goal not saved: ${msg}`)
        throw goalErr
      }
      const missionRows = missionList.map((m) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        recurrence: m.recurrence === 'custom' ? 'none' : m.recurrence,
        duration: m.duration ?? '',
        target_count: m.targetCount ?? null,
        progress_count: m.progressCount ?? null,
        created_at: m.createdAt,
        is_completed: m.isCompleted,
        completed_at: m.completedAt ?? null,
        order_in_category: m.orderInCategory ?? null,
        goal_id: m.goalId ?? null,
        weight_percent: m.weightPercent ?? null,
        user_id: user.id,
      }))
      if (missionRows.length > 0) {
        const { error: missionsErr } = await supabase.from('missions').upsert(missionRows, { onConflict: 'id' })
        if (missionsErr) {
          console.error('[Goals] Failed to persist missions to Supabase:', missionsErr)
          toast.error('Failed to save missions to database. Check console for details.')
          throw missionsErr
        }
      }
    },
    [user?.id, toast],
  )

  const doneMissionsForGoal = async (missionsToAdd?: Array<{ id: string; title: string; recurrence: Recurrence; duration: string; targetCount?: number; weightPercent?: number; deadline?: string }>) => {
    const title = newMissionTitle.trim()
    let list = missionsToAdd ?? pendingMissions
    if (title) {
      const durationStr = showMissionDuration ? `${newMissionHours}h ${newMissionMinutes}m` : '0h 0m'
      const weight = isWeighted ? Math.min(100, Math.max(0, newMissionWeightPercent)) : undefined
      const targetCount = showMissionTargetCount ? newMissionTargetCount : undefined
      list = [
        { id: uuidv4(), title, recurrence: newMissionRecurrence, duration: durationStr, targetCount, weightPercent: weight, deadline: newMissionDeadline.trim() || undefined },
        ...list,
      ]
    }
    const totalToCheck = list.reduce((s, m) => s + (m.weightPercent ?? 0), 0)
    if (isWeighted && totalToCheck < 100) {
      alert('There is not enough percentage. Total weight must equal 100%.')
      return
    }
    if (pendingGoalCreation) {
      const range =
        pendingGoalCreation.dateRange?.from && pendingGoalCreation.dateRange?.to
          ? { from: pendingGoalCreation.dateRange.from, to: pendingGoalCreation.dateRange.to }
          : undefined
      const newGoal = addGoalToContext(
        pendingGoalCreation.title,
        pendingGoalCreation.trackingMode,
        range,
      )
      if (newGoal) {
        const category = `${GOAL_FILTER_PREFIX}${newGoal.id}`
        const newMissionEntries = list.map((pm, index) => ({
          id: pm.id,
          title: pm.title,
          category,
          recurrence: pm.recurrence,
          duration: pm.duration,
          targetCount: pm.targetCount,
          progressCount: pm.targetCount != null ? 0 : undefined,
          createdAt: new Date().toISOString(),
          isCompleted: false,
          orderInCategory: index,
          goalId: newGoal.id,
          weightPercent: pm.weightPercent,
          deadline: pm.deadline,
        }))
        setMissions((prev) => [...newMissionEntries, ...prev])
        try {
          await persistGoalAndMissionsToSupabase(newGoal, newMissionEntries)
        } catch (e) {
          console.error('[Goals] Persist goal/missions failed:', e)
          toast.error('Could not save to cloud. Try again or check your connection.')
        }
      }
      setPendingGoalCreation(null)
      setPendingMissions([])
      setNewMissionTitle('')
      setNewMissionRecurrence('none')
      setNewMissionHours(0)
      setNewMissionMinutes(30)
      setNewMissionTargetCount(1)
      setNewMissionWeightPercent(0)
      setShowMissionDuration(false)
      setShowMissionTargetCount(false)
      setNewMissionDeadline('')
      setEditingMissionId(null)
      setSessionMissionIds([])
      setJustAddedGoal(null)
    } else closeJustAdded()
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

  const startEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setNewGoalTitle(goal.title)
    setTrackingMode(goal.trackingMode ?? 'missions_equal')
    setTargetHours(goal.targetHours ?? 0)
    setTimeLabel(goal.timeLabel ?? '')
    setGoalTargetCount(goal.targetCount ?? 1)
    setMilestoneLabel(goal.milestoneLabel ?? '')
    setCountMilestoneError(false)
    setCountTargetError(false)
    setTimeTargetError(false)
    setAddGoalTitleError(false)
    setShowAddForm(false)
    setJustAddedGoal(null)
    setShowEditGoalModal(true)
  }

  const saveEditedGoal = () => {
    if (!editingGoal) return
    const title = newGoalTitle.trim()
    if (!title) {
      setAddGoalTitleError(true)
      return
    }
    const updates: Partial<Goal> = {
      title,
      trackingMode,
    }
    if (trackingMode === 'time') {
      updates.targetHours = targetHours || undefined
      updates.timeLabel = timeLabel.trim() || undefined
    } else if (trackingMode === 'count') {
      updates.targetCount = goalTargetCount || undefined
      updates.milestoneLabel = milestoneLabel.trim() || undefined
    }
    updateGoal(editingGoal.id, updates)
    setShowEditGoalModal(false)
    setEditingGoal(null)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {!justAddedGoal && (
        <div className="mb-8 flex justify-end">
          <GlowButton
            label="Create New Goal"
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 px-6"
          />
        </div>
      )}

      {showAddForm && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancelAdd()
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-slate-900 shadow-2xl transition-all duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <p id="add-goal-modal-title" className="text-sm font-semibold text-white">
                Create New Goal
              </p>
              <button
                type="button"
                onClick={cancelAdd}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div
              id="add-goal-form"
              className="space-y-4 px-4 py-3 text-left"
              aria-labelledby="add-goal-modal-title"
            >
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
                onKeyDown={(e) => e.key === 'Enter' && setShowGoalCalendarModal(true)}
                placeholder=""
                className={`w-full rounded-lg border bg-slate-800 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                  addGoalTitleError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-700 focus:border-purple-500 focus:ring-purple-500'
                }`}
                autoFocus
              />
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
                  onClick={() => setShowGoalCalendarModal(true)}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500"
                >
                  Add Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar modal — shown after clicking Add Goal */}
      {showGoalCalendarModal && (
        <div
          className={modal.backdrop}
          onClick={() => setShowGoalCalendarModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-calendar-title"
        >
          <div
            className="flex h-[440px] w-full max-w-[min(95vw,600px)] flex-col overflow-hidden rounded-xl border border-gray-800 bg-slate-900 shadow-2xl transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modal.header}>
              <h2 id="goal-calendar-title" className={modal.title}>
                Select deadline
              </h2>
              <button
                type="button"
                onClick={() => setShowGoalCalendarModal(false)}
                className={modal.closeBtn}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex min-h-0 flex-1 w-full flex-col items-center overflow-auto scrollbar-hide px-4 pb-4">
              <div className="rdp-root goal-date-range-picker w-fit shrink-0 rounded-lg border border-gray-800 bg-slate-900/80 p-3">
                <Calendar
                  mode="range"
                  defaultMonth={goalDateRange?.from ?? new Date()}
                  startMonth={(() => {
                    const d = new Date()
                    d.setDate(1)
                    d.setHours(0, 0, 0, 0)
                    return d
                  })()}
                  selected={goalDateRange}
                  components={{ Chevron: GoalCalendarChevron }}
                  onSelect={(range) => {
                    const today = startOfDay(new Date())
                    if (!range?.from) {
                      setGoalDateRange(undefined)
                      return
                    }
                    const selected = range.to
                      ? (range.from.getTime() > range.to.getTime() ? range.from : range.to)
                      : range.from
                    if (startOfDay(selected).getTime() <= today.getTime()) return
                    setGoalDateRange({ from: today, to: startOfDay(selected) })
                  }}
                  disabled={(date) => startOfDay(date).getTime() <= startOfDay(new Date()).getTime()}
                  numberOfMonths={2}
                  className="w-fit rounded-lg border-0"
                />
              </div>
            </div>
            <div className={`${modal.footer} border-t-0 mx-auto w-60`}>
              <button
                type="button"
                onClick={() => setShowGoalCalendarModal(false)}
                className={btn.secondary}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!(goalDateRange?.from && goalDateRange?.to)}
                onClick={() => {
                  if (!goalDateRange?.from || !goalDateRange?.to) return
                  addGoal()
                  setShowGoalCalendarModal(false)
                }}
                className={
                  goalDateRange?.from && goalDateRange?.to
                    ? btn.primary
                    : 'rounded-lg px-4 py-2.5 text-sm font-medium text-gray-500 bg-gray-700 cursor-default transition-all duration-200'
                }
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {(justAddedGoal || pendingGoalCreation) && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeJustAdded()
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-slate-900 shadow-2xl transition-all duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <p id="just-added-goal-modal-title" className="text-sm font-semibold text-white">
                {formGoal && (formGoal.trackingMode === 'missions_equal' || formGoal.trackingMode === 'missions_weighted')
                  ? `Add missions for "${formGoal.title}"`
                  : justAddedGoal?.trackingMode === 'time'
                    ? `Set time target for "${justAddedGoal.title}"`
                    : justAddedGoal
                      ? `Set target for "${justAddedGoal.title}"`
                      : ''}
              </p>
              <button
                type="button"
                onClick={closeJustAdded}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div
              id="just-added-goal-form"
              className="max-h-[80vh] overflow-y-auto space-y-4 px-4 py-3 text-left"
              aria-labelledby="just-added-goal-modal-title"
            >
            {(formGoal && (formGoal.trackingMode === 'missions_equal' || formGoal.trackingMode === 'missions_weighted')) ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Define your mission</p>
                  <input
                    type="text"
                    value={newMissionTitle}
                    onChange={(e) => setNewMissionTitle(e.target.value)}
                    placeholder=""
                    autoFocus
                    className={`w-full rounded-lg border bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                      newMissionTitle.trim()
                        ? 'border-emerald-500/60 focus:border-emerald-500/60 focus:ring-emerald-500/25'
                        : 'border-gray-700 focus:border-cyan-500/50 focus:ring-cyan-500/30'
                    }`}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-gray-500">make it repeat until the deadline hits</p>
                  <div
                    className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                      newMissionRecurrence !== 'none' ? 'border-emerald-500/60' : 'border-gray-700'
                    }`}
                  >
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                      <input
                        type="checkbox"
                        checked={newMissionRecurrence !== 'none'}
                        onChange={(e) => setNewMissionRecurrence(e.target.checked ? 'daily' : 'none')}
                        className="h-4 w-4 accent-cyan-500"
                        aria-label="make it repeat until the deadline hits"
                      />
                      <span>{newMissionRecurrence !== 'none' ? 'Repeated' : 'make it repeat until the deadline hits'}</span>
                    </label>
                    {newMissionRecurrence !== 'none' && (
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="radio"
                            name="goal-mission-recurrence"
                            checked={newMissionRecurrence === 'daily'}
                            onChange={() => setNewMissionRecurrence('daily')}
                            className="h-3 w-3 accent-cyan-500"
                          />
                          Daily
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="radio"
                            name="goal-mission-recurrence"
                            checked={newMissionRecurrence === 'weekly'}
                            onChange={() => setNewMissionRecurrence('weekly')}
                            className="h-3 w-3 accent-cyan-500"
                          />
                          Weekly
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="radio"
                            name="goal-mission-recurrence"
                            checked={newMissionRecurrence === 'monthly'}
                            onChange={() => setNewMissionRecurrence('monthly')}
                            className="h-3 w-3 accent-cyan-500"
                          />
                          Monthly
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      How much time do you astamaite the mission to take?
                    </p>
                    <div
                      className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                        showMissionDuration ? 'border-emerald-500/60' : 'border-gray-700'
                      }`}
                    >
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <input
                          type="checkbox"
                          checked={showMissionDuration}
                          onChange={(e) => setShowMissionDuration(e.target.checked)}
                          className="h-4 w-4 accent-cyan-500"
                          aria-label="Toggle duration"
                        />
                        <span>{showMissionDuration ? 'Duration' : 'Add duration'}</span>
                      </label>
                      {showMissionDuration && (
                        <div className="flex flex-wrap items-center gap-2">
                          <DurationCombobox
                            value={newMissionHours}
                            onChange={setNewMissionHours}
                            options={Array.from({ length: 24 }, (_, i) => i)}
                            min={0}
                            max={99}
                            label="h"
                            ariaLabel="Hours"
                          />
                          <span className="text-gray-400">h</span>
                          <DurationCombobox
                            value={newMissionMinutes}
                            onChange={setNewMissionMinutes}
                            options={[0, 15, 30, 45]}
                            min={0}
                            max={59}
                            label="m"
                            ariaLabel="Minutes"
                          />
                          <span className="text-gray-400">m</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      How much times do you need to do it untill your done?
                    </p>
                    <div
                      className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                        showMissionTargetCount ? 'border-emerald-500/60' : 'border-gray-700'
                      }`}
                    >
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                        <input
                          type="checkbox"
                          checked={showMissionTargetCount}
                          onChange={(e) => setShowMissionTargetCount(e.target.checked)}
                          className="h-4 w-4 accent-cyan-500"
                          aria-label="Toggle target count"
                        />
                        <span>{showMissionTargetCount ? 'Target counter' : 'Add target counter'}</span>
                      </label>
                      {showMissionTargetCount && (
                        <input
                          type="number"
                          min={1}
                          value={newMissionTargetCount}
                          onChange={(e) => setNewMissionTargetCount(Math.max(1, Number(e.target.value) || 1))}
                          onFocus={(e) => (e.target as HTMLInputElement).select()}
                          className="w-20 rounded-lg border bg-slate-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 transition-colors border-gray-700 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                          aria-label="Target count"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">Mission deadline</p>
                    <input
                      type="date"
                      value={newMissionDeadline}
                      onChange={(e) => setNewMissionDeadline(e.target.value)}
                      min={toLocalDateString(new Date())}
                      className="w-full rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                      aria-label="Mission deadline"
                    />
                  </div>

                  {isWeighted && (
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Weight (% of goal) — total should be 100</p>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newMissionWeightPercent}
                        onChange={(e) => setNewMissionWeightPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-20 rounded-lg border border-gray-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                        placeholder="0–100"
                        aria-label="Weight percent"
                      />
                    </div>
                  )}
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

                <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-4 py-3">
                  <button
                    type="button"
                    onClick={closeJustAdded}
                    className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => addMissionForGoal(true)}
                    disabled={!newMissionTitle.trim()}
                    className="rounded-lg border border-cyan-500/60 px-4 py-2.5 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {editingMissionId ? 'Update mission' : 'Add another mission'}
                  </button>
                  <button
                    type="button"
                    onClick={() => doneMissionsForGoal()}
                    className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-500 active:scale-[0.98]"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : justAddedGoal && justAddedGoal.trackingMode === 'time' ? (
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
                    placeholder=""
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
                    placeholder=""
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
          </div>
        </div>
      )}

      <div className={`${pageContainer} w-full max-w-4xl`}>
        {chargeSuccessMessage && (
          <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {chargeSuccessMessage}
          </div>
        )}
        {goals.length > 0 ? (
          <>
          <ul className="w-full space-y-3 px-4 text-left">
            {goals.map((goal) => {
              const progress = getGoalProgressFromMissions(goal, missions)
              const goalMissionsAll = missions
                .filter((m) => m.goalId === goal.id)
                .sort((a, b) => (a.orderInCategory ?? 0) - (b.orderInCategory ?? 0))
              const effectiveCompleted = (m: Mission) =>
                m.recurrence !== 'none' && (m.targetCount ?? 0) > 1
                  ? (m.progressCount ?? 0) >= (m.targetCount ?? 0)
                  : m.isCompleted
              /** Only active (incomplete) missions for display in the list. */
              const goalMissions = goalMissionsAll.filter((m) => !effectiveCompleted(m))
              const circ = 2 * Math.PI * 15
              return (
                <li
                  key={goal.id}
                  className={`group relative rounded-xl border transition-colors ${
                    expandedGoalId === goal.id
                      ? 'border-cyan-500/30 bg-slate-900/70'
                      : 'border-gray-800 bg-slate-900/50 hover:border-gray-700'
                  } ${successFlashGoalId === goal.id ? 'border-emerald-500/70 bg-emerald-500/10' : ''}`}
                >
                  {/* HEADER ROW — תמיד מוצג, לחיץ לפתיחה/סגירה */}
                  <div
                    className="flex cursor-pointer items-center gap-4 px-5 py-5"
                    onClick={() => setExpandedGoalId(expandedGoalId === goal.id ? null : goal.id)}
                  >
                    {/* Progress ring */}
                    <div className="relative shrink-0">
                      <svg width="48" height="48" viewBox="0 0 40 40" className="-rotate-90">
                        <circle cx="20" cy="20" r="15" fill="none" stroke="#1e293b" strokeWidth="3" />
                        <circle
                          cx="20" cy="20" r="15"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={circ}
                          strokeDashoffset={circ - (Math.min(100, Math.max(0, progress)) / 100) * circ}
                          className="transition-all duration-500"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-gray-400">
                        {Math.round(progress)}%
                      </span>
                    </div>

                    {/* Goal title + meta */}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-base font-semibold text-white">
                        <span className="min-w-0 truncate">{goal.title}</span>
                      </p>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 px-2.5 py-1 text-sm text-gray-200">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                          {goalMissions.length} mission{goalMissions.length !== 1 ? 's' : ''}
                        </span>
                        {formatDeadlineRange(goal.deadlineFrom, goal.deadlineTo) && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 px-2.5 py-1 text-sm text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
                              <path d="M8 2v4" />
                              <path d="M16 2v4" />
                              <rect width="18" height="18" x="3" y="4" rx="2" />
                              <path d="M3 10h18" />
                            </svg>
                            {formatDeadlineRange(goal.deadlineFrom, goal.deadlineTo)}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Stake badge / add stake */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {goalStakes[goal.id] != null && goalStakes[goal.id].status !== 'cancelled' && goalStakes[goal.id].status !== 'pending_card' ? (
                        <StakeBadge
                          stake={goalStakes[goal.id]}
                          onReportSuccess={() => handleGoalStakeSuccess(goal.id)}
                          onReportFailure={() => handleGoalStakeFailure(goal.id)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStakeModalForGoalId(goal.id)}
                          className="rounded-full border border-dashed border-gray-700 px-2.5 py-1 text-sm text-gray-500 hover:border-amber-500/50 hover:text-amber-400"
                        >
                          + Stake
                        </button>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg
                      className={`h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 ${expandedGoalId === goal.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* EXPANDED CONTENT — מוצג רק כשהכרטיס פתוח */}
                  {expandedGoalId === goal.id && (
                    <div className="border-t border-gray-800 px-4 pb-4 pt-3">
                      {goal.trackingMode === 'time' && (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-400 tabular-nums">
                            {Math.round((goal.loggedHours ?? 0) * 10) / 10}h / {goal.targetHours ?? 0}h
                          </span>
                          <button type="button" onClick={() => openLogTimeModal(goal.id)} className={btn.outline}>
                            Log Time
                          </button>
                          {activeTimer?.goalId === goal.id ? (
                            <button type="button" onClick={stopTimer} className="rounded-lg border border-amber-600/60 bg-amber-500/20 px-2.5 py-1 text-xs text-amber-200">
                              Stop ({formatTimerElapsed(activeTimer.elapsedSeconds)})
                            </button>
                          ) : (
                            <button type="button" onClick={() => startTimer(goal.id)} disabled={!!activeTimer} className={btn.secondary}>
                              Start Timer
                            </button>
                          )}
                        </div>
                      )}

                      {goal.trackingMode === 'count' && (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {formatTargetCount(goal.currentCount ?? 0)} / {formatTargetCount(goal.targetCount ?? 1)}
                          </span>
                          {updateCountGoalId === goal.id ? (
                            <>
                              <input
                                type="text"
                                value={updateCountInput}
                                onChange={(e) => setUpdateCountInput(e.target.value.replace(/[^\d.]/g, ''))}
                                onKeyDown={(e) => e.key === 'Enter' && saveUpdateCount(goal.id)}
                                className="w-20 rounded-lg border border-gray-600 bg-slate-800 px-2 py-1 text-xs text-white"
                              />
                              <button type="button" onClick={() => saveUpdateCount(goal.id)} className={btn.primary}>Save</button>
                              <button type="button" onClick={() => { setUpdateCountGoalId(null); setUpdateCountInput('') }} className={btn.secondary}>Cancel</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => openUpdateCount(goal)} className={btn.secondary}>Update count</button>
                          )}
                        </div>
                      )}

                      <ul className="space-y-1">
                        {goalMissions.map((mission) => {
                          const done = effectiveCompleted(mission)
                          return (
                            <li
                              key={mission.id}
                              className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-800/50"
                            >
                              {mission.repeatLocked ? (
                                <RefreshCcw className="h-4 w-4 shrink-0 text-cyan-300" />
                              ) : mission.targetCount && mission.targetCount > 1 ? (
                                <NeonCheckbox checked={done} onChange={() => handleMissionToggle(mission.id)} aria-label="Complete" className="shrink-0" />
                              ) : (
                                <NeonCheckbox checked={mission.isCompleted} onChange={() => handleMissionToggle(mission.id)} aria-label="Complete" className="shrink-0" />
                              )}
                              <span className={`flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                <span className="min-w-0 truncate">{mission.title}</span>
                              </span>
                              <div className="shrink-0">
                                {missionStakes[mission.id] != null && missionStakes[mission.id].status !== 'cancelled' && missionStakes[mission.id].status !== 'pending_card' ? (
                                  <StakeBadge stake={missionStakes[mission.id]} onReportSuccess={() => handleMissionStakeSuccess(mission.id)} onReportFailure={() => handleMissionStakeFailure(mission.id)} />
                                ) : !done ? (
                                  <button
                                    type="button"
                                    onClick={() => setStakeModalForMissionId(mission.id)}
                                    className="rounded-full border border-dashed border-gray-700 px-2 py-0.5 text-xs text-gray-500 hover:border-amber-500/50 hover:text-amber-400"
                                  >
                                    + Stake
                                  </button>
                                ) : null}
                              </div>
                            </li>
                          )
                        })}
                      </ul>

                      <button
                        type="button"
                        onClick={() => openAddMissionInCard(goal.id)}
                        className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 py-2 text-sm text-gray-500 transition hover:border-cyan-500/50 hover:text-cyan-400"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add mission
                      </button>
                    </div>
                  )}

                  <div className="absolute right-2 top-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100">
                    <button type="button" onClick={() => startEditGoal(goal)} className={btn.iconEdit} aria-label="Edit goal">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setMissions((prev) => prev.filter((m) => m.goalId !== goal.id))
                        deleteGoal(goal.id)
                        if (supabase && user?.id) {
                          const { error } = await supabase.from('missions').delete().eq('goal_id', goal.id)
                          if (error) {
                            console.error('[Goals] Failed to delete missions for goal:', error)
                            toast.error('Goal removed here but some missions may still be in the database.')
                          }
                        }
                      }}
                      className={btn.iconDanger}
                      aria-label="Delete goal"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" /><path d="M10 11v6M14 11v6" /></svg>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Standalone Missions card */}
          {(() => {
            const standaloneAll = missions.filter((m) => !m.goalId).sort((a, b) => (a.orderInCategory ?? 0) - (b.orderInCategory ?? 0))
            const effectiveCompletedStandalone = (m: Mission) => (m.recurrence !== 'none' && (m.targetCount ?? 0) > 1 ? (m.progressCount ?? 0) >= (m.targetCount ?? 0) : m.isCompleted)
            const standalone = standaloneAll.filter((m) => !effectiveCompletedStandalone(m))
            if (standalone.length === 0) return null
            const standExpanded = expandedGoalId === '__standalone__'
            return (
              <div className="mt-4 rounded-xl border border-gray-800 bg-slate-900/50 px-4 hover:border-gray-700">
                <div className="p-4">
                  <button type="button" onClick={() => setExpandedGoalId(standExpanded ? null : '__standalone__')} className="flex w-full items-center gap-3 text-left">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg">📋</div>
                      <h3 className="flex-1 text-lg font-semibold text-white">Standalone Missions</h3>
                      <svg className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${standExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {standExpanded && (
                      <div className="mt-4 space-y-2 border-t border-gray-800 pt-4">
                        {standalone.map((mission) => {
                          const done = effectiveCompletedStandalone(mission)
                          return (
                            <li key={mission.id} className="flex items-center gap-2 rounded-lg border border-gray-800 bg-slate-800/50 px-3 py-2 list-none">
                              <NeonCheckbox checked={mission.isCompleted} onChange={() => handleMissionToggle(mission.id)} className="shrink-0" />
                              <span className={`flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm ${done ? 'text-gray-500 line-through' : 'text-white'}`}>
                                <span className="min-w-0 truncate">{mission.title}</span>
                              </span>
                              {mission.recurrence !== 'none' && <span className="text-xs text-gray-400">{mission.recurrence}</span>}
                              {missionStakes[mission.id] != null && missionStakes[mission.id].status !== 'cancelled' && missionStakes[mission.id].status !== 'pending_card' ? (
                                <StakeBadge stake={missionStakes[mission.id]} onReportSuccess={() => handleMissionStakeSuccess(mission.id)} onReportFailure={() => handleMissionStakeFailure(mission.id)} />
                              ) : (
                                <button type="button" onClick={() => setStakeModalForMissionId(mission.id)} className="rounded border border-dashed border-amber-500/60 px-2 py-0.5 text-xs text-amber-400">+ Stake</button>
                              )}
                            </li>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
          </>
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

      {/* Edit goal modal */}
      {showEditGoalModal && editingGoal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-gray-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Edit goal</h2>
              <button
                type="button"
                onClick={() => {
                  setShowEditGoalModal(false)
                  setEditingGoal(null)
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-4 py-3 text-left">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Goal
                </label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => {
                    setNewGoalTitle(e.target.value)
                    if (addGoalTitleError) setAddGoalTitleError(false)
                  }}
                  className={`w-full rounded-lg border bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 ${
                    addGoalTitleError
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-700 focus:border-purple-500 focus:ring-purple-500'
                  }`}
                  placeholder=""
                />
              </div>

              {/* Tracking mode selection (simplified) */}
              <div className="space-y-2 rounded-lg border border-gray-800 bg-slate-900/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Tracking mode
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTrackingMode(
                        trackingMode === 'missions_weighted' ? 'missions_weighted' : 'missions_equal',
                      )
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      trackingMode === 'missions_equal' || trackingMode === 'missions_weighted'
                        ? 'border-blue-500 bg-slate-800 text-white'
                        : 'border-gray-700 bg-slate-900 text-gray-300 hover:border-blue-500/70 hover:text-white'
                    }`}
                  >
                    <span className="font-medium">By missions</span>
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
                    <span className="font-medium">By time</span>
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
                    <span className="font-medium">By count</span>
                  </button>
                </div>
              </div>

              {trackingMode === 'time' && (
                <div className="space-y-2 rounded-lg border border-gray-800 bg-slate-900/70 p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Target hours
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={targetHours}
                    onChange={(e) => setTargetHours(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 rounded-lg border border-gray-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    What is this time for?
                  </label>
                  <input
                    type="text"
                    value={timeLabel}
                    onChange={(e) => setTimeLabel(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Deep work, practice..."
                  />
                </div>
              )}

              {trackingMode === 'count' && (
                <div className="space-y-2 rounded-lg border border-gray-800 bg-slate-900/70 p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Target count
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={goalTargetCount}
                    onChange={(e) => setGoalTargetCount(Math.max(1, Number(e.target.value) || 1))}
                    className="w-24 rounded-lg border border-gray-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    What are you counting?
                  </label>
                  <input
                    type="text"
                    value={milestoneLabel}
                    onChange={(e) => setMilestoneLabel(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. chapters read"
                  />
                </div>
              )}

              <div className="space-y-2 rounded-lg border border-gray-800 bg-slate-900/70 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Missions ({missions.filter((m) => m.goalId === editingGoal.id).length})
                </p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto text-sm">
                  {missions
                    .filter((m) => m.goalId === editingGoal.id)
                    .sort((a, b) => (a.orderInCategory ?? 0) - (b.orderInCategory ?? 0))
                    .map((m) => (
                      <li
                        key={m.id}
                        className="flex items-start gap-2 rounded-lg bg-slate-800/60 px-2 py-1.5 text-xs text-gray-200"
                      >
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-cyan-500" aria-hidden />
                        <span className="flex-1 truncate" title={m.title}>
                          {m.title}
                        </span>
                      </li>
                    ))}
                  {missions.filter((m) => m.goalId === editingGoal.id).length === 0 && (
                    <li className="text-xs text-gray-500">
                      No missions yet. Add missions from My Missions.
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-800 px-4 py-3">
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:bg-slate-800"
                onClick={() => {
                  setShowEditGoalModal(false)
                  setEditingGoal(null)
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                onClick={saveEditedGoal}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

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
      {stakeModalForGoalId && (() => {
        const g = goals.find((x) => x.id === stakeModalForGoalId)
        const goalDeadline = g?.deadlineTo ?? g?.deadlineFrom
        return g ? (
          <StakeSetupModal
            itemId={g.id}
            itemTitle={g.title}
            itemType="goal"
            defaultDueDate={goalDeadline}
            deadlineLocked={!!goalDeadline}
            onClose={() => setStakeModalForGoalId(null)}
            onStaked={(info) => {
              handleGoalStakeAttached(g.id, info)
              setStakeModalForGoalId(null)
            }}
          />
        ) : null
      })()}
      {stakeModalForMissionId && (() => {
        const m = missions.find((x) => x.id === stakeModalForMissionId)
        const missionGoal = m?.goalId ? getGoalById(m.goalId) : null
        const missionDeadline = m.deadline ?? missionGoal?.deadlineTo ?? missionGoal?.deadlineFrom
        return m ? (
          <StakeSetupModal
            itemId={m.id}
            itemTitle={m.title}
            itemType="mission"
            defaultDueDate={missionDeadline}
            deadlineLocked={!!missionDeadline}
            onClose={() => setStakeModalForMissionId(null)}
            onStaked={(info) => {
              handleMissionStakeAttached(m.id, info)
              setStakeModalForMissionId(null)
            }}
          />
        ) : null
      })()}
      {addMissionForGoalId &&
        (() => {
          const goal = getGoalById(addMissionForGoalId)
          if (!goal) return null
          const isWeighted = goal.trackingMode === 'missions_weighted'

          return (
            <div
              className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setAddMissionForGoalId(null)
              }}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="w-full max-w-md rounded-xl border border-gray-800 bg-slate-900 shadow-2xl transition-all duration-200"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    {goal.trackingMode === 'missions_equal' || goal.trackingMode === 'missions_weighted'
                      ? `Add missions for "${goal.title}"`
                      : `Add mission to "${goal.title}"`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddMissionForGoalId(null)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="max-h-[80vh] overflow-y-auto space-y-4 px-4 py-3 text-left">
                  {(goal.trackingMode === 'missions_equal' || goal.trackingMode === 'missions_weighted') && (
                    <>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Define your mission</p>
                        <input
                          type="text"
                          value={newMissionTitle}
                          onChange={(e) => setNewMissionTitle(e.target.value)}
                          placeholder=""
                          autoFocus
                          className={`w-full rounded-lg border bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                            newMissionTitle.trim()
                              ? 'border-emerald-500/60 focus:border-emerald-500/60 focus:ring-emerald-500/25'
                              : 'border-gray-700 focus:border-cyan-500/50 focus:ring-cyan-500/30'
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">make it repeat until the deadline hits</p>
                        <div
                          className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                            newMissionRecurrence !== 'none' ? 'border-emerald-500/60' : 'border-gray-700'
                          }`}
                        >
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <input
                              type="checkbox"
                              checked={newMissionRecurrence !== 'none'}
                              onChange={(e) => setNewMissionRecurrence(e.target.checked ? 'daily' : 'none')}
                              className="h-4 w-4 accent-cyan-500"
                              aria-label="make it repeat until the deadline hits"
                            />
                            <span>{newMissionRecurrence !== 'none' ? 'Repeated' : 'make it repeat until the deadline hits'}</span>
                          </label>
                          {newMissionRecurrence !== 'none' && (
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="radio"
                                  name="goal-mission-recurrence-inline"
                                  checked={newMissionRecurrence === 'daily'}
                                  onChange={() => setNewMissionRecurrence('daily')}
                                  className="h-3 w-3 accent-cyan-500"
                                />
                                Daily
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="radio"
                                  name="goal-mission-recurrence-inline"
                                  checked={newMissionRecurrence === 'weekly'}
                                  onChange={() => setNewMissionRecurrence('weekly')}
                                  className="h-3 w-3 accent-cyan-500"
                                />
                                Weekly
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="radio"
                                  name="goal-mission-recurrence-inline"
                                  checked={newMissionRecurrence === 'monthly'}
                                  onChange={() => setNewMissionRecurrence('monthly')}
                                  className="h-3 w-3 accent-cyan-500"
                                />
                                Monthly
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">How much time do you astamaite the mission to take?</p>
                          <div
                            className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                              showMissionDuration ? 'border-emerald-500/60' : 'border-gray-700'
                            }`}
                          >
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                              <input
                                type="checkbox"
                                checked={showMissionDuration}
                                onChange={(e) => setShowMissionDuration(e.target.checked)}
                                className="h-4 w-4 accent-cyan-500"
                                aria-label="Toggle duration"
                              />
                              <span>{showMissionDuration ? 'Duration' : 'Add duration'}</span>
                            </label>
                            {showMissionDuration && (
                              <div className="flex flex-wrap items-center gap-2">
                                <DurationCombobox
                                  value={newMissionHours}
                                  onChange={setNewMissionHours}
                                  options={Array.from({ length: 24 }, (_, i) => i)}
                                  min={0}
                                  max={99}
                                  label="h"
                                  ariaLabel="Hours"
                                />
                                <span className="text-gray-400">h</span>
                                <DurationCombobox
                                  value={newMissionMinutes}
                                  onChange={setNewMissionMinutes}
                                  options={[0, 15, 30, 45]}
                                  min={0}
                                  max={59}
                                  label="m"
                                  ariaLabel="Minutes"
                                />
                                <span className="text-gray-400">m</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">How much times do you need to do it untill your done?</p>
                          <div
                            className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                              showMissionTargetCount ? 'border-emerald-500/60' : 'border-gray-700'
                            }`}
                          >
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                              <input
                                type="checkbox"
                                checked={showMissionTargetCount}
                                onChange={(e) => setShowMissionTargetCount(e.target.checked)}
                                className="h-4 w-4 accent-cyan-500"
                                aria-label="Toggle target count"
                              />
                              <span>{showMissionTargetCount ? 'Target counter' : 'Add target counter'}</span>
                            </label>
                            {showMissionTargetCount && (
                              <input
                                type="number"
                                min={1}
                                value={newMissionTargetCount}
                                onChange={(e) => setNewMissionTargetCount(Math.max(1, Number(e.target.value) || 1))}
                                onFocus={(e) => (e.target as HTMLInputElement).select()}
                                className="w-20 rounded-lg border bg-slate-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 transition-colors border-gray-700 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                                aria-label="Target count"
                              />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">Mission deadline</p>
                          <input
                            type="date"
                            value={newMissionDeadline}
                            onChange={(e) => setNewMissionDeadline(e.target.value)}
                            min={toLocalDateString(new Date())}
                            className="w-full rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                            aria-label="Mission deadline"
                          />
                        </div>

                        {isWeighted && (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Weight (% of goal) — total should be 100</p>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={newMissionWeightPercent}
                              onChange={(e) =>
                                setNewMissionWeightPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                              }
                              className="w-20 rounded-lg border border-gray-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:border-cyan-500/50 focus:ring-cyan-500/30"
                              placeholder="0–100"
                              aria-label="Weight percent"
                            />
                          </div>
                        )}
                      </div>

                      {sessionMissions.length > 0 && (
                        <div className="space-y-3 border-t border-gray-800 pt-4 text-left">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                            Missions added this session
                          </p>
                          <ul className="space-y-2">
                            {sessionMissions.map((m) => (
                              <li
                                key={m.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-700 bg-slate-800/60 px-3 py-2"
                              >
                                <span className="min-w-0 flex-1 truncate font-medium text-white" title={m.title}>
                                  {m.title}
                                </span>
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
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Weight used (total 100%)
                              </p>
                              <div className="flex h-6 w-full overflow-hidden rounded-lg bg-slate-800">
                                {sessionMissions.map((m, i) => {
                                  const pct = m.weightPercent ?? 0
                                  if (pct <= 0) return null
                                  return (
                                    <div
                                      key={m.id}
                                      className="shrink-0 border-r border-slate-900 last:border-r-0"
                                      style={{
                                        width: `${pct}%`,
                                        minWidth: pct > 0 ? '4px' : 0,
                                        backgroundColor: `hsl(${220 + i * 40}, 50%, 45%)`,
                                      }}
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
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setAddMissionForGoalId(null)}
                    className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitAddMissionInCard}
                    disabled={!newMissionTitle.trim()}
                    className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Add mission
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}