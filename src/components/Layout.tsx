import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// רשימת קישורים לתפריט העליון.
// כל אובייקט אומר:
// - to: לאיזה URL הולכים
// - label: הטקסט שרואים בתפריט
const navLinks = [
  { to: '/', label: 'HOME' },
  { to: '/dashboard', label: 'DASHBOARD' },
  { to: '/my-missions', label: 'MY MISSIONS' },
  { to: '/goals', label: 'GOALS' },
  { to: '/budget', label: 'BUDGET' },
  { to: '/settings', label: 'SETTINGS' },
]

// פה אנחנו מחלקים את הלינקים לשני אזורים:
// - mainLinks: רוב הלינקים (בצד שמאל/אמצע)
// - rightLinks: לינק "Settings" בצד ימין
const mainLinks = navLinks.filter((link) => link.to !== '/settings')
const rightLinks = navLinks.filter((link) => link.to === '/settings')

/**
 * Layout = "השלד" הקבוע של האפליקציה.
 *
 * מה התפקיד שלו?
 * - להציג את ההדר (תפריט עליון) שתמיד נשאר אותו דבר
 * - להציג מתחתיו את התוכן של העמוד הנוכחי
 *
 * החלק שמציג את העמוד נקרא <Outlet />:
 * הוא סוג של "חלון" שבתוכו React Router שם את העמוד המתאים לפי ה-URL.
 */
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
      {/* תפריט עליון (נשאר קבוע בכל העמודים) */}
      <header className="sticky top-0 z-50 border-b border-gray-900/40 bg-[#0f172a]">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <span className="font-semibold tracking-[0.2em] text-white">MISSION FLOW</span>
          <nav className="flex flex-1 flex-nowrap items-center gap-5 text-xs font-semibold uppercase tracking-wide text-gray-300 lg:text-sm">
            <div className="flex flex-1 items-center gap-4">
              {mainLinks.map(({ to, label }) => {
                // אנחנו רוצים להדגיש בתפריט את העמוד הנוכחי.
                // לדוגמה: אם אנחנו ב-`/budget`, הקישור Budget יהיה פעיל.
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
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="max-w-[140px] truncate text-xs text-gray-400 sm:max-w-[200px]" title={user.email}>
                {user.email}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowSignOutConfirm(true)}
              className="rounded-full border border-gray-500 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gray-300 hover:border-gray-300 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Are you sure? sign out confirmation */}
      {showSignOutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowSignOutConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-700 bg-slate-800 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="signout-title" className="text-center font-medium text-white">
              Are you sure you want to sign out?
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="rounded-lg border border-gray-500 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* פה נטען התוכן של העמוד הנוכחי */}
      <main className="bg-[#0f172a] pb-10 pt-6 text-white sm:px-6 lg:px-8 px-4">
        <Outlet />
      </main>
    </div>
  )
}
