// src/App.jsx
import { useState, useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useToast } from './hooks/useData'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'

// ── Views ────────────────────────────────────────────────────
import DashboardView  from './views/Dashboardview'
import AccountsView   from './views/Accountsview'
import CustomersView  from './views/Customersview'
import FinanceView    from './views/Financeview'
import OrdersView     from './views/OrdersView'
import SecurityView   from './views/SecurityView'
import LogsView       from './views/LogsView'
import LoginView      from './views/Loginview'

const VIEWS = {
  '/':          DashboardView,
  '/accounts':  AccountsView,
  '/customers': CustomersView,
  '/finance':   FinanceView,
  '/orders':    OrdersView,
  '/security':  SecurityView,
  '/logs':      LogsView,
}

// ── Theme Hook ───────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') !== 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.add('light')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return { dark, toggleTheme: () => setDark(d => !d) }
}

// ── App Shell ────────────────────────────────────────────────
function AppShell({ dark, toggleTheme }) {
  const { toasts, removeToast, success, error, warning, info } = useToast()
  const [path, setPath] = useState('/')
  const navigate = (to) => setPath(to)

  window.__navigate    = navigate
  window.__currentPath = path

  const ActiveView = VIEWS[path] ?? DashboardView

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      <Sidebar
        currentPath={path}
        navigate={navigate}
        dark={dark}
        toggleTheme={toggleTheme}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          className="h-14 flex items-center justify-between px-6 flex-shrink-0 backdrop-blur-sm"
          style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}
        >
          <div />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-5" style={{ backgroundColor: 'var(--bg-base)' }}>
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

// ── Auth Gate ────────────────────────────────────────────────
function AuthGate({ dark, toggleTheme }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: '2px solid var(--border)', borderTopColor: '#ef4444' }}
        />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Đang kiểm tra đăng nhập...
        </span>
      </div>
    )
  }

  return user
    ? <AppShell dark={dark} toggleTheme={toggleTheme} />
    : <LoginView />
}

// ── Root ─────────────────────────────────────────────────────
// useTheme đặt ở đây để apply CSS class ngay lập tức
// trước khi bất kỳ component nào render — kể cả loading screen
export default function App() {
  const { dark, toggleTheme } = useTheme()

  return (
    <AuthProvider>
      <AuthGate dark={dark} toggleTheme={toggleTheme} />
    </AuthProvider>
  )
}