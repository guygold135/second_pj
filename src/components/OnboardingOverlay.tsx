/**
 * OnboardingOverlay — 3-step first-time user modal.
 *
 * Shows once after sign-up when the user lands on Dashboard.
 * Stored in localStorage (key: mf_onboarding_done) so it only shows once.
 * Fully skippable.
 */

import { useState, useEffect } from 'react'
import { btn } from '../styles/designSystem'

const STORAGE_KEY = 'mf_onboarding_done'

const STEPS = [
  {
    emoji: '🎯',
    title: 'Mission Flow works differently.',
    body: "Most goal apps are just fancy to-do lists. You write it down, feel good for a day, and then forget it. Mission Flow doesn't let you do that.",
    highlight: 'You put real money on the line.',
    accent: 'text-cyan-400',
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/5',
  },
  {
    emoji: '💸',
    title: 'Set your first Mission — and stake it.',
    body: 'Create a mission with a clear deadline. Then decide how much to stake. It can be $5 or $500 — what matters is that losing it would sting.',
    highlight: 'No stake needed to start. But the stakes make it work.',
    accent: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
  },
  {
    emoji: '⚡',
    title: "Complete it — or it's gone.",
    body: "You complete the mission before the deadline and self-report (or designate a judge). We verify, and your money is released. Miss the deadline, and it's charged.",
    highlight: "That's it. Simple. Uncomfortable. Effective.",
    accent: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
  },
]

interface Props {
  /** Called when the user completes or skips onboarding */
  onDone: () => void
}

export function OnboardingOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in after a short delay so dashboard renders first
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])

  const handleDone = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch (_) {}
    onDone()
  }

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Mission Flow"
    >
      <div
        className={`w-full max-w-md rounded-2xl border border-gray-800 bg-slate-900 shadow-2xl transition-all duration-300 ${visible ? 'scale-100' : 'scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicators */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-cyan-500' : i < step ? 'w-4 bg-cyan-700' : 'w-4 bg-gray-700'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="text-xs text-gray-500 transition-colors hover:text-white"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <p className="mb-4 text-5xl">{current.emoji}</p>
          <h2 className="mb-3 text-2xl font-bold text-white">{current.title}</h2>
          <p className="mb-5 text-gray-400 leading-relaxed">{current.body}</p>
          <div className={`rounded-xl border p-4 ${current.border} ${current.bg}`}>
            <p className={`text-sm font-semibold ${current.accent}`}>{current.highlight}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-gray-800 px-6 py-4">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className={btn.secondary}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={() => {
              if (isLast) handleDone()
              else setStep((s) => s + 1)
            }}
            className={btn.primary}
          >
            {isLast ? "Let's go →" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Returns true if the user has NOT seen onboarding yet. */
export function shouldShowOnboarding(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY)
  } catch (_) {
    return false
  }
}