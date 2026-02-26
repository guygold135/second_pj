import { useState, useRef, useEffect } from 'react'
import { useCurrency } from '../contexts/CurrencyContext'
import { CURRENCIES } from '../utils/currencies'
import { card, input, pageContainer } from '../styles/designSystem'

export default function Settings() {
  const { currencyCode, setCurrencyCode, formatMoney } = useCurrency()
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

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

      <section className={card}>
        <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-gray-400">
          Currency
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Used for amounts in Budget and related pages.
        </p>
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
        <p className="mt-3 text-xs text-gray-500">
          Example: {formatMoney(1234.56)}
        </p>
      </section>
    </div>
  )
}
