// src/services/supportService.js
import { supabase } from "../lib/supabase";

const TABLE = "support_tickets";

const cleanText = (value) => {
  const text = String(value ?? "").trim();
  return text || null;
};

const cleanPayload = (payload = {}) => ({
  account_id: payload.account_id || null,

  customer_name: cleanText(payload.customer_name),
  customer_contact: cleanText(payload.customer_contact),
  gmail: cleanText(payload.gmail),

  issue_type: payload.issue_type || "account_error",
  status: payload.status || "open",
  priority: payload.priority || "normal",

  issue_note: cleanText(payload.issue_note),
  resolve_note: cleanText(payload.resolve_note),

  updated_at: new Date().toISOString(),
  resolved_at:
    payload.status === "resolved"
      ? payload.resolved_at || new Date().toISOString()
      : null,
});

export const supportService = {
  getAll: async ({ search, status, issueType, priority, page = 1, pageSize = 30 } = {}) => {
    let query = supabase
      .from(TABLE)
      .select(
        `
        *,
        accounts (
          id,
          gmail,
          password,
          customer_name,
          customer_contact,
          customer_start_date,
          customer_expiry,
          customer_status,
          status
        )
      `,
        { count: "exact" }
      );

    if (status) query = query.eq("status", status);
    if (issueType) query = query.eq("issue_type", issueType);
    if (priority) query = query.eq("priority", priority);

    if (search) {
      query = query.or(
        [
          `customer_name.ilike.%${search}%`,
          `customer_contact.ilike.%${search}%`,
          `gmail.ilike.%${search}%`,
          `issue_note.ilike.%${search}%`,
          `resolve_note.ilike.%${search}%`,
        ].join(",")
      );
    }

    return query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

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
          password,
          customer_name,
          customer_contact,
          customer_start_date,
          customer_expiry,
          customer_status,
          status
        )
      `
      )
      .single();

    if (!result.error && clean.account_id) {
      await supabase
        .from("accounts")
        .update({ customer_status: "supporting" })
        .eq("id", clean.account_id);
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
          password,
          customer_name,
          customer_contact,
          customer_start_date,
          customer_expiry,
          customer_status,
          status
        )
      `
      )
      .single();

    if (!result.error && result.data?.account_id) {
      if (clean.status === "resolved" || clean.status === "cancelled") {
        await supabase
          .from("accounts")
          .update({ customer_status: "using" })
          .eq("id", result.data.account_id);
      } else {
        await supabase
          .from("accounts")
          .update({ customer_status: "supporting" })
          .eq("id", result.data.account_id);
      }
    }

    return result;
  },

  delete: (id) => supabase.from(TABLE).delete().eq("id", id),

  getAccountsForSelect: async ({ search } = {}) => {
    let query = supabase
      .from("accounts")
      .select(`
        id,
        gmail,
        password,
        status,
        customer_name,
        customer_contact,
        customer_start_date,
        customer_expiry,
        customer_status,
        deleted_at
      `)
      .is("deleted_at", null)
      .not("customer_name", "is", null)
      .neq("customer_name", "")
      .order("customer_name", { ascending: true })
      .limit(120);

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

  quickCreateFromAccount: async (account, issueNote = "Khách báo lỗi acc, cần hỗ trợ.") => {
    if (!account?.id) {
      return {
        data: null,
        error: new Error("Thiếu account để tạo ticket hỗ trợ"),
      };
    }

    return supportService.create({
      account_id: account.id,
      customer_name: account.customer_name,
      customer_contact: account.customer_contact,
      gmail: account.gmail,
      issue_type: "account_error",
      status: "open",
      priority: "normal",
      issue_note: issueNote,
    });
  },
};