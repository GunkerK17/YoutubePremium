// src/views/SupportView.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Edit2,
  LifeBuoy,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";

import { supportService } from "../services/supportService";
import { copyToClipboard } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { logActivity } from "../services/logService";

const PAGE_SIZE = 30;

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

const ISSUE_TYPES = {
  account_error: {
    label: "Acc lỗi",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.09)",
    border: "rgba(239,68,68,0.22)",
  },
  lost_premium: {
    label: "Mất Premium",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.09)",
    border: "rgba(245,158,11,0.22)",
  },
  login_error: {
    label: "Lỗi đăng nhập",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.09)",
    border: "rgba(59,130,246,0.22)",
  },
  change_account: {
    label: "Đổi acc",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.09)",
    border: "rgba(168,85,247,0.22)",
  },
  refund: {
    label: "Refund",
    color: "#fb7185",
    bg: "rgba(251,113,133,0.09)",
    border: "rgba(251,113,133,0.22)",
  },
  other: {
    label: "Khác",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.09)",
    border: "rgba(161,161,170,0.22)",
  },
};

const SUPPORT_STATUS = {
  open: {
    label: "Mới mở",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.09)",
    border: "rgba(239,68,68,0.22)",
    icon: AlertTriangle,
  },
  processing: {
    label: "Đang xử lý",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.09)",
    border: "rgba(59,130,246,0.22)",
    icon: RefreshCw,
  },
  waiting_source: {
    label: "Chờ nguồn",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.09)",
    border: "rgba(245,158,11,0.22)",
    icon: Clock,
  },
  resolved: {
    label: "Đã xử lý",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.09)",
    border: "rgba(34,197,94,0.22)",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Đã huỷ",
    color: "#71717a",
    bg: "rgba(113,113,122,0.09)",
    border: "rgba(113,113,122,0.22)",
    icon: XCircle,
  },
};

const PRIORITIES = {
  low: {
    label: "Thấp",
    color: "#71717a",
    bg: "rgba(113,113,122,0.09)",
    border: "rgba(113,113,122,0.22)",
  },
  normal: {
    label: "Bình thường",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.09)",
    border: "rgba(59,130,246,0.22)",
  },
  high: {
    label: "Cao",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.09)",
    border: "rgba(245,158,11,0.22)",
  },
  urgent: {
    label: "Gấp",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.09)",
    border: "rgba(239,68,68,0.22)",
  },
};

const EMPTY_FORM = {
  account_id: "",
  customer_name: "",
  customer_contact: "",
  gmail: "",
  issue_type: "account_error",
  status: "open",
  priority: "normal",
  issue_note: "",
  resolve_note: "",
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN");
}

function Badge({ config }) {
  const Icon = config.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 999,
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={11} />}
      {config.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "#111113",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          background: `${color}18`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 13,
        }}
      >
        <Icon size={18} />
      </div>

      <div style={{ color, fontSize: 23, fontWeight: 900, lineHeight: 1 }}>
        {value}
      </div>

      <div style={{ color: "#71717a", fontSize: 12, marginTop: 7 }}>
        {label}
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

function SupportForm({ initial, accounts, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [accountSearch, setAccountSearch] = useState("");

  useEffect(() => {
    setForm(initial || EMPTY_FORM);
  }, [initial]);

  const filteredAccounts = useMemo(() => {
    const q = normalizeText(accountSearch);

    return accounts.filter((account) => {
      if (!q) return true;

      return (
        normalizeText(account.gmail).includes(q) ||
        normalizeText(account.customer_name).includes(q) ||
        normalizeText(account.customer_contact).includes(q)
      );
    });
  }, [accounts, accountSearch]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectAccount = (accountId) => {
    const account = accounts.find((item) => item.id === accountId);

    if (!account) {
      setForm((prev) => ({ ...prev, account_id: "" }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      account_id: account.id,
      customer_name: account.customer_name || "",
      customer_contact: account.customer_contact || "",
      gmail: account.gmail || "",
      issue_note: prev.issue_note || `Khách báo lỗi acc ${account.gmail}`,
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          padding: 13,
          borderRadius: 12,
          background: "rgba(245,158,11,0.07)",
          border: "1px solid rgba(245,158,11,0.18)",
          color: "#fbbf24",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        Tạo ticket khi khách báo lỗi. Ticket mở sẽ tự chuyển acc sang trạng thái{" "}
        <strong>Đang hỗ trợ</strong>. Khi xử lý xong, acc về lại <strong>Đang dùng</strong>.
      </div>

      <Field label="Tìm account">
        <input
          value={accountSearch}
          onChange={(event) => setAccountSearch(event.target.value)}
          placeholder="Tìm Gmail / tên khách / liên hệ..."
          style={inputStyle}
        />
      </Field>

      <Field label="Account liên quan">
        <select
          value={form.account_id || ""}
          onChange={(event) => selectAccount(event.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          <option value="">Không chọn account</option>
          {filteredAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.customer_name || "Không tên"} — {account.gmail}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tên khách">
          <input
            value={form.customer_name || ""}
            onChange={(event) => set("customer_name", event.target.value)}
            style={inputStyle}
            placeholder="Tên khách"
          />
        </Field>

        <Field label="Liên hệ">
          <input
            value={form.customer_contact || ""}
            onChange={(event) => set("customer_contact", event.target.value)}
            style={inputStyle}
            placeholder="Facebook / SĐT / Zalo..."
          />
        </Field>
      </div>

      <Field label="Gmail account lỗi">
        <input
          value={form.gmail || ""}
          onChange={(event) => set("gmail", event.target.value)}
          style={inputStyle}
          placeholder="gmail bị lỗi..."
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Loại lỗi">
          <select
            value={form.issue_type}
            onChange={(event) => set("issue_type", event.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {Object.entries(ISSUE_TYPES).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Trạng thái">
          <select
            value={form.status}
            onChange={(event) => set("status", event.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {Object.entries(SUPPORT_STATUS).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ưu tiên">
          <select
            value={form.priority}
            onChange={(event) => set("priority", event.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {Object.entries(PRIORITIES).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Nội dung khách báo">
        <textarea
          value={form.issue_note || ""}
          onChange={(event) => set("issue_note", event.target.value)}
          placeholder="VD: Khách báo mất Premium / không đăng nhập được / acc bị out..."
          style={{
            ...inputStyle,
            minHeight: 110,
            resize: "vertical",
            lineHeight: 1.6,
          }}
        />
      </Field>

      <Field label="Ghi chú xử lý">
        <textarea
          value={form.resolve_note || ""}
          onChange={(event) => set("resolve_note", event.target.value)}
          placeholder="VD: Đã đổi acc mới / đã nhắn nguồn / đã refund..."
          style={{
            ...inputStyle,
            minHeight: 90,
            resize: "vertical",
            lineHeight: 1.6,
          }}
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
          onClick={onCancel}
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
          onClick={() => onSubmit(form)}
          disabled={loading}
          style={{
            padding: "9px 20px",
            borderRadius: 8,
            border: "none",
            background: loading
              ? "#7f1d1d"
              : "linear-gradient(135deg,#ef4444,#dc2626)",
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
          Lưu ticket
        </button>
      </div>
    </div>
  );
}

export default function SupportView({ toast }) {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterIssue, setFilterIssue] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [editTicket, setEditTicket] = useState(null);
  const [deleteTicket, setDeleteTicket] = useState(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supportService.getAccountsForSelect();
    if (error) throw error;
    setAccounts(data ?? []);
  }, []);

  const fetchTickets = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const { data, count, error } = await supportService.getAll({
          search: search || undefined,
          status: filterStatus || undefined,
          issueType: filterIssue || undefined,
          priority: filterPriority || undefined,
          page,
          pageSize: PAGE_SIZE,
        });

        if (error) throw error;

        setTickets(data ?? []);
        setTotal(count ?? 0);
      } catch (err) {
        toast?.error?.("Lỗi tải hỗ trợ: " + err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, filterStatus, filterIssue, filterPriority, page, toast]
  );

  useEffect(() => {
    fetchAccounts().catch((err) => toast?.error?.("Lỗi tải account: " + err.message));
  }, [fetchAccounts, toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      processing: tickets.filter((t) => t.status === "processing").length,
      waiting: tickets.filter((t) => t.status === "waiting_source").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      urgent: tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length,
    };
  }, [tickets]);

  const handleCreate = async (form) => {
    setFormLoading(true);

    try {
      const { data, error } = await supportService.create(form);
      if (error) throw error;

      logActivity({
        userEmail: user?.email,
        action: "create_support_ticket",
        module: "support",
        target: data?.id,
        accountId: data?.account_id,
        gmail: data?.gmail,
        customerName: data?.customer_name,
        detail: `Tạo ticket hỗ trợ cho ${data?.customer_name || data?.gmail || "khách"}`,
        newValue: data,
      });

      toast?.success?.("Đã tạo ticket hỗ trợ!");
      setShowAdd(false);
      await fetchTickets(true);
      await fetchAccounts();
    } catch (err) {
      toast?.error?.("Lỗi tạo hỗ trợ: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (form) => {
    if (!editTicket) return;

    setFormLoading(true);

    try {
      const { data, error } = await supportService.update(editTicket.id, form);
      if (error) throw error;

      logActivity({
        userEmail: user?.email,
        action: "update_support_ticket",
        module: "support",
        target: editTicket.id,
        accountId: data?.account_id,
        gmail: data?.gmail,
        customerName: data?.customer_name,
        detail: `Cập nhật ticket hỗ trợ: ${data?.status}`,
        oldValue: editTicket,
        newValue: data,
      });

      toast?.success?.("Đã cập nhật ticket!");
      setEditTicket(null);
      await fetchTickets(true);
      await fetchAccounts();
    } catch (err) {
      toast?.error?.("Lỗi cập nhật hỗ trợ: " + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleQuickStatus = async (ticket, status) => {
    try {
      const { data, error } = await supportService.update(ticket.id, {
        ...ticket,
        status,
        resolve_note:
          status === "resolved" && !ticket.resolve_note
            ? "Đã xử lý xong."
            : ticket.resolve_note,
      });

      if (error) throw error;

      logActivity({
        userEmail: user?.email,
        action: "change_support_status",
        module: "support",
        target: ticket.id,
        accountId: ticket.account_id,
        gmail: ticket.gmail,
        customerName: ticket.customer_name,
        detail: `Đổi trạng thái support: ${ticket.status} → ${status}`,
        oldValue: { status: ticket.status },
        newValue: { status },
      });

      toast?.success?.("Đã đổi trạng thái!");
      await fetchTickets(true);
      await fetchAccounts();
    } catch (err) {
      toast?.error?.("Lỗi đổi trạng thái: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTicket) return;

    try {
      const { error } = await supportService.delete(deleteTicket.id);
      if (error) throw error;

      logActivity({
        userEmail: user?.email,
        action: "delete_support_ticket",
        module: "support",
        target: deleteTicket.id,
        accountId: deleteTicket.account_id,
        gmail: deleteTicket.gmail,
        customerName: deleteTicket.customer_name,
        detail: `Xoá ticket hỗ trợ của ${deleteTicket.customer_name || deleteTicket.gmail || "khách"}`,
        oldValue: deleteTicket,
      });

      toast?.success?.("Đã xoá ticket!");
      setDeleteTicket(null);
      await fetchTickets(true);
    } catch (err) {
      toast?.error?.("Lỗi xoá ticket: " + err.message);
    }
  };

  const handleCopy = async (text) => {
    if (!text) return;
    await copyToClipboard(text);
    toast?.success?.("Đã copy!");
  };

  const openEdit = (ticket) => {
    setEditTicket({
      id: ticket.id,
      account_id: ticket.account_id || "",
      customer_name: ticket.customer_name || "",
      customer_contact: ticket.customer_contact || "",
      gmail: ticket.gmail || "",
      issue_type: ticket.issue_type || "account_error",
      status: ticket.status || "open",
      priority: ticket.priority || "normal",
      issue_note: ticket.issue_note || "",
      resolve_note: ticket.resolve_note || "",
    });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>

        <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>
            Hỗ trợ khách
          </h1>

          <p style={{ color: "#71717a", fontSize: 13, margin: "5px 0 0" }}>
            Quản lý khách bị hư acc, mất Premium, lỗi đăng nhập, cần đổi acc hoặc refund.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => fetchTickets(true)}
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
            Làm mới
          </button>

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
            Tạo ticket
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
        <StatCard icon={LifeBuoy} label="Ticket trang này" value={stats.total} color="#a1a1aa" />
        <StatCard icon={AlertTriangle} label="Mới mở" value={stats.open} color="#ef4444" />
        <StatCard icon={RefreshCw} label="Đang xử lý" value={stats.processing} color="#60a5fa" />
        <StatCard icon={Clock} label="Chờ nguồn" value={stats.waiting} color="#f59e0b" />
        <StatCard icon={CheckCircle} label="Đã xử lý" value={stats.resolved} color="#22c55e" />
        <StatCard icon={AlertTriangle} label="Ưu tiên cao" value={stats.urgent} color="#fb7185" />
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
        <div style={{ position: "relative", flex: "1 1 260px" }}>
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
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên khách, gmail, liên hệ, nội dung lỗi..."
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value);
            setPage(1);
          }}
          style={{ ...inputStyle, width: 150, cursor: "pointer" }}
        >
          <option value="">Trạng thái</option>
          {Object.entries(SUPPORT_STATUS).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>

        <select
          value={filterIssue}
          onChange={(event) => {
            setFilterIssue(event.target.value);
            setPage(1);
          }}
          style={{ ...inputStyle, width: 150, cursor: "pointer" }}
        >
          <option value="">Loại lỗi</option>
          {Object.entries(ISSUE_TYPES).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(event) => {
            setFilterPriority(event.target.value);
            setPage(1);
          }}
          style={{ ...inputStyle, width: 150, cursor: "pointer" }}
        >
          <option value="">Ưu tiên</option>
          {Object.entries(PRIORITIES).map(([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          ))}
        </select>

        {(search || filterStatus || filterIssue || filterPriority) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterStatus("");
              setFilterIssue("");
              setFilterPriority("");
              setPage(1);
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
            Xoá lọc
          </button>
        )}
      </div>

      <div
        style={{
          background: "#111113",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  "Khách",
                  "Account",
                  "Loại lỗi",
                  "Trạng thái",
                  "Ưu tiên",
                  "Nội dung",
                  "Xử lý nhanh",
                  "Ngày tạo",
                  "Thao tác",
                ].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "12px 14px",
                      textAlign: header === "Thao tác" ? "center" : "left",
                      color: "#71717a",
                      fontSize: 11,
                      fontWeight: 900,
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
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      height: 220,
                      textAlign: "center",
                      color: "#52525b",
                      fontSize: 14,
                    }}
                  >
                    Chưa có ticket hỗ trợ nào
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const issueConfig = ISSUE_TYPES[ticket.issue_type] || ISSUE_TYPES.other;
                  const statusConfig = SUPPORT_STATUS[ticket.status] || SUPPORT_STATUS.open;
                  const priorityConfig = PRIORITIES[ticket.priority] || PRIORITIES.normal;
                  const account = ticket.accounts;

                  return (
                    <tr
                      key={ticket.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.045)",
                      }}
                    >
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <User size={13} style={{ color: "#71717a" }} />

                          <div>
                            <div style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>
                              {ticket.customer_name || account?.customer_name || "—"}
                            </div>

                            <div style={{ color: "#71717a", fontSize: 11, marginTop: 3 }}>
                              {ticket.customer_contact || account?.customer_contact || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Mail size={12} style={{ color: "#71717a" }} />

                            <span
                              style={{
                                color: "#e4e4e7",
                                fontSize: 12,
                                fontWeight: 800,
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {ticket.gmail || account?.gmail || "—"}
                            </span>

                            {(ticket.gmail || account?.gmail) && (
                              <button
                                onClick={() => handleCopy(ticket.gmail || account?.gmail)}
                                style={{
                                  border: "none",
                                  background: "none",
                                  color: "#52525b",
                                  cursor: "pointer",
                                  display: "flex",
                                  padding: 2,
                                }}
                              >
                                <Copy size={12} />
                              </button>
                            )}
                          </div>

                          {account?.password && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Lock size={12} style={{ color: "#71717a" }} />
                              <span style={{ color: "#52525b", fontSize: 11 }}>••••••••</span>

                              <button
                                onClick={() => handleCopy(account.password)}
                                style={{
                                  border: "none",
                                  background: "none",
                                  color: "#52525b",
                                  cursor: "pointer",
                                  display: "flex",
                                  padding: 2,
                                }}
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <Badge config={issueConfig} />
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <Badge config={statusConfig} />
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <Badge config={priorityConfig} />
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div
                          style={{
                            color: ticket.issue_note ? "#a1a1aa" : "#3f3f46",
                            fontSize: 12,
                            maxWidth: 240,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={ticket.issue_note || ""}
                        >
                          {ticket.issue_note || "—"}
                        </div>

                        {ticket.resolve_note && (
                          <div
                            style={{
                              color: "#22c55e",
                              fontSize: 11,
                              maxWidth: 240,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              marginTop: 4,
                            }}
                            title={ticket.resolve_note}
                          >
                            Xử lý: {ticket.resolve_note}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {ticket.status !== "processing" && ticket.status !== "resolved" && (
                            <button
                              onClick={() => handleQuickStatus(ticket, "processing")}
                              style={{
                                padding: "6px 9px",
                                borderRadius: 8,
                                border: "1px solid rgba(59,130,246,0.2)",
                                background: "rgba(59,130,246,0.08)",
                                color: "#60a5fa",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              Xử lý
                            </button>
                          )}

                          {ticket.status !== "waiting_source" && ticket.status !== "resolved" && (
                            <button
                              onClick={() => handleQuickStatus(ticket, "waiting_source")}
                              style={{
                                padding: "6px 9px",
                                borderRadius: 8,
                                border: "1px solid rgba(245,158,11,0.2)",
                                background: "rgba(245,158,11,0.08)",
                                color: "#f59e0b",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              Chờ nguồn
                            </button>
                          )}

                          {ticket.status !== "resolved" && (
                            <button
                              onClick={() => handleQuickStatus(ticket, "resolved")}
                              style={{
                                padding: "6px 9px",
                                borderRadius: 8,
                                border: "1px solid rgba(34,197,94,0.2)",
                                background: "rgba(34,197,94,0.08)",
                                color: "#22c55e",
                                cursor: "pointer",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              Xong
                            </button>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px", color: "#71717a", fontSize: 12 }}>
                        {formatDate(ticket.created_at)}
                      </td>

                      <td style={{ padding: "13px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                          <button
                            onClick={() => openEdit(ticket)}
                            style={{
                              padding: "6px 9px",
                              borderRadius: 8,
                              border: "none",
                              background: "rgba(59,130,246,0.1)",
                              color: "#60a5fa",
                              cursor: "pointer",
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => setDeleteTicket(ticket)}
                            style={{
                              padding: "6px 9px",
                              borderRadius: 8,
                              border: "none",
                              background: "rgba(239,68,68,0.1)",
                              color: "#ef4444",
                              cursor: "pointer",
                            }}
                          >
                            <Trash2 size={14} />
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
              padding: "13px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#71717a",
              fontSize: 12,
            }}
          >
            <span>
              Trang {page}/{totalPages} · {total} ticket
            </span>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: page === 1 ? "#3f3f46" : "#a1a1aa",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Trước
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: page === totalPages ? "#3f3f46" : "#a1a1aa",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tạo ticket hỗ trợ">
        <SupportForm
          initial={EMPTY_FORM}
          accounts={accounts}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          loading={formLoading}
        />
      </Modal>

      <Modal open={!!editTicket} onClose={() => setEditTicket(null)} title="Sửa ticket hỗ trợ">
        {editTicket && (
          <SupportForm
            initial={editTicket}
            accounts={accounts}
            onSubmit={handleUpdate}
            onCancel={() => setEditTicket(null)}
            loading={formLoading}
          />
        )}
      </Modal>

      <Modal open={!!deleteTicket} onClose={() => setDeleteTicket(null)} title="Xác nhận xoá" width={420}>
        {deleteTicket && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
                fontSize: 13,
                lineHeight: 1.5,
                display: "flex",
                gap: 10,
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              Xoá ticket này khỏi danh sách hỗ trợ?
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setDeleteTicket(null)}
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
                onClick={handleDelete}
                style={{
                  padding: "9px 20px",
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}