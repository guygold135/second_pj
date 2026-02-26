/**
 * Merges class names, ignoring falsy values. Used by UI components (e.g. shadcn-style).
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
