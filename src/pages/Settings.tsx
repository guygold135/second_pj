import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { AnimatedThemeToggle } from '../components/ui/animated-theme-toggle'
import { CURRENCIES } from '../utils/currencies'
import { getAvatarUrl, AVATAR_BG_OPTIONS, getAvatarBgClass, getAvatarBgHex } from '../lib/avatar'
import { card, input, pageContainer, btn, alert } from '../styles/designSystem'

export default function Settings() {
  const { user } = useAuth()
  const { currencyCode, setCurrencyCode, formatMoney } = useCurrency()
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const [profileName, setProfileName] = useState(user?.user_metadata?.name ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  /** null = initial letter; string = DiceBear seed (persisted in user_metadata.avatar_seed) */
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState<string | null>(
    (user?.user_metadata?.avatar_seed as string | undefined) ?? null,
  )
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  /** Profile picture background (persisted in user_metadata.avatar_bg). */
  const [selectedAvatarBg, setSelectedAvatarBg] = useState<string>(
    (user?.user_metadata?.avatar_bg as string) ?? 'slate-700',
  )

  const AVATAR_SEEDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

  useEffect(() => {
    const seed = (user?.user_metadata?.avatar_seed as string | undefined) ?? null
    setSelectedAvatarSeed(seed)
  }, [user?.user_metadata?.avatar_seed])

  useEffect(() => {
    const bg = (user?.user_metadata?.avatar_bg as string) ?? 'slate-700'
    setSelectedAvatarBg(bg)
  }, [user?.user_metadata?.avatar_bg])

  const persistAvatarSeed = async (seed: string | null) => {
    if (!supabase || !user) return
    await supabase.auth.updateUser({ data: { avatar_seed: seed } })
  }

  const persistAvatarBg = async (bgId: string) => {
    if (!supabase || !user) return
    await supabase.auth.updateUser({ data: { avatar_bg: bgId } })
  }

  const avatarBgClass = getAvatarBgClass(selectedAvatarBg)
  const avatarRowRef = useRef<HTMLDivElement>(null)
  const bgRowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const makeHandler = (scrollEl: HTMLDivElement) => (e: WheelEvent) => {
      if (!scrollEl.contains(e.target as Node)) return
      if (scrollEl.scrollWidth <= scrollEl.clientWidth) return
      scrollEl.scrollLeft += e.deltaY
      e.preventDefault()
    }
    const a = avatarRowRef.current
    const b = bgRowRef.current
    const handlerA = a ? makeHandler(a) : () => {}
    const handlerB = b ? makeHandler(b) : () => {}
    a?.addEventListener('wheel', handlerA, { passive: false })
    b?.addEventListener('wheel', handlerB, { passive: false })
    return () => {
      a?.removeEventListener('wheel', handlerA)
      b?.removeEventListener('wheel', handlerB)
    }
  }, [showAvatarPicker])

  const selected = CURRENCIES.find((c) => c.code === currencyCode)
  const filtered = search.trim()
    ? CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase())
      )
    : CURRENCIES

  useEffect(() => {
    if (!selectorOpen) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSelectorOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [selectorOpen])

  return (
    <div className={`${pageContainer} mx-auto max-w-2xl`}>
      <h1 className="text-xl font-medium text-white sm:text-2xl">
        Settings
      </h1>

      {/* Profile */}
      <section className={card}>
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-gray-400">
          Profile
        </h2>
        {profileError && (
          <div className={`${alert.error} mb-3`}>
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className={`${alert.success} mb-3`}>
            {profileSuccess}
          </div>
        )}
        <div className="max-w-sm space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">
              Profile picture
            </label>
            <div className="flex items-center gap-3">
              {selectedAvatarSeed ? (
                <img
                  src={getAvatarUrl(selectedAvatarSeed, getAvatarBgHex(selectedAvatarBg))}
                  alt="Profile avatar"
                  className={`h-12 w-12 shrink-0 rounded-full object-cover ${avatarBgClass}`}
                />
              ) : (
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-medium text-gray-300 ${avatarBgClass}`}>
                  {(profileName.trim() || user?.email?.[0] || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Edit picture
              </button>
            </div>
            {showAvatarPicker && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                onMouseDown={(e) => e.target === e.currentTarget && setShowAvatarPicker(false)}
              >
                <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-slate-900 p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Choose profile picture</h3>
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(false)}
                      className="rounded p-1.5 text-gray-400 hover:bg-slate-800 hover:text-white"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mb-3 flex justify-center">
                    {selectedAvatarSeed ? (
                      <img
                        src={getAvatarUrl(selectedAvatarSeed, getAvatarBgHex(selectedAvatarBg))}
                        alt="Selected avatar preview"
                        className={`h-20 w-20 rounded-full object-cover ${avatarBgClass}`}
                      />
                    ) : (
                      <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-medium text-gray-300 ${avatarBgClass}`}>
                        {(profileName.trim() || user?.email?.[0] || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div
                    ref={avatarRowRef}
                    className="flex gap-2 overflow-x-auto py-1 thin-scrollbar"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAvatarSeed(null)
                        persistAvatarSeed(null)
                      }}
                      className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl font-medium transition ${
                        selectedAvatarSeed === null
                          ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900 bg-slate-700 text-gray-300'
                          : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      }`}
                      title="Use initial"
                    >
                      <span className="flex h-full w-full items-center justify-center">
                        {(profileName.trim() || user?.email?.[0] || '?').charAt(0).toUpperCase()}
                      </span>
                    </button>
                    {AVATAR_SEEDS.map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => {
                          setSelectedAvatarSeed(seed)
                          persistAvatarSeed(seed)
                        }}
                        className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-lg font-medium transition hover:bg-slate-600 ${
                          selectedAvatarSeed === seed
                            ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900'
                            : ''
                        }`}
                      >
                        <img
                          src={getAvatarUrl(seed, getAvatarBgHex(selectedAvatarBg))}
                          alt={`Avatar ${seed}`}
                          className="h-full w-full rounded-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <div
                    ref={bgRowRef}
                    className="mt-2 flex gap-2 overflow-x-auto py-1 thin-scrollbar"
                  >
                    {AVATAR_BG_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatarBg(opt.id)
                          persistAvatarBg(opt.id)
                        }}
                        className={`flex h-14 w-14 min-h-[3.5rem] min-w-[3.5rem] shrink-0 items-center justify-center rounded-full text-lg font-medium transition hover:opacity-90 ${
                          opt.id === selectedAvatarBg
                            ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900'
                            : ''
                        } ${opt.className}`}
                        title={`Background: ${opt.id}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="profile-name"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400"
            >
              Username
            </label>
            <input
              id="profile-name"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className={input.base}
              placeholder={user?.email?.split('@')[0] ?? 'Your name'}
            />
          </div>
          <button
            type="button"
            disabled={profileSaving || !supabase || !user}
            className={`${btn.primary} px-5`}
            onClick={async () => {
              if (!supabase || !user) return
              const value = profileName.trim()
              setProfileError(null)
              setProfileSuccess(null)
              if (!value) {
                setProfileError('Please enter a name.')
                return
              }
              setProfileSaving(true)
              const { error } = await supabase.auth.updateUser({ data: { name: value } })
              setProfileSaving(false)
              if (error) {
                setProfileError(error.message || 'Failed to update profile.')
              } else {
                setProfileSuccess('Profile updated.')
              }
            }}
          >
            {profileSaving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </section>

      {/* Theme */}
      <section className={card}>
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-gray-400">
          Theme
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <AnimatedThemeToggle />
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-gray-400">
          Currency
        </h2>
        <div ref={ref} className="relative max-w-sm">
          <button
            type="button"
            onClick={() => {
              setSelectorOpen((o) => !o)
              if (!selectorOpen) setSearch('')
            }}
            className={`flex w-full items-center justify-between ${input.select}`}
          >
            <span>
              {selected ? `${selected.code} — ${selected.name}` : 'Select currency'}
            </span>
            <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {selectorOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full rounded-lg border border-gray-700 bg-slate-900 py-2 shadow-xl">
              <div className="px-2 pb-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code or name..."
                  className={input.base}
                  autoFocus
                />
              </div>
              <ul className="max-h-64 overflow-auto">
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500">No matching currency</li>
                ) : (
                  filtered.map((c) => (
                    <li key={c.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrencyCode(c.code)
                          setSelectorOpen(false)
                          setSearch('')
                        }}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-800 ${
                          c.code === currencyCode ? 'bg-cyan-500/20 text-cyan-300' : 'text-white'
                        }`}
                      >
                        <span className="font-medium">{c.code}</span>
                        <span className="text-gray-400">{c.name}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
