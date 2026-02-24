import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export type GoalTrackingMode = 'missions_equal' | 'missions_weighted' | 'time' | 'count'

export interface Goal {
  id: string
  title: string
  /** איך עוקבים אחרי ההתקדמות של היעד (משימות / זמן / מספר מוגדר). */
  trackingMode?: GoalTrackingMode
  /** 0–100, for display in the goal cube (computed from missions/time/count elsewhere or set manually). */
  progressPercent?: number
  /** For time mode: target hours to invest. */
  targetHours?: number
  /** For time mode: total hours logged (manual + timer). */
  loggedHours?: number
  /** For time mode: label for what the time is for (e.g. "practice"). */
  timeLabel?: string
  /** For count/milestones mode: numeric target. */
  targetCount?: number
  /** For count/milestones mode: current progress count (e.g. chapters read so far). */
  currentCount?: number
  /** For count/milestones mode: label for what we're counting (e.g. "chapters read"). */
  milestoneLabel?: string
  /** For persistence: set when loading from Supabase. */
  createdAt?: string
  updatedAt?: string
}

const STORAGE_KEY_GOALS = 'goals_app_data'

type GoalsContextValue = {
  goals: Goal[]
  setGoals: Dispatch<SetStateAction<Goal[]>>
  addGoal: (title: string, trackingMode?: GoalTrackingMode) => Goal | undefined
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  getGoalById: (id: string) => Goal | undefined
  isLoading: boolean
  loadError: string | null
}

const GoalsContext = createContext<GoalsContextValue | null>(null)

function goalToRow(g: Goal) {
  return {
    id: g.id,
    title: g.title,
    tracking_mode: g.trackingMode ?? null,
    progress_percent: g.progressPercent ?? null,
    target_hours: g.targetHours ?? null,
    logged_hours: g.loggedHours ?? null,
    time_label: g.timeLabel ?? null,
    target_count: g.targetCount ?? null,
    current_count: g.currentCount ?? null,
    milestone_label: g.milestoneLabel ?? null,
    created_at: g.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

function rowToGoal(r: Record<string, unknown>): Goal {
  return {
    id: String(r.id),
    title: String(r.title),
    trackingMode: (r.tracking_mode as Goal['trackingMode']) ?? undefined,
    progressPercent: r.progress_percent != null ? Number(r.progress_percent) : undefined,
    targetHours: r.target_hours != null ? Number(r.target_hours) : undefined,
    loggedHours: r.logged_hours != null ? Number(r.logged_hours) : undefined,
    timeLabel: r.time_label != null ? String(r.time_label) : undefined,
    targetCount: r.target_count != null ? Number(r.target_count) : undefined,
    currentCount: r.current_count != null ? Number(r.current_count) : undefined,
    milestoneLabel: r.milestone_label != null ? String(r.milestone_label) : undefined,
    createdAt: r.created_at != null ? String(r.created_at) : undefined,
    updatedAt: r.updated_at != null ? String(r.updated_at) : undefined,
  }
}

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Load from Supabase or localStorage on mount
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (supabase && user) {
        if (import.meta.env.DEV) {
          console.log('[GoalsContext] Loading from Supabase...')
        }
        setLoadError(null)
        try {
          const { data, error } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })
          if (cancelled) return
          if (error) throw error
          const loaded = (data ?? []).map((r: Record<string, unknown>) => rowToGoal(r))
          setGoals(loaded)
          if (import.meta.env.DEV) {
            console.log('[GoalsContext] Loaded from Supabase:', loaded.length, 'goals')
          }
        } catch (e) {
          if (import.meta.env.DEV) {
            console.error('[GoalsContext] Load from Supabase failed:', e)
          }
          if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load goals')
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('[GoalsContext] Supabase not configured, loading from localStorage')
        }
        try {
          const raw = localStorage.getItem(STORAGE_KEY_GOALS)
          if (raw) {
            const data = JSON.parse(raw) as { goals?: Goal[] }
            if (data.goals && Array.isArray(data.goals)) {
              setGoals(data.goals)
            }
          }
        } catch (_) {
          // ignore
        }
      }
      if (!cancelled) {
        setIsLoading(false)
        setTimeout(() => {
          hasLoadedRef.current = true
        }, 0)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Persist to Supabase or localStorage on goals change (after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (supabase && !user) return

    const client = supabase
    if (client && user) {
      const save = async () => {
        try {
          const userId = user.id
          const rows = goals.map((g) => ({ ...goalToRow(g), user_id: userId }))
          if (import.meta.env.DEV) {
            console.log('[GoalsContext] Writing to Supabase:', rows.length, 'goals')
          }
          const currentIds = new Set(goals.map((g) => g.id))
          if (rows.length > 0) {
            const { error } = await client.from('goals').upsert(rows, { onConflict: 'id' })
            if (error) throw error
            if (import.meta.env.DEV) {
              console.log('[GoalsContext] Supabase: goals upsert OK')
            }
          }
          const { data: existing } = await client.from('goals').select('id').eq('user_id', userId)
          const toDelete = (existing ?? []).filter((r: { id: string }) => !currentIds.has(r.id)).map((r: { id: string }) => r.id)
          if (toDelete.length > 0) {
            const { error: deleteError } = await client.from('goals').delete().in('id', toDelete)
            if (deleteError) throw deleteError
            if (import.meta.env.DEV) {
              console.log('[GoalsContext] Supabase: deleted', toDelete.length, 'removed goal(s)')
            }
          }
        } catch (e) {
          console.error('[GoalsContext] Save to Supabase failed:', e)
          if (e && typeof e === 'object' && 'message' in e) {
            console.error('[GoalsContext] Error message:', (e as { message: unknown }).message)
          }
        }
      }
      save()
    } else {
      if (import.meta.env.DEV) {
        console.log('[GoalsContext] Supabase not configured, saving to localStorage only')
      }
      try {
        localStorage.setItem(STORAGE_KEY_GOALS, JSON.stringify({ goals }))
      } catch (_) {
        // ignore
      }
    }
  }, [goals, user?.id])

  const addGoal = useCallback((title: string, trackingMode?: GoalTrackingMode): Goal | undefined => {
    const trimmed = title.trim()
    if (!trimmed) return undefined
    const newGoal: Goal = {
      id: crypto.randomUUID?.() ?? `goal-${Date.now()}`,
      title: trimmed,
      trackingMode: trackingMode ?? 'missions_equal',
    }
    setGoals((prev) => [...prev, newGoal])
    return newGoal
  }, [])

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)))
  }, [])

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const getGoalById = useCallback(
    (id: string) => goals.find((g) => g.id === id),
    [goals],
  )

  return (
    <GoalsContext.Provider
      value={{
        goals,
        setGoals,
        addGoal,
        updateGoal,
        deleteGoal,
        getGoalById,
        isLoading,
        loadError,
      }}
    >
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext)
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider')
  return ctx
}
