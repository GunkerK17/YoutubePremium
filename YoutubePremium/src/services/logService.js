// src/services/logService.js
import { supabase } from "../lib/supabase";

export async function logActivity({
  userEmail = "",
  action,
  module = "system",
  target = "",
  detail = "",
  accountId = null,
  gmail = "",
  customerName = "",
  oldValue = null,
  newValue = null,
  meta = {},
} = {}) {
  if (!action) return;

  supabase
    .from("activity_logs")
    .insert({
      user_email: userEmail || null,
      action,
      module,
      target,
      detail,
      account_id: accountId,
      gmail: gmail || null,
      customer_name: customerName || null,
      old_value: oldValue,
      new_value: newValue,
      meta,
    })
    .then(({ error }) => {
      if (error) console.warn("Log error:", error.message);
    });
}

export async function getLogs({ limit = 100, module, action, search } = {}) {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (module) query = query.eq("module", module);
  if (action) query = query.eq("action", action);

  if (search) {
    query = query.or(
      [
        `user_email.ilike.%${search}%`,
        `action.ilike.%${search}%`,
        `module.ilike.%${search}%`,
        `target.ilike.%${search}%`,
        `detail.ilike.%${search}%`,
        `gmail.ilike.%${search}%`,
        `customer_name.ilike.%${search}%`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}