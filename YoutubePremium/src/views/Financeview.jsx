// src/views/FinanceView.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  DollarSign,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
  XCircle,
  Undo2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { copyToClipboard } from "../lib/utils";

const DEFAULT_RATE = 26329.5;
const DEFAULT_CUSTOMER_EXPIRY = "2027-04-01";
const FULL_YEAR_USD = 80;

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

function formatVND(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("vi-VN")} đ`;
}

function formatUSD(value) {
  return `$${Number(value || 0).toFixed(2)}`;
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

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calcCustomerUsd(oldExpiry, newExpiry = DEFAULT_CUSTOMER_EXPIRY) {
  if (!oldExpiry || !newExpiry) return 0;

  const start = new Date(oldExpiry);
  const end = new Date(newExpiry);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (start >= end) return 0;

  const days = Math.ceil((end - start) / 86400000);
  const usd = (FULL_YEAR_USD * days) / 365;

  return Math.round(usd * 100) / 100;
}

function getFinanceStatus(account) {
  const oldExpiry = account.customer_start_date;
  const newExpiry = account.customer_expiry || DEFAULT_CUSTOMER_EXPIRY;

  if (!oldExpiry) {
    return {
      key: "need_check",
      label: "Thiếu hạn cũ",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.09)",
      border: "rgba(245,158,11,0.22)",
    };
  }

  if (new Date(oldExpiry) >= new Date(newExpiry)) {
    return {
      key: "need_check",
      label: "Hạn cũ vượt hạn mới",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.09)",
      border: "rgba(245,158,11,0.22)",
    };
  }

  if (account.is_collected) {
    return {
      key: "collected",
      label: "Đã gom",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.09)",
      border: "rgba(34,197,94,0.22)",
    };
  }

  return {
    key: "not_collected",
    label: "Chưa gom",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.09)",
    border: "rgba(239,68,68,0.22)",
  };
}

function StatusBadge({ status }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        background: status.bg,
        border: `1px solid ${status.border}`,
        color: status.color,
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {status.label}
    </span>
  );
}

function CollectionAction({ account, status, onToggleCollected }) {
  if (status.key === "need_check") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        <button
          disabled
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 11px",
            borderRadius: 10,
            border: "1px solid rgba(245,158,11,0.22)",
            background: "rgba(245,158,11,0.08)",
            color: "#f59e0b",
            cursor: "not-allowed",
            fontSize: 11,
            fontWeight: 900,
            whiteSpace: "nowrap",
            opacity: 0.85,
          }}
        >
          <AlertTriangle size={13} />
          Cần kiểm tra
        </button>
      </div>
    );
  }

  if (status.key === "collected") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 11px",
            borderRadius: 10,
            border: "1px solid rgba(34,197,94,0.22)",
            background: "rgba(34,197,94,0.08)",
            color: "#22c55e",
            fontSize: 11,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          <CheckCircle size={13} />
          Đã gom
        </div>

        <button
          onClick={() => onToggleCollected(account, false)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 9px",
            borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.2)",
            background: "rgba(239,68,68,0.07)",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          <Undo2 size={11} />
          Huỷ gom
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => onToggleCollected(account, true)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "9px 12px",
        borderRadius: 10,
        border: "1px solid rgba(34,197,94,0.25)",
        background: "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(34,197,94,0.07))",
        color: "#22c55e",
        cursor: "pointer",
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
        boxShadow: "0 8px 22px rgba(34,197,94,0.08)",
      }}
    >
      <CheckCircle size={13} />
      Đánh dấu đã gom
    </button>
  );
}




function StatCard({ icon: Icon, label, value, sub, color = "#ef4444" }) {
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

      {sub && (
        <div style={{ color: "#52525b", fontSize: 11, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function CustomerCard({
  customer,
  moneyMode,
  onCopy,
  onToggleCollected,
  onUpdateNote,
}) {
  const collected = customer.accounts.filter(
    (account) => getFinanceStatus(account).key === "collected"
  );

  const notCollected = customer.accounts.filter(
    (account) => getFinanceStatus(account).key === "not_collected"
  );

  const needCheck = customer.accounts.filter(
    (account) => getFinanceStatus(account).key === "need_check"
  );

  return (
    <div
      style={{
        background: "#111113",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg,#ef4444,#dc2626)",
                color: "#fff",
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {customer.name?.[0]?.toUpperCase() || "K"}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 900,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {customer.name}
              </div>

              <div style={{ color: "#71717a", fontSize: 12, marginTop: 3 }}>
                {customer.totalAccounts} acc · đã gom {collected.length} · chưa gom{" "}
                {notCollected.length} · cần check {needCheck.length}
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ color: "#22c55e", fontSize: 15, fontWeight: 900 }}>
            {moneyMode === "usd"
              ? formatUSD(customer.totalNeedUsd)
              : formatVND(customer.totalNeed)}
          </div>

          <div style={{ color: "#71717a", fontSize: 11, marginTop: 3 }}>
            Tổng cần gom
          </div>

          <div style={{ color: "#60a5fa", fontSize: 12, fontWeight: 800, marginTop: 6 }}>
            {moneyMode === "usd"
              ? formatUSD(customer.totalCollectedUsd)
              : formatVND(customer.totalCollected)}
          </div>

          <div style={{ color: "#71717a", fontSize: 11, marginTop: 2 }}>
            Đã gom thực tế
          </div>
        </div>
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {customer.accounts.map((account) => {
          const status = getFinanceStatus(account);

          const calculatedUsd = calcCustomerUsd(
            account.customer_start_date,
            account.customer_expiry || DEFAULT_CUSTOMER_EXPIRY
          );

          const calculatedVnd = Math.round(
            calculatedUsd * Number(account.customer_usd_rate || DEFAULT_RATE)
          );

          const needVnd = Number(account.customer_paid || 0) || calculatedVnd;
          const needUsd = Number(account.customer_paid_usd || 0) || calculatedUsd;

          return (
            <div
              key={account.id}
              style={{
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "grid",
                 gridTemplateColumns: "1.4fr 0.9fr 0.9fr 0.9fr 150px",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        color: "#e4e4e7",
                        fontSize: 13,
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {account.gmail}
                    </span>

                    <button
                      onClick={() => onCopy(account.gmail)}
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

                  <div style={{ color: "#71717a", fontSize: 11, marginTop: 4 }}>
                    Nguồn: {formatDate(account.start_date)} → {formatDate(account.expiry_date)}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#71717a", fontSize: 11 }}>Hạn đăng ký cũ</div>
                  <div style={{ color: "#e4e4e7", fontSize: 12, fontWeight: 800, marginTop: 3 }}>
                    {formatDate(account.customer_start_date)}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#71717a", fontSize: 11 }}>Hạn mới</div>
                  <div style={{ color: "#e4e4e7", fontSize: 12, fontWeight: 800, marginTop: 3 }}>
                    {formatDate(account.customer_expiry)}
                  </div>
                </div>

                <div>
                  <div style={{ color: "#71717a", fontSize: 11 }}>
                    {moneyMode === "usd" ? "Cần gom USD" : "Cần gom VND"}
                  </div>

                  <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 900, marginTop: 3 }}>
                    {moneyMode === "usd" ? formatUSD(needUsd) : formatVND(needVnd)}
                  </div>
                </div>

                <StatusBadge status={status} />
<CollectionAction
  account={account}
  status={status}
  onToggleCollected={onToggleCollected}
/>
                
              </div>

              {account.is_collected && (
                <div style={{ marginTop: 8, color: "#71717a", fontSize: 11 }}>
                  Đã gom lúc:{" "}
                  <span style={{ color: "#a1a1aa", fontWeight: 800 }}>
                    {account.collected_at
                      ? new Date(account.collected_at).toLocaleString("vi-VN")
                      : "—"}
                  </span>
                </div>
              )}

              {status.key === "need_check" && (
                <div
                  style={{
                    marginTop: 9,
                    padding: "8px 10px",
                    borderRadius: 9,
                    background: "rgba(245,158,11,0.08)",
                    color: "#f59e0b",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Acc này cần kiểm tra lại hạn đăng ký cũ hoặc hạn mới.
                </div>
              )}

              <div style={{ marginTop: 9 }}>
                <input
                  value={account.collected_note || ""}
                  onChange={(event) => onUpdateNote(account, event.target.value)}
                  placeholder="Ghi chú gom tiền..."
                  style={{
                    ...inputStyle,
                    padding: "7px 10px",
                    fontSize: 12,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FinanceView({ toast }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [moneyMode, setMoneyMode] = useState("vnd");

  const fetchAccounts = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const { data, error } = await supabase
          .from("accounts")
          .select(`
            id,
            gmail,
            account_type,
            start_date,
            expiry_date,
            status,
            cost_price,
            supplier,
            customer_name,
            customer_start_date,
            customer_expiry,
            customer_paid,
            customer_paid_usd,
            customer_usd_rate,
            customer_status,
            customer_contact,
            is_collected,
            collected_at,
            collected_note,
            note,
            deleted_at
          `)
          .is("deleted_at", null)
          .not("customer_name", "is", null)
          .neq("customer_name", "")
          .order("customer_name", { ascending: true });

        if (error) throw error;

        setAccounts(data ?? []);
      } catch (err) {
        toast?.error?.("Lỗi tải tài chính: " + err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const customers = useMemo(() => {
    const map = new Map();

    accounts.forEach((account) => {
      const key = normalizeText(account.customer_name);
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: account.customer_name,
          accounts: [],
          totalAccounts: 0,

          totalNeed: 0,
          totalNeedUsd: 0,

          totalCollected: 0,
          totalCollectedUsd: 0,

          totalCost: 0,
        });
      }

      const customer = map.get(key);
      const needVnd = Number(account.customer_paid || 0);
      const needUsd = Number(account.customer_paid_usd || 0);

      customer.accounts.push(account);
      customer.totalAccounts += 1;

      customer.totalNeed += needVnd;
      customer.totalNeedUsd += needUsd;

      if (account.is_collected) {
        customer.totalCollected += needVnd;
        customer.totalCollectedUsd += needUsd;
      }

      customer.totalCost += Number(account.cost_price || 0);
    });

    return Array.from(map.values()).sort((a, b) => {
      const aNeed = a.accounts.some((acc) => getFinanceStatus(acc).key !== "collected");
      const bNeed = b.accounts.some((acc) => getFinanceStatus(acc).key !== "collected");

      if (aNeed && !bNeed) return -1;
      if (!aNeed && bNeed) return 1;

      return b.totalNeed - a.totalNeed;
    });
  }, [accounts]);

  const filteredCustomers = useMemo(() => {
    const q = normalizeText(search);

    return customers.filter((customer) => {
      const matchSearch =
        !q ||
        normalizeText(customer.name).includes(q) ||
        customer.accounts.some((acc) => {
          return (
            normalizeText(acc.gmail).includes(q) ||
            normalizeText(acc.customer_contact).includes(q) ||
            normalizeText(acc.note).includes(q) ||
            normalizeText(acc.collected_note).includes(q)
          );
        });

      if (!matchSearch) return false;

      if (filter === "all") return true;

      const hasCollected = customer.accounts.some(
        (acc) => getFinanceStatus(acc).key === "collected"
      );
      const hasNotCollected = customer.accounts.some(
        (acc) => getFinanceStatus(acc).key === "not_collected"
      );
      const hasNeedCheck = customer.accounts.some(
        (acc) => getFinanceStatus(acc).key === "need_check"
      );

      if (filter === "collected") return hasCollected;
      if (filter === "not_collected") return hasNotCollected;
      if (filter === "need_check") return hasNeedCheck;

      return true;
    });
  }, [customers, search, filter]);

  const stats = useMemo(() => {
    const collectedAccounts = accounts.filter(
      (acc) => getFinanceStatus(acc).key === "collected"
    );

    const notCollectedAccounts = accounts.filter(
      (acc) => getFinanceStatus(acc).key === "not_collected"
    );

    const needCheckAccounts = accounts.filter(
      (acc) => getFinanceStatus(acc).key === "need_check"
    );

    const totalNeed = accounts.reduce((sum, acc) => sum + Number(acc.customer_paid || 0), 0);
    const totalNeedUsd = accounts.reduce((sum, acc) => sum + Number(acc.customer_paid_usd || 0), 0);

    const totalCollected = collectedAccounts.reduce(
      (sum, acc) => sum + Number(acc.customer_paid || 0),
      0
    );

    const totalCollectedUsd = collectedAccounts.reduce(
      (sum, acc) => sum + Number(acc.customer_paid_usd || 0),
      0
    );

    const totalCost = accounts.reduce((sum, acc) => sum + Number(acc.cost_price || 0), 0);

    return {
      totalCustomers: customers.length,
      totalAccounts: accounts.length,

      collectedAccounts: collectedAccounts.length,
      notCollectedAccounts: notCollectedAccounts.length,
      needCheckAccounts: needCheckAccounts.length,

      totalNeed,
      totalNeedUsd,
      totalCollected,
      totalCollectedUsd,

      totalCost,
      currentProfit: totalCollected - totalCost,
    };
  }, [accounts, customers]);

  const handleRecalculate = async () => {
    setRefreshing(true);

    try {
      const { error } = await supabase.rpc("recalculate_customer_money");

      if (error) throw error;

      toast?.success?.("Đã tính lại tiền cần gom!");
      await fetchAccounts(true);
    } catch (err) {
      toast?.error?.(
        "Chưa có function recalculate_customer_money hoặc function bị lỗi. Kiểm tra lại SQL function."
      );
      setRefreshing(false);
    }
  };

  const handleCopy = async (text) => {
    await copyToClipboard(text);
    toast?.success?.("Đã copy!");
  };

  const handleToggleCollected = async (account, collected) => {
    try {
      const { error } = await supabase
        .from("accounts")
        .update({
          is_collected: collected,
          collected_at: collected ? new Date().toISOString() : null,
        })
        .eq("id", account.id);

      if (error) throw error;

      toast?.success?.(collected ? "Đã đánh dấu đã gom!" : "Đã chuyển về chưa gom!");
      await fetchAccounts(true);
    } catch (err) {
      toast?.error?.("Lỗi cập nhật gom tiền: " + err.message);
    }
  };

  const handleUpdateNote = async (account, note) => {
    setAccounts((prev) =>
      prev.map((item) =>
        item.id === account.id ? { ...item, collected_note: note } : item
      )
    );

    try {
      const { error } = await supabase
        .from("accounts")
        .update({ collected_note: note })
        .eq("id", account.id);

      if (error) throw error;
    } catch (err) {
      toast?.error?.("Lỗi lưu ghi chú: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>

        <div className="h-80 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

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
            Tài chính gom khách
          </h1>

          <p style={{ color: "#71717a", fontSize: 13, margin: "5px 0 0" }}>
            Quản lý ai đã gom tiền, ai chưa gom, và acc nào cần kiểm tra.
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
            onClick={() => fetchAccounts(true)}
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
            onClick={handleRecalculate}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(59,130,246,0.22)",
              background: "rgba(59,130,246,0.08)",
              color: "#60a5fa",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 900,
            }}
          >
            <RefreshCw size={14} />
            Tính lại tiền
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
        <StatCard icon={Users} label="Tổng khách" value={stats.totalCustomers} color="#a855f7" />
        <StatCard icon={CheckCircle} label="Acc đã gom" value={stats.collectedAccounts} color="#22c55e" />
        <StatCard icon={XCircle} label="Acc chưa gom" value={stats.notCollectedAccounts} color="#ef4444" />
        <StatCard icon={AlertTriangle} label="Cần kiểm tra" value={stats.needCheckAccounts} color="#f59e0b" />

        <StatCard
          icon={Wallet}
          label="Tổng cần gom"
          value={moneyMode === "usd" ? formatUSD(stats.totalNeedUsd) : formatVND(stats.totalNeed)}
          color="#60a5fa"
        />

        <StatCard
          icon={Wallet}
          label="Đã gom thực tế"
          value={moneyMode === "usd" ? formatUSD(stats.totalCollectedUsd) : formatVND(stats.totalCollected)}
          color="#22c55e"
        />

        <StatCard icon={DollarSign} label="Vốn hiện tại" value={formatVND(stats.totalCost)} color="#a1a1aa" />

        <StatCard
          icon={DollarSign}
          label="Lời hiện tại"
          value={formatVND(stats.currentProfit)}
          color={stats.currentProfit >= 0 ? "#22c55e" : "#ef4444"}
          sub="Đã gom thực tế - vốn hiện tại"
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
          flexWrap: "wrap",
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
            placeholder="Tìm tên khách, gmail, liên hệ, ghi chú..."
            onChange={(event) => setSearch(event.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          style={{ ...inputStyle, width: 170, cursor: "pointer" }}
        >
          <option value="all">Tất cả</option>
          <option value="collected">Đã gom</option>
          <option value="not_collected">Chưa gom</option>
          <option value="need_check">Cần kiểm tra</option>
        </select>

        {(search || filter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilter("all");
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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredCustomers.length === 0 ? (
          <div
            style={{
              height: 220,
              borderRadius: 16,
              background: "#111113",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#52525b",
              fontSize: 14,
            }}
          >
            Không có dữ liệu phù hợp
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.key}
              customer={customer}
              moneyMode={moneyMode}
              onCopy={handleCopy}
              onToggleCollected={handleToggleCollected}
              onUpdateNote={handleUpdateNote}
            />
          ))
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}