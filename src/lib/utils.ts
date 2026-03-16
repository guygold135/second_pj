/**
 * Merges class names, ignoring falsy values. Used by UI components (e.g. shadcn-style).
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}

/** Format a Date as YYYY-MM-DD in local timezone (avoids off-by-one day from toISOString()). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
