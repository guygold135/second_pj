# Mission Flow Dashboard

A React + TypeScript + Tailwind CSS recreation of the Mission Flow productivity and financial dashboard (originally built in Bubble). Responsive UI with a clean, modern font (DM Sans).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Pages

- **Home** – Landing: hero, mission task cards, features, testimonials, CTA, footer
- **Dashboard** – Daily motivation, summary cards (Tasks, Goals, Budget, Net Worth), empty states
- **Goals** – Goal motivation input, create goal, empty state
- **Budget** – Finance motivation, income/expenses/net cashflow, add entry, empty state
- **Contract** – Test mode notice, create contract, empty state
- **Investment** – Amount & timeframe inputs, scenario cards (4% / 7% / 10%), growth chart, disclaimer
- **Settings** – Placeholder

## Data structures

See `src/types/index.ts` for:

- **Task** – id, title, category, dueDate, progress, statusColor, assignee, isHighPriority, isCompleted, etc.
- **TaskSummary** – activeTasksCount, completedTodayCount, highPriorityTasksCount
- **BudgetItem** – id, description, amount, type (income | expense), date, category, notes
- **BudgetSummary** – incomeTotal, expensesTotal, surplus
- **FinanceMotivation** – id, text, dateSet
- **Goal** – id, title, status, progress, createdAt, updatedAt
- **Contract** – id, taskId, amountCommitted, deadline, status, isTestMode, etc.
- **InvestmentCalculatorState**, **InvestmentScenario**, **ChartDataPoint**, **InvestmentPreset**

## Stack

- React 18, React Router 6, TypeScript, Vite, Tailwind CSS 4, Recharts (investment chart)
