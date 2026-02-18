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
import { getRandomQuoteForPage } from '../utils/quotes'
/** שם התיקייה בסרגל — לא קטגוריה לבחירה, רק כותרת לתיקייה. */
const CATEGORIES_FOLDER_NAME = 'General'
/** תיקיית "Goals" בסרגל — כותרת בלבד, כמו General. */
const GOALS_FOLDER_NAME = 'Goals'
/** מסנן מיוחד בסרגל — מציג רק משימות שהושלמו; לא קטגוריה אמיתית ולא מופיע בבורר קטגוריה בטופס. */
const COMPLETED_MISSIONS_FILTER = 'Completed missions'
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

/**
 * פריט קטגוריה ניתן לגרירה בסרגל הימני.
 * - הגרירה מופעלת רק מידית הגרירה (לא מהטקסט); הטקסט נשאר לחיץ לבחירת הקטגוריה.
 * - במהלך גרירה: אפקט "רוח" (שקיפות) להבחנה; התנועה הממשית מוצגת ב-DragOverlay (מעקב סנכרון לעכבר).
 * - useSortable מחזיר transform ו־transition; ה-state של הסדר מתעדכן ב-onDragEnd באב.
 * - ביצועים: ה-transform מוחל ב-CSS (translate) לצורך האצת חומרה; transition חלקה להזזת שאר הפריטים.
 */
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    /* מעבר חלק להזזת פריטים כשמשנים סדר — אנימציית layout */
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 py-1 transition-[transform,opacity] duration-200 ease-out ${!isLast ? 'border-b border-gray-700' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <span
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none shrink-0 rounded p-1 text-gray-500 hover:text-gray-400 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <DragHandleIcon className="h-3.5 w-3" />
      </span>
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm font-medium transition ${
          isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800 hover:text-white'
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
          className="shrink-0 rounded-lg p-1 text-gray-400 opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:opacity-100 focus:ring-2 focus:ring-red-400/50"
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

/** פריט יעד (Goal) בסרגל — ניתן לגרירה ומחיקה, כמו SortableCategoryItem. */
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 py-1 transition-[transform,opacity] duration-200 ease-out ${!isLast ? 'border-b border-gray-700' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <span
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none shrink-0 rounded p-1 text-gray-500 hover:text-gray-400 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <DragHandleIcon className="h-3.5 w-3" />
      </span>
      <button
        type="button"
        onClick={onSelect}
        className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm font-medium transition ${
          isSelected ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-slate-800 hover:text-white'
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
        className="shrink-0 rounded-lg p-1 text-gray-400 opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:opacity-100 focus:ring-2 focus:ring-red-400/50"
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

/**
 * כרטיס משימה ניתן לגרירה — לוגיקה זהה לקטגוריות (SortableCategoryItem):
 * useSortable + verticalListSortingStrategy, רק ידית הגרירה (2x3 נקודות) מפעילה גרירה — Checkbox ו-Delete נשארים לחיצים.
 * אפקט "רוח" (opacity) כמו בקטגוריות; layout animation בלבד (פריטים גולשים למעלה/למטה).
 */
function SortableMissionCard({
  mission,
  onToggle,
  onDelete,
  onEdit,
  getGoalById,
}: {
  mission: Mission
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (mission: Mission) => void
  getGoalById?: (id: string) => { title: string } | undefined
}) {
  const categoryLabel =
    mission.category.startsWith(GOAL_FILTER_PREFIX) && getGoalById
      ? getGoalById(mission.goalId ?? mission.category.slice(GOAL_FILTER_PREFIX.length))?.title ?? mission.category
      : mission.category
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mission.id, data: { type: 'mission', mission } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-xl border border-gray-800 bg-slate-900/70 px-4 py-3 text-white transition-[transform,opacity] duration-200 ease-out ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* רק הידית מפעילה גרירה — listeners רק כאן; שאר הכרטיס (checkbox, כפתור מחיקה) נשאר פונקציונלי. */}
      <span
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none shrink-0 rounded p-1 text-gray-500 hover:text-gray-400 active:cursor-grabbing"
        aria-label="Drag to reorder or move to another category"
      >
        <DragHandleIcon className="h-3.5 w-3" />
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* כשהמשימה עם targetCount > 1: תיבת סימון מתמלאת בירוק מלמטה לפי progressCount/targetCount; אחרת תיבת סימון רגילה. */}
        {mission.targetCount && mission.targetCount > 1 ? (
          <button
            type="button"
            onClick={() => onToggle(mission.id)}
            className="relative flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-500 bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            aria-label={`Progress ${mission.progressCount ?? 0} of ${mission.targetCount}`}
            aria-pressed={mission.isCompleted}
          >
            <span
              className="absolute bottom-0 left-0 right-0 bg-green-500 transition-[height] duration-150"
              style={{
                height: mission.isCompleted ? '100%' : `${((mission.progressCount ?? 0) / mission.targetCount) * 100}%`,
              }}
            />
            {mission.isCompleted && (
              <svg className="relative z-10 h-2.5 w-2.5 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <input
            type="checkbox"
            checked={mission.isCompleted}
            onChange={() => onToggle(mission.id)}
            className="h-4 w-4 shrink-0 accent-green-500"
            aria-label={mission.isCompleted ? 'Completed' : 'Mark complete'}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={`text-base font-medium leading-tight ${
              mission.isCompleted ? 'line-through text-gray-500' : 'text-white'
            }`}
          >
            {mission.title}
          </p>
          <p className="text-xs text-gray-400">
            {categoryLabel} • {mission.recurrence !== 'none' ? mission.recurrence : 'One-time'} • Duration: {mission.duration}
            {mission.targetCount ? ` • ${mission.progressCount ?? 0}/${mission.targetCount}` : ''}
            {mission.isCompleted && mission.completedAt && (
              <> • Completed: {new Date(mission.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span
          className={`rounded-full border border-gray-700 px-3 py-1 text-xs uppercase tracking-wider ${
            mission.isCompleted ? 'text-emerald-400' : 'text-gray-300'
          }`}
        >
          {mission.isCompleted ? 'Completed' : mission.recurrence !== 'none' ? mission.recurrence : 'One-time'}
        </span>
        {!mission.isCompleted && (
          <button
            type="button"
            onClick={() => onEdit(mission)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
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
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/50"
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

/**
 * אזור droppable לקטגוריה: שחרור משימה כאן מעדכן את קטגוריית המשימה.
 * showDropIndicator: false (גרירת משימות) — לא מציגים ring/רקע/bar כחול כדי לא להסיח.
 */
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
      className={`rounded-lg transition-colors duration-150 ${showIndicator ? 'ring-2 ring-inset ring-blue-500/50 bg-blue-500/5' : ''} ${className ?? ''}`}
      data-droppable-category={category}
    >
      {children}
      {showIndicator && (
        <div className="mt-2 h-1 rounded-full bg-blue-500/40" aria-hidden title="Drop zone — will land at end of this category" />
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
  const [newRecurrence, setNewRecurrence] = useState<Recurrence | ''>('')
  const [recurrenceError, setRecurrenceError] = useState(false)
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(30)
  const [newTargetCount, setNewTargetCount] = useState(1)
  const [missionPlaceholder] = useState(() => getRandomQuoteForPage('general'))
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All')
  // קטגוריה שנגררת כרגע — משמשת ל-DragOverlay: התצוגה "נצמדת" לעכבר (transform-based, 60FPS).
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  // משימה שנגררת כרגע — להצגה ב-DragOverlay; שחרור על קטגוריה אחרת מעדכן את mission.category.
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null)
  // תיקיית "General" — להצגה/הסתרה של הקטגוריות שבתוכה (Work, Personal וכו').
  const [generalFolderExpanded, setGeneralFolderExpanded] = useState(true)
  // תיקיית "Goals" — להצגה/הסתרה.
  const [goalsFolderExpanded, setGoalsFolderExpanded] = useState(true)
  // הוספת קטגוריה חדשה: לחיצה על "+" מציגה שדה בתחתית הרשימה; Enter מוסיף את השם ל-categoriesOrder (ומופיע גם בבורר קטגוריה בטופס משימה).
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showAddMissionForm, setShowAddMissionForm] = useState(false)
  /** משימה שנמצאת בעריכה — לא מוסרים מהרשימה עד "Keep changes"; ביטול או עריכת משימה אחרת מחזירה אותה. */
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null)
  const newCategoryInputRef = useRef<HTMLInputElement>(null)
  // מסננים בתצוגת "Completed missions": קטגוריה + טווח תאריכים (אחרון יום/שבוע/חודש או לוח שנה).
  const [completedCategoryFilter, setCompletedCategoryFilter] = useState<string>('All')
  const [completedDateFilter, setCompletedDateFilter] = useState<'all' | 'last_day' | 'last_week' | 'last_month' | 'custom'>('all')
  const [completedDateFrom, setCompletedDateFrom] = useState('')
  const [completedDateTo, setCompletedDateTo] = useState('')
  const [completedRecurrenceFilter, setCompletedRecurrenceFilter] = useState<'all' | Recurrence>('all')
  const completedDateFromRef = useRef<HTMLInputElement>(null)
  const completedDateToRef = useRef<HTMLInputElement>(null)

  const closeAddMissionFormAndReset = useCallback(() => {
    setShowAddMissionForm(false)
    setEditingMissionId(null)
    setNewTitle('')
    setNewCategory('')
    setCategoryError(false)
    setNewRecurrence('')
    setRecurrenceError(false)
    setHours(0)
    setMinutes(30)
    setNewTargetCount(1)
  }, [])

  const selectCategory = useCallback(
    (filter: string) => {
      if (showAddMissionForm) closeAddMissionFormAndReset()
      setSelectedCategoryFilter(filter)
    },
    [showAddMissionForm, closeAddMissionFormAndReset],
  )

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
    if (completedDateFilter !== 'custom' || !completedDateFrom) return
    const t = setTimeout(() => completedDateToRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [completedDateFilter, completedDateFrom])

  // במהלך גרירת משימה: user-select: none על body — מונע הדגשת טקסט כחולה (כמו בקטגוריות).
  useEffect(() => {
    if (!activeMissionId) return
    const prev = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.userSelect = prev
    }
  }, [activeMissionId])

  // סדר קטגוריות לתצוגה/מיון — כולל "General", קטגוריות רגילות, ויעדים (Goals) כדי שיופיעו ב־All.
  const categoryOrderForData = useMemo(
    () => [CATEGORIES_FOLDER_NAME, ...categoriesOrder, ...goalsList.map((g) => `goal:${g.id}`)],
    [categoriesOrder, goalsList],
  )

  // מיון: קודם לא הושלמו ואז הושלמו; בתוך כל קטגוריה לפי orderInCategory (סדר שנשמר מגרירה).
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
        const oa = a.orderInCategory ?? 0
        const ob = b.orderInCategory ?? 0
        if (oa !== ob) return oa - ob
        return a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1
      })
      result.push(...sorted)
    }
    return result
  }, [missions, categoryOrderForData])
  // חיישנים ל־dnd-kit: גרירה עם עכבר (מרחק 5px כדי לא להפעיל בטעות), ומקלדת.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  // מודיפיירים (מגבלות תנועה):
  // - restrictToVerticalAxis: גרירה רק לאורך ציר Y — הפריט לא יזוז אופקית.
  // - restrictToParentElement: הגבלה לגבולות האלמנט האב של הפריט (סרגל הקטגוריות) — אי אפשר לגרור מחוץ ל-sidebar.
  const categoryModifiers = [restrictToVerticalAxis, restrictToParentElement]
  // משימות: רק ציר אנכי כדי לאפשר גרירה בין קטגוריות (לא restrictToParentElement).
  const missionModifiers = [restrictToVerticalAxis]

  // כמו קטגוריות: closestCenter. מסננים את הפריט הנגרר (placeholder ב-DOM). כשהמצביע בין שתי משימות — מעדיפים משימות על פני האזור (DroppableSection) כדי שההשמה תהיה "בין" משימות ולא בסוף הקטגוריה.
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

  // משימות לתצוגה — מסתירים את המשימה שנמצאת בעריכה (מופיעה בטופס).
  const missionsForDisplay = useMemo(
    () => (editingMissionId ? sortedMissions.filter((m) => m.id !== editingMissionId) : sortedMissions),
    [sortedMissions, editingMissionId],
  )

  // משימות שהושלמו — לאחר סינון קטגוריה, תאריך וחזרה (רק כשנמצאים ב־"Completed missions").
  const completedMissionsFiltered = useMemo(() => {
    const completed = missionsForDisplay.filter((m) => m.isCompleted)
    const byCategory =
      completedCategoryFilter === 'All'
        ? completed
        : completed.filter((m) => m.category === completedCategoryFilter)
    const byRecurrence =
      completedRecurrenceFilter === 'all'
        ? byCategory
        : byCategory.filter((m) => m.recurrence === completedRecurrenceFilter)
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
    missionsForDisplay,
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

  // רשימה לסינון: All / קטגוריה / goal:id = רק משימות שלא הושלמו; "Completed missions" = רק הושלמו.
  const displayedMissions = useMemo(() => {
    if (selectedCategoryFilter === COMPLETED_MISSIONS_FILTER) return completedMissionsFiltered
    if (selectedCategoryFilter === 'All') return missionsForDisplay.filter((m) => !m.isCompleted)
    if (selectedCategoryFilter.startsWith(GOAL_FILTER_PREFIX)) {
      const goalId = selectedCategoryFilter.slice(GOAL_FILTER_PREFIX.length)
      return missionsForDisplay.filter((m) => !m.isCompleted && m.goalId === goalId)
    }
    return missionsForDisplay.filter((m) => m.category === selectedCategoryFilter && !m.isCompleted)
  }, [missionsForDisplay, selectedCategoryFilter, completedMissionsFiltered])

  // כשמציגים "All": קיבוץ משימות שלא הושלמו לפי קטגוריה; משימות שהושלמו מוצגות רק ב־"Completed missions".
  const missionsGroupedByCategory = useMemo(() => {
    if (selectedCategoryFilter !== 'All') return null
    const activeOnly = missionsForDisplay.filter((m) => !m.isCompleted)
    const byCategory = new Map<string, Mission[]>()
    for (const m of activeOnly) {
      const list = byCategory.get(m.category) ?? []
      list.push(m)
      byCategory.set(m.category, list)
    }
    return categoryOrderForData
      .filter((cat) => (byCategory.get(cat)?.length ?? 0) > 0)
      .map((cat) => ({ category: cat, missions: byCategory.get(cat)! }))
  }, [missionsForDisplay, selectedCategoryFilter, categoryOrderForData])

  // הוספת משימה חדשה או שמירת עריכה — משימה משתנה רק אחרי לחיצה כאן. קטגוריה חייבת להיות תקפה (לא "Choose category").
  const handleAdd = () => {
    if (!newTitle.trim()) return
    const target = newTargetCount >= 1 ? newTargetCount : 1
    const durationStr = `${hours}h ${minutes}m`
    const isCategoryValid =
      newCategory !== '' &&
      (categoriesOrder.includes(newCategory) ||
        (newCategory.startsWith(GOAL_FILTER_PREFIX) && goalsList.some((g) => `goal:${g.id}` === newCategory)))
    const validRecurrences: Recurrence[] = ['none', 'daily', 'weekly']
    const isRecurrenceValid = newRecurrence !== '' && validRecurrences.includes(newRecurrence as Recurrence)
    if (editingMissionId) {
      setMissions((prev) =>
        prev.map((m) =>
          m.id === editingMissionId
            ? {
                ...m,
                title: newTitle.trim(),
                category: newCategory,
                recurrence: newRecurrence as Recurrence,
                duration: durationStr,
                targetCount: target,
                progressCount: m.progressCount ?? (target ? 0 : undefined),
                goalId: newCategory.startsWith(GOAL_FILTER_PREFIX) ? newCategory.slice(GOAL_FILTER_PREFIX.length) : undefined,
              }
            : m,
        ),
      )
      setEditingMissionId(null)
    } else {
      setCategoryError(!isCategoryValid)
      setRecurrenceError(!isRecurrenceValid)
      if (!isCategoryValid || !isRecurrenceValid) return
      setMissions((prev) => {
        const inCategory = prev.filter((m) => m.category === newCategory)
        const nextOrder = inCategory.length === 0 ? 0 : Math.max(...inCategory.map((m) => m.orderInCategory ?? 0)) + 1
        return [
          {
            id: uuidv4(),
            title: newTitle.trim(),
            category: newCategory,
            recurrence: newRecurrence as Recurrence,
            duration: durationStr,
            targetCount: target,
            progressCount: target ? 0 : undefined,
            createdAt: new Date().toISOString(),
            isCompleted: false,
            orderInCategory: nextOrder,
            goalId: newCategory.startsWith(GOAL_FILTER_PREFIX) ? newCategory.slice(GOAL_FILTER_PREFIX.length) : undefined,
          },
          ...prev,
        ]
      })
    }
    setNewTitle('')
    setNewCategory('')
    setCategoryError(false)
    setNewRecurrence('')
    setRecurrenceError(false)
    setHours(0)
    setMinutes(30)
    setNewTargetCount(1)
    setShowAddMissionForm(false)
  }

  // מחיקה לפי id
  const handleDelete = (id: string) => {
    setMissions((prev) => prev.filter((mission) => mission.id !== id))
  }

  // עריכה: לא מוסרים את המשימה — רק ממלאים את הטופס ומסתירים אותה מהרשימה; ביטול או עריכת משימה אחרת מחזיר אותה.
  const handleEdit = (mission: Mission) => {
    setEditingMissionId(mission.id)
    const durationMatch = mission.duration.match(/(\d+)h\s*(\d+)m/)
    const hours = durationMatch ? parseInt(durationMatch[1], 10) : 0
    const minutes = durationMatch ? parseInt(durationMatch[2], 10) : 30
    setNewTitle(mission.title)
    setNewCategory(mission.category)
    setNewRecurrence(mission.recurrence)
    setHours(hours)
    setMinutes(minutes)
    setNewTargetCount(mission.targetCount ?? 1)
    setShowAddMissionForm(true)
  }

  /**
   * "סימון" משימה:
   * - אם אין targetCount: לחיצה אחת מסיימת (isCompleted=true)
   * - אם יש targetCount: כל לחיצה מעלה progressCount ב-1
   *   וכשמגיעים ליעד -> מסיימים
   */
  /**
   * שחרור משימה — לוגיקה מאוחדת עם גרירת קטגוריות (closestCenter, layout animation):
   * - אותה קטגוריה: שינוי מקום — מעדכן orderInCategory; פריטים גולשים (layout) ליצירת רווח.
   * - קטגוריה אחרת: מעבר לקטגוריה + מיקום לפי מקום השחרור (על משימה = הכנסה שם; על אזור = סוף).
   */
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
      // שינוי סדר בתוך אותה קטגוריה
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

    if (!sameCategory) {
      // "Completed missions" הוא מסנן בלבד — לא מעבירים משימה לקטגוריה זו.
      if (targetCategory === COMPLETED_MISSIONS_FILTER || !categoriesOrder.includes(targetCategory)) return
      // מעבר לקטגוריה אחרת — הכנסה במיקום השחרור (או בסוף אם שחרור על האזור)
      setMissions((prev) => {
        const byCat = new Map<string, Mission[]>()
        for (const m of prev) {
          if (m.id === missionId) continue
          const list = byCat.get(m.category) ?? []
          list.push(m)
          byCat.set(m.category, list)
        }
        const targetList = (byCat.get(targetCategory) ?? [])
          .sort((a, b) => (a.orderInCategory ?? 0) - (b.orderInCategory ?? 0))
        const insertIndex = isOverMission
          ? targetList.findIndex((m) => m.id === overId)
          : targetList.length
        const before = targetList.slice(0, insertIndex)
        const after = targetList.slice(insertIndex)
        const withInserted = [
          ...before,
          { ...draggedMission, category: targetCategory, orderInCategory: insertIndex },
          ...after,
        ].map((m, i) => ({ ...m, orderInCategory: i }))
        byCat.set(targetCategory, withInserted)
        const sourceList = (byCat.get(draggedMission.category) ?? [])
          .sort((a, b) => (a.orderInCategory ?? 0) - (b.orderInCategory ?? 0))
        const sourceRenumbered = sourceList.map((m, i) => ({ ...m, orderInCategory: i }))
        byCat.set(draggedMission.category, sourceRenumbered)
        const out: Mission[] = []
        for (const cat of categoriesOrder) {
          out.push(...(byCat.get(cat) ?? []))
        }
        return out
      })
    }
  }

  const submitNewCategory = () => {
    const name = newCategoryName.trim()
    if (!name || name === 'All' || name === COMPLETED_MISSIONS_FILTER || name === CATEGORIES_FOLDER_NAME) return
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

  const handleToggle = (missionId: string) => {
    setMissions((prev) => {
      return prev.map((mission) => {
        if (mission.id !== missionId) return mission

        // אם כבר הושלם, לא עושים כלום (כדי לא "להחזיר אחורה" עם checkbox)
        if (mission.isCompleted) return mission

        const completedAt = new Date().toISOString()
        // בלי יעד ספירה: מסיימים מיד
        if (!mission.targetCount) {
          return { ...mission, isCompleted: true, completedAt }
        }

        // עם יעד: מתקדמים שלב-שלב
        const current = mission.progressCount ?? 0
        if (current >= mission.targetCount) {
          return { ...mission, isCompleted: true, progressCount: mission.targetCount, completedAt }
        }

        const next = current + 1
        if (next >= mission.targetCount) {
          return { ...mission, progressCount: next, isCompleted: true, completedAt }
        }

        return { ...mission, progressCount: next }
      })
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 pt-0 pb-6 sm:px-6 lg:px-8">
      {/* ציטוט מוטיבציה — רוחב מלא כמו ההדר, רווח תחתון אוורירי (mb-12) */}
      <div className="mb-6 flex w-full items-center gap-3 rounded-lg border border-blue-500/30 bg-slate-900 px-4 py-3">
        <svg className="h-5 w-5 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className="flex-1 bg-transparent text-center text-white" aria-hidden="true">
          {missionPlaceholder}
        </span>
      </div>

      <div className="flex gap-6">
        {/* תוכן ראשי: טופס, רשימת משימות */}
        <div className="min-w-0 flex-1 space-y-6">

      {/* אזור יצירת משימה חדשה — לא מוצג ב־"Completed missions" (רק צפייה במשימות שהושלמו) */}
      {selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER && (!showAddMissionForm ? (
        <div className="rounded-2xl bg-slate-900/60">
          <button
            type="button"
            onClick={() => {
              setEditingMissionId(null)
              if (selectedCategoryFilter !== 'All' && selectedCategoryFilter !== COMPLETED_MISSIONS_FILTER) {
                setNewCategory(selectedCategoryFilter)
              } else {
                setNewCategory('')
              }
              setShowAddMissionForm(true)
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-600 bg-slate-900/40 px-4 py-3 text-sm font-medium text-gray-300 transition hover:border-blue-500/50 hover:bg-slate-800/60 hover:text-white"
            aria-expanded="false"
            aria-controls="add-mission-form"
            id="add-mission-toggle"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Mission
          </button>
        </div>
      ) : (
        <div id="add-mission-form" className="space-y-4 rounded-2xl border border-gray-800 bg-slate-900/60 p-4" aria-labelledby="add-mission-toggle">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="Add a new mission"
              className="flex-1 rounded-xl border border-gray-700 bg-slate-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value)
                setCategoryError(false)
              }}
              className={`rounded-xl border bg-slate-900 px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 ${
                categoryError
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
              }`}
              aria-label="Category"
              aria-invalid={categoryError}
            >
              {!editingMissionId && selectedCategoryFilter === 'All' && (
                <option value="">Choose category</option>
              )}
              {categoriesOrder.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {goalsList.map((g) => (
                <option key={g.id} value={`goal:${g.id}`}>{g.title}</option>
              ))}
            </select>
            <select
              value={newRecurrence}
              onChange={(e) => {
                setNewRecurrence(e.target.value as Recurrence | '')
                setRecurrenceError(false)
              }}
              className={`rounded-xl border bg-slate-900 px-4 py-3 text-white focus:outline-none focus:ring-1 ${
                recurrenceError
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500'
              }`}
              aria-label="Repeated time frame"
              aria-invalid={recurrenceError}
            >
              {!editingMissionId && (
                <option value="">Choose repeated time frame</option>
              )}
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          {/* Duration + Target Count וכפתורים — באותה שורה: Duration משמאל, Target Count + כפתורים מימין. */}
          <div className="flex flex-nowrap items-center justify-between gap-3">
            <div className="flex w-fit items-center gap-2 rounded-xl border border-gray-700 bg-slate-900 px-3 py-2">
              <span className="text-xs uppercase tracking-wide text-gray-400">Duration</span>
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
            <div className="flex flex-nowrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <span>Target Count</span>
              <input
                type="number"
                min={1}
                value={newTargetCount}
                onChange={(event) => setNewTargetCount(Math.max(1, Number(event.target.value) || 1))}
                onFocus={(e) => (e.target as HTMLInputElement).select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const n = Math.max(1, Number((e.target as HTMLInputElement).value) || 1)
                    setNewTargetCount(n)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                className="w-16 rounded-lg border border-gray-700 bg-slate-900 px-2 py-1 text-center text-white"
                aria-label="Target count"
              />
            </label>
            <button
              type="button"
              onClick={handleAdd}
              className="rounded-xl bg-blue-600 px-5 py-3 text-[13px] font-normal uppercase tracking-wider text-white transition hover:bg-blue-500"
            >
              {editingMissionId ? 'Keep changes' : 'Add Mission'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingMissionId(null)
                setNewTitle('')
                setNewCategory('')
                setCategoryError(false)
                setNewRecurrence('')
                setRecurrenceError(false)
                setHours(0)
                setMinutes(30)
                setNewTargetCount(1)
                setShowAddMissionForm(false)
              }}
              className="rounded-xl border border-red-800/80 bg-red-800/80 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700/90 hover:border-red-700/90"
            >
              Cancel
            </button>
            </div>
          </div>
        </div>
      ))}

      {/* שורת מסננים מעל רשימת "Completed missions": קטגוריה + טווח תאריכים (אחרון יום/שבוע/חודש או לוח שנה). */}
      {selectedCategoryFilter === COMPLETED_MISSIONS_FILTER && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <span>Category</span>
            <select
              value={completedCategoryFilter}
              onChange={(e) => setCompletedCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="rounded-lg border border-gray-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* מצב ריק: אותו בלוק כשאין משימות בכלל או שאין משימות בקטגוריה הנבחרת */}
      {displayedMissions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-slate-900/40 py-16 text-center">
          <div className="mb-4 flex h-24 w-24 items-center justify-center text-7xl leading-none opacity-65" aria-hidden="true">
            🎯
          </div>
          <p className="text-gray-300">
            {selectedCategoryFilter === 'All'
              ? 'No active missions yet. Create one above to get started!'
              : selectedCategoryFilter === COMPLETED_MISSIONS_FILTER
                ? 'No completed missions yet.'
                : selectedCategoryFilter.startsWith(GOAL_FILTER_PREFIX)
                  ? `No missions for ${getGoalById(selectedCategoryFilter.slice(GOAL_FILTER_PREFIX.length))?.title ?? 'this goal'} yet. Create one above or choose another goal.`
                  : `No missions in ${selectedCategoryFilter} yet. Create one above or choose another category.`}
          </p>
        </div>
      ) : (
      /*
        גרירת משימות — מאוחדת עם לוגיקת הקטגוריות (Category drag) לעקביות:
        - אותם חיישנים, collisionDetection (closestCenter), verticalListSortingStrategy — תנועה רציפה בין קבוצות.
        - כל קבוצת קטגוריה היא SortableContext; פריטים גולשים (layout animation) בלבד.
        - user-select: none במהלך גרירה — מונע הדגשת טקסט כחולה.
      */
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
        {(missionsGroupedByCategory ?? (selectedCategoryFilter === COMPLETED_MISSIONS_FILTER && completedMissionsGroupedByCategory)) ? (
          /* מצב "All" (פעיל או Completed): קיבוץ לפי קטגוריה עם כותרת לכל קבוצה. */
          <div className="space-y-6">
            {(missionsGroupedByCategory ?? completedMissionsGroupedByCategory!)!.map(({ category, missions }) => (
              <section key={category} className="space-y-3" aria-labelledby={`category-${category}`}>
                <h2 id={`category-${category}`} className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                  {category.startsWith(GOAL_FILTER_PREFIX) ? getGoalById(category.slice(GOAL_FILTER_PREFIX.length))?.title ?? category : category}
                </h2>
                <DroppableSection category={category} className="space-y-3" showDropIndicator={false}>
                  <SortableContext items={missions.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                    {missions.map((mission) => (
                      <SortableMissionCard
                        key={mission.id}
                        mission={mission}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                        getGoalById={getGoalById}
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
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  getGoalById={getGoalById}
                />
              ))}
            </SortableContext>
          </DroppableSection>
        )}
        {/* כמו קטגוריות: פריט נגרר זהה בגודל ובסגנון למקור, שקיפות/צל עדין בלבד — בלי rotate/scale. */}
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          modifiers={missionModifiers}
        >
          {activeMissionId ? (() => {
            const m = missions.find((mission) => mission.id === activeMissionId)
            const overlayCategoryLabel =
              m?.category.startsWith(GOAL_FILTER_PREFIX) && getGoalById
                ? getGoalById(m.goalId ?? m.category.slice(GOAL_FILTER_PREFIX.length))?.title ?? m?.category
                : m?.category
            return m ? (
              <div className="flex cursor-grabbing items-center justify-between rounded-xl border border-gray-700 bg-slate-800/95 px-4 py-3 shadow-lg">
                <span className="shrink-0 rounded p-1 text-gray-400">
                  <DragHandleIcon className="h-3.5 w-3" />
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium leading-tight text-white">{m.title}</p>
                    <p className="text-xs text-gray-400">
                      {overlayCategoryLabel} • {m.recurrence !== 'none' ? m.recurrence : 'One-time'} • Duration: {m.duration}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300">
                  {m.recurrence !== 'none' ? m.recurrence : 'One-time'}
                </span>
              </div>
            ) : null
          })() : null}
        </DragOverlay>
      </DndContext>
      )}
        </div>

      {/*
        סרגל ניווט ימני: קטגוריות עם גרירה לשינוי סדר. All קבוע למעלה; השאר ניתנים לגרירה (ידית בלבד).
        אופטימיזציות גרירה:
        - ביצועים (60FPS): שימוש ב-DragOverlay — הפריט הנגרר מוצג בשכבת overlay ונע עם transform לפי מיקום העכבר (מעקב צמוד).
        - מגבלות: modifiers — restrictToVerticalAxis (תנועה רק אנכית), restrictToParentElement (לא יוצאים מגבולות רשימת הקטגוריות).
        - מעברים: transition על פריטי הרשימה + dropAnimation ב-DragOverlay למעבר חלק בשחרור.
      */}
        <aside className="flex w-48 shrink-0 flex-col rounded-xl border border-gray-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Categories</p>
          {generalFolderExpanded && (
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-slate-700 hover:text-white"
              aria-label="Add category"
            >
              +
            </button>
          )}
        </div>
        <nav className="flex min-h-0 flex-1 flex-col" aria-label="Filter by category">
          <div className="border-b border-gray-700">
            <button
              type="button"
              onClick={() => selectCategory('All')}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                selectedCategoryFilter === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={categoryModifiers}
              onDragStart={(event: DragStartEvent) => {
                setActiveCategory(event.active.id as string)
              }}
              onDragEnd={(event: DragEndEvent) => {
                setActiveCategory(null)
                const { active, over } = event
                if (!over || active.id === over.id) return
                const activeId = active.id as string
                const overId = over.id as string
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
              onDragCancel={(_event: DragCancelEvent) => {
                setActiveCategory(null)
              }}
            >
              {/* General = תיקייה (לא קטגוריה) — לחיצה מציגה/מסתירה את הקטגוריות שבתוכה. */}
              <div className="border-b border-gray-700">
                <button
                  type="button"
                  onClick={() => setGeneralFolderExpanded((e) => !e)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-gray-300 transition hover:bg-slate-800 hover:text-white"
                  aria-expanded={generalFolderExpanded}
                  aria-label={generalFolderExpanded ? 'Collapse General folder' : 'Expand General folder'}
                >
                  <FolderIcon open={generalFolderExpanded} className="h-4 w-4 shrink-0 text-amber-500/90" />
                  <span className="min-w-0 flex-1">{CATEGORIES_FOLDER_NAME}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${generalFolderExpanded ? 'rotate-0' : '-rotate-90'}`}
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
              {generalFolderExpanded && (
                <SortableContext items={categoriesOrder} strategy={verticalListSortingStrategy}>
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
                        className="w-full rounded-lg border border-gray-600 bg-slate-800 px-2 py-2 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        aria-label="New category name"
                      />
                    </div>
                  )}
                </SortableContext>
              )}
              {/* Goals — תיקייה נפרדת (כרגע ללא תוכן). */}
              <div className="border-b border-gray-700">
                <button
                  type="button"
                  onClick={() => setGoalsFolderExpanded((e) => !e)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-gray-300 transition hover:bg-slate-800 hover:text-white"
                  aria-expanded={goalsFolderExpanded}
                  aria-label={goalsFolderExpanded ? 'Collapse Goals folder' : 'Expand Goals folder'}
                >
                  <FolderIcon open={goalsFolderExpanded} className="h-4 w-4 shrink-0 text-amber-500/90" />
                  <span className="min-w-0 flex-1">{GOALS_FOLDER_NAME}</span>
                  <svg
                    className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 ${goalsFolderExpanded ? 'rotate-0' : '-rotate-90'}`}
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
              {goalsFolderExpanded && (
                <div className="py-1">
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
              {/* Completed missions — תמיד מחוץ לתיקייה, לא בתוך General. */}
              <div className="border-t border-gray-700 pt-1">
                <button
                  type="button"
                  onClick={() => selectCategory(COMPLETED_MISSIONS_FILTER)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    selectedCategoryFilter === COMPLETED_MISSIONS_FILTER
                      ? 'bg-emerald-600/80 text-white'
                      : 'text-emerald-400 hover:bg-slate-800 hover:text-emerald-300'
                  }`}
                >
                  Completed missions
                </button>
              </div>
              <DragOverlay
                dropAnimation={{
                  duration: 200,
                  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                }}
                modifiers={categoryModifiers}
              >
                {activeCategory ? (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-slate-800/95 shadow-lg">
                    <span className="cursor-grabbing rounded p-1 text-gray-400">
                      <DragHandleIcon className="h-3.5 w-3" />
                    </span>
                    <span className="flex-1 rounded-lg px-2 py-2 text-sm font-medium text-white">
                      {getGoalById(activeCategory)?.title ?? activeCategory}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </nav>
        </aside>
      </div>
    </div>
  )
}
