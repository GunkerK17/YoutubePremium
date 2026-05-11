import { supabase } from "../lib/supabase";

const TABLE = "customers";

export const customerService = {
  getAll: async ({ search, level, page = 1, pageSize = 20 } = {}) => {
    let query = supabase.from(TABLE).select("*", { count: "exact" });

    if (level)  query = query.eq("level", level);
    if (search) query = query.or(`name.ilike.%${search}%,gmail.ilike.%${search}%,phone.ilike.%${search}%`);

    return query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  getById: (id) =>
    supabase.from(TABLE).select("*, orders(*)").eq("id", id).single(),

  create: (payload) =>
    supabase.from(TABLE).insert(payload).select().single(),

  update: (id, payload) =>
    supabase.from(TABLE).update(payload).eq("id", id).select().single(),

  delete: (id) =>
    supabase.from(TABLE).delete().eq("id", id),

  // Purchase history for a customer
  getHistory: (customerId) =>
    supabase
      .from("orders")
      .select("*, accounts(gmail, account_type)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),

  // Quick renew — extend customer's active account
  quickRenew: async (customerId, months) => {
    const { data: acc } = await supabase
      .from("accounts")
      .select("id, expiry_date")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .order("expiry_date", { ascending: false })
      .limit(1)
      .single();

    if (!acc) throw new Error("Không tìm thấy tài khoản đang hoạt động");

    const newExpiry = new Date(acc.expiry_date);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    return supabase
      .from("accounts")
      .update({ expiry_date: newExpiry.toISOString().split("T")[0] })
      .eq("id", acc.id)
      .select()
      .single();
  },
};