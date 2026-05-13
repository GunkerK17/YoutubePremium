// src/views/AccountsView.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Download,
  Upload,
  Edit2,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  X,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Mail,
  Calendar,
  DollarSign,
  Shield,
  ArrowRight,
} from "lucide-react";

import { accountService } from "../services/accountService";
import {
  formatDate,
  formatVND,
  daysUntil,
  exportToCSV,
  copyToClipboard,
  debounce,
  calcExpiry,
} from "../lib/utils";

const PAGE_SIZE = 20;
const USD_RATE_DEFAULT = 25500;
const DEFAULT_CUSTOMER_EXPIRY = "2027-04-01";
const FULL_YEAR_USD = 80;

const STATUS_CONFIG = {
  active: {
    label: "Còn hạn",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
    icon: CheckCircle,
  },
  expiring: {
    label: "Sắp hết hạn",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
    icon: Clock,
  },
  expired: {
    label: "Hết hạn",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
    icon: XCircle,
  },
};

const CUSTOMER_STATUS = {
  using: {
    label: "Đang dùng",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.2)",
  },
  cancelled: {
    label: "Đã cancel",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.2)",
  },
  supporting: {
    label: "Đang hỗ trợ",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.2)",
  },
  refunded: {
    label: "Đã refund",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.2)",
  },
};

const TYPE_LABELS = {
  "1_month": "1 tháng",
  "3_months": "3 tháng",
  "6_months": "6 tháng",
  "1_year": "1 năm",
};

const todayISO = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = {
  gmail: "",
  password: "",
  account_type: "3_months",
  start_date: todayISO(),
  expiry_date: "",
  cost_price: "",
  sell_price: "",
  supplier: "",
  customer_name: "",
  customer_start_date: "2026-04-01",
  customer_package: "1_year",
  customer_expiry: DEFAULT_CUSTOMER_EXPIRY,
  customer_contact: "",
  customer_paid: "",
  customer_paid_usd: "",
  customer_usd_rate: USD_RATE_DEFAULT,
  customer_status: "using",
  note: "",
};

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const outlineButtonStyle = {
  padding: "9px 18px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent",
  color: "#a1a1aa",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

const ghostButtonStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "#52525b",
  padding: 4,
  display: "inline-flex",
};

function isoDateToVN(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

function vnDateToISO(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    const parsed = new Date(raw);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== y ||
      parsed.getUTCMonth() + 1 !== m ||
      parsed.getUTCDate() !== d
    ) {
      return "";
    }
    return raw;
  }
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return "";
  const [, dRaw, mRaw, yRaw] = match;
  const dd = String(dRaw).padStart(2, "0");
  const mm = String(mRaw).padStart(2, "0");
  const yyyy = String(yRaw);
  const iso = `${yyyy}-${mm}-${dd}`;
  const parsed = new Date(iso);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(yyyy) ||
    parsed.getUTCMonth() + 1 !== Number(mm) ||
    parsed.getUTCDate() !== Number(dd)
  ) {
    return "";
  }
  return iso;
}

function calcCustomerUsd(customerStartDate, customerExpiryDate = DEFAULT_CUSTOMER_EXPIRY) {
  if (!customerStartDate || !customerExpiryDate) return 0;

  const start = new Date(customerStartDate);
  const end = new Date(customerExpiryDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (start >= end) return 0;

  const days = Math.ceil((end - start) / 86400000);
  const usd = (FULL_YEAR_USD * days) / 365;

  return Math.round(usd * 100) / 100;
}

function calcCustomerVnd(customerStartDate, customerExpiryDate, usdRate = USD_RATE_DEFAULT) {
  return Math.round(
    calcCustomerUsd(customerStartDate, customerExpiryDate) *
      Number(usdRate || USD_RATE_DEFAULT)
  );
}

function formatMoneyByMode({ vnd, usd, mode }) {
  if (mode === "usd") return `$${Number(usd || 0).toFixed(2)}`;
  return formatVND(Number(vnd) || 0);
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired;
  const Icon = cfg.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

function CustomerStatusBadge({ status }) {
  const cfg = CUSTOMER_STATUS[status] ?? CUSTOMER_STATUS.using;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "#a1a1aa",
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ style: s, ...props }) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...s }}
      onFocus={(e) => {
        e.target.style.borderColor = "rgba(239,68,68,0.5)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "rgba(255,255,255,0.08)";
      }}
    />
  );
}

function DateVNInput({ value, onChange, placeholder = "dd/mm/yyyy" }) {
  const [text, setText] = useState(isoDateToVN(value));

  useEffect(() => {
    setText(isoDateToVN(value));
  }, [value]);

  const handleChange = (event) => {
    const raw = event.target.value;
    setText(raw);

    const iso = vnDateToISO(raw);

    if (iso) {
      onChange(iso);
    }

    if (raw.trim() === "") {
      onChange("");
    }
  };

  const handleBlur = () => {
    const iso = vnDateToISO(text);

    if (iso) {
      setText(isoDateToVN(iso));
    }
  };

  return (
    <input
      type="text"
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      style={{ ...inputStyle, cursor: "pointer" }}
      onFocus={(e) => {
        e.target.style.borderColor = "rgba(239,68,68,0.5)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      {children}
    </select>
  );
}

function Modal({ open, onClose, title, children, width = 720 }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#141418",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            position: "sticky",
            top: 0,
            background: "#141418",
            zIndex: 1,
          }}
        >
          <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 800, margin: 0 }}>
            {title}
          </h2>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: "#71717a",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function SortTh({ label, field, sortBy, sortAsc, onSort }) {
  const active = sortBy === field;

  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: "11px 14px",
        textAlign: "left",
        cursor: "pointer",
        color: active ? "#ef4444" : "#71717a",
        fontWeight: 700,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        {active ? (
          sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
        ) : (
          <ChevronDown size={12} style={{ opacity: 0.3 }} />
        )}
      </span>
    </th>
  );
}

function SectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 900,
        color: "#52525b",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        padding: "16px 0 6px",
      }}
    >
      {children}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          color: "#ef4444",
          fontSize: 12,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      {children}
    </div>
  );
}
function DetailDrawer({ acc, onClose, onEdit, onDelete, navigate, moneyMode }) {
  const [showPass, setShowPass] = useState(false);
  const open = !!acc;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const copy = async (text) => {
    await copyToClipboard(text);
  };

  const sourceDays = acc ? daysUntil(acc.expiry_date) : null;
  const customerDays = acc ? daysUntil(acc.customer_expiry || acc.expiry_date) : null;

  const InfoRow = ({ icon: Icon, label, value, action }) => (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={14} style={{ color: "#71717a" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: "#52525b",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 3,
          }}
        >
          {label}
        </div>

        <div style={{ fontSize: 13, color: "#e4e4e7", fontWeight: 600 }}>
          {value ?? "—"}
        </div>
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 900,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 901,
          width: 440,
          maxWidth: "100vw",
          background: "#111115",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.5)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {acc && (
          <>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "#141418",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <h2 style={{ color: "#fff", fontSize: 16, fontWeight: 800, margin: 0 }}>
                  Chi tiết tài khoản
                </h2>

                <button
                  onClick={onClose}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "none",
                    borderRadius: 8,
                    padding: 6,
                    cursor: "pointer",
                    color: "#71717a",
                    display: "flex",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <StatusBadge status={acc.status} />

                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.06)",
                    color: "#d4d4d8",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Nguồn {TYPE_LABELS[acc.account_type]}
                </span>

                {sourceDays !== null && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color:
                        sourceDays <= 0
                          ? "#ef4444"
                          : sourceDays <= 7
                          ? "#f59e0b"
                          : "#71717a",
                    }}
                  >
                    {sourceDays <= 0
                      ? `Nguồn hết ${Math.abs(sourceDays)} ngày`
                      : `Nguồn còn ${sourceDays} ngày`}
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: "0 24px", flex: 1 }}>
              <SectionTitle>Tài khoản</SectionTitle>

              <InfoRow
                icon={Mail}
                label="Gmail"
                value={acc.gmail}
                action={
                  <button onClick={() => copy(acc.gmail)} style={ghostButtonStyle}>
                    <Copy size={13} />
                  </button>
                }
              />

              <InfoRow
                icon={Shield}
                label="Password"
                value={
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "monospace", letterSpacing: showPass ? 0 : 3 }}>
                      {showPass ? acc.password : "••••••••"}
                    </span>

                    <button onClick={() => setShowPass((s) => !s)} style={ghostButtonStyle}>
                      {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>

                    {showPass && (
                      <button onClick={() => copy(acc.password)} style={ghostButtonStyle}>
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                }
              />

              <InfoRow icon={User} label="Nhà cung cấp" value={acc.supplier || "—"} />

              <SectionTitle>Hạn nguồn / nhà cung cấp</SectionTitle>

              <InfoRow icon={Calendar} label="Ngày nhập nguồn" value={formatDate(acc.start_date)} />

              <InfoRow
                icon={Calendar}
                label="Hạn nguồn"
                value={
                  <div>
                    <div>{formatDate(acc.expiry_date)}</div>
                    <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>
                      Gói nguồn: {TYPE_LABELS[acc.account_type] || acc.account_type}
                    </div>
                  </div>
                }
              />

              <SectionTitle>Tài chính</SectionTitle>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 8,
                  marginBottom: 4,
                }}
              >
                {[
                  {
                    label: "Tiền mua nguồn",
                    value: formatVND(acc.cost_price),
                    color: "#a1a1aa",
                  },
                  {
                    label: "Tiền khách đưa",
                    value: formatMoneyByMode({
                      vnd: Number(acc.customer_paid) || Number(acc.sell_price) || 0,
                      usd: Number(acc.customer_paid_usd) || 0,
                      mode: moneyMode,
                    }),
                    color: "#22c55e",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#52525b", marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {acc.customer_name && (
                <>
                  <SectionTitle>Khách hàng</SectionTitle>

                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "linear-gradient(135deg,#ef4444,#dc2626)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        {acc.customer_name[0]?.toUpperCase()}
                      </div>

                      <div>
                        <div style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>
                          {acc.customer_name}
                        </div>

                        {acc.customer_contact && (
                          <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>
                            {acc.customer_contact}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      <CustomerStatusBadge status={acc.customer_status || "using"} />

                      {customerDays !== null && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color:
                              customerDays <= 0
                                ? "#ef4444"
                                : customerDays <= 7
                                ? "#f59e0b"
                                : "#71717a",
                          }}
                        >
                          {customerDays <= 0
                            ? `Khách hết ${Math.abs(customerDays)} ngày`
                            : `Khách còn ${customerDays} ngày`}
                        </span>
                      )}
                    </div>

                    <div style={{ color: "#71717a", fontSize: 12, lineHeight: 1.6 }}>
                      <div>
                        Tính tiền từ:{" "}
                        <span style={{ color: "#a1a1aa" }}>
                          {formatDate(acc.customer_start_date || acc.start_date)}
                        </span>
                      </div>

                      <div>
                        Hạn khách:{" "}
                        <span style={{ color: "#a1a1aa" }}>
                          {formatDate(acc.customer_expiry)}
                        </span>
                      </div>

                      <div>
                        Khách đưa:{" "}
                        <span style={{ color: "#22c55e", fontWeight: 900 }}>
                          {formatMoneyByMode({
                            vnd: Number(acc.customer_paid) || Number(acc.sell_price) || 0,
                            usd: Number(acc.customer_paid_usd) || 0,
                            mode: moneyMode,
                          })}
                        </span>
                      </div>

                      <div>
                        Tỉ giá:{" "}
                        <span style={{ color: "#a1a1aa" }}>
                          {Number(acc.customer_usd_rate || USD_RATE_DEFAULT).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        window.__customerFilter = acc.customer_name;
                        navigate?.("/customers");
                      }}
                      style={{
                        marginTop: 12,
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(239,68,68,0.2)",
                        background: "rgba(239,68,68,0.08)",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      <ArrowRight size={13} />
                      Xem trang khách hàng
                    </button>
                  </div>
                </>
              )}

              {acc.note && (
                <div style={{ paddingBottom: 24 }}>
                  <SectionTitle>Ghi chú</SectionTitle>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "#a1a1aa",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {acc.note}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "#141418",
                display: "flex",
                gap: 10,
                position: "sticky",
                bottom: 0,
              }}
            >
              <button
                onClick={() => {
                  onClose();
                  onDelete(acc);
                }}
                style={{
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.2)",
                  background: "rgba(239,68,68,0.08)",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Trash2 size={13} />
                Xoá
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEdit(acc);
                }}
                style={{
                  flex: 1,
                  padding: "9px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Edit2 size={13} />
                Chỉnh sửa
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function AccountForm({ initial = EMPTY_FORM, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial);
  const [showPass, setShowPass] = useState(false);

  const set = (key, value) =>
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (
        (key === "account_type" || key === "start_date") &&
        next.start_date &&
        next.account_type
      ) {
        next.expiry_date = calcExpiry(next.start_date, next.account_type);
      }

      if (
        key === "customer_start_date" ||
        key === "customer_expiry" ||
        key === "customer_usd_rate"
      ) {
        const startDate = key === "customer_start_date" ? value : next.customer_start_date;
        const expiryDate = key === "customer_expiry" ? value : next.customer_expiry;
        const rate = key === "customer_usd_rate" ? value : next.customer_usd_rate;

        const usd = calcCustomerUsd(startDate, expiryDate);
        next.customer_paid_usd = usd;
        next.customer_paid = calcCustomerVnd(startDate, expiryDate, rate);
      }

      if (key === "sell_price" && !next.customer_paid) {
        next.customer_paid = value;
      }

      return next;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Gmail" required>
          <Input
            value={form.gmail}
            onChange={(e) => set("gmail", e.target.value)}
            placeholder="example@gmail.com"
          />
        </Field>

        <Field label="Password" required>
          <div style={{ position: "relative" }}>
            <Input
              type={showPass ? "text" : "password"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
              style={{ paddingRight: 36 }}
            />

            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#71717a",
              }}
            >
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
      </div>

      <Panel title="Hạn nguồn / nhà cung cấp">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Gói nguồn" required>
            <Select value={form.account_type} onChange={(e) => set("account_type", e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Ngày nhập nguồn" required>
            <DateVNInput value={form.start_date} onChange={(value) => set("start_date", value)} />
          </Field>

          <Field label="Hạn nguồn">
            <DateVNInput value={form.expiry_date} onChange={(value) => set("expiry_date", value)} />
          </Field>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tiền mua nguồn (₫)">
          <Input
            type="number"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
            placeholder="0"
          />
        </Field>

        <Field label="Giá bán / ghi chú giá (₫)">
          <Input
            type="number"
            value={form.sell_price}
            onChange={(e) => set("sell_price", e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nhà cung cấp">
          <Input
            value={form.supplier}
            onChange={(e) => set("supplier", e.target.value)}
            placeholder="Tên nguồn acc"
          />
        </Field>

        <Field label="Tên khách hàng">
          <Input
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
            placeholder="Tên khách"
          />
        </Field>
      </div>

      <Panel title="Thông tin khách mua bên mình">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tính tiền từ ngày">
            <DateVNInput
              value={form.customer_start_date}
              onChange={(value) => set("customer_start_date", value)}
            />
          </Field>

          <Field label="Hạn khách">
            <DateVNInput
              value={form.customer_expiry}
              onChange={(value) => set("customer_expiry", value)}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
          <Field label="Tiền khách đưa VND">
            <Input
              type="number"
              value={form.customer_paid}
              onChange={(e) => set("customer_paid", e.target.value)}
              placeholder="0"
            />
          </Field>

          <Field label="Tiền USD tự tính">
            <div
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                color: "#60a5fa",
                fontWeight: 900,
              }}
            >
              ${Number(form.customer_paid_usd || 0).toFixed(2)}
            </div>
          </Field>

          <Field label="Tỉ giá USD">
            <Input
              type="number"
              value={form.customer_usd_rate}
              onChange={(e) => set("customer_usd_rate", e.target.value)}
              placeholder="25500"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
          <Field label="Liên hệ khách">
            <Input
              value={form.customer_contact}
              onChange={(e) => set("customer_contact", e.target.value)}
              placeholder="SĐT / Facebook / Zalo..."
            />
          </Field>

          <Field label="Trạng thái khách">
            <Select
              value={form.customer_status}
              onChange={(e) => set("customer_status", e.target.value)}
            >
              <option value="using">Đang dùng</option>
              <option value="cancelled">Đã cancel</option>
              <option value="supporting">Đang hỗ trợ</option>
              <option value="refunded">Đã refund</option>
            </Select>
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Ghi chú">
            <Input
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Ghi chú..."
            />
          </Field>
        </div>
      </Panel>

      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          paddingTop: 8,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <button onClick={onCancel} type="button" style={outlineButtonStyle}>
          Huỷ
        </button>

        <button
          onClick={() => onSubmit(form)}
          disabled={loading || !form.gmail || !form.password}
          type="button"
          style={{
            padding: "9px 20px",
            borderRadius: 8,
            border: "none",
            background: loading ? "#7f1d1d" : "linear-gradient(135deg,#ef4444,#dc2626)",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: !form.gmail || !form.password ? 0.5 : 1,
          }}
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          {loading ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </div>
  );
}
function ImportModal({ open, onClose, onImport }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");

  const parse = (raw) => {
    setError("");

    const lines = raw.trim().split("\n").filter(Boolean);

    try {
      const rows = lines.map((line, index) => {
        const cols = line.split("\t").map((s) => s.trim());

        if (cols.length < 3) throw new Error(`Dòng ${index + 1}: thiếu cột`);

        const [
          gmail,
          password,
          account_type,
          start_date,
          expiry_date,
          cost_price,
          sell_price,
          supplier,
          customer_name,
          customer_start_date,
          customer_expiry,
          customer_contact,
          note,
        ] = cols;

        const sourceStart = vnDateToISO(start_date) || start_date || todayISO();
        const sourceType = account_type || "3_months";
        const sourceExpiry =
          vnDateToISO(expiry_date) || expiry_date || calcExpiry(sourceStart, sourceType);

        const customerStart =
          vnDateToISO(customer_start_date) || customer_start_date || "2026-04-01";

        const customerExpiry =
          vnDateToISO(customer_expiry) || customer_expiry || DEFAULT_CUSTOMER_EXPIRY;

        const usd = calcCustomerUsd(customerStart, customerExpiry);

        return {
          gmail,
          password,

          account_type: sourceType,
          start_date: sourceStart,
          expiry_date: sourceExpiry,

          cost_price: Number(cost_price) || 0,
          sell_price: Number(sell_price) || 0,
          supplier: supplier || "",

          customer_name: customer_name || "",
          customer_start_date: customerStart,
          customer_package: "1_year",
          customer_expiry: customerExpiry,
          customer_contact: customer_contact || "",
          customer_paid_usd: usd,
          customer_usd_rate: USD_RATE_DEFAULT,
          customer_paid: Math.round(usd * USD_RATE_DEFAULT),
          customer_status: "using",

          note: note || "",
        };
      });

      setPreview(rows);
    } catch (err) {
      setError(err.message);
      setPreview([]);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import tài khoản hàng loạt" width={760}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            padding: 12,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 8,
            fontSize: 12,
            color: "#fbbf24",
            lineHeight: 1.6,
          }}
        >
          <strong>Format tab:</strong>
          <br />
          gmail | password | gói nguồn | ngày nguồn | hạn nguồn | tiền mua nguồn | giá bán | nguồn | khách | tính tiền từ ngày | hạn khách | liên hệ | ghi chú
          <br />
          Ngày có thể nhập dạng <strong>dd/mm/yyyy</strong>.
        </div>

        <Field label="Dán dữ liệu vào đây">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              parse(e.target.value);
            }}
            style={{
              ...inputStyle,
              height: 140,
              resize: "vertical",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          />
        </Field>

        {error && (
          <div style={{ color: "#ef4444", fontSize: 12 }}>
            <AlertTriangle size={13} style={{ display: "inline", marginRight: 4 }} />
            {error}
          </div>
        )}

        {preview.length > 0 && (
          <p style={{ color: "#22c55e", fontSize: 12 }}>
            ✓ {preview.length} tài khoản hợp lệ
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={outlineButtonStyle}>
            Huỷ
          </button>

          <button
            onClick={() => onImport(preview)}
            disabled={!preview.length}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: preview.length
                ? "linear-gradient(135deg,#ef4444,#dc2626)"
                : "#3f3f46",
              color: "#fff",
              cursor: preview.length ? "pointer" : "not-allowed",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            Import {preview.length > 0 ? `${preview.length} acc` : ""}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AccountsView({ toast, navigate }) {
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [moneyMode, setMoneyMode] = useState("vnd");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [sortBy, setSortBy] = useState("expiry_date");
  const [sortAsc, setSortAsc] = useState(true);

  const [selectedAcc, setSelectedAcc] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editAcc, setEditAcc] = useState(null);
  const [deleteAcc, setDeleteAcc] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const { data, count, error } = await accountService.getAll({
        status: filterStatus || undefined,
        accountType: filterType || undefined,
        supplier: filterSupplier || undefined,
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
        orderBy: sortBy,
        asc: sortAsc,
      });

      if (error) throw error;

      setAccounts(data ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      toast?.error("Lỗi tải dữ liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, filterSupplier, search, page, sortBy, sortAsc, toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 400),
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.__accountFilter) {
        setSearchInput(window.__accountFilter);
        setSearch(window.__accountFilter);
        window.__accountFilter = "";
        setPage(1);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }

    setPage(1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await accountService.refreshStatuses?.();
    await fetchAccounts();
    setRefreshing(false);
    toast?.success("Đã cập nhật trạng thái nguồn!");
  };

  const handleAdd = async (form) => {
    setFormLoading(true);

    try {
      const { error } = await accountService.create(form);
      if (error) throw error;

      toast?.success("Thêm tài khoản thành công!");
      setShowAdd(false);
      fetchAccounts();
    } catch (err) {
      toast?.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (form) => {
    if (!editAcc) return;

    setFormLoading(true);

    try {
      const { error } = await accountService.update(editAcc.id, form);
      if (error) throw error;

      toast?.success("Cập nhật thành công!");
      setEditAcc(null);
      fetchAccounts();
    } catch (err) {
      toast?.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAcc) return;

    try {
      const { error } = await accountService.delete(deleteAcc.id);
      if (error) throw error;

      toast?.success("Đã xoá tài khoản!");
      setDeleteAcc(null);
      fetchAccounts();
    } catch (err) {
      toast?.error(err.message);
    }
  };

  const handleImport = async (rows) => {
    setFormLoading(true);

    try {
      const { error } = await accountService.bulkCreate(rows);
      if (error) throw error;

      toast?.success(`Import ${rows.length} tài khoản thành công!`);
      setShowImport(false);
      fetchAccounts();
    } catch (err) {
      toast?.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExport = () => {
    const rows = accounts.map((account) => ({
      Gmail: account.gmail,
      Password: account.password,
      "Gói nguồn": TYPE_LABELS[account.account_type],
      "Ngày nhập nguồn": formatDate(account.start_date),
      "Hạn nguồn": formatDate(account.expiry_date),
      "Trạng thái nguồn": STATUS_CONFIG[account.status]?.label,
      "Tiền mua nguồn": account.cost_price,
      "Giá bán / ghi chú giá": account.sell_price,
      "Nhà CC": account.supplier,
      "Khách hàng": account.customer_name,
      "Tính tiền từ ngày": formatDate(account.customer_start_date),
      "Hạn khách": formatDate(account.customer_expiry),
      "Tiền khách đưa": account.customer_paid,
      "Tiền USD": account.customer_paid_usd,
      "Tỉ giá": account.customer_usd_rate,
      "Liên hệ": account.customer_contact,
      "Trạng thái khách": CUSTOMER_STATUS[account.customer_status]?.label,
      "Ghi chú": account.note,
    }));

    exportToCSV(rows, `accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    toast?.success("Đã xuất file CSV!");
  };

  const handleCopy = async (event, text, label) => {
    event.stopPropagation();
    await copyToClipboard(text);
    toast?.success(label);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>
            Quản lý tài khoản YTB
          </h1>

          <p style={{ color: "#71717a", fontSize: 13, margin: "4px 0 0" }}>
            {total} tài khoản · ngày nguồn riêng, hạn khách quy về 01/04/2027
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setMoneyMode((mode) => (mode === "vnd" ? "usd" : "vnd"))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(34,197,94,0.22)",
              background: "rgba(34,197,94,0.08)",
              color: "#22c55e",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            <DollarSign size={14} />
            Đang xem: {moneyMode === "vnd" ? "VND" : "USD"}
          </button>

          {[
            { icon: Upload, label: "Import", onClick: () => setShowImport(true) },
            { icon: Download, label: "Export", onClick: handleExport },
            { icon: Trash2, label: "Thùng rác", onClick: () => navigate?.("/trash") },
            { icon: RefreshCw, label: "Cập nhật", onClick: handleRefresh, spin: refreshing },
          ].map(({ icon: Icon, label, onClick, spin }) => (
            <button
              key={label}
              onClick={onClick}
              disabled={spin}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#a1a1aa",
                cursor: spin ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <Icon size={14} style={{ animation: spin ? "spin 1s linear infinite" : "none" }} />
              {label}
            </button>
          ))}

          <button
            onClick={() => setShowAdd(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 900,
              boxShadow: "0 4px 16px rgba(239,68,68,0.3)",
            }}
          >
            <Plus size={15} />
            Thêm tài khoản
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          padding: 14,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#71717a",
            }}
          />

          <input
            placeholder="Tìm gmail, khách hàng, liên hệ..."
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              debouncedSearch(event.target.value);
            }}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value);
            setPage(1);
          }}
          style={{ ...inputStyle, width: 130, cursor: "pointer" }}
        >
          <option value="">Trạng thái nguồn</option>
          <option value="active">Còn hạn</option>
          <option value="expiring">Sắp hết</option>
          <option value="expired">Hết hạn</option>
        </select>

        <select
          value={filterType}
          onChange={(event) => {
            setFilterType(event.target.value);
            setPage(1);
          }}
          style={{ ...inputStyle, width: 120, cursor: "pointer" }}
        >
          <option value="">Gói nguồn</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          placeholder="Nguồn acc..."
          value={filterSupplier}
          onChange={(event) => {
            setFilterSupplier(event.target.value);
            setPage(1);
          }}
          style={{ ...inputStyle, width: 130 }}
        />

        {(filterStatus || filterType || filterSupplier || searchInput) && (
          <button
            onClick={() => {
              setFilterStatus("");
              setFilterType("");
              setFilterSupplier("");
              setSearch("");
              setSearchInput("");
              setPage(1);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.08)",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <X size={12} />
            Xoá lọc
          </button>
        )}
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {[
                  "Gmail",
                  "Pass",
                  "Nguồn",
                  "TT nguồn",
                  "Khách hàng",
                  "Tính tiền từ",
                  "Hạn khách",
                  moneyMode === "vnd" ? "Tiền khách VND" : "Tiền khách USD",
                ].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "11px 14px",
                      textAlign: "left",
                      color: "#71717a",
                      fontWeight: 800,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {header}
                  </th>
                ))}

                <SortTh
                  label="Hạn nguồn"
                  field="expiry_date"
                  sortBy={sortBy}
                  sortAsc={sortAsc}
                  onSort={handleSort}
                />

                <th
                  style={{
                    padding: "11px 14px",
                    textAlign: "center",
                    color: "#71717a",
                    fontWeight: 800,
                    fontSize: 11,
                    textTransform: "uppercase",
                  }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {Array.from({ length: 10 }).map((_, cellIndex) => (
                      <td key={cellIndex} style={{ padding: "13px 14px" }}>
                        <div
                          style={{
                            height: 13,
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.05)",
                            width: cellIndex === 0 ? "80%" : "60%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: "60px 20px",
                      textAlign: "center",
                      color: "#52525b",
                      fontSize: 14,
                    }}
                  >
                    Không có tài khoản nào
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const sourceDays = daysUntil(account.expiry_date);
                  const customerDays = daysUntil(account.customer_expiry);
                  const isExpiring = account.status === "expiring";
                  const isExpired = account.status === "expired";

                  return (
                    <tr
                      key={account.id}
                      onClick={() => setSelectedAcc(account)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        background: isExpiring
                          ? "rgba(245,158,11,0.03)"
                          : isExpired
                          ? "rgba(239,68,68,0.03)"
                          : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = isExpiring
                          ? "rgba(245,158,11,0.03)"
                          : isExpired
                          ? "rgba(239,68,68,0.03)"
                          : "transparent";
                      }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 700 }}>
                            {account.gmail}
                          </span>

                          <button
                            onClick={(event) => handleCopy(event, account.gmail, "Đã copy gmail!")}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#52525b",
                              padding: 2,
                            }}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ color: "#52525b", fontSize: 12, letterSpacing: 2 }}>
                          ••••••••
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 700 }}>
                          {TYPE_LABELS[account.account_type]}
                        </div>

                        <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>
                          {formatDate(account.start_date)} → {formatDate(account.expiry_date)}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <StatusBadge status={account.status} />
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        {account.customer_name ? (
                          <div>
                            <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 700 }}>
                              {account.customer_name}
                            </div>

                            {account.customer_contact && (
                              <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>
                                {account.customer_contact}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#3f3f46", fontSize: 12 }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ color: "#e4e4e7", fontSize: 13 }}>
                          {formatDate(account.customer_start_date)}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ color: "#e4e4e7", fontSize: 13 }}>
                          {formatDate(account.customer_expiry)}
                        </div>

                        {customerDays !== null && (
                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 2,
                              color:
                                customerDays <= 0
                                  ? "#ef4444"
                                  : customerDays <= 7
                                  ? "#f59e0b"
                                  : "#71717a",
                            }}
                          >
                            {customerDays <= 0
                              ? `Hết ${Math.abs(customerDays)} ngày`
                              : `Còn ${customerDays} ngày`}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 900 }}>
                          {formatMoneyByMode({
                            vnd: Number(account.customer_paid) || Number(account.sell_price) || 0,
                            usd: Number(account.customer_paid_usd) || 0,
                            mode: moneyMode,
                          })}
                        </div>

                        <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>
                          rate {Number(account.customer_usd_rate || USD_RATE_DEFAULT).toLocaleString("vi-VN")}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ color: "#e4e4e7", fontSize: 13 }}>
                          {formatDate(account.expiry_date)}
                        </div>

                        {sourceDays !== null && (
                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 2,
                              color:
                                sourceDays <= 0
                                  ? "#ef4444"
                                  : sourceDays <= 7
                                  ? "#f59e0b"
                                  : "#71717a",
                            }}
                          >
                            {sourceDays <= 0
                              ? `Hết ${Math.abs(sourceDays)} ngày`
                              : `Còn ${sourceDays} ngày`}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditAcc(account);
                            }}
                            style={{
                              padding: "5px 8px",
                              borderRadius: 6,
                              border: "none",
                              background: "rgba(59,130,246,0.1)",
                              color: "#60a5fa",
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteAcc(account);
                            }}
                            style={{
                              padding: "5px 8px",
                              borderRadius: 6,
                              border: "none",
                              background: "rgba(239,68,68,0.1)",
                              color: "#f87171",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ color: "#71717a", fontSize: 12 }}>
              Trang {page}/{totalPages} · {total} tài khoản
            </span>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                style={pagerStyle(page === 1)}
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                const pageNumber = Math.max(1, Math.min(page - 2, totalPages - 4)) + index;

                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      minWidth: 32,
                      border: pageNumber === page ? "none" : "1px solid rgba(255,255,255,0.1)",
                      background: pageNumber === page ? "#ef4444" : "transparent",
                      color: pageNumber === page ? "#fff" : "#a1a1aa",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: pageNumber === page ? 900 : 500,
                    }}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                style={pagerStyle(page === totalPages)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <DetailDrawer
        acc={selectedAcc}
        onClose={() => setSelectedAcc(null)}
        onEdit={(account) => setEditAcc(account)}
        onDelete={(account) => setDeleteAcc(account)}
        navigate={navigate}
        moneyMode={moneyMode}
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Thêm tài khoản mới">
        <AccountForm
          onSubmit={handleAdd}
          onCancel={() => setShowAdd(false)}
          loading={formLoading}
        />
      </Modal>

      <Modal open={!!editAcc} onClose={() => setEditAcc(null)} title="Sửa tài khoản">
        {editAcc && (
          <AccountForm
            initial={{
              gmail: editAcc.gmail ?? "",
              password: editAcc.password ?? "",

              account_type: editAcc.account_type ?? "3_months",
              start_date: editAcc.start_date ?? todayISO(),
              expiry_date: editAcc.expiry_date ?? "",

              cost_price: editAcc.cost_price ?? "",
              sell_price: editAcc.sell_price ?? "",

              supplier: editAcc.supplier ?? "",

              customer_name: editAcc.customer_name ?? "",
              customer_start_date: editAcc.customer_start_date ?? editAcc.start_date ?? "2026-04-01",
              customer_package: editAcc.customer_package ?? "1_year",
              customer_expiry: editAcc.customer_expiry ?? DEFAULT_CUSTOMER_EXPIRY,
              customer_contact: editAcc.customer_contact ?? "",
              customer_paid: editAcc.customer_paid ?? editAcc.sell_price ?? "",
              customer_paid_usd: editAcc.customer_paid_usd ?? "",
              customer_usd_rate: editAcc.customer_usd_rate ?? USD_RATE_DEFAULT,
              customer_status: editAcc.customer_status ?? "using",

              note: editAcc.note ?? "",
            }}
            onSubmit={handleEdit}
            onCancel={() => setEditAcc(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <Modal open={!!deleteAcc} onClose={() => setDeleteAcc(null)} title="Xác nhận xoá" width={420}>
        {deleteAcc && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                padding: 16,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />

              <div>
                <p style={{ color: "#fff", fontWeight: 800, margin: "0 0 4px", fontSize: 14 }}>
                  Xoá tài khoản này?
                </p>
                <p style={{ color: "#a1a1aa", fontSize: 13, margin: 0 }}>{deleteAcc.gmail}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteAcc(null)} style={outlineButtonStyle}>
                Huỷ
              </button>

              <button
                onClick={handleDelete}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                Xoá
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function pagerStyle(disabled) {
  return {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: disabled ? "#3f3f46" : "#a1a1aa",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
  };
}
