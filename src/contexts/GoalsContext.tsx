import { createContext, useContext, useState, useCallback, type ReactNode, type Dispatch, type SetStateAction } from 'react'

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
}

type GoalsContextValue = {
  goals: Goal[]
  setGoals: Dispatch<SetStateAction<Goal[]>>
  addGoal: (title: string, trackingMode?: GoalTrackingMode) => Goal | undefined
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  getGoalById: (id: string) => Goal | undefined
}

const GoalsContext = createContext<GoalsContextValue | null>(null)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([])

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
    <GoalsContext.Provider value={{ goals, setGoals, addGoal, updateGoal, deleteGoal, getGoalById }}>
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoals(): GoalsContextValue {
  const ctx = useContext(GoalsContext)
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider')
  return ctx
}
