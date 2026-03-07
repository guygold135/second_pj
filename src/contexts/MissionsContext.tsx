import { createContext, useContext, useState, useEffect, useRef, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export type Recurrence = 'none' | 'daily' | 'weekly' | 'custom'

export interface Mission {
  id: string
  title: string
  category: string
  recurrence: Recurrence
  duration: string
  /** Repeat configuration (persisted to Supabase) */
  repeatUnit?: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
  repeatValue?: number
  missedRepeats?: number
  repeatLocked?: boolean
  repeatLastEvaluatedAt?: string
  repeatCompletedCount?: number
  targetCount?: number
  progressCount?: number
  createdAt: string
  isCompleted: boolean
  completedAt?: string
  orderInCategory?: number
  /** Client-only: order before marking complete; restored when unchecking. Not persisted. */
  orderInCategoryBeforeComplete?: number
  goalId?: string
  /** For goals with missions_weighted: this mission's share of the goal (0–100). Sum of all mission weights for a goal should be 100. */
  weightPercent?: number
}

export const initialCategoryOrder = ['Work', 'Personal', 'Health', 'Study'] as const
/** Used when category is a goal — selectedCategoryFilter === `goal:${goalId}` */
export const GOAL_FILTER_PREFIX = 'goal:'
const initialMissions: Mission[] = []

const STORAGE_KEY_MISSIONS = 'missions_app_data'

type MissionsContextValue = {
  missions: Mission[]
  setMissions: Dispatch<SetStateAction<Mission[]>>
  categoriesOrder: string[]
  setCategoriesOrder: Dispatch<SetStateAction<string[]>>
  isLoading: boolean
  loadError: string | null
}

const MissionsContext = createContext<MissionsContextValue | null>(null)

function missionToRow(m: Mission) {
  // Persist-friendly recurrence: some databases may only allow 'none' | 'daily' | 'weekly' in this column.
  // Custom repeats are represented via repeat_unit/repeat_value, so we store 'none' in recurrence for them.
  const persistenceRecurrence: Recurrence =
    m.recurrence === 'custom' ? 'none' : m.recurrence

  return {
    id: m.id,
    title: m.title,
    category: m.category,
    recurrence: persistenceRecurrence,
    duration: m.duration ?? '',
    target_count: m.targetCount ?? null,
    progress_count: m.progressCount ?? null,
    created_at: m.createdAt,
    is_completed: m.isCompleted,
    completed_at: m.completedAt ?? null,
    order_in_category: m.orderInCategory ?? null,
    goal_id: m.goalId ?? null,
    weight_percent: m.weightPercent ?? null,
    repeat_unit: m.repeatUnit ?? null,
    repeat_value: m.repeatValue ?? null,
    missed_repeats: m.missedRepeats ?? null,
    repeat_locked: m.repeatLocked ?? null,
    repeat_last_evaluated_at: m.repeatLastEvaluatedAt ?? null,
    repeat_completed_count: m.repeatCompletedCount ?? null,
  }
}

/** Row with only columns that exist in missions before the repeat migration (for backward‑compatible save). */
function missionToRowBase(m: Mission) {
  return {
    id: m.id,
    title: m.title,
    category: m.category,
    recurrence: m.recurrence,
    duration: m.duration ?? '',
    target_count: m.targetCount ?? null,
    progress_count: m.progressCount ?? null,
    created_at: m.createdAt,
    is_completed: m.isCompleted,
    completed_at: m.completedAt ?? null,
    order_in_category: m.orderInCategory ?? null,
    goal_id: m.goalId ?? null,
    weight_percent: m.weightPercent ?? null,
  }
}

function rowToMission(r: Record<string, unknown>): Mission {
  const storedRecurrence = (r.recurrence as Mission['recurrence']) ?? 'none'
  const hasRepeatConfig = r.repeat_unit != null || (r.repeat_value != null && Number(r.repeat_value) > 0)
  const recurrence: Mission['recurrence'] = hasRepeatConfig ? 'custom' : storedRecurrence

  return {
    id: String(r.id),
    title: String(r.title),
    category: String(r.category),
    recurrence,
    duration: String(r.duration ?? ''),
    targetCount: r.target_count != null ? Number(r.target_count) : undefined,
    progressCount: r.progress_count != null ? Number(r.progress_count) : undefined,
    createdAt: String(r.created_at ?? ''),
    isCompleted: Boolean(r.is_completed),
    completedAt: r.completed_at != null ? String(r.completed_at) : undefined,
    orderInCategory: r.order_in_category != null ? Number(r.order_in_category) : undefined,
    goalId: r.goal_id != null ? String(r.goal_id) : undefined,
    weightPercent: r.weight_percent != null ? Number(r.weight_percent) : undefined,
    repeatUnit: r.repeat_unit != null ? (r.repeat_unit as Mission['repeatUnit']) : undefined,
    repeatValue: r.repeat_value != null ? Number(r.repeat_value) : undefined,
    missedRepeats: r.missed_repeats != null ? Number(r.missed_repeats) : undefined,
    repeatLocked: r.repeat_locked != null ? Boolean(r.repeat_locked) : undefined,
    repeatLastEvaluatedAt: r.repeat_last_evaluated_at != null ? String(r.repeat_last_evaluated_at) : undefined,
    repeatCompletedCount: r.repeat_completed_count != null ? Number(r.repeat_completed_count) : undefined,
  }
}

export function MissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [missions, setMissions] = useState<Mission[]>(initialMissions)
  const [categoriesOrder, setCategoriesOrder] = useState<string[]>([...initialCategoryOrder])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Load from Supabase or localStorage on mount
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (supabase && user) {
        if (import.meta.env.DEV) {
          console.log('[MissionsContext] Loading from Supabase...')
        }
        setLoadError(null)
        try {
          const [missionsRes, orderRes] = await Promise.all([
            supabase.from('missions').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
            supabase.from('categories_order').select('"order"').eq('id', user.id).maybeSingle(),
          ])
          if (cancelled) return
          if (missionsRes.error) throw missionsRes.error
          const loadedMissions = (missionsRes.data ?? []).map((r: Record<string, unknown>) => rowToMission(r))
          setMissions(loadedMissions)
          const orderVal = orderRes.data?.order ?? (orderRes.data as Record<string, unknown>)?.['"order"']
          if (orderVal && Array.isArray(orderVal)) {
            setCategoriesOrder(orderVal as string[])
          }
          if (import.meta.env.DEV) {
            console.log('[MissionsContext] Loaded from Supabase:', loadedMissions.length, 'missions')
          }
        } catch (e) {
          if (import.meta.env.DEV) {
            console.error('[MissionsContext] Load from Supabase failed:', e)
          }
          if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load missions')
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('[MissionsContext] Supabase not configured, loading from localStorage')
        }
        // Fallback: load from localStorage when Supabase is not configured
        try {
          const raw = localStorage.getItem(STORAGE_KEY_MISSIONS)
          if (raw) {
            const data = JSON.parse(raw) as { missions?: Mission[]; categoriesOrder?: string[] }
            if (data.missions && Array.isArray(data.missions)) {
              setMissions(data.missions)
            }
            if (data.categoriesOrder && Array.isArray(data.categoriesOrder)) {
              setCategoriesOrder(data.categoriesOrder)
            }
          }
        } catch (_) {
          // ignore parse errors
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

  // Persist to Supabase or localStorage on missions or categoriesOrder change (after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (supabase && !user) return

    const client = supabase
    if (client && user) {
      const save = async () => {
        try {
          const userId = user.id
          const rows = missions.map((m) => ({ ...missionToRow(m), user_id: userId }))
          const rowsBase = missions.map((m) => ({ ...missionToRowBase(m), user_id: userId }))
          if (import.meta.env.DEV) {
            console.log('[MissionsContext] Writing to Supabase:', rows.length, 'missions, order length:', categoriesOrder.length)
          }
          const currentIds = new Set(missions.map((m) => m.id))
          if (rows.length > 0) {
            const { error: missionsError } = await client.from('missions').upsert(rows, { onConflict: 'id' })
            if (missionsError) {
              const msg = missionsError.message ?? String(missionsError)
              if (/repeat_unit|repeat_value|missed_repeats|repeat_locked|repeat_last_evaluated_at|repeat_completed_count|column.*does not exist/i.test(msg)) {
                const { error: fallbackError } = await client.from('missions').upsert(rowsBase, { onConflict: 'id' })
                if (fallbackError) throw fallbackError
                if (import.meta.env.DEV) {
                  console.log('[MissionsContext] Supabase: missions upsert OK (base columns only; run repeat migration for full persist)')
                }
              } else {
                throw missionsError
              }
            } else if (import.meta.env.DEV) {
              console.log('[MissionsContext] Supabase: missions upsert OK')
            }
          }
          const { data: existing } = await client.from('missions').select('id').eq('user_id', userId)
          const toDelete = (existing ?? []).filter((r: { id: string }) => !currentIds.has(r.id)).map((r: { id: string }) => r.id)
          if (toDelete.length > 0) {
            const { error: deleteError } = await client.from('missions').delete().in('id', toDelete)
            if (deleteError) throw deleteError
            if (import.meta.env.DEV) {
              console.log('[MissionsContext] Supabase: deleted', toDelete.length, 'removed mission(s)')
            }
          }
          const { error: orderError } = await client
            .from('categories_order')
            .upsert({ id: userId, order: categoriesOrder, user_id: userId }, { onConflict: 'id' })
          if (orderError) throw orderError
          if (import.meta.env.DEV) {
            console.log('[MissionsContext] Supabase: categories_order upsert OK')
          }
        } catch (e) {
          console.error('[MissionsContext] Save to Supabase failed:', e)
          if (e && typeof e === 'object' && 'message' in e) {
            console.error('[MissionsContext] Error message:', (e as { message: unknown }).message)
          }
        }
      }
      save()
    } else {
      if (import.meta.env.DEV) {
        console.log('[MissionsContext] Supabase not configured, saving to localStorage only')
      }
      // Fallback: save to localStorage when Supabase is not configured
      try {
        localStorage.setItem(
          STORAGE_KEY_MISSIONS,
          JSON.stringify({ missions, categoriesOrder })
        )
      } catch (_) {
        // ignore
      }
    }
  }, [missions, categoriesOrder, user?.id])

  return (
    <MissionsContext.Provider
      value={{ missions, setMissions, categoriesOrder, setCategoriesOrder, isLoading, loadError }}
    >
      {children}
    </MissionsContext.Provider>
  )
}

export function useMissions(): MissionsContextValue {
  const ctx = useContext(MissionsContext)
  if (!ctx) throw new Error('useMissions must be used within MissionsProvider')
  return ctx
}
