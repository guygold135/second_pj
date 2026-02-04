import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { TaskSummary, BudgetSummary } from '../types'
import { getRandomQuoteForPage } from '../utils/quotes'

// נתוני דוגמה לסיכום משימות (כרגע לא מחושב מהמשימות האמיתיות, רק הדגמה ל-UI)
const taskSummary: TaskSummary = {
  activeTasksCount: 0,
  completedTodayCount: 1,
  highPriorityTasksCount: 0,
}

// נתוני דוגמה לסיכום תקציב (כרגע הדגמה ל-UI)
const budgetSummary: BudgetSummary = {
  incomeTotal: 0,
  expensesTotal: 0,
  surplus: 0,
}

/**
 * Dashboard = "לוח בקרה" שמרכז תצוגת מצב מהירה.
 *
 * מה יש פה?
 * - שורת "Daily Motivation" (קלט טקסט) — כרגע בלי שמירה
 * - כרטיסי סיכום (Tasks / Goals / Budget / Net Worth) — בעיקר UI
 * - מצבי "ריק" (Empty States) שמסבירים שאין עדיין מידע
 */
export default function Dashboard() {
  const [motivationQuote] = useState(() => getRandomQuoteForPage('general'))
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* מוטיבציה יומית: ציטוט במקום קבוע (טקסט סטטי, לא שדה קלט) */}
      <div className="mb-8 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-slate-900 px-4 py-3">
        <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className="flex-1 bg-transparent text-white" aria-hidden="true">
          {motivationQuote}
        </span>
      </div>

      {/* כרטיסי סיכום */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tasks: סיכום משימות */}
        <div className="rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-xl shadow-black/40">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Tasks</span>
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="mt-2 text-sm text-gray-400">Active tasks</p>
          <p className="text-sm text-emerald-300">Completed today: {taskSummary.completedTodayCount}</p>
          <p className="text-sm text-red-400">High priority: {taskSummary.highPriorityTasksCount}</p>
          <Link to="/dashboard" className="mt-2 inline-block text-sm font-medium text-blue-400 hover:underline">View all</Link>
        </div>

        {/* Goals: סיכום מטרות (כרגע נתונים סטטיים) */}
        <div className="rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-xl shadow-black/40">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Goals</span>
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <p className="mt-2 text-sm text-gray-400">Active goals</p>
          <p className="text-sm text-gray-300">Near completion: 0</p>
          <p className="text-sm text-purple-400">Avg progress: 0%</p>
          <Link to="/goals" className="mt-2 inline-block text-sm font-medium text-blue-400 hover:underline">View all</Link>
        </div>

        {/* Budget: סיכום הכנסות/הוצאות */}
        <div className="rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-xl shadow-black/40">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Budget</span>
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-2 text-sm text-gray-400">Surplus</p>
          <p className="text-sm text-emerald-300">Income: ${budgetSummary.incomeTotal}</p>
          <p className="text-sm text-red-400">Expenses: ${budgetSummary.expensesTotal}</p>
          <Link to="/budget" className="mt-2 inline-block text-sm font-medium text-blue-400 hover:underline">View all</Link>
        </div>

        {/* Net Worth: מצב פיננסי כללי (דמו) */}
        <div className="rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-xl shadow-black/40">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Net Worth</span>
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="mt-2 text-sm text-gray-400">Current financial position</p>
          <p className="text-sm font-medium text-gray-200">• Break even</p>
          <Link to="/investment" className="mt-2 inline-block text-sm font-medium text-blue-400 hover:underline">View all</Link>
        </div>
      </div>

      {/* מצבי ריק: מסכים מה רואים כשאין עדיין משימות/מטרות */}
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-16 text-center text-gray-300">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mb-4">No active tasks. Time to create some!</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-16 text-center text-gray-300">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <p className="mb-4">No goals yet. Set your first goal!</p>
          <Link
            to="/goals"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Create Your First Goal
          </Link>
        </div>
      </div>
    </div>
  )
}
