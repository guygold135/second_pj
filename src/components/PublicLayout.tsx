import { Link, Outlet, useLocation } from 'react-router-dom'

/**
 * Minimal layout for unauthenticated users: Home (landing) + Sign in / Sign up.
 * Used when user is not signed in.
 */
export default function PublicLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
          >
            Mission Flow
          </Link>
          <nav className="flex flex-1 items-center justify-end gap-2 text-sm">
            <Link
              to="/signin"
              className={`rounded-lg px-3 py-2 font-medium transition-all duration-200 ${
                location.pathname === '/signin'
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'text-gray-400 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition-colors hover:bg-cyan-500"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="min-h-[60vh]">
        <Outlet />
      </main>
    </div>
  )
}
