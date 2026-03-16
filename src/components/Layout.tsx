import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { btn, modal } from '../styles/designSystem'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { getAvatarUrl, getAvatarBgClass, getAvatarBgHex } from '../lib/avatar'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverBody,
  PopoverFooter,
} from './ui/popover'
import { Button } from './ui/button'
import { User as UserIcon, Settings as SettingsIcon, LogOut, Clock3 } from 'lucide-react'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/goals', label: 'Goals' },
  { to: '/calendar', label: 'Calendar' },
]

const mainLinks = navLinks

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const displayName =
    user?.user_metadata?.name ??
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    ''
  const avatarSeed = user?.user_metadata?.avatar_seed as string | undefined
  const avatarBgId = user?.user_metadata?.avatar_bg as string | undefined
  const avatarBgClass = getAvatarBgClass(avatarBgId)
  const initials = displayName.slice(0, 2).toUpperCase()

  const handleSignOut = () => {
    setShowSignOutConfirm(false)
    signOut()
  }

  const isCalendar = location.pathname === '/calendar'

  return (
    <div className="flex min-h-screen flex-col theme-bg theme-text">
      <header className="sticky top-0 z-50 border-b theme-border backdrop-blur-md theme-bg-header">
        <div className="flex w-full items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-center">
            <Link
              to="/dashboard"
              className="font-semibold tracking-wide text-white transition-opacity hover:opacity-90"
            >
              owe it
            </Link>
          </div>
          <nav className="flex flex-shrink-0 items-center gap-1 text-sm">
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
          </nav>
          <div className="flex flex-1 items-center justify-end gap-3">
            {displayName && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                    <Avatar className={`h-11 w-11 ${avatarBgClass}`}>
                      {avatarSeed ? (
                        <AvatarImage src={getAvatarUrl(avatarSeed, getAvatarBgHex(avatarBgId))} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={8}>
                  <PopoverHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className={`h-9 w-9 ${avatarBgClass}`}>
                        {avatarSeed ? (
                          <AvatarImage src={getAvatarUrl(avatarSeed, getAvatarBgHex(avatarBgId))} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-transparent">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <PopoverTitle className="truncate text-sm">
                          {displayName}
                        </PopoverTitle>
                        {user?.email && (
                          <PopoverDescription className="truncate text-xs">
                            {user.email}
                          </PopoverDescription>
                        )}
                      </div>
                    </div>
                  </PopoverHeader>
                  <PopoverBody className="space-y-1 px-2 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { setPopoverOpen(false); navigate('/dashboard') }}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      View dashboard
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { setPopoverOpen(false); navigate('/history') }}
                    >
                      <Clock3 className="mr-2 h-4 w-4" />
                      History
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => { setPopoverOpen(false); navigate('/settings') }}
                    >
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </PopoverBody>
                  <PopoverFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent justify-center theme-text"
                      onClick={() => { setPopoverOpen(false); setShowSignOutConfirm(true) }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </PopoverFooter>
                </PopoverContent>
              </Popover>
            )}
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
            <div className={`${modal.header} justify-center relative`}>
              <h2 id="signout-title" className={modal.title}>
                Are you sure?
              </h2>
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className={`${modal.closeBtn} absolute right-0 top-1/2 -translate-y-1/2`}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={`${modal.footer} justify-center`}>
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

      <main className={isCalendar ? 'flex min-h-0 flex-1 flex-col' : 'min-h-[60vh] pb-10 pt-6'}>
        <Outlet />
      </main>
    </div>
  )
}
