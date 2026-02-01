import { useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

type Recurrence = 'none' | 'daily' | 'weekly'

interface Mission {
  id: string
  title: string
  recurrence: Recurrence
  duration: string
  targetCount?: number
  progressCount?: number
  createdAt: string
  isCompleted: boolean
}

const initialMissions: Mission[] = [
  {
    id: uuidv4(),
    title: 'Morning stand-up writeup',
    recurrence: 'daily',
    duration: '00:30',
    targetCount: 1,
    progressCount: 0,
    createdAt: new Date().toISOString(),
    isCompleted: false,
  },
  {
    id: uuidv4(),
    title: 'Weekly backlog refinement',
    recurrence: 'weekly',
    duration: '00:45',
    createdAt: new Date().toISOString(),
    isCompleted: false,
  },
]

const hourOptions = Array.from({ length: 24 }, (_, idx) => String(idx).padStart(2, '0'))
const minuteOptions = ['00', '15', '30', '45']

export default function MyMissions() {
  const [missions, setMissions] = useState(initialMissions)
  const [newTitle, setNewTitle] = useState('')
  const [newRecurrence, setNewRecurrence] = useState<Recurrence>('none')
  const [hours, setHours] = useState('00')
  const [minutes, setMinutes] = useState('30')
  const [newTargetCount, setNewTargetCount] = useState(1)

  const sortedMissions = useMemo(
    () => [
      ...missions.filter((mission) => !mission.isCompleted),
      ...missions.filter((mission) => mission.isCompleted),
    ],
    [missions],
  )

  const handleAdd = () => {
    if (!newTitle.trim()) return
    const target = newTargetCount >= 1 ? newTargetCount : 1
    setMissions((prev) => [
      {
        id: uuidv4(),
        title: newTitle.trim(),
        recurrence: newRecurrence,
        duration: `${hours}h ${minutes}m`,
        targetCount: target,
        progressCount: target ? 0 : undefined,
        createdAt: new Date().toISOString(),
        isCompleted: false,
      },
      ...prev,
    ])
    setNewTitle('')
    setNewRecurrence('none')
    setHours('00')
    setMinutes('30')
    setNewTargetCount(1)
  }

  const handleDelete = (id: string) => {
    setMissions((prev) => prev.filter((mission) => mission.id !== id))
  }

  const handleToggle = (missionId: string) => {
    setMissions((prev) => {
      return prev.map((mission) => {
        if (mission.id !== missionId) return mission

        if (mission.isCompleted) return mission

        if (!mission.targetCount) {
          return { ...mission, isCompleted: true }
        }

        const current = mission.progressCount ?? 0
        if (current >= mission.targetCount) {
          return { ...mission, isCompleted: true, progressCount: mission.targetCount }
        }

        const next = current + 1
        if (next >= mission.targetCount) {
          return { ...mission, progressCount: next, isCompleted: true }
        }

        return { ...mission, progressCount: next }
      })
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-gray-800 bg-slate-900/70 p-6 shadow-xl shadow-black/50">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-gray-400">My Missions</p>
        <h1 className="text-2xl font-semibold text-white">Stay focused on what matters</h1>
        <p className="text-sm text-gray-400">
          Add missions, track counters, and complete them only when you hit your goal.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-gray-800 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Add a new mission"
            className="flex-1 rounded-xl border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={newRecurrence}
            onChange={(event) => setNewRecurrence(event.target.value as Recurrence)}
            className="rounded-xl border border-gray-700 bg-slate-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="none">One-time</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-gray-700 bg-slate-900 px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">Duration</span>
            <select
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="rounded-lg border border-gray-600 bg-slate-900 px-2 py-1 text-white"
            >
              {hourOptions.map((hour) => (
                <option value={hour} key={hour}>
                  {hour}h
                </option>
              ))}
            </select>
            <select
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="rounded-lg border border-gray-600 bg-slate-900 px-2 py-1 text-white"
            >
              {minuteOptions.map((minute) => (
                <option value={minute} key={minute}>
                  {minute}m
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <span>Target Count</span>
            <input
              type="number"
              min={1}
              value={newTargetCount}
              onChange={(event) => setNewTargetCount(Math.max(1, Number(event.target.value) || 1))}
              className="w-16 rounded-lg border border-gray-700 bg-slate-900 px-2 py-1 text-white"
            />
          </label>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-blue-500"
          >
            Add Mission
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sortedMissions.map((mission) => (
          <div
            key={mission.id}
            className="flex items-center justify-between rounded-xl border border-gray-800 bg-slate-900/70 px-4 py-3 text-white"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={mission.isCompleted}
                onChange={() => handleToggle(mission.id)}
                className="h-4 w-4 accent-blue-500"
              />
              <div>
                <p
                  className={`text-base font-medium leading-tight ${
                    mission.isCompleted ? 'line-through text-gray-500' : 'text-white'
                  }`}
                >
                  {mission.title}
                </p>
                <p className="text-xs text-gray-400">
                  {mission.recurrence !== 'none' ? mission.recurrence : 'One-time'} • Duration: {mission.duration}
                  {mission.targetCount ? ` • ${mission.progressCount ?? 0}/${mission.targetCount}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`rounded-full border border-gray-700 px-3 py-1 text-xs uppercase tracking-wider ${
                  mission.isCompleted ? 'text-emerald-400' : 'text-gray-300'
                }`}
              >
                {mission.isCompleted ? 'Completed' : mission.recurrence !== 'none' ? mission.recurrence : 'One-time'}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(mission.id)}
                className="text-gray-400 transition hover:text-red-400"
                aria-label="Delete mission"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M10 11v6m4-6v6M9 7V5h6v2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7h14l-1 12H6z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
