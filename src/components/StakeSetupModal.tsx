import { useState, useMemo, useEffect, useCallback, Component, type ReactNode } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useAuth } from '../contexts/AuthContext'
import { modal, input, btn } from '../styles/designSystem'

class StakeModalErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message || 'Something went wrong' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">Card form error</p>
          <p className="text-xs text-gray-400">{this.state.message}</p>
          <button
            type="button"
            onClick={this.props.onBack}
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to step 1
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

class StakeModalRootErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err.message || 'Something went wrong' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Add financial stake</h2>
            <button
              type="button"
              onClick={this.props.onClose}
              className="rounded p-1 text-gray-400 hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-medium text-red-300">Something went wrong</p>
            <p className="text-xs text-gray-400 break-all">{this.state.message}</p>
            <button
              type="button"
              onClick={this.props.onClose}
              className={btn.secondary}
            >
              Close
            </button>
          </div>
        </>
      )
    }
    return this.props.children
  }
}

const SUPABASE_URL_RAW =
  typeof import.meta.env.VITE_SUPABASE_URL === 'string' && import.meta.env.VITE_SUPABASE_URL
    ? import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')
    : ''
const FUNCTION_URL = SUPABASE_URL_RAW ? `${SUPABASE_URL_RAW}/functions/v1/stripe-stake` : ''
const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const stripePromise =
  typeof STRIPE_PK === 'string' && STRIPE_PK ? loadStripe(STRIPE_PK) : null

const CURRENCIES = [
  { value: 'usd', label: 'USD' },
  { value: 'eur', label: 'EUR' },
  { value: 'ils', label: 'ILS' },
  { value: 'gbp', label: 'GBP' },
] as const

const FAILURE_MODES = [
  { value: 'self_report' as const, label: 'Honor system', desc: 'You self-report' },
  { value: 'auto_deadline' as const, label: 'Auto deadline', desc: 'Charged if not marked complete by due date' },
  { value: 'both' as const, label: 'Both', desc: 'Either triggers a charge' },
] as const

export interface StakeInfo {
  stakeId: string
  amount: number
  currency: string
  dueDate: string
  failureMode: 'self_report' | 'auto_deadline' | 'both'
  status: 'pending_card' | 'active' | 'charged' | 'succeeded' | 'cancelled'
}

export type StakeSetupModalProps = {
  itemId: string
  itemTitle: string
  itemType: 'mission' | 'goal'
  defaultDueDate?: string
  onClose: () => void
  onStaked: (info: StakeInfo) => void
}

async function callStakeFunction(
  body: Record<string, unknown>,
  accessToken?: string | null
): Promise<Response> {
  if (!FUNCTION_URL || !FUNCTION_URL.startsWith('http')) {
    throw new Error(
      'VITE_SUPABASE_URL is missing or invalid in .env. Add your Supabase project URL and restart the dev server (npm run dev).'
    )
  }
  const token = accessToken ?? (typeof ANON_KEY === 'string' && ANON_KEY ? ANON_KEY : null)
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  return res
}

function CardStep({
  clientSecret,
  amount,
  currency,
  dueDate,
  stakeId,
  itemId: _itemId,
  itemTitle: _itemTitle,
  itemType: _itemType,
  failureMode,
  onSuccess,
  onError,
  accessToken,
}: {
  clientSecret: string
  amount: number
  currency: string
  dueDate: string
  stakeId: string
  itemId: string
  itemTitle: string
  itemType: 'mission' | 'goal'
  failureMode: 'self_report' | 'auto_deadline' | 'both'
  onSuccess: (info: StakeInfo) => void
  onError: (msg: string) => void
  accessToken?: string | null
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [confirming, setConfirming] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!stripe || !elements) return
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        onError('Card element not ready')
        return
      }
      setConfirming(true)
      try {
        const { setupIntent, error: setupError } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: { card: cardElement },
        })
        if (setupError) {
          onError(setupError.message ?? 'Card setup failed')
          setConfirming(false)
          return
        }
        const paymentMethodId = setupIntent?.payment_method
        if (typeof paymentMethodId !== 'string') {
          onError('No payment method returned')
          setConfirming(false)
          return
        }
        const confirmRes = await callStakeFunction(
          {
            action: 'confirm_stake',
            stakeId,
            paymentMethodId,
          },
          accessToken
        )
        const confirmData = await confirmRes.json()
        if (!confirmRes.ok) {
          onError(confirmData?.error ?? 'Failed to confirm stake')
          setConfirming(false)
          return
        }
        onSuccess({
          stakeId,
          amount,
          currency,
          dueDate,
          failureMode,
          status: 'active',
        })
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setConfirming(false)
      }
    },
    [stripe, elements, clientSecret, stakeId, amount, currency, dueDate, failureMode, onSuccess, onError, accessToken]
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-gray-700 bg-slate-800/60 p-4">
        <p className="mb-2 text-sm font-medium text-gray-400">Card details</p>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#fff',
                '::placeholder': { color: '#94a3b8' },
              },
              invalid: { color: '#f87171' },
            },
          }}
          className="rounded-lg border border-gray-700 bg-slate-900 p-3"
        />
      </div>
      <div className="rounded-lg border border-gray-700 bg-slate-800/40 px-3 py-2 text-sm text-gray-300">
        <span className="font-semibold text-white">{amount}</span> {currency.toUpperCase()} · Due {dueDate}
      </div>
      <button
        type="submit"
        disabled={!stripe || confirming}
        className={`w-full ${btn.primary} py-2.5`}
      >
        {confirming ? 'Confirming…' : 'Confirm'}
      </button>
    </form>
  )
}

export function StakeSetupModal({
  itemId,
  itemTitle,
  itemType,
  defaultDueDate,
  onClose,
  onStaked,
}: StakeSetupModalProps) {
  const { user, session } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('usd')
  const [dueDate, setDueDate] = useState(
    defaultDueDate ?? new Date().toISOString().slice(0, 10)
  )
  const [failureMode, setFailureMode] = useState<'self_report' | 'auto_deadline' | 'both'>('both')
  const [stakeId, setStakeId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    if (step !== 2 || !stakeId || !user) return
    const run = async () => {
      setLoading(true)
      setError(null)
      const numAmount = parseFloat(amount)
      if (!Number.isFinite(numAmount) || numAmount < 1) {
        setError('Invalid amount')
        setLoading(false)
        return
      }
      try {
        const res = await callStakeFunction(
          {
            action: 'create_setup_intent',
            stakeId,
            amount: numAmount,
            currency,
            description: `${itemType}: ${itemTitle}`,
            dueDate,
            userId: user.id,
            itemId,
            itemType,
            failureMode,
          },
          session?.access_token
        )
        let data: { error?: string; clientSecret?: string } = {}
        try {
          data = (await res.json()) as { error?: string; clientSecret?: string }
        } catch {
          setError(`Server returned invalid response (${res.status}). Check Edge Function logs and secrets (STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).`)
          setLoading(false)
          return
        }
        if (!res.ok) {
          const serverMsg = typeof data?.error === 'string' ? data.error : 'Failed to create setup'
          setError(`${serverMsg} (${res.status})`)
          setLoading(false)
          return
        }
        if (data.clientSecret) setClientSecret(data.clientSecret)
        else setError('No client secret returned')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Request failed'
        const friendly =
          msg === 'Failed to fetch'
            ? 'Cannot reach the server. Check: (1) VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, (2) run "supabase functions deploy stripe-stake", (3) restart dev server after changing .env.'
            : msg
        setError(friendly)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [step, stakeId, user?.id, session?.access_token, amount, currency, dueDate, itemId, itemTitle, itemType, failureMode])

  const handleContinue = () => {
    setError(null)
    const num = parseFloat(amount)
    if (!Number.isFinite(num) || num < 1) {
      setError('Amount must be at least 1')
      return
    }
    if (!dueDate || dueDate < minDate) {
      setError('Pick a deadline from today onward')
      return
    }
    setStakeId(crypto.randomUUID())
    setStep(2)
  }

  return (
    <div
      className={modal.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stake-modal-title"
    >
      <div
        className={`${modal.box} max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <StakeModalRootErrorBoundary onClose={onClose}>
          <div className={modal.header}>
            <h2 id="stake-modal-title" className={modal.title}>
              Add financial stake
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={modal.closeBtn}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Amount</label>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={input.base}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={input.select}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Deadline</label>
              <input
                type="date"
                min={minDate}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={input.base}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-400">If you don’t complete</p>
              <div className="space-y-2">
                {FAILURE_MODES.map((fm) => (
                  <label
                    key={fm.value}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${
                      failureMode === fm.value
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-gray-700 bg-slate-800/60 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="failureMode"
                      value={fm.value}
                      checked={failureMode === fm.value}
                      onChange={() => setFailureMode(fm.value)}
                      className="sr-only"
                    />
                    <span className="font-medium text-white">{fm.label}</span>
                    <span className="text-sm text-gray-400">— {fm.desc}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="button"
              onClick={handleContinue}
              className={`w-full ${btn.primary} py-2.5`}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <>
            {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
            {loading && <p className="text-sm text-gray-400">Preparing card form…</p>}
            {!loading && !stripePromise && (
              <p className="mb-2 text-sm text-amber-400">
                Stripe is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to .env and restart the dev server (npm run dev).
              </p>
            )}
            {!loading && stripePromise && !clientSecret && !error && (
              <p className="mb-2 text-sm text-gray-400">Loading card form…</p>
            )}
            {clientSecret && stripePromise && stakeId && (
              <StakeModalErrorBoundary
                onBack={() => { setStep(1); setError(null); setClientSecret(null); }}
              >
                <Elements
                  stripe={stripePromise}
                  options={{ appearance: { theme: 'night' } }}
                  key={clientSecret}
                >
                  <CardStep
                    clientSecret={clientSecret}
                    amount={parseFloat(amount)}
                    currency={currency}
                    dueDate={dueDate}
                    stakeId={stakeId}
                    itemId={itemId}
                    itemTitle={itemTitle}
                    itemType={itemType}
                    failureMode={failureMode}
                    onSuccess={onStaked}
                    onError={setError}
                    accessToken={session?.access_token}
                  />
                </Elements>
              </StakeModalErrorBoundary>
            )}
            <button
              type="button"
              onClick={() => { setStep(1); setError(null); setClientSecret(null); }}
              className="mt-3 w-full text-center text-sm text-gray-400 hover:text-white"
            >
              ← Back
            </button>
          </>
        )}
        </StakeModalRootErrorBoundary>
      </div>
    </div>
  )
}

export function StakeBadge({
  stake,
  onReportSuccess,
  onReportFailure,
}: {
  stake: StakeInfo
  onReportSuccess: () => void
  onReportFailure: () => void
}) {
  const [open, setOpen] = useState(false)
  const [showChargeConfirm, setShowChargeConfirm] = useState(false)
  const style =
    stake.status === 'active'
      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      : stake.status === 'succeeded'
        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
        : stake.status === 'charged'
          ? 'bg-red-500/20 text-red-300 border-red-500/50'
          : 'bg-gray-500/20 text-gray-300 border-gray-500/50'

  const amountLabel =
    typeof stake.amount === 'number' && stake.currency
      ? `${stake.amount} ${(stake.currency || 'usd').toUpperCase()}`
      : ''

  const label =
    stake.status === 'active'
      ? (amountLabel ? `Stake: ${amountLabel}` : 'Stake active')
      : stake.status === 'succeeded'
        ? 'Completed'
        : stake.status === 'charged'
          ? `Charged${amountLabel ? ` ${amountLabel}` : ''}`
          : stake.status === 'pending_card'
            ? 'Card not set'
            : stake.status

  const canReportOutcome = stake.status === 'active'

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => canReportOutcome && setOpen((o) => !o)}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${style}`}
          title={
            canReportOutcome
              ? 'Click to report: I completed it / Charge me'
              : stake.status === 'pending_card'
                ? 'Add stake again and complete card step to enable report options'
                : undefined
          }
        >
          {label}
        </button>
        {canReportOutcome && open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-700 bg-slate-800 py-1 shadow-lg">
              <p className="border-b border-gray-700 px-3 py-2 text-xs text-gray-400">
                Honor system — report outcome:
              </p>
              <button
                type="button"
                onClick={() => { onReportSuccess(); setOpen(false); }}
                className="block w-full px-3 py-2.5 text-left text-sm font-medium text-white hover:bg-slate-700"
              >
                ✅ I completed it
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setShowChargeConfirm(true); }}
                className="block w-full px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-red-500/20"
              >
                ❌ I didn’t complete — charge my card
              </button>
            </div>
          </>
        )}
      </div>

      {showChargeConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowChargeConfirm(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="charge-confirm-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-800 bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="charge-confirm-title" className="mb-2 text-lg font-semibold text-white">
              Charge card?
            </h3>
            <p className="mb-4 text-sm text-gray-300">
              Your card will be charged <strong className="text-white">{amountLabel || 'the stake amount'}</strong>.
              You can verify the payment in Stripe Dashboard → Payments.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowChargeConfirm(false)}
                className={`flex-1 ${btn.secondary} py-2.5`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowChargeConfirm(false)
                  onReportFailure()
                }}
                className={`flex-1 ${btn.danger} py-2.5`}
              >
                Yes, charge me
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
