import type { BudgetSummary } from '../types'

// סיכום לדוגמה (בפרויקט אמיתי היינו מחשבים את זה מרשימת הכנסות/הוצאות)
const summary: BudgetSummary = {
  incomeTotal: 0,
  expensesTotal: 0,
  surplus: 0,
}

/**
 * Budget = מסך תקציב.
 *
 * המטרה של המסך:
 * - לראות "במבט אחד" הכנסות, הוצאות ותזרים נטו
 * - להוסיף רשומה חדשה (כפתור Add Entry)
 *
 * כרגע זה בעיקר UI + נתונים סטטיים, בלי טופס שמירה אמיתי.
 */
export default function Budget() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-center text-xl font-medium text-white sm:text-2xl">
        Track your income and expenses with clarity
      </h1>

      {/* מוטיבציה פיננסית: משפט קצר שמזכיר למה לחסוך/לתכנן */}
      <div className="mb-8 flex items-center gap-3 rounded-lg border border-emerald-300/40 bg-slate-900 px-4 py-3">
        <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <input
          type="text"
          placeholder="FINANCE MOTIVATION"
          className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
        />
      </div>

      {/* כרטיסי סיכום */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Income</p>
            <p className="text-2xl font-bold text-emerald-400">${summary.incomeTotal}</p>
          </div>
          <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500">${summary.expensesTotal}</p>
          </div>
          <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Net Cashflow</p>
            <p className="text-2xl font-bold text-emerald-400">${summary.surplus}</p>
            <p className="text-sm text-gray-400">Surplus</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-400 text-emerald-300">
            <span className="text-lg font-bold">$</span>
          </div>
        </div>
      </div>

      {/* כפתור פעולה (כרגע לא מחובר לטופס אמיתי) */}
      <button
        type="button"
        className="mb-10 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 sm:w-auto sm:px-6"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Entry
      </button>

      {/* מצב ריק: כשהמערכת עדיין בלי תנועות */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-20 text-center text-gray-300">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-gray-800">
          <svg className="h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p>No transactions yet. Add your first entry above!</p>
      </div>
    </div>
  )
}
