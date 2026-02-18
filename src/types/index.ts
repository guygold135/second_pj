// ============ TASKS ============
/**
 * Task = "משימה" אחת במערכת.
 * זה רק תיאור של המבנה של הנתונים (כמו טופס עם שדות).
 * בפועל, העמודים/הרכיבים יוצרים משימות כאלה ושומרים אותן ב-state (זיכרון זמני).
 */
export interface Task {
  // מזהה ייחודי (כדי ש-React ידע לעקוב אחרי פריטים ברשימה)
  id: string
  // הכותרת שרואים בכרטיס המשימה
  title: string
  // תיאור חופשי (לא חובה)
  description?: string
  // קטגוריה (לדוגמה: Marketing / Product)
  category: string
  // תאריך יעד (כאן נשמר כמחרוזת, למשל "24/07" או "TBD")
  dueDate: string
  // התקדמות באחוזים (0-100)
  progress: number
  // שם "מצב צבע" שמחליט איזה צבע להציג ב-UI
  statusColor: 'red-orange' | 'orange' | 'yellow-green' | 'green'
  // מי אחראי על המשימה (בגרסה הזו זה רק שם/אווטאר)
  assignee: {
    name: string
    avatarUrl?: string
  }
  // האם זו משימה דחופה/חשובה במיוחד (לא חובה)
  isHighPriority?: boolean
  // האם המשימה הושלמה
  isCompleted: boolean
  // מתי הושלמה (אם בכלל)
  completedDate?: string
  // זמני יצירה/עדכון (ISO string)
  createdAt: string
  updatedAt: string
}

/**
 * TaskSummary = סיכום קצר שמופיע בכרטיסים בדשבורד.
 * רעיון: במקום לחשב כל פעם מהמספרים של המשימות, אפשר לשמור "סיכום" מוכן.
 * (בפרויקט הזה זה כרגע נתון קבוע לדוגמה.)
 */
export interface TaskSummary {
  activeTasksCount: number
  completedTodayCount: number
  highPriorityTasksCount: number
}

// ============ BUDGET ============
/**
 * Budget category with optional icon/color and planned budget.
 */
export interface BudgetCategory {
  id: string
  name: string
  icon?: string
  color?: string
  budget: number
}

/**
 * Single transaction (income or expense).
 */
export interface BudgetTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  categoryId: string
  description?: string
  date: string
  /**
   * Used for stable ordering when multiple transactions share the same date.
   * Stored as epoch milliseconds.
   */
  createdAt?: number
}

/**
 * Budget for a time period with categories and transactions.
 */
export interface Budget {
  id: string
  name: string
  startDate: string
  endDate: string
  categories: BudgetCategory[]
  transactions: BudgetTransaction[]
}

/**
 * BudgetItem = רשומה אחת בתקציב (הכנסה או הוצאה).
 * @deprecated Prefer BudgetTransaction for new code.
 */
export interface BudgetItem {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  date: string
  category?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * BudgetSummary = סיכום מספרי שמוצג למעלה בעמוד התקציב.
 */
export interface BudgetSummary {
  incomeTotal: number
  expensesTotal: number
  surplus: number
}

/**
 * FinanceMotivation = משפט/מטרה קצרה שמזכירה "למה אני עושה את זה".
 * זה קונספט שמופיע כשדה קלט בעמוד התקציב.
 */
export interface FinanceMotivation {
  id: string
  text: string
  dateSet: string
}

// ============ GOALS ============
/**
 * Goal = יעד/מטרה שהמשתמש מגדיר לעצמו.
 * (כרגע בפרויקט זה בעיקר UI, בלי שמירה אמיתית בדאטה.)
 */
export interface Goal {
  id: string
  title: string
  status: 'active' | 'completed' | 'archived'
  progress?: number
  createdAt: string
  updatedAt: string
}

// ============ CONTRACTS ============
/**
 * Contract = "התחייבות" שמחברת משימה לסכום כסף ודדליין.
 * הרעיון: לשים כסף על הקו כדי להילחם בדחיינות.
 * (כאן זה מצב הדגמה/TEST MODE - אין תשלום אמיתי.)
 */
export interface Contract {
  id: string
  taskId: string
  amountCommitted: number
  deadline: string
  status: 'active' | 'completed_refunded' | 'failed_donated' | 'pending'
  creationDate: string
  lastUpdateDate: string
  isTestMode: boolean
}

// ============ INVESTMENT ============
/**
 * InvestmentCalculatorState = מה שהמשתמש בחר/הזין במסך ההשקעות.
 * (כמה כסף + לכמה שנים).
 */
export interface InvestmentCalculatorState {
  investmentAmount: number
  timeframeYears: number
  selectedInvestmentPreset?: number
}

/**
 * InvestmentScenario = תרחיש השקעה (שמרני/בינוני/אגרסיבי) עם אחוז תשואה שנתי
 * ומה יוצא מזה (ערך עתידי ורווח).
 */
export interface InvestmentScenario {
  id: 'conservative' | 'moderate' | 'aggressive'
  name: string
  annualReturnRate: number
  iconName: string
  colorClass: string
  projectedValue: number
  totalGain: number
}

/**
 * ChartDataPoint = נקודה אחת בגרף (שנה מסוימת) עם ערך צפוי לכל תרחיש.
 */
export interface ChartDataPoint {
  year: number
  conservativeValue: number
  moderateValue: number
  aggressiveValue: number
}

/**
 * InvestmentPreset = כפתור "בחירה מהירה" לסכום השקעה (למשל $1,000).
 */
export interface InvestmentPreset {
  label: string
  value: number
}
