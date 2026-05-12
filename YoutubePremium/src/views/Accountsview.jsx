// src/views/Accountsview.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, RefreshCw, Download, Upload,
  Edit2, Trash2, Copy, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, Eye, EyeOff, X, Check,
  AlertTriangle, Clock, CheckCircle, XCircle,
  User, Phone, Mail, Calendar, DollarSign,
  ExternalLink, Shield, ArrowRight,
} from 'lucide-react'
import { accountService } from '../services/accountService'
import { customerService } from '../services/customerService'
import {
  formatDate, formatVND, daysUntil,
  exportToCSV, copyToClipboard, debounce, calcExpiry,
} from '../lib/utils'

// ─── Constants ────────────────────────────────────────────────
const PAGE_SIZE = 20

const STATUS_CONFIG = {
  active:   { label: 'Còn hạn',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)',  icon: CheckCircle  },
  expiring: { label: 'Sắp hết hạn', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: Clock        },
  expired:  { label: 'Hết hạn',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  icon: XCircle      },
}

const TYPE_LABELS = {
  '1_month':  '1 tháng',
  '3_months': '3 tháng',
  '6_months': '6 tháng',
  '1_year':   '1 năm',
}

const LEVEL_CONFIG = {
  member: { label: 'Member', color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)' },
  vip:    { label: 'VIP',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  agent:  { label: 'Đại lý', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
}

const EMPTY_FORM = {
  gmail: '', password: '', account_type: '1_month',
  start_date: new Date().toISOString().split('T')[0],
  expiry_date: '', cost_price: '', sell_price: '',
  supplier: '', customer_name: '', customer_expiry: '', note: '',
}

// ─── Helpers ──────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
  color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

// ─── StatusBadge ──────────────────────────────────────────────
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

// ─── Field / Input / Select ───────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a1a1aa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ style: s, ...props }) {
  return (
    <input {...props} style={{ ...inputStyle, ...s }}
      onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select {...props} style={{ ...inputStyle, cursor: 'pointer' }}
      onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    >
      {children}
    </select>
  )
}

// ─── Modal ────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 640 }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#141418', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, width: '100%', maxWidth: width,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', top: 0, background: '#141418', zIndex: 1,
        }}>
          <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
            padding: 6, cursor: 'pointer', color: '#71717a', display: 'flex', alignItems: 'center',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#71717a' }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────
function DetailDrawer({ acc, onClose, onEdit, onDelete, navigate }) {
  const [showPass, setShowPass] = useState(false)
  const [customerDetail, setCustomerDetail] = useState(null)
  const open = !!acc

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Fetch customer info khi mở drawer
  useEffect(() => {
    if (!acc?.customer_id) { setCustomerDetail(null); return }
    customerService.getById(acc.customer_id)
      .then(({ data }) => setCustomerDetail(data))
      .catch(() => setCustomerDetail(null))
  }, [acc?.customer_id])

  const copy = async (text, label) => {
    await copyToClipboard(text)
  }

  const days = acc ? daysUntil(acc.expiry_date) : null

  const InfoRow = ({ icon: Icon, label, value, valueStyle = {}, action }) => (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={14} style={{ color: '#71717a' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500, ...valueStyle }}>{value ?? '—'}</div>
      </div>
      {action && (
        <div style={{ flexShrink: 0 }}>{action}</div>
      )}
    </div>
  )

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 901,
        width: 420, maxWidth: '100vw',
        background: '#111115',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {acc && (
          <>
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: '#141418',
              position: 'sticky', top: 0, zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>Chi tiết tài khoản</h2>
                <button onClick={onClose} style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
                  padding: 6, cursor: 'pointer', color: '#71717a', display: 'flex',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#71717a' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={acc.status} />
                <span style={{
                  padding: '3px 8px', borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#d4d4d8', fontSize: 11, fontWeight: 600,
                }}>
                  {TYPE_LABELS[acc.account_type]}
                </span>
                {days !== null && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: days <= 0 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#71717a',
                  }}>
                    {days <= 0 ? `Hết hạn ${Math.abs(days)} ngày trước` : `Còn ${days} ngày`}
                  </span>
                )}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '0 24px', flex: 1 }}>

              {/* Tài khoản */}
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 0 4px' }}>
                  Thông tin tài khoản
                </div>

                <InfoRow icon={Mail} label="Gmail" value={acc.gmail}
                  action={
                    <button onClick={() => copy(acc.gmail)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
                      onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
                    ><Copy size={13} /></button>
                  }
                />

                <InfoRow icon={Shield} label="Password"
                  value={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', letterSpacing: showPass ? 0 : 3 }}>
                        {showPass ? acc.password : '••••••••'}
                      </span>
                      <button onClick={() => setShowPass(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
                        onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
                      >
                        {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      {showPass && (
                        <button onClick={() => copy(acc.password)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
                          onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
                        ><Copy size={13} /></button>
                      )}
                    </div>
                  }
                />

                <InfoRow icon={Calendar} label="Bắt đầu" value={formatDate(acc.start_date)} />
                <InfoRow icon={Calendar} label="Hết hạn" value={formatDate(acc.expiry_date)} />
                <InfoRow icon={User} label="Nhà cung cấp" value={acc.supplier} />
              </div>

              {/* Tài chính */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 0 4px' }}>
                  Tài chính
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 8, marginBottom: 4,
                }}>
                  {[
                    { label: 'Giá nhập', value: formatVND(acc.cost_price), color: '#a1a1aa' },
                    { label: 'Giá bán',  value: formatVND(acc.sell_price), color: '#60a5fa' },
                    { label: 'Lợi nhuận', value: formatVND(acc.profit), color: (acc.profit ?? 0) >= 0 ? '#22c55e' : '#ef4444' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      padding: '12px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 11, color: '#52525b', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Khách hàng */}
              {acc.customer_name && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 0 8px' }}>
                    Khách hàng
                  </div>
                  <div style={{
                    padding: 14, borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, fontWeight: 700, color: '#fff',
                        }}>
                          {acc.customer_name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{acc.customer_name}</div>
                          {customerDetail && (
                            <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                              {customerDetail.phone || customerDetail.gmail || ''}
                            </div>
                          )}
                        </div>
                      </div>
                      {customerDetail && (
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: LEVEL_CONFIG[customerDetail.level]?.bg,
                          color: LEVEL_CONFIG[customerDetail.level]?.color,
                        }}>
                          {LEVEL_CONFIG[customerDetail.level]?.label}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      {acc.customer_expiry && (
                        <div style={{ fontSize: 12, color: '#71717a' }}>
                          Hạn KH: <span style={{ color: '#a1a1aa' }}>{formatDate(acc.customer_expiry)}</span>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      {/* Nhảy sang trang KH + filter */}
                      <button
                        onClick={() => {
                          onClose()
                          navigate?.('/customers')
                          // Truyền filter qua window để CustomersView tự filter
                          window.__customerFilter = acc.customer_name
                        }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '8px 12px', borderRadius: 8,
                          border: '1px solid rgba(239,68,68,0.2)',
                          background: 'rgba(239,68,68,0.08)',
                          color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                      >
                        <ArrowRight size={13} /> Xem trang KH
                      </button>

                      {/* Popup mini — scroll to section */}
                      {customerDetail && (
                        <button
                          onClick={() => {
                            window.__customerPopup = customerDetail
                            window.dispatchEvent(new CustomEvent('show-customer-popup'))
                          }}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '8px 12px', borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)',
                            color: '#a1a1aa', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                        >
                          <User size={13} /> Chi tiết KH
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              {acc.note && (
                <div style={{ paddingBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '16px 0 8px' }}>
                    Ghi chú
                  </div>
                  <div style={{
                    padding: 12, borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#a1a1aa', fontSize: 13, lineHeight: 1.6,
                  }}>
                    {acc.note}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: '#141418',
              display: 'flex', gap: 10,
              position: 'sticky', bottom: 0,
            }}>
              <button onClick={() => { onClose(); onDelete(acc) }}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              >
                <Trash2 size={13} /> Xoá
              </button>
              <button onClick={() => { onClose(); onEdit(acc) }}
                style={{
                  flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Edit2 size={13} /> Chỉnh sửa
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── Customer Popup (mini) ────────────────────────────────────
function CustomerPopup() {
  const [customer, setCustomer] = useState(null)

  useEffect(() => {
    const handler = () => {
      setCustomer(window.__customerPopup ?? null)
    }
    window.addEventListener('show-customer-popup', handler)
    return () => window.removeEventListener('show-customer-popup', handler)
  }, [])

  if (!customer) return null

  const level = LEVEL_CONFIG[customer.level] ?? LEVEL_CONFIG.member

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16,
    }} onClick={() => setCustomer(null)}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#141418', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, width: '100%', maxWidth: 380,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}>
        {/* Header gradient */}
        <div style={{
          padding: '24px 24px 20px',
          background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(220,38,38,0.05))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: '#fff',
                boxShadow: '0 8px 20px rgba(239,68,68,0.3)',
              }}>
                {customer.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{customer.name}</div>
                <span style={{
                  display: 'inline-block', marginTop: 4,
                  padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                  background: level.bg, color: level.color,
                }}>
                  {level.label}
                </span>
              </div>
            </div>
            <button onClick={() => setCustomer(null)} style={{
              background: 'rgba(255,255,255,0.06)', border: 'none',
              borderRadius: 8, padding: 6, cursor: 'pointer', color: '#71717a', display: 'flex',
            }}>
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '16px 24px 20px' }}>
          {[
            { icon: Mail,       label: 'Gmail',         value: customer.gmail   },
            { icon: Phone,      label: 'Số điện thoại', value: customer.phone   },
            { icon: DollarSign, label: 'Tổng đã chi',   value: formatVND(customer.total_spent) },
            { icon: Calendar,   label: 'Đã mua',        value: `${customer.total_bought} acc`  },
          ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={13} style={{ color: '#71717a' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#52525b' }}>{label}</div>
                <div style={{ fontSize: 13, color: '#e4e4e7', fontWeight: 500, marginTop: 2 }}>{value}</div>
              </div>
            </div>
          ))}

          {customer.note && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: '#71717a', fontSize: 12 }}>
              {customer.note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Account Form ─────────────────────────────────────────────
function AccountForm({ initial = EMPTY_FORM, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial)
  const [showPass, setShowPass] = useState(false)

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v }
    if ((k === 'account_type' || k === 'start_date') && next.start_date && next.account_type) {
      next.expiry_date = calcExpiry(next.start_date, next.account_type)
    }
    return next
  })

  const profit = (Number(form.sell_price) || 0) - (Number(form.cost_price) || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Gmail" required>
          <Input value={form.gmail} onChange={e => set('gmail', e.target.value)} placeholder="example@gmail.com" />
        </Field>
        <Field label="Password" required>
          <div style={{ position: 'relative' }}>
            <Input type={showPass ? 'text' : 'password'} value={form.password}
              onChange={e => set('password', e.target.value)} placeholder="••••••••"
              style={{ paddingRight: 36 }}
            />
            <button onClick={() => setShowPass(s => !s)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#71717a',
            }}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Loại tài khoản" required>
          <Select value={form.account_type} onChange={e => set('account_type', e.target.value)}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Ngày bắt đầu" required>
          <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </Field>
        <Field label="Ngày hết hạn">
          <Input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Giá nhập (₫)">
          <Input type="number" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Giá bán (₫)">
          <Input type="number" value={form.sell_price} onChange={e => set('sell_price', e.target.value)} placeholder="0" />
        </Field>
        <Field label="Lợi nhuận">
          <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: profit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
            {formatVND(profit)}
          </div>
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Nhà cung cấp">
          <Input value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Tên nguồn acc" />
        </Field>
        <Field label="Tên khách hàng">
          <Input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="Tên khách" />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Hạn khách hàng">
          <Input type="date" value={form.customer_expiry} onChange={e => set('customer_expiry', e.target.value)} />
        </Field>
        <Field label="Ghi chú">
          <Input value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ghi chú..." />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onCancel} style={{
          padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
          background: 'transparent', color: '#a1a1aa', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>Huỷ</button>
        <button onClick={() => onSubmit(form)} disabled={loading || !form.gmail || !form.password} style={{
          padding: '9px 20px', borderRadius: 8, border: 'none',
          background: loading ? '#7f1d1d' : 'linear-gradient(135deg,#ef4444,#dc2626)',
          color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
          opacity: (!form.gmail || !form.password) ? 0.5 : 1,
        }}>
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          {loading ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  )
}

// ─── Import Modal ─────────────────────────────────────────────
function ImportModal({ open, onClose, onImport }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState([])
  const [error, setError] = useState('')

  const parse = (raw) => {
    setError('')
    const lines = raw.trim().split('\n').filter(Boolean)
    try {
      const rows = lines.map((line, i) => {
        const cols = line.split('\t').map(s => s.trim())
        if (cols.length < 3) throw new Error(`Dòng ${i + 1}: thiếu cột`)
        const [gmail, password, account_type, start_date, cost_price, sell_price, supplier, customer_name, note] = cols
        return {
          gmail, password,
          account_type: account_type || '1_month',
          start_date: start_date || new Date().toISOString().split('T')[0],
          cost_price: Number(cost_price) || 0,
          sell_price: Number(sell_price) || 0,
          supplier: supplier || '',
          customer_name: customer_name || '',
          note: note || '',
        }
      })
      setPreview(rows)
    } catch (err) {
      setError(err.message)
      setPreview([])
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import tài khoản hàng loạt" width={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>
          <strong>Format (tab-separated):</strong><br />
          gmail | password | loại acc | ngày bắt đầu | giá nhập | giá bán | nhà cc | khách hàng | ghi chú
        </div>
        <Field label="Dán dữ liệu vào đây">
          <textarea value={text} onChange={e => { setText(e.target.value); parse(e.target.value) }}
            style={{ ...inputStyle, height: 120, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </Field>
        {error && <div style={{ color: '#ef4444', fontSize: 12 }}><AlertTriangle size={13} style={{ display: 'inline', marginRight: 4 }} />{error}</div>}
        {preview.length > 0 && (
          <p style={{ color: '#22c55e', fontSize: 12 }}>✓ {preview.length} tài khoản hợp lệ</p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#a1a1aa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Huỷ</button>
          <button onClick={() => onImport(preview)} disabled={!preview.length} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: preview.length ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#3f3f46',
            color: '#fff', cursor: preview.length ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700,
          }}>
            Import {preview.length > 0 ? `${preview.length} acc` : ''}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Sort Header ──────────────────────────────────────────────
function SortTh({ label, field, sortBy, sortAsc, onSort }) {
  const active = sortBy === field
  return (
    <th onClick={() => onSort(field)} style={{
      padding: '11px 14px', textAlign: 'left', cursor: 'pointer',
      color: active ? '#ef4444' : '#71717a', fontWeight: 600,
      fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em',
      userSelect: 'none', whiteSpace: 'nowrap',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active
          ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
          : <ChevronDown size={12} style={{ opacity: 0.3 }} />}
      </span>
    </th>
  )
}

// ─── Main View ────────────────────────────────────────────────
export default function AccountsView({ toast, navigate }) {
  const [accounts, setAccounts]     = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [filterType, setFilterType]       = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [sortBy, setSortBy]               = useState('expiry_date')
  const [sortAsc, setSortAsc]             = useState(true)

  const [selectedAcc, setSelectedAcc]   = useState(null) // drawer
  const [showAdd, setShowAdd]           = useState(false)
  const [editAcc, setEditAcc]           = useState(null)
  const [deleteAcc, setDeleteAcc]       = useState(null)
  const [showImport, setShowImport]     = useState(false)
  const [formLoading, setFormLoading]   = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Fetch ──────────────────────────────────────────────────
  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count, error } = await accountService.getAll({
        status: filterStatus || undefined,
        accountType: filterType || undefined,
        supplier: filterSupplier || undefined,
        search: search || undefined,
        page, pageSize: PAGE_SIZE,
        orderBy: sortBy, asc: sortAsc,
      })
      if (error) throw error
      setAccounts(data ?? [])
      setTotal(count ?? 0)
    } catch (err) {
      toast?.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType, filterSupplier, search, page, sortBy, sortAsc])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const debouncedSearch = useCallback(debounce((v) => { setSearch(v); setPage(1) }, 400), [])

  const handleSort = (field) => {
    if (sortBy === field) setSortAsc(a => !a)
    else { setSortBy(field); setSortAsc(true) }
    setPage(1)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await accountService.refreshStatuses?.()
    await fetchAccounts()
    setRefreshing(false)
    toast?.success('Đã cập nhật trạng thái!')
  }

  // ── CRUD ───────────────────────────────────────────────────
  const handleAdd = async (form) => {
    setFormLoading(true)
    try {
      const { error } = await accountService.create(form)
      if (error) throw error
      toast?.success('Thêm tài khoản thành công!')
      setShowAdd(false)
      fetchAccounts()
    } catch (err) {
      toast?.error(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = async (form) => {
    setFormLoading(true)
    try {
      const { error } = await accountService.update(editAcc.id, form)
      if (error) throw error
      toast?.success('Cập nhật thành công!')
      setEditAcc(null)
      fetchAccounts()
    } catch (err) {
      toast?.error(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await accountService.delete(deleteAcc.id)
      if (error) throw error
      toast?.success('Đã xoá tài khoản!')
      setDeleteAcc(null)
      fetchAccounts()
    } catch (err) {
      toast?.error(err.message)
    }
  }

  const handleImport = async (rows) => {
    setFormLoading(true)
    try {
      const { error } = await accountService.bulkCreate(rows)
      if (error) throw error
      toast?.success(`Import ${rows.length} tài khoản thành công!`)
      setShowImport(false)
      fetchAccounts()
    } catch (err) {
      toast?.error(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleExport = () => {
    const rows = accounts.map(a => ({
      Gmail: a.gmail, Password: a.password,
      Loại: TYPE_LABELS[a.account_type],
      'Bắt đầu': formatDate(a.start_date),
      'Hết hạn': formatDate(a.expiry_date),
      'Trạng thái': STATUS_CONFIG[a.status]?.label,
      'Giá nhập': a.cost_price, 'Giá bán': a.sell_price, 'Lợi nhuận': a.profit,
      'Nhà CC': a.supplier, 'Khách hàng': a.customer_name,
      'Hạn KH': formatDate(a.customer_expiry), 'Ghi chú': a.note,
    }))
    exportToCSV(rows, `accounts_${new Date().toISOString().slice(0, 10)}.csv`)
    toast?.success('Đã xuất file CSV!')
  }

  const handleCopy = async (e, text, label) => {
    e.stopPropagation()
    await copyToClipboard(text)
    toast?.success(label)
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>Quản lý tài khoản YTB</h1>
          <p style={{ color: '#71717a', fontSize: 13, margin: '4px 0 0' }}>{total} tài khoản tổng cộng</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { icon: Upload,      label: 'Import',       onClick: () => setShowImport(true) },
            { icon: Download,    label: 'Export',       onClick: handleExport              },
            { icon: Trash2,      label: 'Thùng rác',    onClick: () => navigate?.('/trash') },
            { icon: RefreshCw,   label: 'Cập nhật',     onClick: handleRefresh, spin: refreshing },
          ].map(({ icon: Icon, label, onClick, spin }) => (
            <button key={label} onClick={onClick} disabled={spin} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#a1a1aa', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>
              <Icon size={14} style={{ animation: spin ? 'spin 1s linear infinite' : 'none' }} />
              {label}
            </button>
          ))}
          <button onClick={() => setShowAdd(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
          }}>
            <Plus size={15} /> Thêm tài khoản
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
          <input placeholder="Tìm gmail, khách hàng..." onChange={e => debouncedSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
            onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          style={{ ...inputStyle, width: 130, cursor: 'pointer' }}
          onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        >
          <option value="">Trạng thái</option>
          <option value="active">Còn hạn</option>
          <option value="expiring">Sắp hết</option>
          <option value="expired">Hết hạn</option>
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
          style={{ ...inputStyle, width: 120, cursor: 'pointer' }}
          onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        >
          <option value="">Loại acc</option>
          {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input placeholder="Nguồn acc..." value={filterSupplier}
          onChange={e => { setFilterSupplier(e.target.value); setPage(1) }}
          style={{ ...inputStyle, width: 120 }}
          onFocus={e => e.target.style.borderColor = 'rgba(239,68,68,0.5)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        {(filterStatus || filterType || filterSupplier) && (
          <button onClick={() => { setFilterStatus(''); setFilterType(''); setFilterSupplier(''); setPage(1) }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <X size={12} /> Xoá lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {['Gmail', 'Password', 'Loại', 'Trạng thái', 'Khách hàng', 'Nhà CC'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
                <SortTh label="Hết hạn"   field="expiry_date" sortBy={sortBy} sortAsc={sortAsc} onSort={handleSort} />
                <SortTh label="Lợi nhuận" field="profit"      sortBy={sortBy} sortAsc={sortAsc} onSort={handleSort} />
                <th style={{ padding: '11px 14px', textAlign: 'center', color: '#71717a', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} style={{ padding: '13px 14px' }}>
                        <div style={{ height: 13, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: j === 0 ? '80%' : '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center', color: '#52525b', fontSize: 14 }}>
                    Không có tài khoản nào
                  </td>
                </tr>
              ) : accounts.map((acc) => {
                const days = daysUntil(acc.expiry_date)
                const isExpiring = acc.status === 'expiring'
                const isExpired  = acc.status === 'expired'

                return (
                  <tr key={acc.id}
                    onClick={() => setSelectedAcc(acc)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      background: isExpiring ? 'rgba(245,158,11,0.03)' : isExpired ? 'rgba(239,68,68,0.03)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = isExpiring ? 'rgba(245,158,11,0.03)' : isExpired ? 'rgba(239,68,68,0.03)' : 'transparent'}
                  >
                    {/* Gmail */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#e4e4e7', fontSize: 13, fontWeight: 500 }}>{acc.gmail}</span>
                        <button onClick={e => handleCopy(e, acc.gmail, 'Đã copy gmail!')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 2 }}
                          onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
                          onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
                        ><Copy size={11} /></button>
                      </div>
                    </td>

                    {/* Password */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#52525b', fontSize: 12, letterSpacing: 2 }}>••••••••</span>
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#d4d4d8', fontSize: 12, fontWeight: 600 }}>
                        {TYPE_LABELS[acc.account_type]}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={acc.status} />
                    </td>

                    {/* Customer */}
                    <td style={{ padding: '12px 14px' }}>
                      {acc.customer_name
                        ? <div>
                            <div style={{ color: '#e4e4e7', fontSize: 13 }}>{acc.customer_name}</div>
                            {acc.customer_expiry && <div style={{ color: '#71717a', fontSize: 11, marginTop: 2 }}>HKH: {formatDate(acc.customer_expiry)}</div>}
                          </div>
                        : <span style={{ color: '#3f3f46', fontSize: 12 }}>—</span>
                      }
                    </td>

                    {/* Supplier */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#a1a1aa', fontSize: 13 }}>{acc.supplier || '—'}</span>
                    </td>

                    {/* Expiry */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#e4e4e7', fontSize: 13 }}>{formatDate(acc.expiry_date)}</div>
                      {days !== null && (
                        <div style={{ fontSize: 11, marginTop: 2, color: days <= 0 ? '#ef4444' : days <= 7 ? '#f59e0b' : '#71717a' }}>
                          {days <= 0 ? `Hết ${Math.abs(days)} ngày trước` : `Còn ${days} ngày`}
                        </div>
                      )}
                    </td>

                    {/* Profit */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: (acc.profit ?? 0) >= 0 ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 700 }}>
                        {formatVND(acc.profit)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); setEditAcc(acc) }}
                          style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                        ><Edit2 size={13} /></button>
                        <button onClick={e => { e.stopPropagation(); setDeleteAcc(acc) }}
                          style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        ><Trash2 size={13} /></button>
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

      {/* Detail Drawer */}
      <DetailDrawer
        acc={selectedAcc}
        onClose={() => setSelectedAcc(null)}
        onEdit={(acc) => setEditAcc(acc)}
        onDelete={(acc) => setDeleteAcc(acc)}
        navigate={navigate}
      />

      {/* Customer Popup */}
      <CustomerPopup />

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Thêm tài khoản mới">
        <AccountForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} loading={formLoading} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editAcc} onClose={() => setEditAcc(null)} title="Sửa tài khoản">
        {editAcc && (
          <AccountForm
            initial={{
              gmail: editAcc.gmail, password: editAcc.password,
              account_type: editAcc.account_type, start_date: editAcc.start_date,
              expiry_date: editAcc.expiry_date, cost_price: editAcc.cost_price,
              sell_price: editAcc.sell_price, supplier: editAcc.supplier ?? '',
              customer_name: editAcc.customer_name ?? '',
              customer_expiry: editAcc.customer_expiry ?? '', note: editAcc.note ?? '',
            }}
            onSubmit={handleEdit} onCancel={() => setEditAcc(null)} loading={formLoading}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteAcc} onClose={() => setDeleteAcc(null)} title="Xác nhận xoá" width={420}>
        {deleteAcc && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <p style={{ color: '#fff', fontWeight: 600, margin: '0 0 4px', fontSize: 14 }}>Xoá tài khoản này?</p>
                <p style={{ color: '#a1a1aa', fontSize: 13, margin: 0 }}>{deleteAcc.gmail}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteAcc(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#a1a1aa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Huỷ</button>
              <button onClick={handleDelete} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Xoá</button>
            </div>
          </div>
        )}
      </Modal>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
