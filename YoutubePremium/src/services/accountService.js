import { supabase } from "../lib/supabase";
import { resolveStatus, calcExpiry } from "../lib/utils";

const TABLE = "accounts";

export const accountService = {
  // ─── Read ──────────────────────────────────────────────────────────────────
  getAll: async ({ status, accountType, supplier, search, page = 1, pageSize = 20, orderBy = "expiry_date", asc = true } = {}) => {
    let query = supabase.from(TABLE).select("*", { count: "exact" });

    if (status)      query = query.eq("status", status);
    if (accountType) query = query.eq("account_type", accountType);
    if (supplier)    query = query.eq("supplier", supplier);
    if (search)      query = query.or(`gmail.ilike.%${search}%,customer_name.ilike.%${search}%`);

    query = query
      .order(orderBy, { ascending: asc })
      .range((page - 1) * pageSize, page * pageSize - 1);

    return query;
  },

  getById: (id) =>
    supabase.from(TABLE).select("*").eq("id", id).single(),

  // ─── Create ────────────────────────────────────────────────────────────────
  create: async (payload) => {
    const startDate  = payload.start_date || new Date().toISOString().split("T")[0];
    const expiryDate = payload.expiry_date || calcExpiry(startDate, payload.account_type);
    const status     = resolveStatus(expiryDate);
    const profit     = (payload.sell_price ?? 0) - (payload.cost_price ?? 0);

    return supabase.from(TABLE).insert({
      ...payload,
      start_date:  startDate,
      expiry_date: expiryDate,
      status,
      profit,
    }).select().single();
  },

  // ─── Update ────────────────────────────────────────────────────────────────
  update: async (id, payload) => {
    const updates = { ...payload };

    // Recalculate derived fields if relevant fields changed
    if (payload.expiry_date || payload.account_type || payload.start_date) {
      const current = (await supabase.from(TABLE).select("*").eq("id", id).single()).data;
      const startDate  = updates.start_date  || current.start_date;
      const acType     = updates.account_type || current.account_type;
      const expiryDate = updates.expiry_date  || calcExpiry(startDate, acType);
      updates.expiry_date = expiryDate;
      updates.status      = resolveStatus(expiryDate);
    }

    if (payload.sell_price !== undefined || payload.cost_price !== undefined) {
      const current = (await supabase.from(TABLE).select("sell_price,cost_price").eq("id", id).single()).data;
      const sell = updates.sell_price ?? current.sell_price ?? 0;
      const cost = updates.cost_price ?? current.cost_price ?? 0;
      updates.profit = sell - cost;
    }

    return supabase.from(TABLE).update(updates).eq("id", id).select().single();
  },

  // ─── Delete ────────────────────────────────────────────────────────────────
  delete: (id) =>
    supabase.from(TABLE).delete().eq("id", id),

  deleteMany: (ids) =>
    supabase.from(TABLE).delete().in("id", ids),

  // ─── Bulk import ──────────────────────────────────────────────────────────
  bulkCreate: async (rows) => {
    const enriched = rows.map((r) => {
      const expiry = r.expiry_date || calcExpiry(r.start_date || new Date().toISOString().split("T")[0], r.account_type);
      return {
        ...r,
        expiry_date: expiry,
        status: resolveStatus(expiry),
        profit: (r.sell_price ?? 0) - (r.cost_price ?? 0),
      };
    });
    return supabase.from(TABLE).insert(enriched).select();
  },

  // ─── Refresh all statuses ─────────────────────────────────────────────────
  refreshStatuses: async () => {
    const { data: accounts } = await supabase.from(TABLE).select("id, expiry_date");
    if (!accounts?.length) return;

    const updates = accounts.map(({ id, expiry_date }) => ({
      id,
      status: resolveStatus(expiry_date),
    }));

    // Batch upsert
    return supabase.from(TABLE).upsert(updates, { onConflict: "id" });
  },
};