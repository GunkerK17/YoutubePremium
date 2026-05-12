// src/components/Sidebar.jsx
import { useState } from 'react'
import {
  LayoutDashboard, Play, Users, DollarSign,
  ShoppingCart, Shield, Activity, Trash2,
  ChevronLeft, ChevronRight, LogOut, Menu, X,
  Sun, Moon,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard',       icon: LayoutDashboard },
  { path: '/accounts',  label: 'Tài khoản YTB',   icon: Play            },
  { path: '/customers', label: 'Khách hàng',      icon: Users           },
  { path: '/finance',   label: 'Tài chính',       icon: DollarSign      },
  { path: '/orders',    label: 'Đơn hàng',        icon: ShoppingCart    },
  { path: '/security',  label: 'Bảo mật & Roles', icon: Shield          },
  { path: '/logs',      label: 'Activity Logs',   icon: Activity        },
  { path: '/trash',     label: 'Thùng rác',       icon: Trash2          },
]

export default function Sidebar({ currentPath = '/', navigate, dark, toggleTheme }) {
  const [collapsed,  setCollapsed]  = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut } = useAuth()

  const handleNav     = (path) => { navigate?.(path); setMobileOpen(false) }
  const handleSignOut = async () => { await signOut() }

  const NavItem = ({ path, label, icon: Icon }) => {
    const isActive = currentPath === path
    return (
      <button
        onClick={() => handleNav(path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative text-left ${
          isActive
            ? 'bg-red-600/20 text-red-400'
            : 'text-zinc-400 hover:text-white hover:bg-white/5 dark:hover:bg-white/5'
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-red-500 rounded-r-full" />
        )}
        <Icon
          size={17}
          className={`flex-shrink-0 ${isActive ? 'text-red-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}
        />
        {!collapsed && <span className="truncate">{label}</span>}

        {collapsed && (
          <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 border border-white/10 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl transition-opacity">
            {label}
          </div>
        )}
      </button>
    )
  }

  const Content = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/40">
                <Play size={14} className="text-white fill-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide leading-none">YTB</p>
                <p className="text-red-400 text-[10px] tracking-widest uppercase leading-none mt-0.5">Premium</p>
              </div>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-white/5"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
            <Play size={14} className="text-white fill-white" />
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => <NavItem key={item.path} {...item} />)}
      </nav>

      <div className="px-2 py-3 border-t border-white/5 space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {(user.email?.[0] || 'A').toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.email}</p>
              <p className="text-red-400 text-[10px]">Super Admin</p>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}
          title={dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
        >
          {dark
            ? <Sun  size={16} className="flex-shrink-0" />
            : <Moon size={16} className="flex-shrink-0" />
          }
          {!collapsed && (
            <span>{dark ? 'Chế độ sáng' : 'Chế độ tối'}</span>
          )}
        </button>

        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
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
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-zinc-900 border border-white/10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white shadow-lg"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-[#0d0d0f] border-r border-white/5 z-50 transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1"
        >
          <X size={18} />
        </button>
        <Content />
      </aside>

      <aside className={`hidden lg:flex flex-col h-screen sticky top-0 bg-[#0d0d0f] border-r border-white/5 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <Content />
      </aside>
    </>
  )
}
