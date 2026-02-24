import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { GoalsProvider } from './contexts/GoalsContext'
import { MissionsProvider } from './contexts/MissionsContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import MyMissions from './pages/MyMissions'
import Goals from './pages/Goals'
import Budget from './pages/Budget'
import Settings from './pages/Settings'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import ResetPassword from './pages/ResetPassword'

function ProtectedLayout() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <div className="text-lg text-gray-400">Loading…</div>
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
          <Layout />
        </MissionsProvider>
      </GoalsProvider>
    </CurrencyProvider>
  )
}

function AuthRoutes() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <div className="text-lg text-gray-400">Loading…</div>
      </div>
    )
  }
  if (user) {
    return <Navigate to="/" replace />
  }
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  )
}

function AppRoutes() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <div className="text-lg text-gray-400">Loading…</div>
      </div>
    )
  }
  if (!user) {
    return <AuthRoutes />;
  }
  return (
    <Routes>
      <Route path="/" element={<ProtectedLayout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="my-missions" element={<MyMissions />} />
        <Route path="goals" element={<Goals />} />
        <Route path="budget" element={<Budget />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] p-6 text-white">
          <p className="mb-2 text-lg font-medium text-red-300">Something went wrong</p>
          <p className="mb-4 max-w-md break-all text-sm text-gray-400">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
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
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </AppErrorBoundary>
  )
}
