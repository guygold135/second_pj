import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'

export type Recurrence = 'none' | 'daily' | 'weekly'

export interface Mission {
  id: string
  title: string
  category: string
  recurrence: Recurrence
  duration: string
  targetCount?: number
  progressCount?: number
  createdAt: string
  isCompleted: boolean
  completedAt?: string
  orderInCategory?: number
  goalId?: string
  /** For goals with missions_weighted: this mission's share of the goal (0–100). Sum of all mission weights for a goal should be 100. */
  weightPercent?: number
}

export const initialCategoryOrder = ['Work', 'Personal', 'Health', 'Study'] as const
/** Used when category is a goal — selectedCategoryFilter === `goal:${goalId}` */
export const GOAL_FILTER_PREFIX = 'goal:'
const initialMissions: Mission[] = []

type MissionsContextValue = {
  missions: Mission[]
  setMissions: Dispatch<SetStateAction<Mission[]>>
  categoriesOrder: string[]
  setCategoriesOrder: Dispatch<SetStateAction<string[]>>
}

const MissionsContext = createContext<MissionsContextValue | null>(null)

export function MissionsProvider({ children }: { children: ReactNode }) {
  const [missions, setMissions] = useState<Mission[]>(initialMissions)
  const [categoriesOrder, setCategoriesOrder] = useState<string[]>([...initialCategoryOrder])

  return (
    <MissionsContext.Provider value={{ missions, setMissions, categoriesOrder, setCategoriesOrder }}>
      {children}
    </MissionsContext.Provider>
  )
}

export function useMissions(): MissionsContextValue {
  const ctx = useContext(MissionsContext)
  if (!ctx) throw new Error('useMissions must be used within MissionsProvider')
  return ctx
}
