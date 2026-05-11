import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * useData — generic hook for any Supabase table with optional realtime sync.
 *
 * @param {string} table        - Supabase table name
 * @param {object} options
 *   @param {string}   select   - column selector (default "*")
 *   @param {object}   filters  - { column: value } eq filters
 *   @param {string}   orderBy  - column to order by
 *   @param {boolean}  asc      - ascending order (default false)
 *   @param {boolean}  realtime - subscribe to realtime changes (default true)
 *   @param {number}   limit    - row limit
 */
export function useData(table, options = {}) {
  const {
    select   = "*",
    filters  = {},
    orderBy  = "created_at",
    asc      = false,
    realtime = true,
    limit,
  } = options;

  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const channelRef            = useRef(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from(table).select(select);

      // Apply eq filters
      Object.entries(filters).forEach(([col, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          query = query.eq(col, val);
        }
      });

      if (orderBy) query = query.order(orderBy, { ascending: asc });
      if (limit)   query = query.limit(limit);

      const { data: rows, error: err } = await query;
      if (err) throw err;
      setData(rows ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, JSON.stringify(filters), orderBy, asc, limit]);

  // Initial fetch
  useEffect(() => { fetch(); }, [fetch]);

  // Realtime subscription
  useEffect(() => {
    if (!realtime) return;

    channelRef.current = supabase
      .channel(`realtime:${table}:${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        fetch();
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [table, realtime, fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * useStats — pre-built hook for dashboard statistics
 */
export function useStats() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [accounts, orders] = await Promise.all([
        supabase.from("accounts").select("id, status, expiry_date, cost_price, sell_price"),
        supabase.from("orders").select("id, status, sell_price, created_at"),
      ]);

      const accs = accounts.data ?? [];
      const ords = orders.data  ?? [];

      const totalAccounts  = accs.length;
      const activeAccounts = accs.filter((a) => a.status === "active").length;
      const expiringAccounts = accs.filter((a) => a.status === "expiring").length;
      const expiredAccounts  = accs.filter((a) => a.status === "expired").length;

      const totalCost    = accs.reduce((s, a) => s + (a.cost_price  ?? 0), 0);
      const totalRevenue = ords
        .filter((o) => o.status === "completed")
        .reduce((s, o) => s + (o.sell_price ?? 0), 0);
      const totalProfit  = totalRevenue - totalCost;

      // Monthly revenue — last 6 months
      const now = new Date();
      const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = d.toLocaleString("vi-VN", { month: "short", year: "2-digit" });
        const revenue = ords
          .filter((o) => {
            const od = new Date(o.created_at);
            return o.status === "completed" &&
              od.getMonth()    === d.getMonth() &&
              od.getFullYear() === d.getFullYear();
          })
          .reduce((s, o) => s + (o.sell_price ?? 0), 0);
        return { label, revenue };
      });

      setStats({
        totalAccounts,
        activeAccounts,
        expiringAccounts,
        expiredAccounts,
        totalCost,
        totalRevenue,
        totalProfit,
        monthly,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime refresh on accounts/orders change
  useEffect(() => {
    const ch = supabase
      .channel("stats_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts" }, fetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders"   }, fetch)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch]);

  return { stats, loading, refetch: fetch };
}

/**
 * useToast — lightweight toast state manager (no context needed)
 * Usage: const { toasts, toast, removeToast } = useToast()
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ type = "info", title, message, duration = 4000 }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Shorthand helpers
  const success = (msg, title)  => toast({ type: "success", message: msg, title });
  const error   = (msg, title)  => toast({ type: "error",   message: msg, title });
  const warning = (msg, title)  => toast({ type: "warning", message: msg, title });
  const info    = (msg, title)  => toast({ type: "info",    message: msg, title });

  return { toasts, toast, removeToast, success, error, warning, info };
}