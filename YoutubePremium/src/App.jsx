// src/App.jsx
import { useState } from 'react'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './hooks/useAuth'
import { useToast } from './hooks/useData'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'

import LoginView    from './views/LoginView'
import DashboardView from './views/DashboardView'
import AccountsView  from './views/AccountsView'
import CustomersView from './views/CustomersView'
import FinanceView   from './views/FinanceView'
import OrdersView    from './views/OrdersView'
import SecurityView  from './views/SecurityView'
import LogsView      from './views/LogsView'
import TrashView     from './views/TrashView'

const VIEWS = {
  '/':          DashboardView,
  '/accounts':  AccountsView,
  '/customers': CustomersView,
  '/finance':   FinanceView,
  '/orders':    OrdersView,
  '/security':  SecurityView,
  '/logs':      LogsView,
  '/trash':     TrashView,
}

function AppShell() {
  const { toasts, removeToast, success, error, warning, info } = useToast()
  const [path, setPath] = useState('/')
  const [dark, setDark] = useState(true)

  const navigate = (to) => setPath(to)
  const toggleTheme = () => setDark(d => !d)

  const ActiveView = VIEWS[path] ?? DashboardView

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0b]">
      <Sidebar
        currentPath={path}
        navigate={navigate}
        dark={dark}
        toggleTheme={toggleTheme}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-white/5 bg-[#0d0d0f]/80 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
          <div />
          <span className="text-xs text-zinc-500">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          <ActiveView
            toast={{ success, error, warning, info }}
            navigate={navigate}
          />
        </main>
      </div>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0b] gap-4">
      <div className="w-10 h-10 border-2 border-zinc-800 border-t-red-500 rounded-full animate-spin" />
      <span className="text-zinc-500 text-sm">Đang kiểm tra đăng nhập...</span>
    </div>
  )
  return user ? <AppShell /> : <LoginView />
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}