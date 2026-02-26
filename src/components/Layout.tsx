import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { btn, modal } from '../styles/designSystem'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/my-missions', label: 'My Missions' },
  { to: '/goals', label: 'Goals' },
  { to: '/budget', label: 'Budget' },
  { to: '/settings', label: 'Settings' },
]

const mainLinks = navLinks.filter((link) => link.to !== '/settings')
const rightLinks = navLinks.filter((link) => link.to === '/settings')

export default function Layout() {
  const location = useLocation()
  const { signOut, user } = useAuth()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)

  const handleSignOut = () => {
    setShowSignOutConfirm(false)
    signOut()
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-[#0f172a]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
          >
            Mission Flow
          </Link>
          <nav className="flex flex-1 flex-nowrap items-center gap-1 text-sm">
            <div className="flex flex-1 items-center gap-1">
              {mainLinks.map(({ to, label }) => {
                const isActive = location.pathname === to || location.pathname.startsWith(to + '/')
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-lg px-3 py-2 font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'text-gray-400 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {rightLinks.map(({ to, label }) => {
                const isActive = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`rounded-lg px-3 py-2 font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'text-gray-400 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </nav>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span
                className="max-w-[140px] truncate text-xs text-gray-500 sm:max-w-[200px]"
                title={user.email}
              >
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className={btn.secondary}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {showSignOutConfirm && (
        <div
          className={modal.backdrop}
          onClick={() => setShowSignOutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
        >
          <div
            className={`${modal.box} max-w-sm`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={modal.header}>
              <h2 id="signout-title" className={modal.title}>
                Sign out?
              </h2>
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className={modal.closeBtn}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={modal.footer}>
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className={btn.secondary}
              >
                Cancel
              </button>
              <button type="button" onClick={handleSignOut} className={btn.danger}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-[60vh] pb-10 pt-6">
        <Outlet />
      </main>
    </div>
  )
}
