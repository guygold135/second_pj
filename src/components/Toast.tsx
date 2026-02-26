/**
 * Toast — lightweight bottom-right notification system.
 *
 * Usage:
 *   import { useToast } from './Toast'
 *   const { toast } = useToast()
 *   toast.success('Mission completed!')
 *   toast.error('Something went wrong')
 *   toast.info('Stake set successfully')
 *
 * Wrap your app (or the authenticated layout) with <ToastProvider>.
 * Toasts auto-dismiss after 3 seconds.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
  } from 'react'
  
  export type ToastVariant = 'success' | 'error' | 'info'
  
  interface ToastItem {
    id: string
    variant: ToastVariant
    message: string
    /** ms remaining; counts down so we can animate the progress bar */
    remaining: number
    exiting: boolean
  }
  
  const DURATION_MS = 3000
  
  interface ToastContextValue {
    toast: {
      success: (message: string) => void
      error: (message: string) => void
      info: (message: string) => void
    }
  }
  
  const ToastContext = createContext<ToastContextValue | null>(null)
  
  export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([])
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  
    const dismiss = useCallback((id: string) => {
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      )
      // Remove from DOM after CSS transition
      const t = setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
      }, 300)
      timersRef.current.set(`exit-${id}`, t)
    }, [])
  
    const add = useCallback(
      (variant: ToastVariant, message: string) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
        setItems((prev) => [
          ...prev,
          { id, variant, message, remaining: DURATION_MS, exiting: false },
        ])
        const t = setTimeout(() => dismiss(id), DURATION_MS)
        timersRef.current.set(id, t)
      },
      [dismiss],
    )
  
    // Clean up all timers on unmount
    useEffect(() => {
      return () => {
        timersRef.current.forEach((t) => clearTimeout(t))
      }
    }, [])
  
    const toast = {
      success: (m: string) => add('success', m),
      error: (m: string) => add('error', m),
      info: (m: string) => add('info', m),
    }
  
    return (
      <ToastContext.Provider value={{ toast }}>
        {children}
        {/* Portal-like fixed container */}
        <div
          className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3"
          aria-live="polite"
          aria-atomic="false"
        >
          {items.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </div>
      </ToastContext.Provider>
    )
  }
  
  const VARIANT_STYLES: Record<ToastVariant, { wrapper: string; bar: string; icon: string }> = {
    success: {
      wrapper:
        'border-emerald-500/50 bg-emerald-500/10 text-emerald-200 shadow-emerald-900/30',
      bar: 'bg-emerald-500',
      icon: '✓',
    },
    error: {
      wrapper:
        'border-red-500/50 bg-red-500/10 text-red-200 shadow-red-900/30',
      bar: 'bg-red-500',
      icon: '✕',
    },
    info: {
      wrapper:
        'border-cyan-500/50 bg-cyan-500/10 text-cyan-200 shadow-cyan-900/30',
      bar: 'bg-cyan-500',
      icon: 'ℹ',
    },
  }
  
  function ToastCard({
    item,
    onDismiss,
  }: {
    item: ToastItem
    onDismiss: () => void
  }) {
    const styles = VARIANT_STYLES[item.variant]
    return (
      <div
        role="status"
        className={`
          relative flex w-72 items-start gap-3 overflow-hidden rounded-xl border
          p-4 shadow-xl backdrop-blur-sm transition-all duration-300
          ${styles.wrapper}
          ${item.exiting ? 'translate-x-20 opacity-0' : 'translate-x-0 opacity-100'}
        `}
        style={{
          transform: item.exiting ? 'translateX(80px)' : 'translateX(0)',
          opacity: item.exiting ? 0 : 1,
        }}
      >
        {/* Icon */}
        <span className="mt-px shrink-0 text-base font-bold">{styles.icon}</span>
  
        {/* Message */}
        <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
  
        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs opacity-60 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
  
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-current/10">
          <div
            className={`h-full ${styles.bar} transition-none`}
            style={{
              animation: `toastProgress ${DURATION_MS}ms linear forwards`,
            }}
          />
        </div>
      </div>
    )
  }
  
  export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) {
      // Graceful fallback if used outside provider — no-op
      return {
        toast: {
          success: () => {},
          error: () => {},
          info: () => {},
        },
      }
    }
    return ctx
  }