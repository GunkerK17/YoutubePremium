// src/components/Sidebar.jsx
import { useState } from 'react'
import {
  LayoutDashboard,
  Play,
  Users,
  DollarSign,
  Activity,
  Trash2,
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard',     icon: LayoutDashboard },
  { path: '/accounts',  label: 'Tài khoản YTB', icon: Play },
  { path: '/customers', label: 'Khách hàng',    icon: Users },
  { path: '/finance',   label: 'Tài chính',     icon: DollarSign },
  { path: '/support',   label: 'Hỗ trợ khách',  icon: LifeBuoy },
  { path: '/logs',      label: 'Activity Logs', icon: Activity },
  { path: '/trash',     label: 'Thùng rác',     icon: Trash2 },
]

export default function Sidebar({
  currentPath = '/',
  navigate,
  dark = true,
  toggleTheme,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const { user, signOut } = useAuth()

  const handleNav = (path) => {
    navigate?.(path)
    setMobileOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const NavItem = ({ path, label, icon: Icon }) => {
    const isActive = currentPath === path

    return (
      <button
        onClick={() => handleNav(path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative text-left ${
          isActive
            ? 'bg-red-600/20 text-red-500'
            : dark
              ? 'text-zinc-400 hover:text-white hover:bg-white/5'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500 rounded-r-full" />
        )}

        <Icon
          size={17}
          className={`flex-shrink-0 ${
            isActive
              ? 'text-red-500'
              : dark
                ? 'text-zinc-500 group-hover:text-zinc-300'
                : 'text-zinc-500 group-hover:text-zinc-900'
          }`}
        />

        {!collapsed && <span className="truncate">{label}</span>}

        {collapsed && (
          <div
            className={`absolute left-full ml-3 px-2 py-1 border text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-opacity ${
              dark
                ? 'bg-zinc-800 border-white/10 text-white'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {label}
          </div>
        )}
      </button>
    )
  }

  const Content = () => (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center justify-between px-4 py-5 border-b transition-colors duration-300 ${
          dark ? 'border-white/5' : 'border-zinc-200'
        }`}
      >
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/40">
                <Play size={14} className="text-white fill-white" />
              </div>

              <div>
                <p
                  className={`font-bold text-sm tracking-wide leading-none ${
                    dark ? 'text-white' : 'text-zinc-900'
                  }`}
                >
                  YTB
                </p>
                <p className="text-red-400 text-[10px] tracking-widest uppercase leading-none mt-0.5">
                  Premium
                </p>
              </div>
            </div>

            <button
              onClick={() => setCollapsed(true)}
              className={`transition-colors p-1 rounded-md ${
                dark
                  ? 'text-zinc-500 hover:text-red-400 hover:bg-white/5'
                  : 'text-zinc-500 hover:text-red-500 hover:bg-zinc-100'
              }`}
              title="Thu gọn menu"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center hover:scale-105 transition-transform"
            title="Mở rộng menu"
          >
            <Play size={14} className="text-white fill-white" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      <div
        className={`px-2 py-3 border-t space-y-1 transition-colors duration-300 ${
          dark ? 'border-white/5' : 'border-zinc-200'
        }`}
      >
        {!collapsed && user && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 transition-colors ${
              dark ? 'bg-white/5' : 'bg-zinc-100'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(user.email?.[0] || 'A').toUpperCase()}
              </span>
            </div>

            <div className="min-w-0">
              <p
                className={`text-xs font-medium truncate ${
                  dark ? 'text-white' : 'text-zinc-900'
                }`}
              >
                {user.email}
              </p>
              <p className="text-red-400 text-[10px]">
                Super Admin
              </p>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
            collapsed ? 'justify-center' : ''
          } ${
            dark
              ? 'text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10'
              : 'text-zinc-600 hover:text-yellow-600 hover:bg-yellow-500/10'
          }`}
          title={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
        >
          {dark ? (
            <Sun size={16} className="flex-shrink-0" />
          ) : (
            <Moon size={16} className="flex-shrink-0" />
          )}

          {!collapsed && (
            <span>{dark ? 'Chế độ sáng' : 'Chế độ tối'}</span>
          )}
        </button>

        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
            collapsed ? 'justify-center' : ''
          } ${
            dark
              ? 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
              : 'text-zinc-600 hover:text-red-500 hover:bg-red-500/10'
          }`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className={`w-full flex items-center justify-center px-3 py-2 rounded-lg transition-all ${
              dark
                ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Mở rộng menu"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden fixed top-4 left-4 z-50 w-9 h-9 border rounded-lg flex items-center justify-center shadow-lg transition-colors ${
          dark
            ? 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
            : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-950'
        }`}
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-64 border-r z-50 transform transition-all duration-300 ${
          dark
            ? 'bg-[#0d0d0f] border-white/5'
            : 'bg-white border-zinc-200'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className={`absolute top-4 right-4 p-1 transition-colors ${
            dark ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <X size={18} />
        </button>

        <Content />
      </aside>

      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 border-r transition-all duration-300 flex-shrink-0 ${
          dark
            ? 'bg-[#0d0d0f] border-white/5'
            : 'bg-white border-zinc-200'
        } ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <Content />
      </aside>
    </>
  )
}