/** Base URL for DiceBear Lorelei Neutral avatars (no query). */
export const DICEBEAR_AVATAR_BASE = 'https://api.dicebear.com/9.x/lorelei-neutral/svg'

/** Hex for DiceBear backgroundColor (no #). Use so the SVG has this background instead of white. */
export function getAvatarUrl(seed: string, backgroundColorHex?: string): string {
  const url = new URL(DICEBEAR_AVATAR_BASE)
  url.searchParams.set('seed', seed)
  if (backgroundColorHex) {
    url.searchParams.set('backgroundColor', backgroundColorHex.replace(/^#/, ''))
  }
  return url.toString()
}

export const AVATAR_BG_OPTIONS: { id: string; className: string; hex: string }[] = [
  { id: 'white', className: 'bg-white', hex: 'f8fafc' },
  { id: 'skin-light', className: 'bg-[#f5d0c5]', hex: 'f5d0c5' },
  { id: 'skin-medium', className: 'bg-[#d4a574]', hex: 'd4a574' },
  { id: 'skin-dark', className: 'bg-[#8d5524]', hex: '8d5524' },
  { id: 'cyan-500', className: 'bg-cyan-500', hex: '06b6d4' },
  { id: 'blue-500', className: 'bg-blue-500', hex: '3b82f6' },
  { id: 'violet-500', className: 'bg-violet-500', hex: '8b5cf6' },
  { id: 'emerald-500', className: 'bg-emerald-500', hex: '10b981' },
  { id: 'amber-400', className: 'bg-amber-400', hex: 'fbbf24' },
  { id: 'rose-400', className: 'bg-rose-400', hex: 'fb7185' },
]

export function getAvatarBgClass(avatarBgId: string | undefined): string {
  return AVATAR_BG_OPTIONS.find((o) => o.id === avatarBgId)?.className ?? 'bg-slate-700'
}

export function getAvatarBgHex(avatarBgId: string | undefined): string | undefined {
  const opt = AVATAR_BG_OPTIONS.find((o) => o.id === avatarBgId)
  return opt?.hex
}
