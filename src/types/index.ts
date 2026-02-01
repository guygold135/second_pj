// ============ TASKS ============
export interface Task {
  id: string
  title: string
  description?: string
  category: string
  dueDate: string
  progress: number
  statusColor: 'red-orange' | 'orange' | 'yellow-green' | 'green'
  assignee: {
    name: string
    avatarUrl?: string
  }
  isHighPriority?: boolean
  isCompleted: boolean
  completedDate?: string
  createdAt: string
  updatedAt: string
}

export interface TaskSummary {
  activeTasksCount: number
  completedTodayCount: number
  highPriorityTasksCount: number
}

// ============ BUDGET ============
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

export interface BudgetSummary {
  incomeTotal: number
  expensesTotal: number
  surplus: number
}

export interface FinanceMotivation {
  id: string
  text: string
  dateSet: string
}

// ============ GOALS ============
export interface Goal {
  id: string
  title: string
  status: 'active' | 'completed' | 'archived'
  progress?: number
  createdAt: string
  updatedAt: string
}

// ============ CONTRACTS ============
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
export interface InvestmentCalculatorState {
  investmentAmount: number
  timeframeYears: number
  selectedInvestmentPreset?: number
}

export interface InvestmentScenario {
  id: 'conservative' | 'moderate' | 'aggressive'
  name: string
  annualReturnRate: number
  iconName: string
  colorClass: string
  projectedValue: number
  totalGain: number
}

export interface ChartDataPoint {
  year: number
  conservativeValue: number
  moderateValue: number
  aggressiveValue: number
}

export interface InvestmentPreset {
  label: string
  value: number
}
