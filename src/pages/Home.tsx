import { Link } from 'react-router-dom'
import { btn } from '../styles/designSystem'

/**
 * Home — Landing page for owe it.
 *
 * Tone: Direct, personal, challenging. Speaks to ONE person who keeps
 * breaking promises to themselves. No fake social proof, no team messaging.
 *
 * Two core differentiators front-and-center:
 *   1. Commitment Stakes — real money on the line
 *   2. Future Value Visualization — every overspend shown as what it costs you long-term
 */

const STATS = [
  { value: '73%', label: 'of people abandon goals within 2 weeks without accountability' },
  { value: '3×', label: 'higher completion rate when money is on the line (Ariely, 2008)' },
  { value: '∞', label: 'excuses. One antidote: skin in the game.' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Set a Mission',
    body: 'Define exactly what you need to do and when it must be done. Not "get fit" — "run 3× a week for 4 weeks."',
    color: 'border-cyan-500/40 text-cyan-400',
  },
  {
    step: '02',
    title: 'Stake real money',
    body: 'Commit an amount that actually hurts to lose. You set the number. We hold it. You decide how success gets verified.',
    color: 'border-amber-500/40 text-amber-400',
  },
  {
    step: '03',
    title: 'Deliver or pay',
    body: "Complete it — your money stays. Miss it — it's charged. No negotiation. No extensions. That's the whole point.",
    color: 'border-emerald-500/40 text-emerald-400',
  },
]

export default function Home() {
  return (
    <div className="text-white">
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0a1120] px-4 pt-20 pb-24 sm:px-6 lg:px-8">
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(6,182,212,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow orb */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-600/10 blur-[120px]" />

        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-cyan-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Accountability with skin in the game
          </p>

          <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            You set goals.<br />
            <span className="text-cyan-400">You don't follow through.</span><br />
            Here's why this is different.
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-gray-400">
            owe it isn't another to-do list. It's a commitment engine that makes
            breaking your promises to yourself cost real money — and makes keeping them
            feel earned.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/signup"
              className={`${btn.primary} px-8 py-3.5 text-base`}
            >
              Start my first Mission →
            </Link>
            <Link
              to="/signin"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Already have an account? Sign in
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-600">
            No credit card required to sign up. Stakes are optional — but they work.
          </p>
        </div>
      </section>

      {/* ── PAIN POINT ────────────────────────────────────────────────── */}
      <section className="border-t border-gray-800 bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-8">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-400">Sound familiar?</p>
            <ul className="space-y-3 text-gray-300">
              {[
                'You wrote the goal down. You felt motivated for a week. Then life happened.',
                "You use Notion, Todoist, or a whiteboard. The list grows. The habits don't.",
                'You know what you need to do. The problem is actually doing it.',
                "You've \"started fresh\" more times than you can count.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-base">
                  <span className="mt-1 shrink-0 text-amber-400">—</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm font-medium text-amber-300">
              The problem isn't your willpower. It's that there's nothing at stake when you quit.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section id="features" className="border-t border-gray-800 bg-[#0a1120] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-center text-3xl font-bold text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-gray-400">
            Three steps. No fluff. The psychological mechanism is simple: loss aversion
            is stronger than ambition. We use that.
          </p>

          <div className="grid gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.step}
                className={`rounded-xl border bg-slate-900/60 p-6 ${step.color.split(' ')[0]}`}
              >
                <p className={`mb-3 font-mono text-3xl font-bold ${step.color.split(' ')[1]}`}>
                  {step.step}
                </p>
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-gray-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-800 bg-slate-950 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.value} className="rounded-xl border border-gray-800 bg-slate-900/60 p-6 text-center">
                <p className="mb-2 text-4xl font-bold text-cyan-400">{s.value}</p>
                <p className="text-sm text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUTURE VALUE FEATURE ──────────────────────────────────────── */}
      <section className="border-t border-gray-800 bg-[#0a1120] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Bonus feature: The real cost of spending
            </p>
            <h3 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
              Every overspend shown as what it actually costs you — in 10 years.
            </h3>
            <p className="mb-6 text-gray-400">
              Spent ₪500 more than budgeted this month? owe it tells you what
              that would have grown to if you'd invested it instead — based on your
              personal investment profile. It makes impulse spending concrete.
            </p>
            <div className="rounded-xl border border-emerald-500/20 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Overspend this month</span>
                <span className="font-semibold text-amber-400">₪ 500</span>
              </div>
              <div className="my-3 h-px bg-gray-800" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Could have been in 10 years (7% avg)</span>
                <span className="text-xl font-bold text-emerald-400">₪ 983</span>
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Illustrative example. Connect your investment profile to see real projections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAKES CALLOUT ────────────────────────────────────────────── */}
      <section className="border-t border-gray-800 bg-slate-950 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Commitment Stakes
          </div>

          <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
            This only works if losing actually hurts.
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-gray-400">
            You decide how much to put on the line. You decide how success gets verified —
            self-report, a designated judge, or future AI verification. The point is:
            you made a promise. There are now consequences for breaking it.
          </p>

          <div className="mx-auto grid max-w-xl gap-4 text-left sm:grid-cols-2">
            {[
              { icon: '✓', label: 'Complete in time', sub: 'Your money is released. You earned it.', color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' },
              { icon: '✗', label: 'Miss the deadline', sub: 'The stake is charged. No exceptions.', color: 'border-red-500/30 bg-red-500/5 text-red-400' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border p-5 ${item.color}`}>
                <p className="mb-1 text-2xl font-bold">{item.icon}</p>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-800 bg-[#0a1120] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
            Ready to actually do it?
          </h2>
          <p className="mb-8 text-gray-400">
            Create your account. Set your first Mission. Put something real on the line.
          </p>
          <div className="space-y-3">
            <Link
              to="/signup"
              className={`${btn.primary} block w-full py-3.5 text-center text-base`}
            >
              Create my account — it's free
            </Link>
            <Link
              to="/signin"
              className={`${btn.secondary} block w-full py-3 text-center`}
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-600">
            By signing up, you agree to our Terms of Service and Privacy Policy.
            Stakes require a payment method. Sign-up itself is free.
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-base font-semibold tracking-wide text-white">owe it</span>
            <p className="mt-1 text-xs text-gray-600">© 2026 owe it. All rights reserved.</p>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#features" className="transition-colors hover:text-white">How it works</a>
            <Link to="/signup" className="transition-colors hover:text-white">Get started</Link>
            <Link to="/signin" className="transition-colors hover:text-white">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}