import { useState, useEffect, type ComponentType } from 'react'
import { useCurrency } from '../contexts/CurrencyContext'

export type OpportunityCostProps = {
  /** When coming from the budget tracker, pass the overspend amount here */
  prefillAmount?: number
  /** Optional section title shown above the card */
  title?: string
}

type ProfileId = 'index_global' | 'pension_fund' | 'bonds_savings' | 'real_estate' | 'mixed_portfolio'

type InvestmentProfile = {
  id: ProfileId
  label: string
  historicalReturn: number
  volatility: 'Low' | 'Medium' | 'High'
  riskLabel: string
  description: string
  disclaimerNote: string
  accentColor: string
  iconColor: string
  accentHex: string
}

const PROFILES: InvestmentProfile[] = [
  { id: 'index_global', label: 'Global Index / S&P 500', historicalReturn: 0.1, volatility: 'High', riskLabel: 'Growth', description: 'Broad market equity — long-term growth potential.', disclaimerNote: '~10% avg/year historically. In some years the index dropped 30%+.', accentColor: 'text-cyan-400 border-cyan-500/60', iconColor: '#22d3ee', accentHex: '#22d3ee' },
  { id: 'pension_fund', label: 'Pension / Provident Fund', historicalReturn: 0.065, volatility: 'Medium', riskLabel: 'Balanced', description: 'Typical pension-style mix of bonds and equities.', disclaimerNote: '~6.5% historical average. Returns vary by fund and region.', accentColor: 'text-blue-400 border-blue-500/60', iconColor: '#60a5fa', accentHex: '#60a5fa' },
  { id: 'bonds_savings', label: 'Savings / Bank Deposit', historicalReturn: 0.04, volatility: 'Low', riskLabel: 'Conservative', description: 'Low risk, stable returns — cash and bonds.', disclaimerNote: '~4% typical. Rates change with central bank policy.', accentColor: 'text-emerald-400 border-emerald-500/60', iconColor: '#34d399', accentHex: '#34d399' },
  { id: 'real_estate', label: 'Real Estate', historicalReturn: 0.07, volatility: 'Medium', riskLabel: 'Balanced', description: 'Property and REITs — income and appreciation.', disclaimerNote: '~7% historical. Property markets can be illiquid and cyclical.', accentColor: 'text-amber-400 border-amber-500/60', iconColor: '#fbbf24', accentHex: '#fbbf24' },
  { id: 'mixed_portfolio', label: 'Mixed Portfolio (avg)', historicalReturn: 0.075, volatility: 'Medium', riskLabel: 'Balanced', description: 'Blend of stocks and bonds — middle-ground risk.', disclaimerNote: '~7.5% historical average. Actual mix determines volatility.', accentColor: 'text-violet-400 border-violet-500/60', iconColor: '#a78bfa', accentHex: '#a78bfa' },
]

const ICON_SIZE = 28
const ICON_STROKE = 1.5
const ICON_GRAY = '#94a3b8'

function GlobeIcon({ color, size = ICON_SIZE }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ transform: 'rotate(90deg)' }}>
      <circle cx="14" cy="14" r="10" />
      <ellipse cx="14" cy="14" rx="10" ry="5" />
      <line x1="4" y1="14" x2="24" y2="14" />
      <line x1="14" y1="4" x2="14" y2="24" />
    </svg>
  )
}

function PillarIcon({ color, size = ICON_SIZE }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="10" y="18" width="8" height="4" rx="0.5" />
      <line x1="12" y1="18" x2="12" y2="8" />
      <line x1="14" y1="18" x2="14" y2="6" />
      <line x1="16" y1="18" x2="16" y2="8" />
      <rect x="8" y="4" width="12" height="4" rx="0.5" />
    </svg>
  )
}

function VaultIcon({ color, size = ICON_SIZE }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="6" width="20" height="16" rx="2" />
      <circle cx="14" cy="14" r="4" />
      <line x1="14" y1="10" x2="14" y2="18" />
      <line x1="10" y1="14" x2="18" y2="14" />
      <line x1="12.5" y1="11.5" x2="15.5" y2="16.5" />
      <line x1="15.5" y1="11.5" x2="12.5" y2="16.5" />
    </svg>
  )
}

function HouseIcon({ color, size = ICON_SIZE }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 3L4 11v14h8V16h4v9h8V11L14 3z" />
      <rect x="11.5" y="14" width="5" height="7" rx="0.5" />
    </svg>
  )
}

function ScaleIcon({ color, size = ICON_SIZE }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="10" x2="24" y2="10" />
      <line x1="14" y1="10" x2="14" y2="24" />
      <line x1="6" y1="10" x2="6" y2="15" />
      <line x1="22" y1="10" x2="22" y2="15" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="22" cy="19" r="3" />
    </svg>
  )
}

function getProfileIcon(id: ProfileId): ComponentType<{ color: string; size?: number }> {
  switch (id) {
    case 'index_global': return GlobeIcon
    case 'pension_fund': return PillarIcon
    case 'bonds_savings': return VaultIcon
    case 'real_estate': return HouseIcon
    case 'mixed_portfolio': return ScaleIcon
    default: return GlobeIcon
  }
}

const HORIZONS = [5, 10, 20, 30] as const
const VOLATILITY_FILLS: Record<'Low' | 'Medium' | 'High', number> = { Low: 1, Medium: 2, High: 4 }
const SEGMENT_SIZE = 10

function StatBar({ volatility, accentHex }: { volatility: 'Low' | 'Medium' | 'High'; accentHex: string }) {
  const count = VOLATILITY_FILLS[volatility]
  return (
    <div className="flex flex-col gap-0.5" title={`Volatility: ${volatility}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Volatility</span>
      <div className="flex items-end gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: SEGMENT_SIZE,
              backgroundColor: i < count ? accentHex : 'rgba(255,255,255,0.08)',
              opacity: i < count ? 0.9 : 1,
              borderRadius: 2,
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function compound(principal: number, rate: number, years: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0
  return principal * Math.pow(1 + rate, years)
}

function getCurrencySymbol(currencyCode: string): string {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0)
    const currencyPart = parts.find((p) => p.type === 'currency')
    return currencyPart?.value ?? '$'
  } catch {
    return '$'
  }
}

function formatAmountWithCommas(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [intPart, decPart] = cleaned.split('.')
  if (!intPart) return ''
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart != null ? `${withCommas}.${decPart}` : withCommas
}

function stripToNumeric(s: string): string {
  const noComma = s.replace(/,/g, '')
  const allowed = noComma.replace(/[^\d.]/g, '')
  const firstDot = allowed.indexOf('.')
  if (firstDot === -1) return allowed
  return allowed.slice(0, firstDot + 1) + allowed.slice(firstDot + 1).replace(/\./g, '')
}

export default function OpportunityCost({ prefillAmount, title }: OpportunityCostProps) {
  const { formatMoney, currencyCode } = useCurrency()
  const [selectedProfileId, setSelectedProfileId] = useState<ProfileId>('index_global')
  const [amountInput, setAmountInput] = useState('')
  const [horizonYears, setHorizonYears] = useState<number>(10)

  const currencySymbol = getCurrencySymbol(currencyCode)

  useEffect(() => {
    if (prefillAmount != null && Number.isFinite(prefillAmount) && prefillAmount > 0) {
      setAmountInput(String(prefillAmount))
    }
  }, [prefillAmount])

  const amount = (() => {
    const n = parseFloat(amountInput.replace(/,/g, ''))
    return Number.isFinite(n) && n > 0 ? n : 0
  })()

  const profile = PROFILES.find((p) => p.id === selectedProfileId) ?? PROFILES[0]!
  const rate = profile.historicalReturn

  const projectedByHorizon = {
    5: compound(amount, rate, 5),
    10: compound(amount, rate, 10),
    20: compound(amount, rate, 20),
    30: compound(amount, rate, 30),
  }

  const projected = projectedByHorizon[horizonYears as keyof typeof projectedByHorizon] ?? projectedByHorizon[10]
  const multiplier = amount > 0 ? projected / amount : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-white sm:px-6 lg:px-8">
      {title && (
        <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
      )}

      <div className="rounded-2xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Investment profile</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROFILES.map((p) => {
            const selected = selectedProfileId === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProfileId(p.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? `${p.accentColor} border-2 bg-slate-800/60`
                    : 'border-gray-800 bg-slate-900/50 hover:border-gray-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = getProfileIcon(p.id)
                    return <Icon color={selected ? p.iconColor : ICON_GRAY} size={ICON_SIZE} />
                  })()}
                  <span className="font-medium text-white">{p.label}</span>
                </div>
                <div className={`mt-1.5 inline-block rounded px-2 py-0.5 text-xs font-medium ${selected ? p.accentColor : 'text-gray-400 border border-gray-600'}`}>
                  {p.riskLabel}
                </div>
                <p className="mt-2 text-xs text-gray-400">{p.description}</p>
                <div className="mt-2">
                  <StatBar volatility={p.volatility} accentHex={p.accentHex} />
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-3 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-amber-100">
          <p className="text-xs font-medium text-amber-200">{profile.disclaimerNote}</p>
        </div>

        <div className="mt-6">
          <label htmlFor="opportunity-amount" className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Amount
          </label>
          <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-gray-800 bg-slate-900/50">
            <span className="border-r border-gray-700 bg-slate-900/80 px-4 py-3 text-xl text-gray-300" aria-hidden>
              {currencySymbol}
            </span>
            <input
              id="opportunity-amount"
              type="text"
              inputMode="decimal"
              value={formatAmountWithCommas(amountInput)}
              onChange={(e) => setAmountInput(stripToNumeric(e.target.value))}
              className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-[22px] font-semibold text-white placeholder-gray-500 focus:outline-none focus:ring-0"
              placeholder="0"
              aria-label="Amount to invest"
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Time horizon</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {HORIZONS.map((y) => {
              const active = horizonYears === y
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => setHorizonYears(y)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                      : 'border border-gray-700 bg-slate-900 text-gray-200 hover:bg-slate-800'
                  }`}
                >
                  {y} years
                </button>
              )
            })}
          </div>
        </div>

        {amount > 0 && (
          <>
            <div className="mt-6 rounded-xl border border-gray-800 bg-slate-900/50 p-4">
              <p className="text-sm text-gray-400">
                {formatMoney(amount)} invested for {horizonYears} years could grow to{' '}
                <span className="font-bold text-cyan-400">{formatMoney(Math.round(projected))}</span>
              </p>
              <div className="mt-2 inline-flex items-center rounded-lg bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-300">
                ×{multiplier >= 10 ? multiplier.toFixed(1) : multiplier.toFixed(2)}
              </div>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-400">Projected value by horizon</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {HORIZONS.map((y) => {
                const value = projectedByHorizon[y]
                const active = horizonYears === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setHorizonYears(y)}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-cyan-500/70 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'border-gray-800 bg-slate-900/50 hover:border-gray-700'
                    }`}
                  >
                    <div className="text-xs font-medium uppercase tracking-wider text-gray-400">{y}y</div>
                    <div className="mt-1 font-semibold text-white">{formatMoney(Math.round(value))}</div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="mt-6 rounded-xl border border-amber-400/50 bg-amber-500/10 p-4 text-amber-100">
          <p className="text-sm">
            * Figures are based on historical averages and are not a guarantee of future returns.
            Past performance does not predict future results. This is not financial advice.
          </p>
        </div>
      </div>
    </div>
  )
}
