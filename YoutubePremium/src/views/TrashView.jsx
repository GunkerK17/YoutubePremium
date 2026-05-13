// src/views/TrashView.jsx
import { useState, useCallback, useEffect } from 'react'
import {
  Trash2, RotateCcw, Search, RefreshCw, AlertTriangle,
  X, ChevronLeft, ChevronRight, CheckSquare, Square,
  Clock, CheckCircle, XCircle,
} from 'lucide-react'
import { accountService } from '../services/accountService'
import { formatDate, formatVND, daysUntil, debounce } from '../lib/utils'

const PAGE_SIZE = 20

const STATUS_CONFIG = {
  active:   { label: 'Còn hạn',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)',  icon: CheckCircle },
  expiring: { label: 'Sắp hết hạn', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: Clock       },
  expired:  { label: 'Hết hạn',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  icon: XCircle     },
}

const TYPE_LABELS = {
  '1_month': '1 tháng', '3_months': '3 tháng',
  '6_months': '6 tháng', '1_year': '1 năm',
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <Icon size={11} />{cfg.label}
    </span>
  )
}

// ── Confirm Modal ────────────────────────────────────────────
function ConfirmModal({ open, onClose, onConfirm, title, description, confirmLabel = 'Xác nhận', danger = true }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#141418', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, width: '100%', maxWidth: 400,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: 14, borderRadius: 10,
            background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${danger ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
            marginBottom: 20,
          }}>
            <AlertTriangle size={18} style={{ color: danger ? '#ef4444' : '#f59e0b', flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#d4d4d8', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{description}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '9px 18px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#a1a1aa',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>Huỷ</button>
            <button onClick={onConfirm} style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: danger ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#f59e0b,#d97706)',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function TrashView({ toast }) {
  const [accounts, setAccounts] = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(new Set()) // selected IDs

  const [confirmHard,    setConfirmHard]    = useState(null)  // 'one' | 'selected' | 'all'
  const [confirmRestore, setConfirmRestore] = useState(null)  // 'one' | 'selected'
  const [targetAcc, setTargetAcc]           = useState(null)  // single row target

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Fetch ─────────────────────────────────────────────────
  const fetchTrashed = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count, error } = await accountService.getTrashed({ search, page, pageSize: PAGE_SIZE })
      if (error) throw error
      setAccounts(data ?? [])
      setTotal(count ?? 0)
      setSelected(new Set())
    } catch (err) {
      toast?.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchTrashed() }, [fetchTrashed])

  const debouncedSearch = useCallback(
    debounce((v) => { setSearch(v); setPage(1) }, 400), []
  )

  // ── Select ────────────────────────────────────────────────
  const allSelected = accounts.length > 0 && accounts.every(a => selected.has(a.id))
  const toggleAll   = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(accounts.map(a => a.id)))
  }
  const toggleOne = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  // ── Restore ───────────────────────────────────────────────
  const doRestore = async () => {
    try {
      if (confirmRestore === 'one' && targetAcc) {
        const { error } = await accountService.restore(targetAcc.id)
        if (error) throw error
        toast?.success(`Đã khôi phục: ${targetAcc.gmail}`)
      } else {
        const ids = [...selected]
        const { error } = await accountService.restoreMany(ids)
        if (error) throw error
        toast?.success(`Đã khôi phục ${ids.length} tài khoản`)
      }
      setConfirmRestore(null)
      setTargetAcc(null)
      fetchTrashed()
    } catch (err) {
      toast?.error(err.message)
    }
  }

  // ── Hard Delete ───────────────────────────────────────────
  const doHardDelete = async () => {
    try {
      if (confirmHard === 'all') {
        const { error } = await accountService.hardDeleteAll()
        if (error) throw error
        toast?.success('Đã xoá vĩnh viễn toàn bộ thùng rác')
      } else if (confirmHard === 'selected') {
        const ids = [...selected]
        await Promise.all(ids.map(id => accountService.hardDelete(id)))
        toast?.success(`Đã xoá vĩnh viễn ${ids.length} tài khoản`)
      } else if (confirmHard === 'one' && targetAcc) {
        const { error } = await accountService.hardDelete(targetAcc.id)
        if (error) throw error
        toast?.success(`Đã xoá vĩnh viễn: ${targetAcc.gmail}`)
      }
      setConfirmHard(null)
      setTargetAcc(null)
      fetchTrashed()
    } catch (err) {
      toast?.error(err.message)
    }
  }

  const btn = (onClick, bg, color, border, children) => (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
      background: bg, color, border, fontSize: 13, fontWeight: 600,
    }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >{children}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trash2 size={17} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Thùng rác</h1>
              <p style={{ color: '#71717a', fontSize: 13, margin: '2px 0 0' }}>
                {total} tài khoản đã xoá
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {btn(fetchTrashed, 'rgba(255,255,255,0.04)', '#a1a1aa', '1px solid rgba(255,255,255,0.1)',
            <><RefreshCw size={14} />Làm mới</>
          )}
          {selected.size > 0 && (<>
            {btn(
              () => setConfirmRestore('selected'),
              'rgba(34,197,94,0.08)', '#22c55e', '1px solid rgba(34,197,94,0.2)',
              <><RotateCcw size={14} />Khôi phục ({selected.size})</>
            )}
            {btn(
              () => setConfirmHard('selected'),
              'rgba(239,68,68,0.08)', '#ef4444', '1px solid rgba(239,68,68,0.2)',
              <><Trash2 size={14} />Xoá vĩnh viễn ({selected.size})</>
            )}
          </>)}
          {total > 0 && btn(
            () => setConfirmHard('all'),
            'rgba(239,68,68,0.1)', '#ef4444', '1px solid rgba(239,68,68,0.25)',
            <><Trash2 size={14} />Xoá tất cả</>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 10,
        background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)',
      }}>
        <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <p style={{ color: '#fbbf24', fontSize: 13, margin: 0 }}>
          Các tài khoản trong thùng rác có thể được <strong>khôi phục</strong> hoặc <strong>xoá vĩnh viễn</strong>. Xoá vĩnh viễn không thể hoàn tác.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
        <input
          placeholder="Tìm gmail, khách hàng..."
          onChange={e => debouncedSearch(e.target.value)}
          style={{
            width: '100%', padding: '9px 12px 9px 32px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {/* Checkbox all */}
                <th style={{ padding: '11px 14px', width: 36 }}>
                  <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: allSelected ? '#ef4444' : '#52525b', display: 'flex', alignItems: 'center' }}>
                    {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                </th>
                {['Gmail', 'Loại', 'Trạng thái', 'Khách hàng', 'Nhà CC', 'Hết hạn', 'Lợi nhuận', 'Đã xoá lúc', 'Thao tác'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} style={{ padding: '13px 14px' }}>
                        <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: j === 1 ? '80%' : '55%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={22} style={{ color: '#3f3f46' }} />
                      </div>
                      <p style={{ color: '#52525b', fontSize: 14, margin: 0 }}>Thùng rác trống</p>
                    </div>
                  </td>
                </tr>
              ) : accounts.map(acc => {
                const isSelected = selected.has(acc.id)
                const deletedAt  = acc.deleted_at ? new Date(acc.deleted_at) : null
                const deletedAgo = deletedAt
                  ? Math.floor((Date.now() - deletedAt) / (1000 * 60 * 60 * 24))
                  : null

                return (
                  <tr key={acc.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isSelected ? 'rgba(239,68,68,0.06)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(239,68,68,0.06)' : 'transparent' }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '12px 14px' }}>
                      <button onClick={() => toggleOne(acc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? '#ef4444' : '#52525b', display: 'flex', alignItems: 'center' }}>
                        {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                    </td>

                    {/* Gmail */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#a1a1aa', fontSize: 13, textDecoration: 'line-through', textDecorationColor: 'rgba(161,161,170,0.4)' }}>
                        {acc.gmail}
                      </span>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#71717a', fontSize: 12, fontWeight: 600 }}>
                        {TYPE_LABELS[acc.account_type] || acc.account_type}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={acc.status} />
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#71717a', fontSize: 13 }}>{acc.customer_name || '—'}</span>
                    </td>

                    {/* Supplier */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#71717a', fontSize: 13 }}>{acc.supplier || '—'}</span>
                    </td>

                    {/* Expiry */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#71717a', fontSize: 13 }}>{formatDate(acc.expiry_date)}</span>
                    </td>

                    {/* Profit */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#52525b', fontSize: 13, fontWeight: 700 }}>
                        {formatVND(acc.profit)}
                      </span>
                    </td>

                    {/* Deleted at */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#52525b', fontSize: 12 }}>
                        {deletedAt ? deletedAt.toLocaleDateString('vi-VN') : '—'}
                      </div>
                      {deletedAgo !== null && (
                        <div style={{ color: '#3f3f46', fontSize: 11, marginTop: 2 }}>
                          {deletedAgo === 0 ? 'Hôm nay' : `${deletedAgo} ngày trước`}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {/* Restore */}
                        <button
                          title="Khôi phục"
                          onClick={() => { setTargetAcc(acc); setConfirmRestore('one') }}
                          style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
                        >
                          <RotateCcw size={13} />
                        </button>
                        {/* Hard delete */}
                        <button
                          title="Xoá vĩnh viễn"
                          onClick={() => { setTargetAcc(acc); setConfirmHard('one') }}
                          style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#71717a', fontSize: 12 }}>Trang {page}/{totalPages} · {total} tài khoản</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: page === 1 ? '#3f3f46' : '#a1a1aa', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button key={p} onClick={() => setPage(p)} style={{
                    padding: '6px 10px', borderRadius: 6, minWidth: 32,
                    border: p === page ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    background: p === page ? '#ef4444' : 'transparent',
                    color: p === page ? '#fff' : '#a1a1aa',
                    cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400,
                  }}>{p}</button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: page === totalPages ? '#3f3f46' : '#a1a1aa', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Modals ───────────────────────────────────── */}

      {/* Restore confirm */}
      <ConfirmModal
        open={!!confirmRestore}
        onClose={() => { setConfirmRestore(null); setTargetAcc(null) }}
        onConfirm={doRestore}
        danger={false}
        title="Khôi phục tài khoản"
        confirmLabel="Khôi phục"
        description={
          confirmRestore === 'one' && targetAcc
            ? `Khôi phục tài khoản "${targetAcc.gmail}" về danh sách quản lý?`
            : `Khôi phục ${selected.size} tài khoản đã chọn?`
        }
      />

      {/* Hard delete confirm */}
      <ConfirmModal
        open={!!confirmHard}
        onClose={() => { setConfirmHard(null); setTargetAcc(null) }}
        onConfirm={doHardDelete}
        danger={true}
        title="Xoá vĩnh viễn"
        confirmLabel="Xoá vĩnh viễn"
        description={
          confirmHard === 'all'
            ? `Xoá vĩnh viễn TẤT CẢ ${total} tài khoản trong thùng rác? Hành động này KHÔNG THỂ hoàn tác!`
            : confirmHard === 'selected'
            ? `Xoá vĩnh viễn ${selected.size} tài khoản đã chọn? Hành động này KHÔNG THỂ hoàn tác!`
            : targetAcc
            ? `Xoá vĩnh viễn tài khoản "${targetAcc.gmail}"? Hành động này KHÔNG THỂ hoàn tác!`
            : ''
        }
      />
    </div>
  )
}