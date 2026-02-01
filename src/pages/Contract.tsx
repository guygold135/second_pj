export default function Contract() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-right text-sm font-medium text-amber-400">TEST MODE</p>
      <h1 className="text-center text-xl font-medium text-white sm:text-2xl">
        Put money on the line to beat procrastination
      </h1>

      {/* Warning box */}
      <div className="mb-6 flex gap-3 rounded-lg border border-amber-400/60 bg-amber-500/10 p-4 text-amber-100">
        <svg className="h-6 w-6 shrink-0 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <ul className="list-inside list-disc space-y-1 text-sm text-amber-100">
          <li>Commit money to a task with a deadline.</li>
          <li>If you don't complete the task by the deadline, the amount is "donated" (simulated in test mode)</li>
          <li>Complete the task on time to get your money back</li>
          <li><span className="font-semibold text-red-400">TEST MODE</span>: No real payments are processed. This is for motivation only.</li>
        </ul>
      </div>

      <button
        type="button"
        className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-500 sm:w-auto sm:px-6"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Create New Contract
      </button>
      <p className="text-center text-sm text-gray-400">Create some tasks first to add contracts.</p>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-20 text-center text-gray-300">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-slate-800">
          <svg className="h-10 w-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="mb-2">Create your first contract to start fighting procrastination.</p>
        <p className="text-sm text-gray-400">No contract history yet.</p>
      </div>
    </div>
  )
}
