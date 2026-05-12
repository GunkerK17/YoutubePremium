import { supabase } from "../lib/supabase";
import { calcExpiry, resolveStatus } from "../lib/utils";

const TABLE = "accounts";

// profit là generated column nên không gửi lên Supabase khi insert/update.
const stripGenerated = (obj) => {
  const { profit, ...rest } = obj;
  return rest;
};

export const accountService = {
  getAll: async ({
    status,
    accountType,
    supplier,
    search,
    page = 1,
    pageSize = 20,
    orderBy = "expiry_date",
    asc = true,
  } = {}) => {
    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .is("deleted_at", null);

    if (status) query = query.eq("status", status);
    if (accountType) query = query.eq("account_type", accountType);
    if (supplier) query = query.eq("supplier", supplier);
    if (search) query = query.or(`gmail.ilike.%${search}%,customer_name.ilike.%${search}%`);

    return query
      .order(orderBy, { ascending: asc })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  getTrashed: async ({ search, page = 1, pageSize = 20 } = {}) => {
    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .not("deleted_at", "is", null);

    if (search) query = query.or(`gmail.ilike.%${search}%,customer_name.ilike.%${search}%`);

    return query
      .order("deleted_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  getById: (id) =>
    supabase.from(TABLE).select("*").eq("id", id).single(),

  create: async (payload) => {
    const startDate = payload.start_date || new Date().toISOString().split("T")[0];
    const expiryDate = payload.expiry_date || calcExpiry(startDate, payload.account_type);
    const status = resolveStatus(expiryDate);

    return supabase
      .from(TABLE)
      .insert(stripGenerated({
        ...payload,
        start_date: startDate,
        expiry_date: expiryDate,
        status,
      }))
      .select()
      .single();
  },

  update: async (id, payload) => {
    const updates = { ...payload };

    if (payload.expiry_date || payload.account_type || payload.start_date) {
      const { data: current } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();

      const startDate = updates.start_date || current.start_date;
      const accountType = updates.account_type || current.account_type;
      const expiryDate = updates.expiry_date || calcExpiry(startDate, accountType);

      updates.expiry_date = expiryDate;
      updates.status = resolveStatus(expiryDate);
    }

    return supabase
      .from(TABLE)
      .update(stripGenerated(updates))
      .eq("id", id)
      .select()
      .single();
  },

  delete: (id) =>
    supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq("id", id),

  deleteMany: (ids) =>
    supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).in("id", ids),

  restore: (id) =>
    supabase.from(TABLE).update({ deleted_at: null }).eq("id", id).select().single(),

  restoreMany: (ids) =>
    supabase.from(TABLE).update({ deleted_at: null }).in("id", ids),

  hardDelete: (id) =>
    supabase.from(TABLE).delete().eq("id", id),

  hardDeleteAll: () =>
    supabase.from(TABLE).delete().not("deleted_at", "is", null),

  bulkCreate: async (rows) => {
    const enriched = rows.map((row) => {
      const startDate = row.start_date || new Date().toISOString().split("T")[0];
      const expiryDate = row.expiry_date || calcExpiry(startDate, row.account_type);

      return stripGenerated({
        ...row,
        start_date: startDate,
        expiry_date: expiryDate,
        status: resolveStatus(expiryDate),
      });
    });

    return supabase.from(TABLE).insert(enriched).select();
  },

  refreshStatuses: async () => {
    const { data: accounts } = await supabase
      .from(TABLE)
      .select("id, expiry_date")
      .is("deleted_at", null);

    if (!accounts?.length) return;

    const updates = accounts.map(({ id, expiry_date }) => ({
      id,
      status: resolveStatus(expiry_date),
    }));

    return supabase.from(TABLE).upsert(updates, { onConflict: "id" });
  },
};
