import { useMemo, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useGoals } from '../contexts/GoalsContext'
import { useMissions, GOAL_FILTER_PREFIX, type Mission, type Recurrence } from '../contexts/MissionsContext'
import { StakeSetupModal, StakeBadge, type StakeInfo } from '../components/StakeSetupModal'
import { RippleButton } from '../components/ui/ripple-button'
import { NeonCheckbox } from '../components/ui/animated-check-box'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { RefreshCcw } from 'lucide-react'
import { btn, dragHandle, modal, pageContainer, sortableTransition } from '../styles/designSystem'
/** שם התיקייה בסרגל — לא קטגוריה לבחירה, רק כותרת לתיקייה. */
const CATEGORIES_FOLDER_NAME = 'Categories'
/** תיקיית "Goals" בסרגל — כותרת בלבד, כמו General. */
const GOALS_FOLDER_NAME = 'Goals'
/** IDs for sortable folder sections in the sidebar (General vs Goals). */
const FOLDER_ID_GENERAL = 'folder-general'
const FOLDER_ID_GOALS = 'folder-goals'
type SidebarFolderId = typeof FOLDER_ID_GENERAL | typeof FOLDER_ID_GOALS
/** מסנן מיוחד בסרגל — מציג רק משימות שהושלמו; לא קטגוריה אמיתית ולא מופיע בבורר קטגוריה בטופס. */
const COMPLETED_MISSIONS_FILTER = 'Completed'
/** מסנן — משימות שחויבו (לא בוצעו, stake status = charged). */
const UNCOMPLETED_MISSIONS_FILTER = 'Uncompleted'
/** אייקון ידית גרירה: שתי עמודות של שלוש נקודות (2x3). */
function DragHandleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="8" cy="4" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="8" cy="12" r="1.5" />
    </svg>
  )
}

/** אייקון תיקייה — סגור כשהתיקייה מקופלת, פתוח כשמוצגת. */
function FolderIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {open ? (
        <>
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h2l2 4h10a2 2 0 012 2z" />
          <path d="M2 11v8a2 2 0 002 2h16a2 2 0 002-2v-8H2z" />
        </>
      ) : (
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h2l2 4h10a2 2 0 012 2v2H2z" />
      )}
    </svg>
  )
}

/** Category item in sidebar — reorder via drag handle. */
function SortableCategoryItem({
  id,
  isSelected,
  onSelect,
  onDelete,
  isLast,
}: {
  id: string
  isSelected: boolean
  onSelect: () => void
  onDelete?: (id: string) => void
  isLast?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? sortableTransition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 py-1 transition-[transform,opacity] duration-200 ease-out ${!isLast ? 'border-b border-gray-700' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <span {...listeners} {...attributes} className={dragHandle} aria-label="Drag to reorder">
        <DragHandleIcon className="h-3.5 w-3" />
      </span>
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm font-medium transition ${
          isSelected ? 'bg-cyan-500/15 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {id}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(id)
          }}
          className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:opacity-100 focus:ring-2 focus:ring-red-400/50"
          aria-label="Delete category"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      )}
    </div>
  )
}

/** Goal item in sidebar — reorder via drag handle. */
function SortableGoalItem({
  goal,
  isSelected,
  onSelect,
  onDelete,
  isLast,
}: {
  goal: { id: string; title: string }
  isSelected: boolean
  onSelect: () => void
  onDelete: (id: string) => void
  isLast?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? sortableTransition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 py-1 transition-[transform,opacity] duration-200 ease-out ${!isLast ? 'border-b border-gray-700' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <span {...listeners} {...attributes} className={dragHandle} aria-label="Drag to reorder">
        <DragHandleIcon className="h-3.5 w-3" />
      </span>
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm font-medium transition ${
          isSelected ? 'bg-cyan-500/15 text-cyan-400' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {goal.title}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(goal.id)
        }}
        className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:opacity-100 focus:ring-2 focus:ring-red-400/50"
        aria-label="Delete goal"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  )
}

/** Sidebar folder (General / Goals) — reorder via drag handle. */
function SortableFolderSection({
  id,
  title,
  isExpanded,
  onToggle,
  children,
}: {
  id: SidebarFolderId
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = isDragging
    ? { visibility: 'hidden' }
    : { transform: CSS.Transform.toString(transform), transition: transition ?? sortableTransition }
  return (
    <div ref={setNodeRef} style={style}>
      <div className="border-b border-gray-800/40">
        <div className="flex items-center gap-1">
          <span {...listeners} {...attributes} className={dragHandle} aria-label="Drag to reorder folder">
            <DragHandleIcon className="h-3.5 w-3" />
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-gray-400 transition hover:bg-slate-800 hover:text-white"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Collapse ${title} folder` : `Expand ${title} folder`}
          >
            <FolderIcon open={isExpanded} className="h-4 w-4 shrink-0 text-amber-500/90" />
            <span className="min-w-0 flex-1">{title}</span>
            <svg
              className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

/** Mission card — reorder / move between categories via drag handle. */
function SortableMissionCard({
  mission,
  onToggle,
  onDelete,
  onEdit,
  getGoalById,
  stake,
  onAddStake,
  onStakeSuccess,
  onStakeFailure,
  onMoveToCompleted,
  disableDrag,
  isCompletedView,
  hasActiveSibling,
}: {
  mission: Mission
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (mission: Mission) => void
  getGoalById?: (id: string) => { title: string } | undefined
  stake?: StakeInfo | null
  onAddStake?: () => void
  onStakeSuccess?: () => void
  onStakeFailure?: () => void
  onMoveToCompleted?: (id: string) => void
  disableDrag?: boolean
  isCompletedView?: boolean
  /** When true, another mission with same title+category is still active (not completed); show title normal instead of grey strikethrough. */
  hasActiveSibling?: boolean
}) {
  const [cardHovered, setCardHovered] = useState(false)
  const effectiveCompleted =
    mission.recurrence !== 'none' && (mission.targetCount ?? 0) > 1
      ? (mission.progressCount ?? 0) >= (mission.targetCount ?? 0)
      : mission.isCompleted
  const showTitleAsNormal = effectiveCompleted && hasActiveSibling
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: mission.id,
    data: { type: 'mission', mission },
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? sortableTransition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      className={`flex items-start justify-between rounded-xl border border-gray-800 bg-slate-900/70 px-4 py-3 text-white transition-[transform,opacity] duration-200 ease-out ${isDragging ? 'opacity-40' : ''}`}
    >
      {!disableDrag && (
        <span {...listeners} {...attributes} className={dragHandle} aria-label="Drag to reorder">
          <DragHandleIcon className="h-3.5 w-3" />
        </span>
      )}
      <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
        {/* Row 1: checkbox + title (title always in line with checkbox). In Completed view, repeated missions show refresh icon. */}
        {isCompletedView && mission.recurrence !== 'none' && effectiveCompleted ? (
          <RefreshCcw className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
        ) : mission.targetCount && mission.targetCount > 1 ? (
          effectiveCompleted ? (
            <NeonCheckbox
              checked={true}
              onChange={() => onToggle(mission.id)}
              aria-label="Completed"
              className="shrink-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => onToggle(mission.id)}
              className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded border border-[#00ffaa] bg-black/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              aria-label={`Progress ${mission.progressCount ?? 0} of ${mission.targetCount}`}
              aria-pressed={false}
            >
              <span
                className="absolute bottom-0 left-0 right-0 bg-[#00ffaa] transition-[height] duration-150"
                style={{
                  height: `${((mission.progressCount ?? 0) / mission.targetCount) * 100}%`,
                }}
              />
              {(mission.progressCount ?? 0) > 0 && (
                <svg
                  className="relative z-10 h-3 w-3 mission-progress-check"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        ) : mission.repeatLocked ? (
          <RefreshCcw className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
        ) : (
          <NeonCheckbox
            checked={mission.isCompleted}
            onChange={() => onToggle(mission.id)}
            aria-label={mission.isCompleted ? 'Completed' : 'Mark complete'}
            className="shrink-0"
          />
        )}
        <p className={`min-w-0 text-base font-medium leading-tight ${(showTitleAsNormal || !effectiveCompleted) ? 'text-white' : 'text-gray-400 line-through'}`}>
          {mission.title}
        </p>
        {/* Row 2: spacer under checkbox + meta line (moved down, aligned with title) */}
        <div className="shrink-0" aria-hidden />
        <p className="min-w-0 text-xs text-gray-400">
            <span>
              {mission.recurrence !== 'none' && (
                (() => {
                  const value = mission.repeatValue && mission.repeatValue > 0 ? mission.repeatValue : 1
                  const unit = mission.repeatUnit ?? (mission.recurrence === 'daily' ? 'days' : mission.recurrence === 'weekly' ? 'weeks' : 'days')
                  const unitLabel = value === 1 ? unit.slice(0, -1) : unit
                  const repeatLabel = value === 1 && (unit === 'days' || unit === 'weeks' || unit === 'months')
                    ? (unit === 'days' ? 'daily' : unit === 'weeks' ? 'weekly' : 'monthly')
                    : `every ${value} ${unitLabel}`
                  return (
                    <>
                      <RefreshCcw className="inline-block h-3.5 w-3.5 shrink-0 align-middle text-cyan-300" aria-hidden />
                      {' '}{repeatLabel}
                      {!effectiveCompleted && (mission.missedRepeats ?? 0) > 0 && (
                        <>
                          <span className="mx-1.5 text-gray-500">·</span>
                          <span className="text-amber-400">
                            uncompleted {mission.missedRepeats} {mission.missedRepeats === 1 ? 'time' : 'times'}
                          </span>
                        </>
                      )}
                    </>
                  )
                })()
              )}
              {mission.duration && mission.duration !== '0h 0m' && (
                <>{mission.recurrence !== 'none' ? ' • ' : ''}Duration: {mission.duration}</>
              )}
            </span>
            {mission.targetCount && mission.targetCount > 1 && (
              <>
                <span className="mx-2 text-gray-600">•</span>
                <span
                  className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
                    effectiveCompleted
                      ? 'border-emerald-500/70 bg-emerald-500/25 text-emerald-400 shadow-sm shadow-emerald-500/20'
                      : 'border-gray-600 bg-gray-800/80 text-gray-300'
                  }`}
                >
                  {mission.progressCount ?? 0}/{mission.targetCount}
                </span>
              </>
            )}
            {effectiveCompleted && mission.completedAt && (
              <>
                <span className="mx-2 text-gray-600">•</span>
                <span>
                  Completed:{' '}
                  {new Date(mission.completedAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {mission.repeatLocked && mission.repeatCompletedCount != null && mission.repeatCompletedCount >= 1 && (
                    <>
                      <span className="mx-2 text-gray-600">•</span>
                      <span className="text-emerald-400">
                        completed {mission.repeatCompletedCount} {mission.repeatCompletedCount === 1 ? 'time' : 'times'}
                      </span>
                    </>
                  )}
                </span>
              </>
            )}
          </p>
      </div>
      <div className="flex shrink-0 items-center self-center gap-4">
        {effectiveCompleted && onMoveToCompleted && (
          <button
            type="button"
            onClick={() => onMoveToCompleted(mission.id)}
            className="rounded-full border border-gray-700 px-3 py-1 text-xs uppercase tracking-wider text-emerald-400 transition-colors hover:border-emerald-500/50"
            aria-label="Move to completed"
          >
            {cardHovered ? 'Move to completed' : 'COMPLETED'}
          </button>
        )}
        {!effectiveCompleted && stake != null && stake.status !== 'cancelled' && stake.status !== 'pending_card' && (
          <StakeBadge
            stake={stake}
            onReportSuccess={onStakeSuccess ?? (() => {})}
            onReportFailure={onStakeFailure ?? (() => {})}
          />
        )}
        {!effectiveCompleted && (stake == null || stake.status === 'cancelled' || stake.status === 'pending_card') && (
          <button
            type="button"
            onClick={onAddStake}
            className="rounded-lg border border-dashed border-amber-500/60 px-2.5 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/10 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            aria-label="Add stake"
          >
            💰 Stake
          </button>
        )}
        {!effectiveCompleted && (
          <button
            type="button"
            onClick={() => onEdit(mission)}
            className={btn.iconEdit}
            aria-label="Edit mission"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(mission.id)}
          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50"
          aria-label="Delete mission"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/** Drop zone for a category — missions dropped here get that category. */
function DroppableSection({
  category,
  children,
  className,
  showDropIndicator = true,
}: {
  category: string
  children: ReactNode
  className?: string
  showDropIndicator?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: category })
  const showIndicator = showDropIndicator && isOver
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors duration-150 ${showIndicator ? 'ring-2 ring-inset ring-cyan-500/50 bg-cyan-500/5' : ''} ${className ?? ''}`}
      data-droppable-category={category}
    >
      {children}
      {showIndicator && (
        <div className="mt-2 h-1 rounded-full bg-cyan-500/40" aria-hidden title="Drop zone" />
      )}
    </div>
  )
}

/**
 * Combobox היברידי: שדה קלט + רשימה נפתחת.
 * - בפיוקוס/קליק על השדה — הרשימה נפתחת מיד (אפשרויות מהירות).
 * - במקביל אפשר להקליד מספר ידנית בשדה.
 * - Enter שומר את הערך וסוגר את הרשימה.
 * - קליק מחוץ לשדה סוגר את הרשימה.
 */
function DurationCombobox({
  value,
  onChange,
  options,
  min,
  max,
  label,
  ariaLabel,
}: {
  value: number
  onChange: (n: number) => void
  options: number[]
  min: number
  max: number
  label: string
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        onFocus={(e) => {
          setOpen(true)
          ;(e.target as HTMLInputElement).select()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onChange(Math.min(max, Math.max(min, Number((e.target as HTMLInputElement).value) || 0)))
            setOpen(false)
          }
        }}
        className="w-14 rounded-lg border border-gray-600 bg-slate-900 px-2 py-1 text-center text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        placeholder="0"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <ul
          className="absolute left-0 top-full z-10 mt-1 max-h-40 w-14 overflow-auto rounded-lg border border-gray-600 bg-slate-900 py-1 shadow-lg"
          role="listbox"
        >
          {options.map((opt) => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className="cursor-pointer px-2 py-1 text-center text-white hover:bg-slate-700"
            >
              {String(opt).padStart(2, '0')}{label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * MyMissions = מסך לניהול משימות אישיות/חוזרות.
 *
 * הלוגיקה המרכזית פה:
 * - מוסיפים Mission חדש דרך שדות הקלט למעלה
 * - מסמנים כ"בוצע": אם יש targetCount, כל קליק מעלה את progressCount עד שמגיעים ליעד
 * - מוחקים Mission
 *
 * שים לב: הכל נשמר רק בזיכרון של הדף (state), אין שמירה קבועה.
 */
export default function MyMissions() {
  const { missions, setMissions, categoriesOrder, setCategoriesOrder } = useMissions()
  const { goals: goalsList, setGoals: setGoalsList, getGoalById, deleteGoal: deleteGoalFromContext } = useGoals()
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [categoryError, setCategoryError] = useState(false)
  const [titleError, setTitleError] = useState(false)
  const [newRecurrence, setNewRecurrence] = useState<Recurrence>('none')
  const [showCustomRecurrenceModal, setShowCustomRecurrenceModal] = useState(false)
  const [customRepeatValue, setCustomRepeatValue] = useState('')
  const [customRepeatUnit, setCustomRepeatUnit] = useState<'minutes' | 'hours' | 'days' | 'weeks' | 'months'>('days')
  const [recurrenceError, setRecurrenceError] = useState(false)
  const [recurrenceTouched, setRecurrenceTouched] = useState(false)
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(30)
  const [newTargetCount, setNewTargetCount] = useState(1)
  const [useDuration, setUseDuration] = useState(false)
  const [useTargetCount, setUseTargetCount] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All')
  const customRepeatInputRef = useRef<HTMLInputElement>(null)
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  // תיקיית "General" — להצגה/הסתרה של הקטגוריות שבתוכה (Work, Personal וכו').
  const [generalFolderExpanded, setGeneralFolderExpanded] = useState(true)
  // תיקיית "Goals" — להצגה/הסתרה.
  const [goalsFolderExpanded, setGoalsFolderExpanded] = useState(true)
  /** Sidebar folder order (General vs Goals); mission list displays in this order. */
  const [folderOrder, setFolderOrder] = useState<SidebarFolderId[]>([FOLDER_ID_GENERAL, FOLDER_ID_GOALS])
  // הוספת קטגוריה חדשה: לחיצה על "+" מציגה שדה בתחתית הרשימה; Enter מוסיף את השם ל-categoriesOrder (ומופיע גם בבורר קטגוריה בטופס משימה).
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddMissionForm, setShowAddMissionForm] = useState(false)
  /** Mission being edited — form is pre-filled; submit updates this mission. */
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null)
  const [missionIdToDelete, setMissionIdToDelete] = useState<string | null>(null)
  const [targetCountError, setTargetCountError] = useState(false)
  const targetCountInputRef = useRef<HTMLInputElement>(null)
  const newCategoryInputRef = useRef<HTMLInputElement>(null)
  // מסננים בתצוגת "Completed missions": קטגוריה + טווח תאריכים (אחרון יום/שבוע/חודש או לוח שנה).
  const [completedCategoryFilter, setCompletedCategoryFilter] = useState<string>('All')
  const [completedDateFilter, setCompletedDateFilter] = useState<'all' | 'last_day' | 'last_week' | 'last_month' | 'custom'>('all')
  const [completedDateFrom, setCompletedDateFrom] = useState('')
  const [completedDateTo, setCompletedDateTo] = useState('')
  const [completedRecurrenceFilter, setCompletedRecurrenceFilter] = useState<'all' | Recurrence>('all')
  const completedDateFromRef = useRef<HTMLInputElement>(null)
  const completedDateToRef = useRef<HTMLInputElement>(null)
  const [stakeModalForId, setStakeModalForId] = useState<string | null>(null)
  const [stakes, setStakes] = useState<Record<string, StakeInfo>>({})
  const [chargeSuccessMessage, setChargeSuccessMessage] = useState<string | null>(null)
  /** IDs of missions unchecked while on Completed view — keep them in the list until user leaves or refreshes. */
  const [uncheckedIdsStillShownInCompleted, setUncheckedIdsStillShownInCompleted] = useState<string[]>([])
  /** IDs of completed missions that user clicked "Move to completed" — they disappear from category and only show in Completed. */
  const [movedToCompletedIds, setMovedToCompletedIds] = useState<Set<string>>(() => new Set())
  const { user, session } = useAuth()

  useEffect(() => {
    if (showCustomRecurrenceModal) {
      setCustomRepeatValue('')
      const t = setTimeout(() => {
        customRepeatInputRef.current?.focus()
      }, 0)
      return () => clearTimeout(t)
    }
  }, [showCustomRecurrenceModal])

  // Clear "still show in Completed" when leaving the Completed view or refreshing (state resets on refresh).
  useEffect(() => {
    if (selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER) setUncheckedIdsStillShownInCompleted([])
  }, [selectedCategoryFilter])

  const closeAddMissionFormAndReset = useCallback(() => {
    setShowAddMissionForm(false)
    setEditingMissionId(null)
    setNewTitle('')
    setNewCategory('')
    setCategoryError(false)
    setTitleError(false)
    setNewRecurrence('none')
    setRecurrenceError(false)
    setRecurrenceTouched(false)
    setHours(0)
    setMinutes(30)
    setNewTargetCount(1)
    setUseDuration(false)
    setUseTargetCount(false)
    setTargetCountError(false)
  }, [])

  const selectCategory = useCallback(
    (filter: string) => {
      if (showAddMissionForm) closeAddMissionFormAndReset()
      setSelectedCategoryFilter(filter)
    },
    [showAddMissionForm, closeAddMissionFormAndReset],
  )

  useEffect(() => {
    if (!showAddMissionForm) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAddMissionFormAndReset()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showAddMissionForm, closeAddMissionFormAndReset])

  useEffect(() => {
    if (isAddingCategory) {
      setNewCategoryName('')
      newCategoryInputRef.current?.focus()
    }
  }, [isAddingCategory])

  // כשבוחרים "Calendar (date to date)" — פותחים את לוח השנה של "From"; אחרי בחירת From — פותחים את "To" (עם min=From).
  useEffect(() => {
    if (completedDateFilter !== 'custom') return
    const t = setTimeout(() => completedDateFromRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [completedDateFilter])

  useEffect(() => {
    if (!activeMissionId) return
    const prev = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    return () => { document.body.style.userSelect = prev }
  }, [activeMissionId])

  // One-time cleanup: collapse old duplicate locked repeat missions into a single card with a counter.
  useEffect(() => {
    setMissions((prev) => {
      const groups = new Map<string, Mission[]>()
      for (const m of prev) {
        if (!m.repeatLocked) continue
        const key = `${m.title}::${m.category}::${m.recurrence}`
        const list = groups.get(key) ?? []
        list.push(m)
        groups.set(key, list)
      }
      let changed = false
      const idsToRemove = new Set<string>()
      const replacements = new Map<string, Mission>()

      for (const [, list] of groups) {
        if (list.length <= 1) continue
        // Keep the earliest created as the primary; others are merged into it
        const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        const primary = sorted[0]
        const extras = sorted.slice(1)
        const extraCount = extras.length
        if (extraCount > 0) {
          changed = true
          extras.forEach((m) => idsToRemove.add(m.id))
          const updatedPrimary: Mission = {
            ...primary,
            repeatCompletedCount: (primary.repeatCompletedCount ?? 1) + extraCount,
          }
          replacements.set(primary.id, updatedPrimary)
        }
      }

      if (!changed) return prev
      return prev
        .filter((m) => !idsToRemove.has(m.id))
        .map((m) => (replacements.has(m.id) ? replacements.get(m.id)! : m))
    })
  }, [setMissions])

  // Repeat engine: check repeated missions periodically and apply behavior
  useEffect(() => {
    const getIntervalMs = (m: Mission): number | null => {
      if (m.recurrence === 'none') return null
      const value = m.repeatValue && m.repeatValue > 0 ? m.repeatValue : 1
      const unit = m.repeatUnit ?? (m.recurrence === 'daily' ? 'days' : m.recurrence === 'weekly' ? 'weeks' : 'days')
      const base = value * 60 * 1000 // minutes
      if (unit === 'minutes') return base
      if (unit === 'hours') return base * 60
      if (unit === 'days') return base * 60 * 24
      if (unit === 'weeks') return base * 60 * 24 * 7
      if (unit === 'months') return base * 60 * 24 * 30
      return null
    }

    const runRepeatEngine = () => {
      setMissions((prev) => {
        const now = Date.now()
        const updated: Mission[] = []
        const repeatKey = (t: string, c: string) => `${t}\0${c}`
        const hasExistingLocked = (title: string, category: string) =>
          prev.some((x) => x.repeatLocked && x.title === title && x.category === category)
        const lockedKeyAddedThisRun = new Set<string>()
        const mergedCountByKey = new Map<string, number>()

        for (const m of prev) {
          if (m.recurrence === 'none') {
            updated.push(m)
            continue
          }
          const intervalMs = getIntervalMs(m)
          if (!intervalMs) {
            updated.push(m)
            continue
          }
          const lastTs = m.repeatLastEvaluatedAt ? new Date(m.repeatLastEvaluatedAt).getTime() : new Date(m.createdAt).getTime()
          if (now - lastTs < intervalMs) {
            updated.push(m)
            continue
          }
          const intervalsPassed = Math.floor((now - lastTs) / intervalMs)
          const nextEval = new Date(lastTs + intervalsPassed * intervalMs).toISOString()
          const key = repeatKey(m.title, m.category)

          if (m.isCompleted && !m.repeatLocked) {
            const alreadyHasLocked = hasExistingLocked(m.title, m.category) || lockedKeyAddedThisRun.has(key)
            const newMission: Mission = {
              ...m,
              id: uuidv4(),
              isCompleted: false,
              completedAt: undefined,
              createdAt: new Date().toISOString(),
              missedRepeats: 0,
              repeatLocked: false,
              repeatLastEvaluatedAt: new Date().toISOString(),
              progressCount: (m.targetCount != null && m.targetCount > 0) ? 0 : m.progressCount,
            }
            if (alreadyHasLocked) {
              mergedCountByKey.set(key, (mergedCountByKey.get(key) ?? 0) + 1)
              updated.push(newMission)
            } else {
              lockedKeyAddedThisRun.add(key)
              const locked: Mission = {
                ...m,
                repeatLocked: true,
                repeatLastEvaluatedAt: nextEval,
                repeatCompletedCount: (m.repeatCompletedCount ?? 0) + 1,
              }
              updated.push(locked, newMission)
            }
          } else if (!m.isCompleted) {
            const missed = (m.missedRepeats ?? 0) + intervalsPassed
            updated.push({
              ...m,
              missedRepeats: missed,
              repeatLastEvaluatedAt: nextEval,
              progressCount: (m.targetCount != null && m.targetCount > 0) ? 0 : (m.progressCount ?? 0),
            })
          } else {
            const extra = mergedCountByKey.get(key) ?? 0
            updated.push({
              ...m,
              repeatLastEvaluatedAt: nextEval,
              repeatCompletedCount: (m.repeatCompletedCount ?? 0) + extra,
            })
          }
        }
        return updated
      })
    }

    runRepeatEngine()
    const catchUpAfterLoad = setTimeout(runRepeatEngine, 1500)
    const timer = setInterval(runRepeatEngine, 15000)

    return () => {
      clearInterval(timer)
      clearTimeout(catchUpAfterLoad)
    }
  }, [setMissions])
  useEffect(() => {
    if (completedDateFilter !== 'custom' || !completedDateFrom) return
    const t = setTimeout(() => completedDateToRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [completedDateFilter, completedDateFrom])

  // טעינת stakes מהטבלה stakes ב-Supabase (item_type = mission, user_id = current user)
  useEffect(() => {
    const client = supabase
    if (!user?.id || !client) return
    const load = async () => {
      const { data: rows, error } = await client
        .from('stakes')
        .select('id, amount, currency, due_date, failure_mode, status, item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'mission')
      if (error) return
      const map: Record<string, StakeInfo> = {}
      for (const row of rows ?? []) {
        const itemId = row.item_id as string
        map[itemId] = {
          stakeId: row.id as string,
          amount: Number(row.amount),
          currency: (row.currency as string) ?? 'usd',
          dueDate: row.due_date ? new Date(row.due_date as string).toISOString().slice(0, 10) : '',
          failureMode: (row.failure_mode as StakeInfo['failureMode']) ?? 'both',
          status: (row.status as StakeInfo['status']) ?? 'pending_card',
        }
      }
      setStakes(map)
    }
    load()
  }, [user?.id])

  // סדר קטגוריות לתצוגה/מיון — נקבע לפי סדר התיקיות בסרגל (General vs Goals).
  const categoryOrderForData = useMemo(() => {
    const generalBlock = [CATEGORIES_FOLDER_NAME, ...categoriesOrder]
    const goalsBlock = goalsList.map((g) => `goal:${g.id}`)
    return folderOrder[0] === FOLDER_ID_GOALS
      ? [...goalsBlock, ...generalBlock]
      : [...generalBlock, ...goalsBlock]
  }, [categoriesOrder, goalsList, folderOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )
  const missionModifiers = [restrictToVerticalAxis]
  const categoryModifiers = [restrictToVerticalAxis, restrictToParentElement]
  const missionCollisionDetection: CollisionDetection = useCallback(
    (args) => {
      const result = closestCenter(args)
      const withoutActive = result.filter((c) => c.id !== args.active?.id)
      if (withoutActive.length === 0) return []
      const categorySet = new Set(categoryOrderForData)
      const missionCollisions = withoutActive.filter((c) => !categorySet.has(String(c.id)))
      if (missionCollisions.length > 0) return missionCollisions
      return withoutActive
    },
    [categoryOrderForData],
  )

  // מיון: קודם לא הושלמו ואז הושלמו; בתוך כל קטגוריה לפי orderInCategory.
  // למשימות שהושלמו ויש להן orderInCategoryBeforeComplete (שדה קליינט בלבד),
  // נשתמש בערך ה"ישן" לצורך סדר ויזואלי — כך שהן נשארות במקומן עד ריענון/חזרה לעמוד.
  const sortedMissions = useMemo(() => {
    const byCategory = new Map<string, Mission[]>()
    for (const m of missions) {
      const list = byCategory.get(m.category) ?? []
      list.push(m)
      byCategory.set(m.category, list)
    }
    const result: Mission[] = []
    for (const cat of categoryOrderForData) {
      const list = byCategory.get(cat) ?? []
      const sorted = [...list].sort((a, b) => {
        const oa =
          a.isCompleted && a.orderInCategoryBeforeComplete != null
            ? a.orderInCategoryBeforeComplete
            : a.orderInCategory ?? 0
        const ob =
          b.isCompleted && b.orderInCategoryBeforeComplete != null
            ? b.orderInCategoryBeforeComplete
            : b.orderInCategory ?? 0
        if (oa !== ob) return oa - ob
        return a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1
      })
      result.push(...sorted)
    }
    return result
  }, [missions, categoryOrderForData])

  /** Hide the mission being edited from the list (it is shown in the form). */
  const missionsForDisplay = useMemo(
    () => (editingMissionId ? sortedMissions.filter((m) => m.id !== editingMissionId) : sortedMissions),
    [sortedMissions, editingMissionId],
  )

  // 24 hours in ms — completed missions stay visible in their category for this long, then only in Completed.
  const COMPLETED_VISIBLE_MS = 24 * 60 * 60 * 1000

  /** For repeated missions with a counter, completion = counter full; otherwise use isCompleted. */
  const getEffectiveCompleted = useCallback((m: Mission) => {
    return m.recurrence !== 'none' && (m.targetCount ?? 0) > 1
      ? (m.progressCount ?? 0) >= (m.targetCount ?? 0)
      : m.isCompleted
  }, [])

  // משימות שהושלמו ומופיעות ב־Completed: רק אם נלחץ "Move to completed" או עברו 24 שעות מההשלמה (בכל רגע משימה מופיעה במקום אחד בלבד). Locked repeated missions always show in Completed.
  const completedMissionsEligibleForView = useMemo(() => {
    const now = Date.now()
    return missionsForDisplay.filter((m) => {
      if (!getEffectiveCompleted(m)) return false
      if (m.repeatLocked) return true
      if (movedToCompletedIds.has(m.id)) return true
      if (!m.completedAt) return false
      return now - new Date(m.completedAt).getTime() >= COMPLETED_VISIBLE_MS
    })
  }, [missionsForDisplay, movedToCompletedIds, getEffectiveCompleted])

  // משימות שהושלמו — לאחר סינון קטגוריה, תאריך וחזרה (רק כשנמצאים ב־"Completed missions").
  const completedMissionsFiltered = useMemo(() => {
    const completed = completedMissionsEligibleForView
    const byCategory =
      completedCategoryFilter === 'All'
        ? completed
        : completed.filter((m) => m.category === completedCategoryFilter)
    const byRecurrence = byCategory
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const filterByDate = (m: Mission) => {
      const at = new Date(m.createdAt).getTime()
      if (completedDateFilter === 'all') return true
      if (completedDateFilter === 'last_day') return at >= now - oneDay
      if (completedDateFilter === 'last_week') return at >= now - 7 * oneDay
      if (completedDateFilter === 'last_month') return at >= now - 30 * oneDay
      if (completedDateFilter === 'custom') {
        if (!completedDateFrom || !completedDateTo) return false
        const from = new Date(completedDateFrom).setHours(0, 0, 0, 0)
        const to = new Date(completedDateTo).setHours(23, 59, 59, 999)
        return at >= from && at <= to
      }
      return true
    }
    return byRecurrence.filter(filterByDate)
  }, [
    completedMissionsEligibleForView,
    completedCategoryFilter,
    completedRecurrenceFilter,
    completedDateFilter,
    completedDateFrom,
    completedDateTo,
  ])

  // קיבוץ משימות שהושלמו לפי קטגוריה — רק כשמסנן הקטגוריה הוא "All".
  const completedMissionsGroupedByCategory = useMemo(() => {
    if (completedCategoryFilter !== 'All') return null
    const byCategory = new Map<string, Mission[]>()
    for (const m of completedMissionsFiltered) {
      const list = byCategory.get(m.category) ?? []
      list.push(m)
      byCategory.set(m.category, list)
    }
    return categoryOrderForData
      .filter((cat) => (byCategory.get(cat)?.length ?? 0) > 0)
      .map((cat) => ({ category: cat, missions: byCategory.get(cat)! }))
  }, [completedMissionsFiltered, completedCategoryFilter, categoryOrderForData])

  // Completed view with "All" categories: include unchecked missions so they stay visible until user leaves.
  const completedDisplayGroupedByCategory = useMemo(() => {
    if (selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER || completedCategoryFilter !== 'All') return null
    const completedIds = new Set(completedMissionsFiltered.map((m) => m.id))
    const uncheckedStillShown = missionsForDisplay.filter(
      (m) => uncheckedIdsStillShownInCompleted.includes(m.id) && !completedIds.has(m.id)
    )
    const list = [...completedMissionsFiltered, ...uncheckedStillShown]
    const byCategory = new Map<string, Mission[]>()
    for (const m of list) {
      const arr = byCategory.get(m.category) ?? []
      arr.push(m)
      byCategory.set(m.category, arr)
    }
    return categoryOrderForData
      .filter((cat) => (byCategory.get(cat)?.length ?? 0) > 0)
      .map((cat) => ({ category: cat, missions: byCategory.get(cat)! }))
  }, [selectedCategoryFilter, completedCategoryFilter, completedMissionsFiltered, missionsForDisplay, uncheckedIdsStillShownInCompleted, categoryOrderForData])

  // משימות שחויבו (stake status = charged) — מוצגות רק ב־"Uncompleted missions".
  const uncompletedMissions = useMemo(
    () => missionsForDisplay.filter((m) => stakes[m.id]?.status === 'charged'),
    [missionsForDisplay, stakes]
  )

  // משימות "פעילות" בקטגוריות: לא הושלמו ולא חויבו — כך שהקטגוריה המקורית לא תציג משימות שעברו ל־Completed/Uncompleted.
  const activeMissionsInCategories = useMemo(
    () => missionsForDisplay.filter((m) => !getEffectiveCompleted(m) && stakes[m.id]?.status !== 'charged'),
    [missionsForDisplay, stakes, getEffectiveCompleted]
  )

  // משימות שמוצגות ברשימת הקטגוריות: פעילות + הושלמו בתוך 24 שעות (באותה קטגוריה, בתחתית). חויבו לא נכללים. Locked repeated (⟳) never show here — only in Completed.
  const missionsVisibleInCategories = useMemo(() => {
    const now = Date.now()
    return missionsForDisplay.filter((m) => {
      if (m.repeatLocked) return false
      if (stakes[m.id]?.status === 'charged') return false
      if (!getEffectiveCompleted(m)) return true
      if (movedToCompletedIds.has(m.id)) return false
      if (!m.completedAt) return false
      return now - new Date(m.completedAt).getTime() < COMPLETED_VISIBLE_MS
    })
  }, [missionsForDisplay, stakes, movedToCompletedIds, getEffectiveCompleted])

  // רשימה לסינון: All / קטגוריה / goal:id = משימות גלויות (פעילות + הושלמו ב־24h, ממוינות עם הושלמו בתחתית); "Completed" = רק הושלמו (+ unchecked עד יציאה מהמסך); "Uncompleted" = חויבו.
  const displayedMissions = useMemo(() => {
    if (selectedCategoryFilter === COMPLETED_MISSIONS_FILTER) {
      const completedIds = new Set(completedMissionsFiltered.map((m) => m.id))
      const uncheckedStillShown = missionsForDisplay.filter(
        (m) => uncheckedIdsStillShownInCompleted.includes(m.id) && !completedIds.has(m.id)
      )
      return [...completedMissionsFiltered, ...uncheckedStillShown]
    }
    if (selectedCategoryFilter === UNCOMPLETED_MISSIONS_FILTER) return uncompletedMissions
    if (selectedCategoryFilter === 'All') return missionsVisibleInCategories
    if (selectedCategoryFilter.startsWith(GOAL_FILTER_PREFIX)) {
      const goalId = selectedCategoryFilter.slice(GOAL_FILTER_PREFIX.length)
      return missionsVisibleInCategories.filter((m) => m.goalId === goalId)
    }
    return missionsVisibleInCategories.filter((m) => m.category === selectedCategoryFilter)
  }, [selectedCategoryFilter, completedMissionsFiltered, uncompletedMissions, missionsVisibleInCategories, missionsForDisplay, uncheckedIdsStillShownInCompleted])

  // כשמציגים "All": קיבוץ משימות גלויות לפי קטגוריה (פעילות + הושלמו ב־24h; הושלמו בתחתית).
  const missionsGroupedByCategory = useMemo(() => {
    if (selectedCategoryFilter !== 'All') return null
    const visible = missionsVisibleInCategories
    const byCategory = new Map<string, Mission[]>()
    for (const m of visible) {
      const list = byCategory.get(m.category) ?? []
      list.push(m)
      byCategory.set(m.category, list)
    }
    return categoryOrderForData
      .filter((cat) => (byCategory.get(cat)?.length ?? 0) > 0)
      .map((cat) => ({ category: cat, missions: byCategory.get(cat)! }))
  }, [missionsVisibleInCategories, selectedCategoryFilter, categoryOrderForData])

  const handleAdd = () => {
    if (!newTitle.trim()) {
      setTitleError(true)
      return
    }
    setTitleError(false)
    if (useTargetCount) {
      const num = Number(newTargetCount)
      if (!Number.isFinite(num) || num < 1) {
        setTargetCountError(true)
        targetCountInputRef.current?.focus()
        return
      }
    }
    setTargetCountError(false)
    const target = newTargetCount >= 1 ? newTargetCount : 1
    const durationStr = useDuration ? `${hours}h ${minutes}m` : '0h 0m'
    const effectiveCategory =
      newCategory && (
        categoriesOrder.includes(newCategory) ||
        (newCategory.startsWith(GOAL_FILTER_PREFIX) && goalsList.some((g) => `goal:${g.id}` === newCategory))
      )
        ? newCategory
        : CATEGORIES_FOLDER_NAME
    const parseCustomValue = () => {
      const n = Number(customRepeatValue)
      return Number.isFinite(n) && n > 0 ? n : undefined
    }

    const buildRepeatFields = (base: Mission): Partial<Mission> => {
      if (newRecurrence === 'none') {
        return {
          recurrence: 'none',
          repeatUnit: undefined,
          repeatValue: undefined,
          missedRepeats: 0,
          repeatLocked: false,
          repeatLastEvaluatedAt: undefined,
        }
      }
      if (newRecurrence === 'daily') {
        return {
          recurrence: 'daily',
          repeatUnit: 'days',
          repeatValue: 1,
          missedRepeats: base.missedRepeats ?? 0,
          repeatLocked: base.repeatLocked ?? false,
          repeatLastEvaluatedAt: base.repeatLastEvaluatedAt ?? new Date().toISOString(),
        }
      }
      if (newRecurrence === 'weekly') {
        return {
          recurrence: 'weekly',
          repeatUnit: 'weeks',
          repeatValue: 1,
          missedRepeats: base.missedRepeats ?? 0,
          repeatLocked: base.repeatLocked ?? false,
          repeatLastEvaluatedAt: base.repeatLastEvaluatedAt ?? new Date().toISOString(),
        }
      }
      // custom
      const v = parseCustomValue()
      if (!v) {
        // treat as none if invalid
        return {
          recurrence: 'none',
          repeatUnit: undefined,
          repeatValue: undefined,
          missedRepeats: 0,
          repeatLocked: false,
          repeatLastEvaluatedAt: undefined,
        }
      }
      return {
        recurrence: 'custom',
        repeatUnit: customRepeatUnit,
        repeatValue: v,
        missedRepeats: base.missedRepeats ?? 0,
        repeatLocked: base.repeatLocked ?? false,
        repeatLastEvaluatedAt: base.repeatLastEvaluatedAt ?? new Date().toISOString(),
      }
    }

    if (editingMissionId) {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === editingMissionId
            ? {
                ...m,
                title: newTitle.trim(),
                category: effectiveCategory,
                ...buildRepeatFields(m),
                duration: durationStr,
                targetCount: useTargetCount ? target : undefined,
                progressCount: useTargetCount ? (m.progressCount ?? 0) : undefined,
                goalId: effectiveCategory.startsWith(GOAL_FILTER_PREFIX) ? effectiveCategory.slice(GOAL_FILTER_PREFIX.length) : undefined,
              }
            : m,
        ),
      )
    } else {
      setCategoryError(false)
      setMissions((prev) => {
        const inCategory = prev.filter((m) => m.category === effectiveCategory)
        const nextOrder = inCategory.length === 0 ? 0 : Math.max(...inCategory.map((m) => m.orderInCategory ?? 0)) + 1
        const base: Mission = {
          id: 'temp',
          title: newTitle.trim(),
          category: effectiveCategory,
          recurrence: 'none',
          duration: durationStr,
          createdAt: new Date().toISOString(),
          isCompleted: false,
        } as Mission
        const repeatFields = buildRepeatFields(base)
        return [
          {
            id: uuidv4(),
            title: newTitle.trim(),
            category: effectiveCategory,
            recurrence: repeatFields.recurrence ?? 'none',
            repeatUnit: repeatFields.repeatUnit,
            repeatValue: repeatFields.repeatValue,
            missedRepeats: repeatFields.missedRepeats,
            repeatLocked: repeatFields.repeatLocked,
            repeatLastEvaluatedAt: repeatFields.repeatLastEvaluatedAt ?? new Date().toISOString(),
            duration: durationStr,
            targetCount: useTargetCount ? target : undefined,
            progressCount: useTargetCount ? 0 : undefined,
            createdAt: new Date().toISOString(),
            isCompleted: false,
            orderInCategory: nextOrder,
            goalId: effectiveCategory.startsWith(GOAL_FILTER_PREFIX) ? effectiveCategory.slice(GOAL_FILTER_PREFIX.length) : undefined,
          },
          ...prev,
        ]
      })
    }
    closeAddMissionFormAndReset()
  }

  const handleDeleteClick = (id: string) => {
    setMissionIdToDelete(id)
  }

  /** Open the add-mission modal with the mission's data; submit will update this mission. */
  const handleEdit = (mission: Mission) => {
    setEditingMissionId(mission.id)
    const durationMatch = mission.duration.match(/(\d+)h\s*(\d+)m/)
    const hours = durationMatch ? parseInt(durationMatch[1], 10) : 0
    const minutes = durationMatch ? parseInt(durationMatch[2], 10) : 30
    const hasDuration = Boolean(mission.duration) && mission.duration !== '0h 0m'
    const hasCounter = (mission.targetCount ?? 0) > 1
    setNewTitle(mission.title)
    setNewCategory(mission.category)
    setNewRecurrence(mission.recurrence)
    setRecurrenceTouched(mission.recurrence !== 'none')
    setHours(hours)
    setMinutes(minutes)
    setNewTargetCount(mission.targetCount ?? 1)
    setUseDuration(hasDuration)
    setUseTargetCount(hasCounter)
    if (mission.recurrence === 'custom' && mission.repeatValue != null && mission.repeatUnit) {
      setCustomRepeatValue(String(mission.repeatValue))
      setCustomRepeatUnit(mission.repeatUnit as 'minutes' | 'hours' | 'days' | 'weeks' | 'months')
    } else {
      setCustomRepeatValue('')
      setCustomRepeatUnit('days')
    }
    setShowAddMissionForm(true)
  }

  const handleConfirmDeleteMission = () => {
    if (!missionIdToDelete) return
    const mission = missions.find((m) => m.id === missionIdToDelete)
    if (mission) {
      setMissions((prev) =>
        prev.filter((m) => !(m.title === mission.title && m.category === mission.category))
      )
    }
    setMissionIdToDelete(null)
  }

  const stakeFunctionUrl =
    (typeof import.meta.env.VITE_SUPABASE_URL === 'string' && import.meta.env.VITE_SUPABASE_URL
      ? import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')
      : '') + '/functions/v1/stripe-stake'
  const stakeToken = session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY

  const handleStakeAttached = useCallback((missionId: string, info: StakeInfo) => {
    setStakes((prev) => ({ ...prev, [missionId]: info }))
  }, [])

  const handleStakeSuccess = useCallback(
    async (missionId: string) => {
      const stake = stakes[missionId]
      if (!stake?.stakeId) return
      try {
        const res = await fetch(stakeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(stakeToken ? { Authorization: `Bearer ${stakeToken}` } : {}),
          },
          body: JSON.stringify({ action: 'succeed_stake', stakeId: stake.stakeId }),
        })
        if (res.ok) setStakes((prev) => ({ ...prev, [missionId]: { ...stake, status: 'succeeded' } }))
      } catch {
        // keep UI consistent on network error
      }
    },
    [stakes, stakeFunctionUrl, stakeToken],
  )

  const handleStakeFailure = useCallback(
    async (missionId: string) => {
      const stake = stakes[missionId]
      if (!stake?.stakeId) return
      try {
        const res = await fetch(stakeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(stakeToken ? { Authorization: `Bearer ${stakeToken}` } : {}),
          },
          body: JSON.stringify({ action: 'charge_stake', stakeId: stake.stakeId }),
        })
        if (res.ok) {
          setStakes((prev) => ({ ...prev, [missionId]: { ...stake, status: 'charged' } }))
          const msg = `Charged ${stake.amount} ${(stake.currency || 'usd').toUpperCase()} from your card. Check Stripe Dashboard → Payments to verify.`
          setChargeSuccessMessage(msg)
          setTimeout(() => setChargeSuccessMessage(null), 8000)
        }
      } catch {
        // keep UI consistent on network error
      }
    },
    [stakes, stakeFunctionUrl, stakeToken],
  )

  const onMissionDragEnd = (event: DragEndEvent) => {
    setActiveMissionId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const missionId = active.id as string
    const overId = over.id as string
    const draggedMission = missions.find((m) => m.id === missionId)
    if (!draggedMission) return

    const overMission = missions.find((m) => m.id === overId)
    const isOverMission = !!overMission
    const targetCategory = isOverMission ? overMission!.category : (overId as string)
    const sameCategory = draggedMission.category === targetCategory

    if (sameCategory && isOverMission) {
      const inCategory = missions
        .filter((m) => m.category === draggedMission.category)
        .sort((a, b) => (a.orderInCategory ?? 0) - (b.orderInCategory ?? 0))
      const ids = inCategory.map((m) => m.id)
      const oldIndex = ids.indexOf(missionId)
      const newIndex = ids.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return
      const newIds = arrayMove(ids, oldIndex, newIndex)
      setMissions((prev) =>
        prev.map((m) => {
          if (m.category !== draggedMission.category) return m
          const idx = newIds.indexOf(m.id)
          return { ...m, orderInCategory: idx }
        }),
      )
      return
    }
    // Dragging to another category is disabled — only reorder within same category.
  }

  /**
   * "סימון" משימה:
   * - אם אין targetCount: לחיצה אחת מסיימת (isCompleted=true)
   * - אם יש targetCount: כל לחיצה מעלה progressCount ב-1
   *   וכשמגיעים ליעד -> מסיימים
   */
  const submitNewCategory = () => {
    const name = newCategoryName.trim()
    if (!name || name === 'All' || name === COMPLETED_MISSIONS_FILTER || name === UNCOMPLETED_MISSIONS_FILTER || name === CATEGORIES_FOLDER_NAME) return
    if (categoriesOrder.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setNewCategoryName('')
      setIsAddingCategory(false)
      return
    }
    setCategoriesOrder((prev) => [...prev, name])
    setNewCategoryName('')
    setIsAddingCategory(false)
  }

  const handleDeleteCategory = (cat: string) => {
    if (categoriesOrder.length <= 1) return
    const newOrder = categoriesOrder.filter((c) => c !== cat)
    const fallback = newOrder[0]
    setCategoriesOrder(newOrder)
    setMissions((prev) =>
      prev.map((m) => (m.category === cat ? { ...m, category: fallback } : m))
    )
    if (selectedCategoryFilter === cat) selectCategory('All')
  }

  const handleMoveToCompleted = (missionId: string) => {
    setMovedToCompletedIds((prev) => new Set(prev).add(missionId))
  }

  const handleToggle = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId)
    if (mission?.isCompleted && selectedCategoryFilter === COMPLETED_MISSIONS_FILTER) {
      setUncheckedIdsStillShownInCompleted((prev) => (prev.includes(missionId) ? prev : [...prev, missionId]))
    }
    setMissions((prev) => {
      const mission = prev.find((m) => m.id === missionId)
      if (!mission) return prev

      if (mission.isCompleted) {
        // Uncheck: restore to original location and form (incomplete); decrement locked sibling's completed count
        const restoredOrder = mission.orderInCategoryBeforeComplete ?? 0
        return prev.map((m) => {
          if (m.id !== missionId) {
            if (m.category === mission.category && (m.orderInCategory ?? 0) >= restoredOrder) {
              return { ...m, orderInCategory: (m.orderInCategory ?? 0) + 1 }
            }
            // Same repeated mission (title+category), locked: decrement completed count when user unchecks active
            if (m.repeatLocked && m.title === mission.title && m.category === mission.category) {
              const next = Math.max(0, (m.repeatCompletedCount ?? 0) - 1)
              return { ...m, repeatCompletedCount: next }
            }
            return m
          }
          const { orderInCategoryBeforeComplete: _, ...rest } = m
          return {
            ...rest,
            isCompleted: false,
            completedAt: undefined,
            orderInCategory: restoredOrder,
            progressCount: m.targetCount ? 0 : m.progressCount,
          }
        })
      }

      const completedAt = new Date().toISOString()
      const inCategory = prev.filter((m) => m.category === mission.category)
      const maxOrder = Math.max(0, ...inCategory.map((m) => m.orderInCategory ?? 0))
      const orderAtBottom = maxOrder + 1
      const previousOrder = mission.orderInCategory ?? 0

      const currentProgress = mission.progressCount ?? 0
      const nextProgress = currentProgress + 1
      const didCompleteCounter = !mission.targetCount || nextProgress >= (mission.targetCount ?? 0)

      return prev.map((m) => {
        if (m.id !== missionId) {
          if (m.repeatLocked && m.title === mission.title && m.category === mission.category && didCompleteCounter) {
            return { ...m, repeatCompletedCount: (m.repeatCompletedCount ?? 0) + 1 }
          }
          return m
        }

        if (!m.targetCount) {
          return { ...m, isCompleted: true, completedAt, orderInCategory: orderAtBottom, orderInCategoryBeforeComplete: previousOrder }
        }
        const current = m.progressCount ?? 0
        if (current >= m.targetCount) {
          return { ...m, isCompleted: true, progressCount: m.targetCount, completedAt, orderInCategory: orderAtBottom, orderInCategoryBeforeComplete: previousOrder }
        }
        const next = current + 1
        if (next >= m.targetCount) {
          return { ...m, progressCount: next, isCompleted: true, completedAt, orderInCategory: orderAtBottom, orderInCategoryBeforeComplete: previousOrder }
        }
        return { ...m, progressCount: next }
      })
    })
  }

  return (
    <div className={`${pageContainer} mx-auto w-full max-w-[1600px]`}>
      {missionIdToDelete != null && (
        <div
          className={modal.backdrop}
          onClick={() => setMissionIdToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-mission-title"
        >
          <div className={`${modal.box} max-w-sm`} onClick={(e) => e.stopPropagation()}>
            <div className={`${modal.header} justify-center relative`}>
              <h2 id="delete-mission-title" className={modal.title}>
                Delete repeated mission?
              </h2>
              <button
                type="button"
                onClick={() => setMissionIdToDelete(null)}
                className={`${modal.closeBtn} absolute right-0 top-1/2 -translate-y-1/2`}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={`${modal.footer} justify-center`}>
              <button
                type="button"
                onClick={() => setMissionIdToDelete(null)}
                className={btn.secondary}
              >
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDeleteMission} className={btn.danger}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showCustomRecurrenceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCustomRecurrenceModal(false)
              setNewRecurrence('none')
            }
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-gray-800 pb-2">
              <h2 className="text-sm font-semibold text-white">Custom repeat</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCustomRecurrenceModal(false)
                  setNewRecurrence('none')
                }}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                aria-label="Close custom repeat"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-300">repeat every</span>
                <input
                  ref={customRepeatInputRef}
                  type="number"
                  min={1}
                  value={customRepeatValue}
                  onChange={(e) => setCustomRepeatValue(e.target.value)}
                  className="w-20 rounded border border-gray-700 bg-slate-900 px-2 py-1.5 text-xs text-white text-center focus:border-cyan-500 focus:outline-none no-spinner-input"
                />
                <select
                  value={customRepeatUnit}
                  onChange={(e) => setCustomRepeatUnit(e.target.value as 'minutes' | 'hours' | 'days' | 'weeks' | 'months')}
                  className="rounded border border-gray-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="minutes">{Number(customRepeatValue || '0') <= 1 ? 'minute' : 'minutes'}</option>
                  <option value="hours">{Number(customRepeatValue || '0') <= 1 ? 'hour' : 'hours'}</option>
                  <option value="days">{Number(customRepeatValue || '0') <= 1 ? 'day' : 'days'}</option>
                  <option value="weeks">{Number(customRepeatValue || '0') <= 1 ? 'week' : 'weeks'}</option>
                  <option value="months">{Number(customRepeatValue || '0') <= 1 ? 'month' : 'months'}</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomRecurrenceModal(false)
                    setNewRecurrence('none')
                  }}
                  className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-gray-500/50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomRecurrenceModal(false)
                    setNewRecurrence('custom')
                    setRecurrenceError(false)
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-6">
        {/* תוכן ראשי: טופס, רשימת משימות */}
        <div className="min-w-0 flex-1 space-y-6">

      {/* אזור יצירת משימה חדשה — לא מוצג ב־"Completed/Uncompleted" */}
      {selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER &&
        selectedCategoryFilter !== UNCOMPLETED_MISSIONS_FILTER && (
          <>
            <div>
              <RippleButton
                type="button"
                onClick={() => {
                  setEditingMissionId(null)
                  if (
                    selectedCategoryFilter !== 'All' &&
                    selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER &&
                    selectedCategoryFilter !== UNCOMPLETED_MISSIONS_FILTER
                  ) {
                    setNewCategory(selectedCategoryFilter)
                  } else {
                    setNewCategory('')
                  }
                  setShowAddMissionForm(true)
                }}
                className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-700/80 bg-slate-900/30 px-4 py-3.5 text-sm font-medium text-gray-400 transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-800/60 hover:text-white"
                rippleClassName="bg-cyan-500/40"
                aria-expanded={showAddMissionForm}
                aria-controls="add-mission-form"
                id="add-mission-toggle"
              >
                <span className="text-lg transition-transform duration-200 group-hover:scale-110">+</span>
                Add Mission
              </RippleButton>
            </div>

            {showAddMissionForm && (
              <div
                className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) closeAddMissionFormAndReset()
                }}
              >
                <div className="w-full max-w-md rounded-xl border border-gray-800 bg-slate-900 shadow-2xl transition-all duration-200">
                  <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                    <p id="add-mission-modal-title" className="text-sm font-semibold text-white">
                      {editingMissionId ? 'Edit mission' : 'Add mission'}
                    </p>
                    <button
                      type="button"
                      onClick={closeAddMissionFormAndReset}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  <form
                    id="add-mission-form"
                    className="space-y-0"
                    aria-labelledby="add-mission-modal-title"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleAdd()
                    }}
                  >
                  <div className="space-y-4 px-4 py-3 text-left">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Define your mission</p>
                      <input
                        id="add-mission-title"
                        value={newTitle}
                        onChange={(event) => {
                          setNewTitle(event.target.value)
                          if (titleError) setTitleError(false)
                        }}
                        autoFocus
                        className={`w-full rounded-lg border bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                          titleError
                            ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                            : newTitle.trim()
                              ? 'border-emerald-500/60 focus:border-emerald-500/60 focus:ring-emerald-500/25'
                              : 'border-gray-700 focus:border-cyan-500/50 focus:ring-cyan-500/30'
                        }`}
                        aria-invalid={titleError}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Under what category will the mission be?</p>
                        <select
                          id="add-mission-category"
                          value={newCategory}
                          onChange={(e) => {
                            setNewCategory(e.target.value)
                            setCategoryError(false)
                          }}
                          className={`w-full rounded-lg border bg-slate-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 transition-colors appearance-none ${
                            categoryError
                              ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                              : newCategory
                                ? 'border-emerald-500/60 focus:border-emerald-500/60 focus:ring-emerald-500/25'
                                : 'border-gray-700 focus:border-cyan-500/50 focus:ring-cyan-500/30'
                          }`}
                          aria-label="Category"
                          aria-invalid={categoryError}
                        >
                          {!editingMissionId && selectedCategoryFilter === 'All' && (
                            <option value="">Choose category</option>
                          )}
                          {categoriesOrder.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          {goalsList.map((g) => (
                            <option key={g.id} value={`goal:${g.id}`}>
                              {g.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">
                          Do you need to do the mission in a repeated time frame?
                        </p>
                        <div
                          className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                            newRecurrence !== 'none' ? 'border-emerald-500/60' : 'border-gray-700'
                          }`}
                        >
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <input
                              id="add-mission-recurrence-toggle"
                              type="checkbox"
                              checked={newRecurrence !== 'none'}
                              onChange={(e) => {
                                setNewRecurrence(e.target.checked ? 'daily' : 'none')
                              }}
                              className="h-4 w-4 accent-cyan-500"
                              aria-label="Make it repeat"
                              aria-invalid={false}
                            />
                            <span>{newRecurrence !== 'none' ? 'Repeated' : 'Make it repeat'}</span>
                          </label>
                          {newRecurrence !== 'none' && (
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="radio"
                                  name="add-mission-recurrence"
                                  checked={newRecurrence === 'daily'}
                                  onChange={() => {
                                    setNewRecurrence('daily')
                                  }}
                                  className="h-3 w-3 accent-cyan-500"
                                />
                                Daily
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="radio"
                                  name="add-mission-recurrence"
                                  checked={newRecurrence === 'weekly'}
                                  onChange={() => {
                                    setNewRecurrence('weekly')
                                  }}
                                  className="h-3 w-3 accent-cyan-500"
                                />
                                Weekly
                              </label>
                              <label className="flex items-center gap-2 text-sm text-white">
                                <input
                                  type="radio"
                                  name="add-mission-recurrence"
                                  checked={newRecurrence === 'custom'}
                                  onChange={() => {
                                    setNewRecurrence('custom')
                                    setShowCustomRecurrenceModal(true)
                                  }}
                                  className="h-3 w-3 accent-emerald-500"
                                />
                                Custom
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Duration (optional) */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">
                          How much time do you astamaite the mission to take?
                        </p>
                        <div
                          className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                            useDuration ? 'border-emerald-500/60' : 'border-gray-700'
                          }`}
                        >
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                          <input
                            id="add-mission-duration-toggle"
                            type="checkbox"
                            checked={useDuration}
                            onChange={(e) => setUseDuration(e.target.checked)}
                            className="h-4 w-4 accent-cyan-500"
                            aria-label="Toggle duration"
                          />
                          <span>{useDuration ? 'Duration' : 'Add duration'}</span>
                        </label>
                        {useDuration && (
                          <div className="flex flex-wrap items-center gap-2">
                            <DurationCombobox
                              value={hours}
                              onChange={setHours}
                              options={Array.from({ length: 24 }, (_, i) => i)}
                              min={0}
                              max={99}
                              label="h"
                              ariaLabel="Hours"
                            />
                            <span className="text-gray-400">h</span>
                            <DurationCombobox
                              value={minutes}
                              onChange={setMinutes}
                              options={[0, 15, 30, 45]}
                              min={0}
                              max={59}
                              label="m"
                              ariaLabel="Minutes"
                            />
                            <span className="text-gray-400">m</span>
                          </div>
                        )}
                      </div>
                      </div>

                      {/* Target count (optional) */}
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">
                          How much times do you need to do it untill your done?
                        </p>
                        <div
                          className={`flex flex-wrap items-center gap-3 rounded-lg border bg-slate-800 px-3 py-2 ${
                            useTargetCount ? 'border-emerald-500/60' : 'border-gray-700'
                          }`}
                        >
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                            <input
                              id="add-mission-target-toggle"
                              type="checkbox"
                              checked={useTargetCount}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setUseTargetCount(checked)
                                if (checked) {
                                  setNewTargetCount(0)
                                  setTargetCountError(false)
                                  setTimeout(() => targetCountInputRef.current?.focus(), 0)
                                }
                              }}
                              className="h-4 w-4 accent-cyan-500"
                              aria-label="Toggle target count"
                            />
                            <span>{useTargetCount ? 'Target counter' : 'Add target counter'}</span>
                          </label>
                          {useTargetCount && (
                            <input
                              ref={targetCountInputRef}
                              id="add-mission-target-count"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={newTargetCount <= 0 ? '' : newTargetCount}
                              onChange={(event) => {
                                const raw = (event.target as HTMLInputElement).value
                                const digitsOnly = raw.replace(/\D/g, '')
                                const n = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10) || 0
                                setNewTargetCount(n)
                                if (targetCountError) setTargetCountError(false)
                              }}
                              onFocus={(e) => (e.target as HTMLInputElement).select()}
                              className={`no-spinner-input w-20 rounded-lg border bg-slate-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 transition-colors ${
                                targetCountError
                                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                                  : 'border-emerald-500/60 focus:border-emerald-500/60 focus:ring-emerald-500/25'
                              }`}
                              aria-label="Target count"
                              aria-invalid={targetCountError}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-4 py-3">
                    <button
                      type="button"
                      onClick={closeAddMissionFormAndReset}
                      className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-400 transition-all hover:bg-slate-800 hover:text-white active:scale-[0.98]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-500 active:scale-[0.98]"
                    >
                      {editingMissionId ? 'Save' : 'Add Mission'}
                    </button>
                  </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

      {/* שורת מסננים מעל רשימת "Completed missions": קטגוריה + טווח תאריכים (אחרון יום/שבוע/חודש או לוח שנה). */}
      {selectedCategoryFilter === COMPLETED_MISSIONS_FILTER && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800/60 bg-slate-900/50 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <span>Category</span>
            <select
              value={completedCategoryFilter}
              onChange={(e) => setCompletedCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
              aria-label="Filter completed by category"
            >
              <option value="All">All</option>
              {categoriesOrder.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {goalsList.map((g) => (
                <option key={g.id} value={`goal:${g.id}`}>{g.title}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <span>Repeated time frame</span>
            <select
              value={completedRecurrenceFilter}
              onChange={(e) => setCompletedRecurrenceFilter(e.target.value as 'all' | Recurrence)}
              className="rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
              aria-label="Filter completed by repeated time frame"
            >
              <option value="all">All</option>
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <span>Completed time frame</span>
            <select
              value={completedDateFilter}
              onChange={(e) => {
                const v = e.target.value as typeof completedDateFilter
                setCompletedDateFilter(v)
                if (v !== 'custom') {
                  setCompletedDateFrom('')
                  setCompletedDateTo('')
                }
              }}
              className="rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
              aria-label="Filter completed by time frame"
            >
              <option value="all">All</option>
              <option value="last_day">Last day</option>
              <option value="last_week">Last week</option>
              <option value="last_month">Last month</option>
              <option value="custom">Calendar (date to date)</option>
            </select>
          </label>
          {completedDateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <span>From</span>
                <input
                  ref={completedDateFromRef}
                  type="date"
                  value={completedDateFrom}
                  onChange={(e) => setCompletedDateFrom(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
                  aria-label="From date"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <span>To</span>
                <input
                  ref={completedDateToRef}
                  type="date"
                  value={completedDateTo}
                  onChange={(e) => setCompletedDateTo(e.target.value)}
                  min={completedDateFrom || undefined}
                  className="rounded-lg border border-gray-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
                  aria-label="To date (from and dates in between are shown)"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  completedDateFromRef.current?.blur()
                  completedDateToRef.current?.blur()
                }}
                disabled={!completedDateFrom || !completedDateTo}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* מצב ריק: אותו בלוק כשאין משימות בכלל או שאין משימות בקטגוריה הנבחרת */}
      {displayedMissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800/40 bg-slate-900/30 py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60" aria-hidden="true">
            🎯
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-gray-500">
            {selectedCategoryFilter === 'All'
              ? 'No active missions yet. Create one above to get started!'
              : selectedCategoryFilter === COMPLETED_MISSIONS_FILTER
                ? 'No completed missions yet.'
                : selectedCategoryFilter === UNCOMPLETED_MISSIONS_FILTER
                  ? 'No uncompleted (charged) missions yet.'
                  : selectedCategoryFilter.startsWith(GOAL_FILTER_PREFIX)
                    ? `No missions for ${getGoalById(selectedCategoryFilter.slice(GOAL_FILTER_PREFIX.length))?.title ?? 'this goal'} yet. Create one above or choose another goal.`
                    : `No missions in ${selectedCategoryFilter} yet. Create one above or choose another category.`}
          </p>
        </div>
      ) : (
      <>
        {chargeSuccessMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {chargeSuccessMessage}
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={missionCollisionDetection}
          modifiers={missionModifiers}
          onDragStart={(e: DragStartEvent) => {
            const data = e.active.data.current
            if (data?.type === 'mission') setActiveMissionId(e.active.id as string)
          }}
          onDragEnd={onMissionDragEnd}
          onDragCancel={() => setActiveMissionId(null)}
        >
        {(missionsGroupedByCategory ?? (selectedCategoryFilter === COMPLETED_MISSIONS_FILTER && (completedDisplayGroupedByCategory ?? completedMissionsGroupedByCategory))) ? (
          /* מצב "All" (פעיל או Completed): קיבוץ לפי קטגוריה עם כותרת לכל קבוצה. */
          <div className="space-y-6">
            {(missionsGroupedByCategory ?? (completedDisplayGroupedByCategory ?? completedMissionsGroupedByCategory)!)!.map(({ category, missions: categoryMissions }) => (
              <section key={category} className="space-y-3" aria-labelledby={`category-${category}`}>
                <h2 id={`category-${category}`} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                  <span className="h-px flex-1 mission-category-divider" />
                  <span>{category.startsWith(GOAL_FILTER_PREFIX) ? getGoalById(category.slice(GOAL_FILTER_PREFIX.length))?.title ?? category : category}</span>
                  <span className="h-px flex-1 mission-category-divider" />
                </h2>
                <DroppableSection category={category} className="space-y-3" showDropIndicator={false}>
                  <SortableContext items={categoryMissions.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  {categoryMissions.map((mission) => (
                    <SortableMissionCard
                        key={mission.id}
                        mission={mission}
                        onToggle={handleToggle}
                        onDelete={handleDeleteClick}
                        onEdit={handleEdit}
                        getGoalById={getGoalById}
                        stake={stakes[mission.id] ?? null}
                        onAddStake={() => setStakeModalForId(mission.id)}
                        onStakeSuccess={() => { handleStakeSuccess(mission.id); handleToggle(mission.id); }}
                        onStakeFailure={() => handleStakeFailure(mission.id)}
                        onMoveToCompleted={selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER ? handleMoveToCompleted : undefined}
                        disableDrag={selectedCategoryFilter === COMPLETED_MISSIONS_FILTER}
                        isCompletedView={selectedCategoryFilter === COMPLETED_MISSIONS_FILTER}
                        hasActiveSibling={missions.some((m) => m.id !== mission.id && m.title === mission.title && m.category === mission.category && !getEffectiveCompleted(m))}
                      />
                    ))}
                  </SortableContext>
                </DroppableSection>
              </section>
            ))}
          </div>
        ) : (
          <DroppableSection category={selectedCategoryFilter} className="space-y-3" showDropIndicator={false}>
            <SortableContext items={displayedMissions.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {displayedMissions.map((mission) => (
                <SortableMissionCard
                  key={mission.id}
                  mission={mission}
                  onToggle={handleToggle}
                  onDelete={handleDeleteClick}
                  onEdit={handleEdit}
                  getGoalById={getGoalById}
                  stake={stakes[mission.id] ?? null}
                  onAddStake={() => setStakeModalForId(mission.id)}
                  onStakeSuccess={() => { handleStakeSuccess(mission.id); handleToggle(mission.id); }}
                  onStakeFailure={() => handleStakeFailure(mission.id)}
                  onMoveToCompleted={selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER ? handleMoveToCompleted : undefined}
                  disableDrag={selectedCategoryFilter === COMPLETED_MISSIONS_FILTER}
                  isCompletedView={selectedCategoryFilter === COMPLETED_MISSIONS_FILTER}
                  hasActiveSibling={missions.some((m) => m.id !== mission.id && m.title === mission.title && m.category === mission.category && !getEffectiveCompleted(m))}
                />
              ))}
            </SortableContext>
          </DroppableSection>
        )}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }} modifiers={missionModifiers}>
          {activeMissionId ? (() => {
            const m = missions.find((mission) => mission.id === activeMissionId)
            return m ? (
              <div className="flex cursor-grabbing items-center justify-between rounded-xl border border-cyan-500/20 bg-slate-900/95 px-4 py-3.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <span className="shrink-0 rounded p-1 text-gray-400">
                  <DragHandleIcon className="h-3.5 w-3" />
                </span>
                <div className="grid min-w-0 flex-1 grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5">
                  <div className="shrink-0" aria-hidden />
                  <p className={`min-w-0 text-base font-medium leading-tight ${m.isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>{m.title}</p>
                </div>
              </div>
            ) : null
          })() : null}
        </DragOverlay>
        </DndContext>
      </>
      )}
        </div>

      {/*
        סרגל ניווט ימני: קטגוריות עם גרירה לשינוי סדר. All קבוע למעלה; השאר ניתנים לגרירה (ידית בלבד).
        אופטימיזציות גרירה:
        - ביצועים (60FPS): שימוש ב-DragOverlay — הפריט הנגרר מוצג בשכבת overlay ונע עם transform לפי מיקום העכבר (מעקב צמוד).
        - מגבלות: modifiers — restrictToVerticalAxis (תנועה רק אנכית), restrictToParentElement (לא יוצאים מגבולות רשימת הקטגוריות).
        - מעברים: transition על פריטי הרשימה + dropAnimation ב-DragOverlay למעבר חלק בשחרור.
      */}
        <aside className="sticky top-6 flex w-48 shrink-0 flex-col self-start rounded-xl border border-gray-800/60 bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Categories</p>
          {generalFolderExpanded && (
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-slate-800 hover:text-white"
              aria-label="Add category"
            >
              +
            </button>
          )}
        </div>
        <nav className="flex min-h-0 flex-1 flex-col" aria-label="Filter by category">
          <div className="border-b border-gray-800/40">
            <button
              type="button"
              onClick={() => selectCategory('All')}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                selectedCategoryFilter === 'All'
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-gray-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              All Missions
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={categoryModifiers}
              onDragStart={(e: DragStartEvent) => setActiveCategory(e.active.id as string)}
              onDragEnd={(event: DragEndEvent) => {
                setActiveCategory(null)
                const { active, over } = event
                if (!over || active.id === over.id) return
                const activeId = active.id as string
                const overId = over.id as string
                const folderIds: SidebarFolderId[] = [FOLDER_ID_GENERAL, FOLDER_ID_GOALS]
                if (folderIds.includes(activeId as SidebarFolderId) && folderIds.includes(overId as SidebarFolderId)) {
                  setFolderOrder((prev) => {
                    const oldIndex = prev.indexOf(activeId as SidebarFolderId)
                    const newIndex = prev.indexOf(overId as SidebarFolderId)
                    if (oldIndex === -1 || newIndex === -1) return prev
                    return arrayMove(prev, oldIndex, newIndex)
                  })
                  return
                }
                if (categoriesOrder.includes(activeId)) {
                  setCategoriesOrder((prev) => {
                    const oldIndex = prev.indexOf(activeId)
                    const newIndex = prev.indexOf(overId)
                    if (oldIndex === -1 || newIndex === -1) return prev
                    return arrayMove(prev, oldIndex, newIndex)
                  })
                } else if (goalsList.some((g) => g.id === activeId)) {
                  const oldIndex = goalsList.findIndex((g) => g.id === activeId)
                  const newIndex = goalsList.findIndex((g) => g.id === overId)
                  if (oldIndex !== -1 && newIndex !== -1) {
                    setGoalsList(arrayMove(goalsList, oldIndex, newIndex))
                  }
                }
              }}
              onDragCancel={(_e: DragCancelEvent) => setActiveCategory(null)}
            >
            <SortableContext items={folderOrder} strategy={verticalListSortingStrategy}>
            {folderOrder.map((folderId) =>
                  folderId === FOLDER_ID_GENERAL ? (
                    <SortableFolderSection
                      key={FOLDER_ID_GENERAL}
                      id={FOLDER_ID_GENERAL}
                      title={CATEGORIES_FOLDER_NAME}
                      isExpanded={generalFolderExpanded}
                      onToggle={() => setGeneralFolderExpanded((e) => !e)}
                    >
                      {generalFolderExpanded && (
                        <SortableContext items={categoriesOrder} strategy={verticalListSortingStrategy}>
                        <div className="pl-2">
                          {categoriesOrder.map((cat, index) => (
                              <SortableCategoryItem
                                key={cat}
                                id={cat}
                                isSelected={selectedCategoryFilter === cat}
                                onSelect={() => selectCategory(cat)}
                                onDelete={handleDeleteCategory}
                                isLast={index === categoriesOrder.length - 1 && !isAddingCategory}
                              />
                          ))}
                          {isAddingCategory && (
                              <div className="flex items-center gap-2 rounded-lg">
                                <input
                                  ref={newCategoryInputRef}
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      submitNewCategory()
                                    }
                                    if (e.key === 'Escape') {
                                      setNewCategoryName('')
                                      setIsAddingCategory(false)
                                      newCategoryInputRef.current?.blur()
                                    }
                                  }}
                                  onBlur={() => {
                                    if (newCategoryName.trim()) submitNewCategory()
                                    else setIsAddingCategory(false)
                                  }}
                                  placeholder="New category"
                                  className="w-full rounded-lg border border-gray-700 bg-slate-800 px-2 py-2 text-sm text-white placeholder:text-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-colors"
                                  aria-label="New category name"
                                />
                              </div>
                            )}
                        </div>
                        </SortableContext>
                      )}
                    </SortableFolderSection>
                  ) : (
                    <SortableFolderSection
                      key={FOLDER_ID_GOALS}
                      id={FOLDER_ID_GOALS}
                      title={GOALS_FOLDER_NAME}
                      isExpanded={goalsFolderExpanded}
                      onToggle={() => setGoalsFolderExpanded((e) => !e)}
                    >
                      {goalsFolderExpanded && (
                        <div className="py-1 pl-2">
                          {goalsList.length === 0 ? (
                            <p className="rounded-lg px-2 py-2 text-xs text-gray-500">No goals yet</p>
                          ) : (
                            <SortableContext items={goalsList.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                            {goalsList.map((goal, index) => (
                                <SortableGoalItem
                                  key={goal.id}
                                  goal={goal}
                                  isSelected={selectedCategoryFilter === `${GOAL_FILTER_PREFIX}${goal.id}`}
                                  onSelect={() => selectCategory(`${GOAL_FILTER_PREFIX}${goal.id}`)}
                                  onDelete={(id) => {
                                    deleteGoalFromContext(id)
                                    if (selectedCategoryFilter === `${GOAL_FILTER_PREFIX}${id}`) selectCategory('All')
                                  }}
                                  isLast={index === goalsList.length - 1}
                                />
                            ))}
                            </SortableContext>
                          )}
                        </div>
                      )}
                    </SortableFolderSection>
                  )
                )}
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }}>
              {activeCategory ? (
                <div className="flex cursor-grabbing items-center gap-2 rounded-lg border border-cyan-500/20 bg-slate-900/95 px-2 py-1.5 shadow-xl shadow-black/20 backdrop-blur-sm">
                  <span className="rounded p-1 text-gray-400">
                    <DragHandleIcon className="h-3.5 w-3" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-white">
                    {activeCategory === FOLDER_ID_GENERAL
                      ? CATEGORIES_FOLDER_NAME
                      : activeCategory === FOLDER_ID_GOALS
                        ? GOALS_FOLDER_NAME
                        : getGoalById(activeCategory)?.title ?? activeCategory}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
            </DndContext>
              {/* Completed missions — תמיד מחוץ לתיקייה, לא בתוך General. */}
              <div className="border-t border-gray-800/40 pt-1">
                <button
                  type="button"
                  onClick={() => selectCategory(COMPLETED_MISSIONS_FILTER)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    selectedCategoryFilter === COMPLETED_MISSIONS_FILTER
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'text-emerald-600/60 hover:text-emerald-400'
                  }`}
                >
                  {COMPLETED_MISSIONS_FILTER}
                </button>
              </div>
          </div>
        </nav>
        </aside>
      </div>
      {stakeModalForId && (() => {
        const m = missions.find((x) => x.id === stakeModalForId)
        return m ? (
          <StakeSetupModal
            itemId={m.id}
            itemTitle={m.title}
            itemType="mission"
            onClose={() => setStakeModalForId(null)}
            onStaked={(info) => {
              handleStakeAttached(m.id, info)
              setStakeModalForId(null)
            }}
          />
        ) : null
      })()}
    </div>
  )
}
