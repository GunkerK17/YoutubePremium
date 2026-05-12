import { supabase } from "../lib/supabase";

const TABLE = "customers";

const cleanCustomerAccountPayload = (payload) => {
  const next = {
    customer_start_date: payload.customer_start_date || null,
    customer_package: payload.customer_package || null,
    customer_expiry: payload.customer_expiry || null,
    customer_contact: payload.customer_contact || null,
    customer_paid: Number(payload.customer_paid) || 0,
    customer_paid_usd: Number(payload.customer_paid_usd) || 0,
    customer_usd_rate: Number(payload.customer_usd_rate) || 25500,
    customer_status: payload.customer_status || "using",
    note: payload.note || null,
  };

  return next;
};

export const customerService = {
  // ─── Customers table cũ, giữ lại nếu sau này cần ─────────────
  getAll: async ({ search, level, page = 1, pageSize = 20 } = {}) => {
    let query = supabase.from(TABLE).select("*", { count: "exact" });

    if (level) query = query.eq("level", level);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,gmail.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    return query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  getById: (id) =>
    supabase.from(TABLE).select("*, orders(*)").eq("id", id).single(),

  create: (payload) => supabase.from(TABLE).insert(payload).select().single(),

  update: (id, payload) =>
    supabase.from(TABLE).update(payload).eq("id", id).select().single(),

  delete: (id) => supabase.from(TABLE).delete().eq("id", id),

  getHistory: (customerId) =>
    supabase
      .from("orders")
      .select("*, accounts(gmail, account_type)")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),

  quickRenew: async (customerId, months) => {
    const { data: acc, error } = await supabase
      .from("accounts")
      .select("id, expiry_date")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .order("expiry_date", { ascending: false })
      .limit(1)
      .single();

    if (error || !acc) {
      throw new Error("Không tìm thấy tài khoản đang hoạt động");
    }

    const newExpiry = new Date(acc.expiry_date);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    return supabase
      .from("accounts")
      .update({ expiry_date: newExpiry.toISOString().split("T")[0] })
      .eq("id", acc.id)
      .select()
      .single();
  },

  // ─── Customers từ bảng accounts ──────────────────────────────
  // Trang CustomersView đang dùng hàm này.
  getFromAccounts: async () => {
    return supabase
      .from("accounts")
      .select(`
  id,
  gmail,
  password,
  account_type,
  start_date,
  expiry_date,
  status,
  cost_price,
  sell_price,
  profit,
  supplier,
  customer_id,
  customer_name,
  customer_start_date,
  customer_expiry,
  customer_package,
  customer_contact,
  customer_paid,
  customer_paid_usd,
  customer_usd_rate,
  customer_status,
  note,
  created_at,
  updated_at,
  deleted_at
`)
      .is("deleted_at", null)
      .not("customer_name", "is", null)
      .neq("customer_name", "")
      .order("customer_name", { ascending: true });
  },

  updateAccountCustomerInfo: async (accountId, payload) => {
    return supabase
      .from("accounts")
      .update(cleanCustomerAccountPayload(payload))
      .eq("id", accountId)
      .select()
      .single();
  },

  updateManyAccountsByCustomerName: async (customerName, payload) => {
    const updatePayload = {};

    if ("customer_contact" in payload) {
      updatePayload.customer_contact = payload.customer_contact || null;
    }

    return supabase
      .from("accounts")
      .update(updatePayload)
      .eq("customer_name", customerName)
      .select();
  },
};