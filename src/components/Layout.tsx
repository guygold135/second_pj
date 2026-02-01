import { Link, Outlet, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'HOME' },
  { to: '/dashboard', label: 'DASHBOARD' },
  { to: '/my-missions', label: 'MY MISSIONS' },
  { to: '/goals', label: 'GOALS' },
  { to: '/budget', label: 'BUDGET' },
  { to: '/investment', label: 'INVESTMENT' },
  { to: '/contract', label: 'CONTRACT' },
  { to: '/settings', label: 'SETTINGS' },
]

const mainLinks = navLinks.filter((link) => link.to !== '/settings')
const rightLinks = navLinks.filter((link) => link.to === '/settings')

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <header className="sticky top-0 z-50 border-b border-gray-900/40 bg-[#0f172a]">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <span className="font-semibold tracking-[0.2em] text-white">MISSION FLOW</span>
          <nav className="flex flex-1 flex-nowrap items-center gap-5 text-xs font-semibold uppercase tracking-wide text-gray-300 lg:text-sm">
            <div className="flex flex-1 items-center gap-4">
              {mainLinks.map(({ to, label }) => {
                const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-2 ${isActive ? 'text-cyan-300 underline decoration-2 underline-offset-4' : 'hover:text-white'}`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
            <div className="ml-auto flex items-center gap-4">
              {rightLinks.map(({ to, label }) => {
                const isActive = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`px-3 py-2 ${isActive ? 'text-cyan-300 underline decoration-2 underline-offset-4' : 'hover:text-white'}`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </nav>
          <button className="rounded-full border border-gray-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-300 hover:border-gray-300 hover:text-white">
            Get Started Free
          </button>
        </div>
      </header>
      <main className="bg-[#0f172a] pb-10 pt-6 text-white sm:px-6 lg:px-8 px-4">
        <Outlet />
      </main>
    </div>
  )
}
