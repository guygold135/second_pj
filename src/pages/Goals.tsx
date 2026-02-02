/**
 * Goals = מסך מטרות.
 *
 * המטרה:
 * - לתת למשתמש להגדיר מטרות ולעקוב אחרי ההתקדמות
 *
 * כרגע זה מסך "שלד" (UI) בלי רשימה ושמירה אמיתית של מטרות.
 */
export default function Goals() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-center text-xl font-medium text-white sm:text-2xl">
        Set ambitious targets and track your progress
      </h1>

      {/* מוטיבציה למטרה: שדה קצר שמזכיר למה המטרה חשובה */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-purple-500/40 bg-slate-900 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <input
          type="text"
          placeholder="GOAL MOTIVATION"
          className="flex-1 bg-transparent text-white placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      {/* פעולה ראשית: יצירת מטרה חדשה (כרגע בלי לוגיקה) */}
      <button
        type="button"
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 sm:w-auto sm:px-6"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create New Goal
      </button>

      {/* מצב ריק: כשהמשתמש עוד לא יצר מטרות */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-20 text-center text-gray-300">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
          <svg className="h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <p className="mb-6">Start setting ambitious targets to achieve greatness</p>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-500"
        >
          Create Your First Goal
        </button>
      </div>
    </div>
  )
}
