import { useState, useEffect, useRef, type ComponentType } from 'react'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export type OpportunityCostProps = {
  /** When coming from the budget tracker, pass the overspend amount here */
  prefillAmount?: number
  /** Optional section title shown above the card */
  title?: string
  /** When true, render only the inner card (no page wrapper). Use inside modal. */
  embedded?: boolean
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
const STORAGE_KEY_OPPORTUNITY = 'opportunity_cost_data'

const VALID_PROFILE_IDS: ProfileId[] = ['index_global', 'pension_fund', 'bonds_savings', 'real_estate', 'mixed_portfolio']
function isValidProfileId(id: string): id is ProfileId {
  return VALID_PROFILE_IDS.includes(id as ProfileId)
}
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

function stripToNumeric(s: string): string {
  const noComma = s.replace(/,/g, '')
  const allowed = noComma.replace(/[^\d.]/g, '')
  const firstDot = allowed.indexOf('.')
  if (firstDot === -1) return allowed
  return allowed.slice(0, firstDot + 1) + allowed.slice(firstDot + 1).replace(/\./g, '')
}

/** Allocation: how the user splits savings across profiles. values keyed by ProfileId. */
export type AllocationSaved = {
  mode: 'percent' | 'amount'
  /** In percent mode: 0–100 per profile. In amount mode: raw amount per profile. */
  values: Partial<Record<ProfileId, number>>
}

export type OpportunityCostSaved = {
  profileId: ProfileId
  amount: string
  horizonYears: number
  allocation?: AllocationSaved | null
}

/** Given saved opportunity_cost, return blended rate (0–1) and horizon years for projections. */
export function getBlendedRateAndHorizon(oc: OpportunityCostSaved | null): { rate: number; horizonYears: number } | null {
  if (!oc || typeof oc !== 'object') return null
  const horizonYears = typeof oc.horizonYears === 'number' && [5, 10, 20, 30].includes(oc.horizonYears)
    ? oc.horizonYears
    : 5
  const profile = PROFILES.find((p) => p.id === (oc.profileId as ProfileId)) ?? PROFILES[0]!
  const alloc = oc.allocation
  if (alloc?.values && typeof alloc.values === 'object') {
    const vals = alloc.values as Partial<Record<ProfileId, number>>
    const hasAny = VALID_PROFILE_IDS.some((id) => Number.isFinite(vals[id]) && (vals[id] ?? 0) > 0)
    if (hasAny) {
      if (alloc.mode === 'amount') {
        const total = VALID_PROFILE_IDS.reduce((s, id) => s + (vals[id] ?? 0), 0)
        if (total <= 0) return { rate: profile.historicalReturn, horizonYears }
        const rate = VALID_PROFILE_IDS.reduce(
          (s, id) => s + ((PROFILES.find((p) => p.id === id)!.historicalReturn * (vals[id] ?? 0)) / total),
          0
        )
        return { rate, horizonYears }
      }
      const totalPct = VALID_PROFILE_IDS.reduce((s, id) => s + (vals[id] ?? 0), 0)
      if (totalPct <= 0) return { rate: profile.historicalReturn, horizonYears }
      const rate = VALID_PROFILE_IDS.reduce(
        (s, id) => s + (PROFILES.find((p) => p.id === id)!.historicalReturn * (vals[id] ?? 0)) / totalPct,
        0
      )
      return { rate, horizonYears }
    }
  }
  return { rate: profile.historicalReturn, horizonYears }
}

export function compoundGrowth(principal: number, rate: number, years: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0
  return principal * Math.pow(1 + rate, years)
}

export default function OpportunityCost({ prefillAmount, title, embedded }: OpportunityCostProps) {
  const { user } = useAuth()
  const { formatMoney, currencyCode } = useCurrency()
  const [selectedProfileId, setSelectedProfileId] = useState<ProfileId>('index_global')
  const [amountInput, setAmountInput] = useState('')
  const [horizonYears, setHorizonYears] = useState<number>(5)
  const [allocationMode, setAllocationMode] = useState<'percent' | 'amount'>('percent')
  const [allocationValues, setAllocationValues] = useState<Record<ProfileId, string>>(() =>
    Object.fromEntries(VALID_PROFILE_IDS.map((id) => [id, ''])) as Record<ProfileId, string>
  )
  const hasLoadedRef = useRef(false)

  const currencySymbol = getCurrencySymbol(currencyCode)

  // Load from Supabase or localStorage on mount
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (supabase && user) {
        try {
          const { data, error } = await supabase
            .from('user_settings')
            .select('opportunity_cost')
            .eq('id', user.id)
            .maybeSingle()
          if (cancelled) return
          if (!error && data?.opportunity_cost && typeof data.opportunity_cost === 'object') {
            const oc = data.opportunity_cost as Record<string, unknown>
            if (isValidProfileId(String(oc.profileId ?? ''))) {
              setSelectedProfileId(String(oc.profileId) as ProfileId)
            }
            if (oc.amount != null) setAmountInput(String(oc.amount))
            if (typeof oc.horizonYears === 'number' && HORIZONS.includes(oc.horizonYears as (typeof HORIZONS)[number])) {
              setHorizonYears(oc.horizonYears)
            }
            const alloc = oc.allocation as AllocationSaved | undefined
            if (alloc?.mode === 'percent' || alloc?.mode === 'amount') {
              setAllocationMode(alloc.mode)
              if (alloc.values && typeof alloc.values === 'object') {
                const next = Object.fromEntries(
                  VALID_PROFILE_IDS.map((id) => {
                    const v = (alloc.values as Record<string, number>)?.[id]
                    return [id, v != null && Number.isFinite(v) ? String(v) : '']
                  })
                ) as Record<ProfileId, string>
                setAllocationValues(next)
              }
            }
          }
        } catch (_) {
          // keep defaults
        }
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY_OPPORTUNITY)
          if (raw) {
            const oc = JSON.parse(raw) as OpportunityCostSaved
            if (isValidProfileId(oc?.profileId ?? '')) setSelectedProfileId(oc.profileId)
            if (oc?.amount != null) setAmountInput(String(oc.amount))
            if (typeof oc?.horizonYears === 'number' && HORIZONS.includes(oc.horizonYears as (typeof HORIZONS)[number])) setHorizonYears(oc.horizonYears)
            const alloc = oc?.allocation
            if (alloc?.mode === 'percent' || alloc?.mode === 'amount') {
              setAllocationMode(alloc.mode)
              if (alloc.values && typeof alloc.values === 'object') {
                const next = Object.fromEntries(
                  VALID_PROFILE_IDS.map((id) => {
                    const v = (alloc.values as Record<string, number>)?.[id]
                    return [id, v != null && Number.isFinite(v) ? String(v) : '']
                  })
                ) as Record<ProfileId, string>
                setAllocationValues(next)
              }
            }
          }
        } catch (_) {
          // keep defaults
        }
      }
      if (!cancelled) setTimeout(() => { hasLoadedRef.current = true }, 0)
    }
    run()
    return () => { cancelled = true }
  }, [user?.id])

  // Persist to Supabase or localStorage when opportunity cost state changes (after initial load)
  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (supabase && !user) return

    const allocationPayload: AllocationSaved | undefined = (() => {
      const values: Partial<Record<ProfileId, number>> = {}
      let hasAny = false
      VALID_PROFILE_IDS.forEach((id) => {
        const s = allocationValues[id] ?? ''
        const n = parseFloat(String(s).replace(/,/g, ''))
        if (Number.isFinite(n) && n >= 0) {
          values[id] = n
          hasAny = true
        }
      })
      if (!hasAny) return undefined
      return { mode: allocationMode, values }
    })()

    const payload: OpportunityCostSaved = {
      profileId: selectedProfileId,
      amount: amountInput,
      horizonYears,
      allocation: allocationPayload ?? null,
    }
    const client = supabase
    if (client && user) {
      const save = async () => {
        try {
          const userId = user.id
          const { data: row } = await client
            .from('user_settings')
            .select('currency_code')
            .eq('id', userId)
            .maybeSingle()
          const { error } = await client
            .from('user_settings')
            .upsert(
              {
                id: userId,
                currency_code: row?.currency_code ?? 'USD',
                opportunity_cost: payload,
                user_id: userId,
              },
              { onConflict: 'id' }
            )
          if (error) throw error
          if (import.meta.env.DEV) console.log('[OpportunityCost] Supabase: user_settings opportunity_cost saved')
          const { data: existing } = await client.from('user_settings').select('id').eq('user_id', userId)
          const toDelete = (existing ?? []).filter((r: { id: string }) => r.id !== userId).map((r: { id: string }) => r.id)
          if (toDelete.length > 0) {
            await client.from('user_settings').delete().in('id', toDelete)
          }
        } catch (e) {
          console.error('[OpportunityCost] Save to Supabase failed:', e)
        }
      }
      save()
    } else {
      try {
        localStorage.setItem(STORAGE_KEY_OPPORTUNITY, JSON.stringify(payload))
      } catch (_) {
        // ignore
      }
    }
  }, [selectedProfileId, amountInput, horizonYears, allocationMode, allocationValues, user?.id])

  useEffect(() => {
    if (prefillAmount != null && Number.isFinite(prefillAmount) && prefillAmount > 0) {
      setAmountInput(String(prefillAmount))
    }
  }, [prefillAmount])

  const amount = (() => {
    const n = parseFloat(amountInput.replace(/,/g, ''))
    return Number.isFinite(n) && n > 0 ? n : 0
  })()

  // Allocation: parse inputs and compute per-profile percentages (0–100) and amounts
  const allocationParsed = (() => {
    const parsed: Record<ProfileId, number> = Object.fromEntries(
      VALID_PROFILE_IDS.map((id) => [id, parseFloat(String(allocationValues[id] ?? '').replace(/,/g, ''))])
    ) as Record<ProfileId, number>
    const valid = (id: ProfileId) => Number.isFinite(parsed[id]) && parsed[id] >= 0
    if (allocationMode === 'percent') {
      const totalPct = VALID_PROFILE_IDS.reduce((s, id) => s + (valid(id) ? parsed[id]! : 0), 0)
      const pcts: Record<ProfileId, number> = Object.fromEntries(
        VALID_PROFILE_IDS.map((id) => [id, valid(id) ? parsed[id]! : 0])
      ) as Record<ProfileId, number>
      const amts: Record<ProfileId, number> = Object.fromEntries(
        VALID_PROFILE_IDS.map((id) => [id, (pcts[id]! / 100) * amount])
      ) as Record<ProfileId, number>
      return { totalPercent: totalPct, totalAmount: amount, pcts, amts }
    }
    const amts: Record<ProfileId, number> = Object.fromEntries(
      VALID_PROFILE_IDS.map((id) => [id, valid(id) ? parsed[id]! : 0])
    ) as Record<ProfileId, number>
    const totalAmount = VALID_PROFILE_IDS.reduce((s, id) => s + amts[id]!, 0)
    const pcts: Record<ProfileId, number> =
      totalAmount > 0
        ? (Object.fromEntries(
            VALID_PROFILE_IDS.map((id) => [id, (amts[id]! / totalAmount) * 100])
          ) as Record<ProfileId, number>)
        : (Object.fromEntries(VALID_PROFILE_IDS.map((id) => [id, 0])) as Record<ProfileId, number>)
    const totalPercent = 100
    return { totalPercent, totalAmount, pcts, amts }
  })()

  const hasAllocationInput = VALID_PROFILE_IDS.some((id) => {
    const s = allocationValues[id] ?? ''
    const n = parseFloat(String(s).replace(/,/g, ''))
    return Number.isFinite(n) && n > 0
  })
  const allocationTotalNot100 = allocationMode === 'percent' && Math.abs(allocationParsed.totalPercent - 100) > 0.5

  const profile = PROFILES.find((p) => p.id === selectedProfileId) ?? PROFILES[0]!
  const blendedRate = hasAllocationInput
    ? VALID_PROFILE_IDS.reduce((s, id) => s + (PROFILES.find((p) => p.id === id)!.historicalReturn * allocationParsed.pcts[id]!) / 100, 0)
    : profile.historicalReturn

  const cardContent = (
    <div className="rounded-xl border border-gray-800 bg-slate-900/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">My Portfolio Allocation</p>
          <p className="mt-1 text-sm text-gray-300">Split your savings across profiles. Enter either % or amounts.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Input as:</span>
            <button
              type="button"
              onClick={() => setAllocationMode('percent')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                allocationMode === 'percent'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setAllocationMode('amount')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                allocationMode === 'amount'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              Amount
            </button>
          </div>
          {allocationTotalNot100 && (
            <p className="mt-2 text-sm text-amber-400">Total is {allocationParsed.totalPercent.toFixed(1)}%. Adjust so it equals 100%.</p>
          )}
          <div className="mt-4 space-y-4">
            {PROFILES.map((p) => (
              <div
                key={p.id}
                className="flex w-full flex-col gap-3 rounded-xl border border-gray-800 bg-slate-900/60 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getProfileIcon(p.id)
                      return <Icon color={p.iconColor} size={ICON_SIZE} />
                    })()}
                    <span className="font-medium text-white">{p.label}</span>
                  </div>
                  <div className={`mt-1.5 inline-block rounded border px-2 py-0.5 text-xs font-medium ${p.accentColor}`}>
                    {p.riskLabel}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{p.description}</p>
                  <div className="mt-2">
                    <StatBar volatility={p.volatility} accentHex={p.accentHex} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-800 pt-3">
                  <span className="w-full text-xs font-medium uppercase tracking-wider text-gray-500 sm:w-auto">
                    Allocation
                  </span>
                  {allocationMode === 'percent' ? (
                    <>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={allocationValues[p.id] ?? ''}
                        onChange={(e) =>
                          setAllocationValues((prev) => ({ ...prev, [p.id]: stripToNumeric(e.target.value) }))
                        }
                        className="w-20 rounded-lg border border-gray-700 bg-slate-800 px-2 py-1.5 text-sm text-white"
                        placeholder="0"
                        aria-label={`${p.label} percent`}
                      />
                      <span className="text-xs text-gray-500">%</span>
                      {allocationParsed.pcts[p.id] != null && allocationParsed.pcts[p.id] > 0 && amount > 0 && (
                        <span className="text-xs text-gray-400">
                          = {formatMoney(allocationParsed.amts[p.id]!)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-gray-500">{currencySymbol}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={allocationValues[p.id] ?? ''}
                        onChange={(e) =>
                          setAllocationValues((prev) => ({ ...prev, [p.id]: stripToNumeric(e.target.value) }))
                        }
                        className="w-28 rounded-lg border border-gray-700 bg-slate-800 px-2 py-1.5 text-sm text-white"
                        placeholder="0"
                        aria-label={`${p.label} amount`}
                      />
                      {allocationParsed.pcts[p.id] != null && allocationParsed.pcts[p.id] > 0 && (
                        <span className="text-xs text-gray-400">
                          {allocationParsed.pcts[p.id]!.toFixed(1)}%
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasAllocationInput && (
            <>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-gray-400">Allocation breakdown</p>
              <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-gray-800">
                {VALID_PROFILE_IDS.map((id) => {
                  const pct = allocationParsed.pcts[id] ?? 0
                  if (pct <= 0) return null
                  const p = PROFILES.find((x) => x.id === id)!
                  return (
                    <div
                      key={id}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: p.accentHex,
                      }}
                      className="transition-all duration-300"
                      title={`${p.label}: ${pct.toFixed(1)}%`}
                    />
                  )
                })}
              </div>
              <p className="mt-2.5 text-base text-gray-300">
                Weighted avg return: <span className="font-semibold text-cyan-400">{(blendedRate * 100).toFixed(2)}%</span>
                {allocationMode === 'amount' && allocationParsed.totalAmount > 0 && (
                  <span className="ml-2 text-gray-400">Total: {formatMoney(allocationParsed.totalAmount)}</span>
                )}
              </p>
            </>
          )}
          <div className="mt-6">
            <p className="text-sm font-medium uppercase tracking-wider text-gray-400">Time horizon for projections</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {HORIZONS.map((y) => {
                const active = horizonYears === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setHorizonYears(y)}
                    className={`rounded-lg px-4 py-2.5 text-base font-medium transition ${
                      active
                        ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                        : 'border border-gray-700 bg-slate-900 text-gray-200 hover:bg-slate-800'
                    }`}
                  >
                    {y} years
                  </button>
                );
              })}
            </div>
          </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="rounded-2xl bg-slate-900/60 p-2">
        {cardContent}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 text-white sm:px-6 lg:px-8">
      {title && <h2 className="text-xl font-semibold text-gray-100">{title}</h2>}
      <div className="rounded-2xl border border-gray-800 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
        {cardContent}
      </div>
    </div>
  );
}
