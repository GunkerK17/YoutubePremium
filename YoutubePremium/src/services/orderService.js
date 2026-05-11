import { supabase } from "../lib/supabase";

const TABLE = "activity_logs";

export const logService = {
  getAll: async ({ action, userId, page = 1, pageSize = 50 } = {}) => {
    let query = supabase
      .from(TABLE)
      .select("*, profiles(email, role)", { count: "exact" });

    if (action) query = query.eq("action", action);
    if (userId) query = query.eq("user_id", userId);

    return query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  /**
   * Log an action
   * @param {"create"|"update"|"delete"|"refund"|"login"|"logout"} action
   * @param {string} targetTable  - e.g. "accounts"
   * @param {string} targetId     - record id affected
   * @param {object} meta         - extra info (before/after snapshot etc.)
   */
  log: async (action, targetTable, targetId, meta = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    return supabase.from(TABLE).insert({
      user_id:      user.id,
      action,
      target_table: targetTable,
      target_id:    targetId,
      meta,
    });
  },

  // Convenience wrappers
  logCreate: (table, id, meta) => logService.log("create", table, id, meta),
  logUpdate: (table, id, meta) => logService.log("update", table, id, meta),
  logDelete: (table, id, meta) => logService.log("delete", table, id, meta),
  logRefund: (table, id, meta) => logService.log("refund", table, id, meta),
};