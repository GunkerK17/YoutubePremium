// src/views/CustomersView.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  X,
  User,
  Mail,
  DollarSign,
  Package,
  Copy,
  Eye,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Edit2,
  Check,
  Phone,
  ArrowRight,
} from "lucide-react";

import { customerService } from "../services/customerService";
import {
  formatDate,
  formatVND,
  daysUntil,
  copyToClipboard,
  debounce,
} from "../lib/utils";

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
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return "";

  const [, d, m, y] = match;

  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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

function formatMoneyByMode({ vnd, usd, mode }) {
  if (mode === "usd") {
    return `$${Number(usd || 0).toFixed(2)}`;
  }

  return formatVND(Number(vnd) || 0);
}

function calcTotalCost(accounts) {
  return accounts.reduce((sum, account) => {
    return sum + (Number(account.cost_price) || 0);
  }, 0);
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired;
  const Icon = cfg.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
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
      <Icon size={11} />
      {cfg.label}
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

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background:
          "linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ margin: 0, color: "#71717a", fontSize: 12, fontWeight: 700 }}>
            {label}
          </p>

          <h3 style={{ margin: "7px 0 0", color: "#fff", fontSize: 22, fontWeight: 900 }}>
            {value}
          </h3>

          {sub && (
            <p style={{ margin: "5px 0 0", color: "#52525b", fontSize: 11 }}>
              {sub}
            </p>
          )}
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            background:
              "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.08))",
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, green }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 12,
        background: "rgba(0,0,0,0.22)",
        border: "1px solid rgba(255,255,255,0.07)",
        minWidth: 0,
      }}
    >
      <span style={{ display: "block", color: "#71717a", fontSize: 11, marginBottom: 4 }}>
        {label}
      </span>

      <strong
        style={{
          display: "block",
          color: green ? "#22c55e" : "#fff",
          fontSize: 14,
          fontWeight: 900,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
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
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#141418",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#141418",
            zIndex: 2,
          }}
        >
          <h2 style={{ margin: 0, color: "#fff", fontSize: 16, fontWeight: 900 }}>
            {title}
          </h2>

          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              border: "none",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "#71717a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: 6,
          color: "#a1a1aa",
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function EditCustomerAccountModal({ account, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    customer_start_date: account?.customer_start_date || account?.start_date || "2026-04-01",
    customer_package: account?.customer_package || "1_year",
    customer_expiry: account?.customer_expiry || DEFAULT_CUSTOMER_EXPIRY,
    customer_contact: account?.customer_contact || "",
    customer_paid: account?.customer_paid || account?.sell_price || 0,
    customer_paid_usd: account?.customer_paid_usd || 0,
    customer_usd_rate: account?.customer_usd_rate || USD_RATE_DEFAULT,
    customer_status: account?.customer_status || "using",
    note: account?.note || "",
  });

  useEffect(() => {
    if (!account) return;

    setForm({
      customer_start_date: account.customer_start_date || account.start_date || "2026-04-01",
      customer_package: account.customer_package || "1_year",
      customer_expiry: account.customer_expiry || DEFAULT_CUSTOMER_EXPIRY,
      customer_contact: account.customer_contact || "",
      customer_paid: account.customer_paid || account.sell_price || 0,
      customer_paid_usd: account.customer_paid_usd || 0,
      customer_usd_rate: account.customer_usd_rate || USD_RATE_DEFAULT,
      customer_status: account.customer_status || "using",
      note: account.note || "",
    });
  }, [account]);

  if (!account) return null;

  const set = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

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

      return next;
    });
  };

  return (
    <Modal open={!!account} onClose={onClose} title="Sửa thông tin khách mua" width={620}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            padding: 13,
            borderRadius: 12,
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ color: "#71717a", fontSize: 12, marginBottom: 4 }}>
            Account
          </div>

          <div style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>
            {account.gmail}
          </div>

          <div style={{ color: "#71717a", fontSize: 12, marginTop: 4 }}>
            Nguồn: {formatDate(account.start_date)} → {formatDate(account.expiry_date)} ·{" "}
            {TYPE_LABELS[account.account_type] || account.account_type}
          </div>
        </div>

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tiền khách đưa VND">
            <input
              type="number"
              value={form.customer_paid}
              onChange={(event) => set("customer_paid", event.target.value)}
              style={inputStyle}
              placeholder="0"
            />
          </Field>

          <Field label="Tỉ giá USD">
            <input
              type="number"
              value={form.customer_usd_rate}
              onChange={(event) => set("customer_usd_rate", event.target.value)}
              style={inputStyle}
              placeholder="25500"
            />
          </Field>
        </div>

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

        <Field label="Trạng thái khách">
          <select
            value={form.customer_status}
            onChange={(event) => set("customer_status", event.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="using">Đang dùng</option>
            <option value="cancelled">Đã cancel</option>
            <option value="supporting">Đang hỗ trợ</option>
            <option value="refunded">Đã refund</option>
          </select>
        </Field>

        <Field label="Thông tin liên hệ">
          <input
            value={form.customer_contact}
            onChange={(event) => set("customer_contact", event.target.value)}
            style={inputStyle}
            placeholder="SĐT / Facebook / Zalo / Link chat..."
          />
        </Field>

        <Field label="Note">
          <textarea
            value={form.note}
            onChange={(event) => set("note", event.target.value)}
            style={{
              ...inputStyle,
              minHeight: 120,
              resize: "vertical",
              lineHeight: 1.6,
            }}
            placeholder="Ghi chú riêng cho acc này..."
          />
        </Field>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#a1a1aa",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Huỷ
          </button>

          <button
            onClick={() => onSave(form)}
            disabled={loading}
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
            }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
            Lưu
          </button>
        </div>
      </div>
    </Modal>
  );
}
function CustomerDrawer({
  customer,
  moneyMode,
  onClose,
  onEditAccount,
  onSupport,
  navigate,
}) {
  const open = !!customer;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!customer) return null;

  const copy = async (text) => {
    if (!text) return;
    await copyToClipboard(text);
  };

  const goToAccount = () => {
    window.__accountFilter = customer.name;
    navigate?.("/accounts");
    onClose?.();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 900,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 901,
          width: 520,
          maxWidth: "100vw",
          background: "#111115",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: 24,
            background:
              "linear-gradient(135deg,rgba(239,68,68,0.16),rgba(20,20,24,0.96))",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
            <div style={{ display: "flex", gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  boxShadow: "0 12px 30px rgba(239,68,68,0.3)",
                  flexShrink: 0,
                }}
              >
                {customer.name?.[0]?.toUpperCase() || "K"}
              </div>

              <div style={{ minWidth: 0 }}>
                <h2
                  style={{
                    color: "#fff",
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 900,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {customer.name}
                </h2>

                <p style={{ margin: "6px 0 0", color: "#71717a", fontSize: 13 }}>
                  {customer.totalAccounts} acc đã mua · {customer.activeAccounts} acc đang dùng
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                border: "none",
                borderRadius: 9,
                background: "rgba(255,255,255,0.07)",
                color: "#a1a1aa",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
              marginTop: 20,
            }}
          >
            <MiniStat label="Đã mua" value={customer.totalAccounts} />
            <MiniStat label="Đang dùng" value={customer.activeAccounts} />
            <MiniStat
              label="Tổng tiền"
              value={formatMoneyByMode({
                vnd: customer.totalPaid,
                usd: customer.totalPaidUsd,
                mode: moneyMode,
              })}
              green
            />
          </div>

          <button
            onClick={goToAccount}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.09)",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            <ArrowRight size={14} />
            Qua trang Account của khách này
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>
          <div
            style={{
              color: "#52525b",
              fontSize: 11,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Danh sách acc khách đang mua
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {customer.accounts.map((account) => {
              const sourceStart = account.start_date;
              const sourceExpiry = account.expiry_date;
              const customerStart = account.customer_start_date || account.start_date;
              const customerExpiry = account.customer_expiry;
              const days = daysUntil(customerExpiry || sourceExpiry);
              const paid = Number(account.customer_paid) || Number(account.sell_price) || 0;

              return (
                <div
                  key={account.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Mail size={13} style={{ color: "#71717a", flexShrink: 0 }} />

                        <span
                          style={{
                            color: "#e4e4e7",
                            fontSize: 13,
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {account.gmail}
                        </span>

                        <button
                          onClick={() => copy(account.gmail)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#52525b",
                            cursor: "pointer",
                            padding: 2,
                          }}
                        >
                          <Copy size={12} />
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 9 }}>
                        <StatusBadge status={account.status} />
                        <CustomerStatusBadge status={account.customer_status || "using"} />

                        <span
                          style={{
                            color: days <= 0 ? "#ef4444" : days <= 7 ? "#f59e0b" : "#71717a",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {days <= 0 ? `Hết ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                        </span>
                      </div>

                      <div style={{ marginTop: 9, color: "#71717a", fontSize: 12, lineHeight: 1.6 }}>
                        <div>
                          Tính tiền từ:{" "}
                          <span style={{ color: "#a1a1aa" }}>
                            {formatDate(customerStart)}
                          </span>
                        </div>

                        <div>
                          Hạn khách:{" "}
                          <span style={{ color: "#a1a1aa" }}>
                            {formatDate(customerExpiry)}
                          </span>
                        </div>

                        <div>
                          Nguồn: {formatDate(sourceStart)} →{" "}
                          <span style={{ color: "#a1a1aa" }}>{formatDate(sourceExpiry)}</span>
                          {" "}· {TYPE_LABELS[account.account_type] || account.account_type}
                        </div>
                      </div>

                      <div style={{ marginTop: 7, color: "#71717a", fontSize: 12 }}>
                        Khách đưa:{" "}
                        <span style={{ color: "#22c55e", fontWeight: 900 }}>
                          {formatMoneyByMode({
                            vnd: paid,
                            usd: account.customer_paid_usd,
                            mode: moneyMode,
                          })}
                        </span>
                      </div>

                      <div style={{ marginTop: 4, color: "#71717a", fontSize: 12 }}>
                        Tiền mua nguồn:{" "}
                        <span style={{ color: "#a1a1aa", fontWeight: 800 }}>
                          {formatVND(account.cost_price)}
                        </span>
                      </div>

                      <div style={{ marginTop: 4, color: "#71717a", fontSize: 12 }}>
                        Tỉ giá:{" "}
                        <span style={{ color: "#a1a1aa" }}>
                          {Number(account.customer_usd_rate || USD_RATE_DEFAULT).toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      {account.customer_contact && (
                        <div
                          style={{
                            marginTop: 7,
                            color: "#a1a1aa",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Phone size={12} style={{ color: "#71717a" }} />
                          {account.customer_contact}
                        </div>
                      )}

                      {account.note && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: 9,
                            borderRadius: 9,
                            background: "rgba(0,0,0,0.18)",
                            color: "#71717a",
                            fontSize: 12,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {account.note}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <button
                        onClick={() => onEditAccount(account)}
                        style={{
                          padding: "6px 9px",
                          borderRadius: 8,
                          border: "1px solid rgba(59,130,246,0.2)",
                          background: "rgba(59,130,246,0.1)",
                          color: "#60a5fa",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <Edit2 size={12} />
                        Sửa
                      </button>

                      <br />

                      <button
                        onClick={() => onSupport(customer, account)}
                        style={{
                          marginTop: 8,
                          padding: "6px 9px",
                          borderRadius: 8,
                          border: "1px solid rgba(239,68,68,0.2)",
                          background: "rgba(239,68,68,0.08)",
                          color: "#ef4444",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <MessageSquare size={12} />
                        Báo lỗi
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}

export default function CustomersView({ toast, navigate }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [moneyMode, setMoneyMode] = useState("vnd");

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editAccount, setEditAccount] = useState(null);
  const [supportData, setSupportData] = useState(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await customerService.getFromAccounts();

      if (error) throw error;

      setAccounts(data ?? []);
    } catch (err) {
      toast?.error("Lỗi tải khách hàng: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.__customerFilter) {
        setSearchInput(window.__customerFilter);
        setSearch(window.__customerFilter);
        window.__customerFilter = "";
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const debouncedSearch = useMemo(() => {
    return debounce((value) => setSearch(value), 350);
  }, []);

  const customers = useMemo(() => {
    const map = new Map();

    accounts
      .filter((account) => account.customer_name && account.customer_name.trim())
      .forEach((account) => {
        const key = normalizeText(account.customer_name);

        if (!map.has(key)) {
          map.set(key, {
            key,
            name: account.customer_name.trim(),
            accounts: [],
            totalAccounts: 0,
            activeAccounts: 0,

            totalPaid: 0,
            totalPaidUsd: 0,
            totalCost: 0,
            realProfit: 0,

            nearestExpiry: null,
            nearestSourceExpiry: null,
            lastPurchase: null,
            contact: account.customer_contact || "",
          });
        }

        const customer = map.get(key);

        const paid = Number(account.customer_paid) || Number(account.sell_price) || 0;
        const paidUsd = Number(account.customer_paid_usd) || 0;
        const cost = Number(account.cost_price) || 0;

        const expiry = account.customer_expiry || account.expiry_date;
        const sourceExpiry = account.expiry_date;
        const purchaseDate = account.customer_start_date || account.start_date;

        customer.accounts.push(account);
        customer.totalAccounts += 1;

        customer.totalPaid += paid;
        customer.totalPaidUsd += paidUsd;
        customer.totalCost += cost;
        customer.realProfit = customer.totalPaid - customer.totalCost;

        if (
          (account.status === "active" || account.status === "expiring") &&
          (account.customer_status || "using") === "using"
        ) {
          customer.activeAccounts += 1;
        }

        if (!customer.contact && account.customer_contact) {
          customer.contact = account.customer_contact;
        }

        if (
          expiry &&
          (!customer.nearestExpiry || new Date(expiry) < new Date(customer.nearestExpiry))
        ) {
          customer.nearestExpiry = expiry;
        }

        if (
          sourceExpiry &&
          (!customer.nearestSourceExpiry ||
            new Date(sourceExpiry) < new Date(customer.nearestSourceExpiry))
        ) {
          customer.nearestSourceExpiry = sourceExpiry;
        }

        if (
          purchaseDate &&
          (!customer.lastPurchase || new Date(purchaseDate) > new Date(customer.lastPurchase))
        ) {
          customer.lastPurchase = purchaseDate;
        }
      });

    return Array.from(map.values())
      .map((customer) => ({
        ...customer,
        accounts: customer.accounts.sort((a, b) => {
          const ad = new Date(a.customer_expiry || a.expiry_date);
          const bd = new Date(b.customer_expiry || b.expiry_date);
          return ad - bd;
        }),
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid);
  }, [accounts]);
    const filteredCustomers = useMemo(() => {
    const q = normalizeText(search);

    if (!q) return customers;

    return customers.filter((customer) => {
      const matchName = normalizeText(customer.name).includes(q);
      const matchContact = normalizeText(customer.contact).includes(q);

      const matchAccount = customer.accounts.some((account) => {
        return (
          normalizeText(account.gmail).includes(q) ||
          normalizeText(account.customer_name).includes(q) ||
          normalizeText(account.customer_contact).includes(q) ||
          normalizeText(account.note).includes(q)
        );
      });

      return matchName || matchContact || matchAccount;
    });
  }, [customers, search]);

  const stats = useMemo(() => {
    const totalPaid = customers.reduce((sum, customer) => sum + customer.totalPaid, 0);
    const totalPaidUsd = customers.reduce((sum, customer) => sum + customer.totalPaidUsd, 0);
    const totalCost = customers.reduce((sum, customer) => sum + customer.totalCost, 0);
    const realProfit = totalPaid - totalCost;

    return {
      totalCustomers: customers.length,
      totalAccounts: customers.reduce((sum, customer) => sum + customer.totalAccounts, 0),
      activeAccounts: customers.reduce((sum, customer) => sum + customer.activeAccounts, 0),
      totalPaid,
      totalPaidUsd,
      totalCost,
      realProfit,
    };
  }, [customers]);

  const selectedCustomerLive = useMemo(() => {
    if (!selectedCustomer) return null;
    return customers.find((customer) => customer.key === selectedCustomer.key) || selectedCustomer;
  }, [customers, selectedCustomer]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts();
    setRefreshing(false);
    toast?.success("Đã cập nhật danh sách khách!");
  };

  const handleSaveEditAccount = async (form) => {
    if (!editAccount) return;

    setFormLoading(true);

    try {
      const { error } = await customerService.updateAccountCustomerInfo(editAccount.id, form);

      if (error) throw error;

      toast?.success("Đã cập nhật thông tin khách mua!");
      setEditAccount(null);
      await fetchAccounts();
    } catch (err) {
      toast?.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSupportSave = async () => {
    if (!supportData?.account) return;

    setFormLoading(true);

    try {
      const oldNote = supportData.account.note || "";
      const time = new Date().toLocaleString("vi-VN");

      const payload = {
        customer_start_date:
          supportData.account.customer_start_date ||
          supportData.account.start_date ||
          "2026-04-01",
        customer_package: supportData.account.customer_package || "1_year",
        customer_expiry: supportData.account.customer_expiry || DEFAULT_CUSTOMER_EXPIRY,
        customer_contact: supportData.account.customer_contact || "",
        customer_paid:
          Number(supportData.account.customer_paid) ||
          Number(supportData.account.sell_price) ||
          0,
        customer_paid_usd: Number(supportData.account.customer_paid_usd) || 0,
        customer_usd_rate: Number(supportData.account.customer_usd_rate) || USD_RATE_DEFAULT,
        customer_status: "supporting",
        note: `${oldNote ? `${oldNote}\n\n` : ""}[${time}] Khách báo lỗi acc này, cần hỗ trợ.`,
      };

      const { error } = await customerService.updateAccountCustomerInfo(
        supportData.account.id,
        payload
      );

      if (error) throw error;

      toast?.success("Đã chuyển acc sang trạng thái đang hỗ trợ!");
      setSupportData(null);
      await fetchAccounts();
    } catch (err) {
      toast?.error(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const goToAccountsByCustomer = (customerName) => {
    window.__accountFilter = customerName;
    navigate?.("/accounts");
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
            Khách hàng từ Account
          </h1>

          <p style={{ color: "#71717a", fontSize: 13, margin: "5px 0 0" }}>
            Gom khách từ Account, tính doanh thu theo VND/USD và lợi nhuận thật.
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

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              color: "#a1a1aa",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
            />
            Cập nhật
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
          gap: 12,
        }}
      >
        <StatCard icon={User} label="Tổng khách" value={stats.totalCustomers} />
        <StatCard icon={Package} label="Acc đã bán" value={stats.totalAccounts} />
        <StatCard icon={CheckCircle} label="Acc đang dùng" value={stats.activeAccounts} />

        <StatCard
          icon={DollarSign}
          label="Tổng doanh thu"
          value={formatMoneyByMode({
            vnd: stats.totalPaid,
            usd: stats.totalPaidUsd,
            mode: moneyMode,
          })}
        />

        <StatCard
          icon={DollarSign}
          label="Tiền mua nguồn"
          value={formatVND(stats.totalCost)}
        />

        <StatCard
          icon={DollarSign}
          label="Lợi nhuận thật"
          value={formatVND(stats.realProfit)}
          sub="Doanh thu - tiền mua nguồn"
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 14,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
        }}
      >
        <div style={{ position: "relative", flex: 1 }}>
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
            value={searchInput}
            placeholder="Tìm tên khách, gmail acc, SĐT, Facebook, note..."
            onChange={(event) => {
              setSearchInput(event.target.value);
              debouncedSearch(event.target.value);
            }}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>

        {(searchInput || search) && (
          <button
            onClick={() => {
              setSearchInput("");
              setSearch("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
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
            Xoá
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
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1050 }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {[
                  "Tên khách",
                  "Liên hệ",
                  "Số acc",
                  "Đang dùng",
                  moneyMode === "vnd" ? "Tổng tiền VND" : "Tổng tiền USD",
                  "Lợi nhuận",
                  "Lần tính tiền gần nhất",
                  "Hạn khách gần nhất",
                  "Mail đang dùng",
                  "Thao tác",
                ].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "12px 14px",
                      textAlign: header === "Thao tác" ? "center" : "left",
                      color: "#71717a",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={rowIndex} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {Array.from({ length: 10 }).map((__, cellIndex) => (
                      <td key={cellIndex} style={{ padding: 14 }}>
                        <div
                          style={{
                            height: 13,
                            width: cellIndex === 0 ? "80%" : "60%",
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.055)",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: 58,
                      textAlign: "center",
                      color: "#52525b",
                      fontSize: 14,
                    }}
                  >
                    Chưa có khách nào. Qua Account nhập “Tên khách hàng” là bên này tự hiện.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const days = customer.nearestExpiry ? daysUntil(customer.nearestExpiry) : null;

                  return (
                    <tr
                      key={customer.key}
                      onClick={() => setSelectedCustomer(customer)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 11,
                              background: "linear-gradient(135deg,#ef4444,#dc2626)",
                              color: "#fff",
                              fontWeight: 900,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {customer.name?.[0]?.toUpperCase()}
                          </div>

                          <div>
                            <div style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>
                              {customer.name}
                            </div>

                            <div style={{ color: "#52525b", fontSize: 11, marginTop: 2 }}>
                              Bấm để xem tất cả acc
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            color: customer.contact ? "#a1a1aa" : "#3f3f46",
                            fontSize: 12,
                          }}
                        >
                          {customer.contact || "—"}
                        </span>
                      </td>

                      <td style={{ padding: "13px 14px", color: "#e4e4e7", fontWeight: 900 }}>
                        {customer.totalAccounts}
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            color: customer.activeAccounts > 0 ? "#22c55e" : "#52525b",
                            fontWeight: 900,
                          }}
                        >
                          {customer.activeAccounts}
                        </span>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 900 }}>
                          {formatMoneyByMode({
                            vnd: customer.totalPaid,
                            usd: customer.totalPaidUsd,
                            mode: moneyMode,
                          })}
                        </span>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            color: customer.realProfit >= 0 ? "#22c55e" : "#ef4444",
                            fontSize: 13,
                            fontWeight: 900,
                          }}
                        >
                          {formatVND(customer.realProfit)}
                        </span>
                      </td>

                      <td style={{ padding: "13px 14px", color: "#a1a1aa", fontSize: 13 }}>
                        {customer.lastPurchase ? formatDate(customer.lastPurchase) : "—"}
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ color: "#a1a1aa", fontSize: 13 }}>
                          {customer.nearestExpiry ? formatDate(customer.nearestExpiry) : "—"}
                        </div>

                        {days !== null && (
                          <div
                            style={{
                              marginTop: 2,
                              color:
                                days <= 0
                                  ? "#ef4444"
                                  : days <= 7
                                  ? "#f59e0b"
                                  : "#71717a",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {days <= 0 ? `Hết ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ color: "#a1a1aa", fontSize: 12 }}>
                          {customer.accounts.slice(0, 2).map((account) => account.gmail).join(", ")}
                          {customer.accounts.length > 2 ? ` +${customer.accounts.length - 2}` : ""}
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedCustomer(customer);
                            }}
                            style={{
                              padding: "6px 9px",
                              borderRadius: 8,
                              border: "none",
                              background: "rgba(255,255,255,0.06)",
                              color: "#a1a1aa",
                              cursor: "pointer",
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              goToAccountsByCustomer(customer.name);
                            }}
                            style={{
                              padding: "6px 9px",
                              borderRadius: 8,
                              border: "none",
                              background: "rgba(239,68,68,0.1)",
                              color: "#ef4444",
                              cursor: "pointer",
                            }}
                          >
                            <ArrowRight size={14} />
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
      </div>

      <CustomerDrawer
        customer={selectedCustomerLive}
        moneyMode={moneyMode}
        onClose={() => setSelectedCustomer(null)}
        onEditAccount={(account) => setEditAccount(account)}
        onSupport={(customer, account) => setSupportData({ customer, account })}
        navigate={navigate}
      />

      <EditCustomerAccountModal
        account={editAccount}
        onClose={() => setEditAccount(null)}
        onSave={handleSaveEditAccount}
        loading={formLoading}
      />

      <Modal open={!!supportData} onClose={() => setSupportData(null)} title="Ghi nhận báo lỗi">
        {supportData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
                fontSize: 13,
                lineHeight: 1.6,
                display: "flex",
                gap: 10,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />

              <div>
                Khách <strong>{supportData.customer.name}</strong> báo lỗi acc:{" "}
                <strong>{supportData.account.gmail}</strong>
              </div>
            </div>

            <p style={{ color: "#71717a", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Bấm lưu sẽ chuyển acc này sang trạng thái <strong>Đang hỗ trợ</strong> và tự thêm note.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setSupportData(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#a1a1aa",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Huỷ
              </button>

              <button
                onClick={handleSupportSave}
                disabled={formLoading}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: formLoading
                    ? "#7f1d1d"
                    : "linear-gradient(135deg,#ef4444,#dc2626)",
                  color: "#fff",
                  cursor: formLoading ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                Lưu hỗ trợ
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}