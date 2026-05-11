// src/views/DashboardView.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  LayoutDashboard, TrendingUp, TrendingDown,
  Users, Play, ShoppingCart, DollarSign,
  AlertTriangle, CheckCircle, XCircle, Clock,
  RefreshCw, ArrowUpRight, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n ?? 0)

const fmtShort = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n ?? 0)
}

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

const STATUS_COLORS = {
  active:   '#22c55e',
  expiring: '#f59e0b',
  expired:  '#ef4444',
}

const PIE_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7']

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'red', trend }) {
  const colors = {
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    icon: 'text-red-400'    },
    green:  { bg: 'bg-green-500/10',  border: 'border-green-500/20',  text: 'text-green-400',  icon: 'text-green-400'  },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: 'text-yellow-400' },
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   icon: 'text-blue-400'   },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'text-purple-400' },
    zinc:   { bg: 'bg-zinc-500/10',   border: 'border-zinc-500/20',   text: 'text-zinc-400',   icon: 'text-zinc-400'   },
  }
  const c = colors[color] ?? colors.red

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-[#111113] p-5 flex flex-col gap-3 hover:bg-[#141416] transition-colors`}>
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={16} className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className={`text-2xl font-bold tracking-tight ${c.text}`}>{value}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
        {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
}

// ── Custom Tooltip ────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1c] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtShort(p.value)}đ
        </p>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function DashboardView({ toast, navigate }) {
  const [loading,  setLoading]  = useState(true)
  const [stats,    setStats]    = useState(null)
  const [chart,    setChart]    = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  // ── Fetch All ─────────────────────────────────────────────
  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)

    try {
      const [
        { data: accounts },
        { data: orders },
        { data: customers },
      ] = await Promise.all([
        supabase.from('accounts').select('status, cost_price, sell_price, profit, supplier, created_at, expiry_date'),
        supabase.from('orders').select('sell_price, status, created_at, customer_gmail, package').order('created_at', { ascending: false }),
        supabase.from('customers').select('id'),
      ])

      // ── Stats ──────────────────────────────────────────
      const total    = accounts?.length ?? 0
      const active   = accounts?.filter(a => a.status === 'active').length   ?? 0
      const expiring = accounts?.filter(a => a.status === 'expiring').length ?? 0
      const expired  = accounts?.filter(a => a.status === 'expired').length  ?? 0

      const totalCost    = accounts?.reduce((s, a) => s + Number(a.cost_price  ?? 0), 0) ?? 0
      const totalRevenue = accounts?.reduce((s, a) => s + Number(a.sell_price  ?? 0), 0) ?? 0
      const totalProfit  = accounts?.reduce((s, a) => s + Number(a.profit      ?? 0), 0) ?? 0

      setStats({
        total, active, expiring, expired,
        totalCost, totalRevenue, totalProfit,
        totalCustomers: customers?.length ?? 0,
        totalOrders:    orders?.length    ?? 0,
      })

      // ── Chart: doanh thu & lợi nhuận theo tháng ────────
      const thisYear = new Date().getFullYear()
      const monthData = MONTHS.map((m, i) => ({
        month: m,
        revenue: 0,
        profit:  0,
      }))
      accounts?.forEach(a => {
        const d = new Date(a.created_at)
        if (d.getFullYear() === thisYear) {
          const mi = d.getMonth()
          monthData[mi].revenue += Number(a.sell_price ?? 0)
          monthData[mi].profit  += Number(a.profit     ?? 0)
        }
      })
      setChart(monthData)

      // ── Top suppliers ───────────────────────────────────
      const supMap = {}
      accounts?.forEach(a => {
        const s = a.supplier || 'Không rõ'
        if (!supMap[s]) supMap[s] = { name: s, count: 0, profit: 0 }
        supMap[s].count  += 1
        supMap[s].profit += Number(a.profit ?? 0)
      })
      setSuppliers(Object.values(supMap).sort((a, b) => b.profit - a.profit).slice(0, 5))

      // ── Recent orders ───────────────────────────────────
      setRecentOrders(orders?.slice(0, 6) ?? [])

    } catch (err) {
      toast?.error?.('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )

  const statusDist = [
    { name: 'Còn hạn',      value: stats.active,   color: '#22c55e' },
    { name: 'Sắp hết hạn',  value: stats.expiring, color: '#f59e0b' },
    { name: 'Hết hạn',      value: stats.expired,  color: '#ef4444' },
  ].filter(d => d.value > 0)

  const orderStatusColor = {
    pending:    'text-yellow-400 bg-yellow-400/10',
    processing: 'text-blue-400 bg-blue-400/10',
    completed:  'text-green-400 bg-green-400/10',
    refunded:   'text-purple-400 bg-purple-400/10',
    error:      'text-red-400 bg-red-400/10',
  }
  const orderStatusLabel = {
    pending:    'Chờ xử lý',
    processing: 'Đang nâng cấp',
    completed:  'Hoàn thành',
    refunded:   'Refund',
    error:      'Lỗi',
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={18} className="text-red-400" />
          <h1 className="text-white font-bold text-lg">Dashboard</h1>
        </div>
        <button
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Stat Cards Row 1 — Tài khoản */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Play}         label="Tổng tài khoản"     value={stats.total}    color="zinc"   />
        <StatCard icon={CheckCircle}  label="Còn hạn"            value={stats.active}   color="green"  />
        <StatCard icon={AlertTriangle} label="Sắp hết hạn"       value={stats.expiring} color="yellow" />
        <StatCard icon={XCircle}      label="Hết hạn"            value={stats.expired}  color="red"    />
      </div>

      {/* Stat Cards Row 2 — Tài chính */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign}   label="Tổng vốn"           value={fmtShort(stats.totalCost) + 'đ'}     color="zinc"   />
        <StatCard icon={TrendingUp}   label="Tổng doanh thu"     value={fmtShort(stats.totalRevenue) + 'đ'}  color="blue"   />
        <StatCard icon={Zap}          label="Tổng lợi nhuận"     value={fmtShort(stats.totalProfit) + 'đ'}   color="green"  />
        <StatCard icon={Users}        label="Khách hàng"         value={stats.totalCustomers}                color="purple" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area Chart — Doanh thu & Lợi nhuận */}
        <div className="lg:col-span-2 bg-[#111113] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white font-semibold text-sm">Doanh thu & Lợi nhuận</p>
              <p className="text-zinc-500 text-xs mt-0.5">Theo tháng năm {new Date().getFullYear()}</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Doanh thu</span>
              <span className="flex items-center gap-1.5 text-zinc-400"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Lợi nhuận</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#ef4444" strokeWidth={2} fill="url(#revenue)" dot={false} />
              <Area type="monotone" dataKey="profit"  name="Lợi nhuận" stroke="#22c55e" strokeWidth={2} fill="url(#profit)"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart — Trạng thái tài khoản */}
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-1">Trạng thái tài khoản</p>
          <p className="text-zinc-500 text-xs mb-4">Phân bổ hiện tại</p>
          {statusDist.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-zinc-600 text-sm">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' acc', n]} contentStyle={{ background: '#1a1a1c', border: '1px solid #ffffff15', borderRadius: 12, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-zinc-400 text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Suppliers */}
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold text-sm">Top nguồn acc</p>
              <p className="text-zinc-500 text-xs mt-0.5">Lợi nhuận theo nhà cung cấp</p>
            </div>
          </div>
          {suppliers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">Chưa có dữ liệu</div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((s, i) => {
                const maxProfit = suppliers[0]?.profit || 1
                const pct = Math.round((s.profit / maxProfit) * 100)
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-zinc-600 text-xs w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-300 text-xs font-medium truncate">{s.name}</span>
                        <span className="text-green-400 text-xs font-semibold ml-2">{fmtShort(s.profit)}đ</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-700"
                          style={{ width: pct + '%' }}
                        />
                      </div>
                    </div>
                    <span className="text-zinc-600 text-xs">{s.count} acc</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white font-semibold text-sm">Đơn hàng gần đây</p>
              <p className="text-zinc-500 text-xs mt-0.5">6 đơn mới nhất</p>
            </div>
            <button
              onClick={() => navigate?.('/orders')}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Xem tất cả <ArrowUpRight size={12} />
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">Chưa có đơn hàng</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <ShoppingCart size={12} className="text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-xs font-medium truncate">{o.customer_gmail || 'Khách lẻ'}</p>
                    <p className="text-zinc-600 text-[10px]">{o.package || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-zinc-300 text-xs font-semibold">{fmtShort(o.sell_price)}đ</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${orderStatusColor[o.status] ?? 'text-zinc-400 bg-zinc-400/10'}`}>
                      {orderStatusLabel[o.status] ?? o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}