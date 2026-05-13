// src/views/DashboardView.jsx
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  LayoutDashboard,
  Play,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../lib/supabase'

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

const fmtShort = (n) => {
  const num = Number(n ?? 0)
  const sign = num < 0 ? '-' : ''
  const abs = Math.abs(num)

  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`
  return `${sign}${abs}`
}

const sumBy = (arr, key) =>
  arr.reduce((sum, item) => sum + Number(item?.[key] ?? 0), 0)

function StatCard({ icon: Icon, label, value, color = 'red', sub, featured = false }) {
  const colors = {
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-400',
      icon: 'text-red-400',
      glow: 'shadow-red-950/20',
    },
    green: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-400',
      icon: 'text-green-400',
      glow: 'shadow-green-950/20',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-400',
      icon: 'text-yellow-400',
      glow: 'shadow-yellow-950/20',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      icon: 'text-blue-400',
      glow: 'shadow-blue-950/20',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      icon: 'text-purple-400',
      glow: 'shadow-purple-950/20',
    },
    zinc: {
      bg: 'bg-zinc-500/10',
      border: 'border-zinc-500/20',
      text: 'text-zinc-400',
      icon: 'text-zinc-400',
      glow: 'shadow-black/20',
    },
  }

  const c = colors[color] ?? colors.red

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${c.border} bg-[#111113] ${
        featured ? `p-6 min-h-[150px] shadow-2xl ${c.glow}` : 'p-5 min-h-[116px]'
      } flex flex-col justify-between hover:bg-[#141416] transition-all`}
    >
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/[0.025]" />

      <div className="flex items-start justify-between gap-3 relative">
        <div
          className={`rounded-xl ${c.bg} flex items-center justify-center ${
            featured ? 'w-12 h-12' : 'w-9 h-9'
          }`}
        >
          <Icon size={featured ? 21 : 16} className={c.icon} />
        </div>

        {featured && (
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
            Ưu tiên
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <p
          className={`font-black tracking-tight ${c.text} ${
            featured ? 'text-3xl lg:text-4xl' : 'text-2xl'
          }`}
        >
          {value}
        </p>

        <p
          className={`mt-1 font-bold ${
            featured ? 'text-sm text-zinc-300' : 'text-xs text-zinc-500'
          }`}
        >
          {label}
        </p>

        {sub && (
          <p
            className={`${
              featured ? 'text-xs' : 'text-[10px]'
            } text-zinc-600 mt-1 leading-relaxed`}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

function AlertPanel({ stats, navigate }) {
  const items = [
    {
      label: 'Sắp hết hạn',
      value: stats.expiring,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      action: () => navigate?.('/accounts'),
    },
    {
      label: 'Hết hạn',
      value: stats.expired,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      action: () => navigate?.('/accounts'),
    },
    {
      label: 'Khách hàng',
      value: stats.totalCustomers,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      action: () => navigate?.('/customers'),
    },
    {
      label: 'Tổng tài khoản',
      value: stats.total,
      color: 'text-zinc-300',
      bg: 'bg-white/5',
      border: 'border-white/10',
      action: () => navigate?.('/accounts'),
    },
  ]

  return (
    <div className="bg-[#111113] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-sm">Cần chú ý</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Những mục nên xử lý trước
          </p>
        </div>

        <AlertTriangle size={17} className="text-yellow-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`text-left rounded-xl border ${item.border} ${item.bg} p-3 hover:scale-[1.02] transition-transform`}
          >
            <p className={`text-2xl font-black ${item.color}`}>
              {item.value}
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              {item.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
}

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

export default function DashboardView({ toast, navigate }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [chart, setChart] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const { data: profitRows, error: profitError } = await supabase
        .from('account_profit_view')
        .select(`
          id,
          status,
          customer_status,
          customer_name,
          supplier,
          source_start_date,
          current_source_expiry,
          old_customer_expiry,
          customer_expiry,
          revenue_vnd,
          revenue_usd,
          current_paid_source_cost_vnd,
          projected_source_cost_vnd,
          current_profit_vnd,
          projected_profit_vnd
        `)

      if (profitError) throw profitError

      const rows = profitRows ?? []

      const total = rows.length
      const active = rows.filter((a) => a.status === 'active').length
      const expiring = rows.filter((a) => a.status === 'expiring').length
      const expired = rows.filter((a) => a.status === 'expired').length

      const totalRevenue = sumBy(rows, 'revenue_vnd')
      const totalRevenueUsd = sumBy(rows, 'revenue_usd')

      const currentCost = sumBy(rows, 'current_paid_source_cost_vnd')
      const projectedCost = sumBy(rows, 'projected_source_cost_vnd')

      const currentProfit = sumBy(rows, 'current_profit_vnd')
      const projectedProfit = sumBy(rows, 'projected_profit_vnd')

      const totalCustomers = new Set(
        rows
          .map((r) => String(r.customer_name ?? '').trim())
          .filter(Boolean)
      ).size

      setStats({
        total,
        active,
        expiring,
        expired,
        totalRevenue,
        totalRevenueUsd,
        currentCost,
        projectedCost,
        currentProfit,
        projectedProfit,
        totalCustomers,
      })

      const thisYear = new Date().getFullYear()

      const monthData = MONTHS.map((month) => ({
        month,
        revenue: 0,
        profit: 0,
      }))

      rows.forEach((row) => {
        const dateValue =
          row.source_start_date ||
          row.old_customer_expiry ||
          row.customer_expiry

        if (!dateValue) return

        const date = new Date(dateValue)
        if (Number.isNaN(date.getTime())) return

        if (date.getFullYear() === thisYear) {
          const monthIndex = date.getMonth()
          monthData[monthIndex].revenue += Number(row.revenue_vnd ?? 0)
          monthData[monthIndex].profit += Number(row.projected_profit_vnd ?? 0)
        }
      })

      setChart(monthData)

      const supplierMap = {}

      rows.forEach((row) => {
        const name = row.supplier || 'Không rõ'

        if (!supplierMap[name]) {
          supplierMap[name] = {
            name,
            count: 0,
            profit: 0,
            revenue: 0,
            cost: 0,
          }
        }

        supplierMap[name].count += 1
        supplierMap[name].profit += Number(row.projected_profit_vnd ?? 0)
        supplierMap[name].revenue += Number(row.revenue_vnd ?? 0)
        supplierMap[name].cost += Number(row.projected_source_cost_vnd ?? 0)
      })

      setSuppliers(
        Object.values(supplierMap)
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 5)
      )
    } catch (err) {
      toast?.error?.('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const statusDist = [
    { name: 'Còn hạn', value: stats.active, color: '#22c55e' },
    { name: 'Sắp hết hạn', value: stats.expiring, color: '#f59e0b' },
    { name: 'Hết hạn', value: stats.expired, color: '#ef4444' },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <StatCard
          featured
          icon={Zap}
          label="Lợi nhuận dự kiến"
          value={fmtShort(stats.projectedProfit) + 'đ'}
          color={stats.projectedProfit >= 0 ? 'green' : 'red'}
          sub="Doanh thu - vốn dự kiến phải gia hạn nguồn"
        />

        <StatCard
          featured
          icon={TrendingUp}
          label="Tổng doanh thu"
          value={fmtShort(stats.totalRevenue) + 'đ'}
          color="blue"
          sub={`≈ $${Number(stats.totalRevenueUsd || 0).toFixed(2)}`}
        />

        <StatCard
          featured
          icon={DollarSign}
          label="Vốn dự kiến"
          value={fmtShort(stats.projectedCost) + 'đ'}
          color="yellow"
          sub="Tổng vốn cần chi tới hết hạn khách"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Zap}
          label="Lợi nhuận hiện tại"
          value={fmtShort(stats.currentProfit) + 'đ'}
          color={stats.currentProfit >= 0 ? 'green' : 'red'}
          sub="Doanh thu - vốn đã chi"
        />

        <StatCard
          icon={DollarSign}
          label="Vốn đã chi"
          value={fmtShort(stats.currentCost) + 'đ'}
          color="zinc"
        />

        <StatCard
          icon={Users}
          label="Khách hàng"
          value={stats.totalCustomers}
          color="purple"
        />

        <StatCard
          icon={Play}
          label="Tổng tài khoản"
          value={stats.total}
          color="zinc"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={CheckCircle}
          label="Còn hạn"
          value={stats.active}
          color="green"
        />

        <StatCard
          icon={AlertTriangle}
          label="Sắp hết hạn"
          value={stats.expiring}
          color="yellow"
        />

        <StatCard
          icon={XCircle}
          label="Hết hạn"
          value={stats.expired}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#111113] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-white font-semibold text-sm">
                Doanh thu & Lợi nhuận dự kiến
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Theo tháng năm {new Date().getFullYear()}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Doanh thu
              </span>

              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Lợi nhuận
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>

                <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#71717a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => fmtShort(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#revenue)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="Lợi nhuận dự kiến"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#profit)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-1">
            Trạng thái tài khoản
          </p>
          <p className="text-zinc-500 text-xs mb-4">
            Phân bổ hiện tại
          </p>

          {statusDist.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-zinc-600 text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(v, n) => [v + ' acc', n]}
                  contentStyle={{
                    background: '#1a1a1c',
                    border: '1px solid #ffffff15',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />

                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span className="text-zinc-400 text-xs">{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-5">
          <div className="mb-4">
            <p className="text-white font-semibold text-sm">Top nguồn acc</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              Lợi nhuận dự kiến theo nhà cung cấp
            </p>
          </div>

          {suppliers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier, i) => {
                const maxProfit = Math.max(Math.abs(suppliers[0]?.profit || 1), 1)
                const pct = Math.max(
                  5,
                  Math.round((Math.abs(supplier.profit) / maxProfit) * 100)
                )

                return (
                  <div key={supplier.name} className="flex items-center gap-3">
                    <span className="text-zinc-600 text-xs w-4">
                      {i + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-300 text-xs font-medium truncate">
                          {supplier.name}
                        </span>

                        <span
                          className={`text-xs font-semibold ml-2 ${
                            supplier.profit >= 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}
                        >
                          {fmtShort(supplier.profit)}đ
                        </span>
                      </div>

                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            supplier.profit >= 0
                              ? 'bg-gradient-to-r from-green-600 to-green-400'
                              : 'bg-gradient-to-r from-red-600 to-red-400'
                          }`}
                          style={{ width: pct + '%' }}
                        />
                      </div>
                    </div>

                    <span className="text-zinc-600 text-xs">
                      {supplier.count} acc
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <AlertPanel stats={stats} navigate={navigate} />
      </div>
    </div>
  )
}