import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { loadingState } from './styles/designSystem'
import { GoalsProvider } from './contexts/GoalsContext'
import { MissionsProvider } from './contexts/MissionsContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { BudgetProvider } from './contexts/BudgetContext'
import { ToastProvider } from './components/Toast'
import { EtherealShadow } from './components/ui/ethereal-shadow'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import Budget from './pages/Budget'
import CalendarPage from './pages/CalendarPage'
import Settings from './pages/Settings'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ResetPassword from './pages/ResetPassword'

function ProtectedLayout() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 theme-bg theme-text">
        <div className={loadingState.spinner} aria-hidden />
        <span className={loadingState.inline}>Loading…</span>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/signin" replace />
  }
  return (
    <CurrencyProvider>
      <GoalsProvider>
        <MissionsProvider>
          <BudgetProvider>
            <ToastProvider>
              <Layout />
            </ToastProvider>
          </BudgetProvider>
        </MissionsProvider>
      </GoalsProvider>
    </CurrencyProvider>
  )
}

function AppRoutes() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 theme-bg theme-text">
        <div className={loadingState.spinner} aria-hidden />
        <span className={loadingState.inline}>Loading…</span>
      </div>
    )
  }
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="my-missions" element={<Navigate to="/goals" replace />} />
        <Route path="goals" element={<Goals />} />
        <Route path="budget" element={<Budget />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err }
  }

  componentDidCatch() {
    // already in state
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 theme-bg theme-text p-6 text-center">
          <p className="text-lg font-medium text-red-300">Something went wrong</p>
          <p className="max-w-md break-words text-sm text-gray-400">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <div className="relative min-h-screen theme-bg">
            <div className="fixed inset-0 z-0 h-full w-full min-h-screen">
              <EtherealShadow
                className="h-full w-full min-h-full min-w-full"
                color="rgba(15, 23, 42, 0.92)"
                animation={{ scale: 100, speed: 90 }}
                noise={{ opacity: 0.4, scale: 1.2 }}
                sizing="fill"
                showTitle={false}
              />
            </div>
            <div className="relative z-10">
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </div>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </AppErrorBoundary>
  )
}