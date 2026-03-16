import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoals } from '../contexts/GoalsContext'
import { useMissions } from '../contexts/MissionsContext'

export function History() {
  const navigate = useNavigate()
  const { goals } = useGoals()
  const { missions } = useMissions()

  const completedGoals = useMemo(
    () => goals.filter((g) => (g as { isCompleted?: boolean }).isCompleted === true),
    [goals],
  )

  const completedMissions = useMemo(
    () => missions.filter((m) => m.isCompleted && m.goalId),
    [missions],
  )

  const standaloneCompletedMissions = useMemo(
    () => missions.filter((m) => m.isCompleted && !m.goalId),
    [missions],
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">History</h1>
          <p className="text-sm text-gray-400">
            Completed goals and missions. Deleted items are not saved here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          Back to dashboard
        </button>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Completed goals
          </h2>
        {completedGoals.length === 0 ? (
          <p className="text-sm text-gray-500">No completed goals yet.</p>
        ) : (
          <ul className="space-y-2">
            {completedGoals.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-800 bg-slate-900/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{g.title}</p>
                  {(g.deadlineFrom || g.deadlineTo) && (
                    <p className="text-xs text-gray-500">
                      Deadline:{' '}
                      {g.deadlineFrom && g.deadlineTo
                        ? `${new Date(g.deadlineFrom).toLocaleDateString()} – ${new Date(g.deadlineTo).toLocaleDateString()}`
                        : g.deadlineTo
                          ? new Date(g.deadlineTo).toLocaleDateString()
                          : new Date(g.deadlineFrom!).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Completed missions (with goal)
        </h2>
        {completedMissions.length === 0 ? (
          <p className="text-sm text-gray-500">No completed missions yet.</p>
        ) : (
          <ul className="space-y-2">
            {completedMissions.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-800 bg-slate-900/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    Goal: {goals.find((g) => g.id === m.goalId)?.title ?? 'Unknown'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Completed standalone missions
        </h2>
        {standaloneCompletedMissions.length === 0 ? (
          <p className="text-sm text-gray-500">No completed standalone missions yet.</p>
        ) : (
          <ul className="space-y-2">
            {standaloneCompletedMissions.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-800 bg-slate-900/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{m.title}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </div>
  )
}

export default History

