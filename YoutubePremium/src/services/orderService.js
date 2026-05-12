// src/services/orderService.js
import { supabase } from "../lib/supabase";

const TABLE = "orders";

const cleanNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const cleanText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const cleanDate = (value) => {
  return value || null;
};

const cleanPayload = (payload = {}) => ({
  account_id: payload.account_id || null,

  customer_name: cleanText(payload.customer_name),
  customer_contact: cleanText(payload.customer_contact),

  order_type: payload.order_type || "renew",
  status: payload.status || "pending",

  amount_vnd: cleanNumber(payload.amount_vnd),
  amount_usd: cleanNumber(payload.amount_usd),
  usd_rate: cleanNumber(payload.usd_rate) || 26329.5,

  old_expiry: cleanDate(payload.old_expiry),
  new_expiry: cleanDate(payload.new_expiry),

  note: cleanText(payload.note),
  updated_at: new Date().toISOString(),
});

export const orderService = {
  getAll: async ({
    search,
    status,
    orderType,
    page = 1,
    pageSize = 30,
  } = {}) => {
    let query = supabase
      .from(TABLE)
      .select(
        `
        *,
        accounts (
          id,
          gmail,
          customer_name,
          customer_contact,
          customer_start_date,
          customer_expiry,
          customer_paid,
          customer_paid_usd,
          customer_usd_rate,
          is_collected
        )
      `,
        { count: "exact" }
      );

    if (status) query = query.eq("status", status);
    if (orderType) query = query.eq("order_type", orderType);

    if (search) {
      query = query.or(
        [
          `customer_name.ilike.%${search}%`,
          `customer_contact.ilike.%${search}%`,
          `note.ilike.%${search}%`,
        ].join(",")
      );
    }

    return query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  getById: (id) =>
    supabase
      .from(TABLE)
      .select(
        `
        *,
        accounts (
          id,
          gmail,
          customer_name,
          customer_contact,
          customer_start_date,
          customer_expiry,
          customer_paid,
          customer_paid_usd,
          customer_usd_rate,
          is_collected
        )
      `
      )
      .eq("id", id)
      .single(),

  create: async (payload) => {
    const clean = cleanPayload(payload);

    const result = await supabase
      .from(TABLE)
      .insert(clean)
      .select(
        `
        *,
        accounts (
          id,
          gmail,
          customer_name,
          customer_contact,
          customer_start_date,
          customer_expiry,
          customer_paid,
          customer_paid_usd,
          customer_usd_rate,
          is_collected
        )
      `
      )
      .single();

    if (!result.error) {
      await orderService.syncAccountCollection(clean);
    }

    return result;
  },

  update: async (id, payload) => {
    const clean = cleanPayload(payload);

    const result = await supabase
      .from(TABLE)
      .update(clean)
      .eq("id", id)
      .select(
        `
        *,
        accounts (
          id,
          gmail,
          customer_name,
          customer_contact,
          customer_start_date,
          customer_expiry,
          customer_paid,
          customer_paid_usd,
          customer_usd_rate,
          is_collected
        )
      `
      )
      .single();

    if (!result.error) {
      await orderService.syncAccountCollection(clean);
    }

    return result;
  },

  delete: (id) =>
    supabase
      .from(TABLE)
      .delete()
      .eq("id", id),

  getAccountsForSelect: async ({ search } = {}) => {
    let query = supabase
      .from("accounts")
      .select(
        `
        id,
        gmail,
        customer_name,
        customer_contact,
        customer_start_date,
        customer_expiry,
        customer_paid,
        customer_paid_usd,
        customer_usd_rate,
        is_collected,
        deleted_at
      `
      )
      .is("deleted_at", null)
      .not("customer_name", "is", null)
      .neq("customer_name", "")
      .order("customer_name", { ascending: true })
      .limit(100);

    if (search) {
      query = query.or(
        [
          `gmail.ilike.%${search}%`,
          `customer_name.ilike.%${search}%`,
          `customer_contact.ilike.%${search}%`,
        ].join(",")
      );
    }

    return query;
  },

  createCollectOrderFromAccount: async (account, status = "completed") => {
    if (!account?.id) {
      return {
        data: null,
        error: new Error("Thiếu account để tạo đơn gom tiền"),
      };
    }

    return orderService.create({
      account_id: account.id,
      customer_name: account.customer_name,
      customer_contact: account.customer_contact,

      order_type: "collect_money",
      status,

      amount_vnd: account.customer_paid || 0,
      amount_usd: account.customer_paid_usd || 0,
      usd_rate: account.customer_usd_rate || 26329.5,

      old_expiry: account.customer_start_date,
      new_expiry: account.customer_expiry,

      note: status === "completed"
        ? "Tạo đơn gom tiền và đánh dấu đã gom."
        : "Tạo đơn gom tiền chờ xử lý.",
    });
  },

  markAccountCollected: async (accountId, collected = true) => {
    return supabase
      .from("accounts")
      .update({
        is_collected: collected,
        collected_at: collected ? new Date().toISOString() : null,
      })
      .eq("id", accountId);
  },

  syncAccountCollection: async (payload) => {
    if (!payload.account_id) return;

    const shouldCollect =
      ["new", "renew", "collect_money"].includes(payload.order_type) &&
      payload.status === "completed";

    if (shouldCollect) {
      await orderService.markAccountCollected(payload.account_id, true);
    }

    if (payload.status === "cancelled" || payload.status === "refunded") {
      await orderService.markAccountCollected(payload.account_id, false);
    }
  },
};