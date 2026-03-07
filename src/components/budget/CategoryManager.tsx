import { useState, useEffect, useRef } from 'react'
import { useCurrency } from '../../contexts/CurrencyContext'
import type { BudgetCategory } from '../../types'
import { getCategoryColorHex } from './categoryColors'
import { input } from '../../styles/designSystem'
import { btn } from '../../styles/designSystem'

interface CategoryManagerProps {
  categories: BudgetCategory[]
  initialEditId?: string | null
  onCloseSingleEdit?: () => void
  onAdd: (name: string, budget: number) => void
  onEdit: (id: string, updates: { name?: string; budget?: number; color?: string }) => void
  onDelete: (id: string) => void
}

// Intentionally high-contrast palette (mostly *-500) so categories are easier to distinguish.
// Value is the Tailwind text color class; hex is used for swatches + charts.
const PRESET_COLORS: { value: string; label: string; hex: string }[] = [
  { value: 'text-white', label: 'white', hex: '#ffffff' },
  { value: 'text-sky-500', label: 'sky', hex: '#0ea5e9' },
  { value: 'text-orange-500', label: 'orange', hex: '#f97316' },
  { value: 'text-blue-500', label: 'blue', hex: '#3b82f6' },
  { value: 'text-amber-500', label: 'amber', hex: '#f59e0b' },
  { value: 'text-indigo-500', label: 'indigo', hex: '#6366f1' },
  { value: 'text-yellow-500', label: 'yellow', hex: '#eab308' },
  { value: 'text-violet-500', label: 'violet', hex: '#8b5cf6' },
  { value: 'text-lime-500', label: 'lime', hex: '#84cc16' },
  { value: 'text-fuchsia-500', label: 'fuchsia', hex: '#d946ef' },
  { value: 'text-green-500', label: 'green', hex: '#22c55e' },
  { value: 'text-pink-500', label: 'pink', hex: '#ec4899' },
  { value: 'text-emerald-500', label: 'emerald', hex: '#10b981' },
  { value: 'text-rose-500', label: 'rose', hex: '#f43f5e' },
  { value: 'text-teal-500', label: 'teal', hex: '#14b8a6' },
  { value: 'text-purple-500', label: 'purple', hex: '#a855f7' },
  { value: 'text-cyan-500', label: 'cyan', hex: '#06b6d4' },
  { value: 'text-stone-500', label: 'stone', hex: '#78716c' },
  { value: 'text-slate-400', label: 'slate', hex: '#94a3b8' },
]

export const PRESET_COLOR_VALUES = PRESET_COLORS.map((p) => p.value)

function labelFromTailwindTextClass(value: string): string {
  if (value === 'text-white') return 'white'
  const m = value.match(/^text-([a-z]+)-\d{3}$/)
  if (m?.[1]) return m[1]
  return value.replace(/^text-/, '')
}

export function ColorSelect({
  value,
  onChange,
  className = '',
  disabledColors = [],
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  disabledColors?: string[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected =
    PRESET_COLORS.find((p) => p.value === value) ??
    (value
      ? { value, label: labelFromTailwindTextClass(value), hex: getCategoryColorHex(value) }
      : PRESET_COLORS[0]!)
  const usedSet = new Set(disabledColors)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-w-[135px] items-center gap-2 ${input.select}`}
      >
        <span className="h-4 w-4 shrink-0 rounded-full border border-gray-600" style={{ backgroundColor: selected.hex }} aria-hidden />
        <span>{selected.label}</span>
        <svg className="ml-auto h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute left-0 top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-gray-700 bg-slate-900 py-1 shadow-lg scrollbar-hide">
          {PRESET_COLORS.map((p) => {
            const disabled = usedSet.has(p.value)
            return (
              <li key={p.value}>
                <button
                  type="button"
                  onClick={() => {
                    if (!disabled) {
                      onChange(p.value)
                      setOpen(false)
                    }
                  }}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${disabled ? 'cursor-default opacity-60' : 'text-white hover:bg-slate-800'}`}
                >
                  <span className="h-4 w-4 shrink-0 rounded-full border border-gray-600" style={{ backgroundColor: p.hex }} aria-hidden />
                  <span>{p.label}</span>
                  {p.value === value && (
                    <svg className="ml-auto h-4 w-4 shrink-0 text-cyan-400" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M7.49991 0.877045C3.84222 0.877045 0.877075 3.84219 0.877075 7.49988C0.877075 11.1575 3.84222 14.1227 7.49991 14.1227C11.1576 14.1227 14.1227 11.1575 14.1227 7.49988C14.1227 3.84219 11.1576 0.877045 7.49991 0.877045ZM1.82708 7.49988C1.82708 4.36686 4.36689 1.82704 7.49991 1.82704C10.6329 1.82704 13.1727 4.36686 13.1727 7.49988C13.1727 10.6329 10.6329 13.1727 7.49991 13.1727C4.36689 13.1727 1.82708 10.6329 1.82708 7.49988ZM10.1589 5.53774C10.3178 5.31191 10.2636 5.00001 10.0378 4.84109C9.81194 4.68217 9.50004 4.73642 9.34112 4.96225L6.51977 8.97154L5.35681 7.78706C5.16334 7.59002 4.84677 7.58711 4.64973 7.78058C4.45268 7.97404 4.44978 8.29061 4.64325 8.48765L6.22658 10.1003C6.33054 10.2062 6.47617 10.2604 6.62407 10.2483C6.77197 10.2363 6.90686 10.1591 6.99226 10.0377L10.1589 5.53774Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function CategoryManager({ categories, initialEditId, onCloseSingleEdit, onAdd, onEdit, onDelete }: CategoryManagerProps) {
  const { formatMoney } = useCurrency()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editBudget, setEditBudget] = useState('')
  const [editColor, setEditColor] = useState('')
  const budgetReplaceOnNextKey = useRef<'new' | 'edit' | null>(null)

  const handleBudgetKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'new' | 'edit',
    setValue: (v: string) => void
  ) => {
    if (budgetReplaceOnNextKey.current !== type) return
    const key = e.key
    if ((key >= '0' && key <= '9') || key === '.') {
      e.preventDefault()
      setValue(key.replace(/[^\d.]/g, ''))
      budgetReplaceOnNextKey.current = null
    }
  }

  useEffect(() => {
    if (initialEditId && categories.some((c) => c.id === initialEditId)) {
      const c = categories.find((x) => x.id === initialEditId)!
      setEditingId(c.id)
      setEditName(c.name)
      setEditBudget(String(c.budget))
      setEditColor(c.color ?? 'text-white')
    }
  }, [initialEditId, categories])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    const budget = parseFloat(newBudget) || 0
    if (!name) return
    onAdd(name, budget)
    setNewName('')
    setNewBudget('')
    setShowForm(false)
  }

  const startEdit = (c: BudgetCategory) => {
    setEditingId(c.id)
    setEditName(c.name)
    setEditBudget(String(c.budget))
    setEditColor(c.color ?? 'text-white')
  }

  const saveEdit = (closeAfter = false) => {
    if (!editingId) return
    onEdit(editingId, {
      name: editName.trim() || undefined,
      budget: parseFloat(editBudget) || 0,
      color: editColor || undefined,
    })
    setEditingId(null)
    if (closeAfter) onCloseSingleEdit?.()
  }

  const singleCategory = initialEditId ? categories.find((c) => c.id === initialEditId) : null

  if (singleCategory && editingId === initialEditId) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-medium text-gray-400">Edit category</p>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-slate-900/60 p-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="min-w-0 flex-1 rounded border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            placeholder="Category name"
          />
          <input
            type="text"
            inputMode="decimal"
            value={editBudget}
            onChange={(e) => setEditBudget(e.target.value.replace(/[^\d.]/g, ''))}
            onFocus={() => { budgetReplaceOnNextKey.current = 'edit' }}
            onKeyDown={(e) => handleBudgetKeyDown(e, 'edit', setEditBudget)}
            className="w-24 rounded border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            placeholder="Budget"
          />
          <ColorSelect
            value={editColor}
            onChange={setEditColor}
            disabledColors={categories.filter((c) => c.id !== editingId).map((c) => c.color ?? 'text-white')}
          />
          <button type="button" onClick={() => saveEdit(true)} className={btn.primary}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Categories</h3>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={btn.outline}
          >
            + Add category
          </button>
        ) : (
          <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="text"
              inputMode="decimal"
              value={newBudget}
              onChange={(e) => setNewBudget(e.target.value.replace(/[^\d.]/g, ''))}
              onFocus={() => { budgetReplaceOnNextKey.current = 'new' }}
              onKeyDown={(e) => handleBudgetKeyDown(e, 'new', setNewBudget)}
              placeholder="Budget"
              className="w-24 rounded-lg border border-gray-700 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
            <button type="submit" className={btn.primary}>
              Save
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewName(''); setNewBudget('') }}
              className={btn.secondary}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-800 bg-slate-900/60 p-2">
            {editingId === c.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-w-0 flex-1 rounded border border-gray-700 bg-slate-900 px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value.replace(/[^\d.]/g, ''))}
                  onFocus={() => { budgetReplaceOnNextKey.current = 'edit' }}
                  onKeyDown={(e) => handleBudgetKeyDown(e, 'edit', setEditBudget)}
                  className="w-20 rounded border border-gray-700 bg-slate-900 px-2 py-1 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <ColorSelect
                  value={editColor}
                  onChange={setEditColor}
                  className="min-w-0"
                  disabledColors={categories.filter((other) => other.id !== c.id).map((other) => other.color ?? 'text-white')}
                />
                <button type="button" onClick={() => saveEdit()} className="rounded px-2 py-1 text-sm text-cyan-400 hover:bg-cyan-500/20">Done</button>
              </>
            ) : (
              <>
                <span className={c.color ?? 'text-white'}>{c.name}</span>
                <span className="text-sm text-gray-400">{formatMoney(c.budget)}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className={btn.iconEdit}
                    aria-label={`Edit ${c.name}`}
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c.id)}
                    className="rounded p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400"
                    aria-label={`Delete ${c.name}`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
