import { supabase } from "../lib/supabase";
import { calcExpiry, resolveStatus } from "../lib/utils";

const TABLE = "accounts";

// profit là generated column nên không gửi lên Supabase khi insert/update.
const stripGenerated = (obj) => {
  const { profit, ...rest } = obj;
  return rest;
};

const cleanPayload = (payload) => {
  const next = stripGenerated({ ...payload });

  // Ép số cho các field tiền
  if ("cost_price" in next) next.cost_price = Number(next.cost_price) || 0;
  if ("sell_price" in next) next.sell_price = Number(next.sell_price) || 0;
  if ("customer_paid" in next) next.customer_paid = Number(next.customer_paid) || 0;

  // Empty string date -> null để Supabase không lỗi date
  [
    "start_date",
    "expiry_date",
    "customer_start_date",
    "customer_expiry",
  ].forEach((key) => {
    if (next[key] === "") next[key] = null;
  });

  // Empty string text -> null cho các field optional
  [
    "supplier",
    "customer_name",
    "customer_package",
    "customer_contact",
    "customer_status",
    "note",
  ].forEach((key) => {
    if (next[key] === "") next[key] = null;
  });

  return next;
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

    if (search) {
      query = query.or(
        [
          `gmail.ilike.%${search}%`,
          `customer_name.ilike.%${search}%`,
          `supplier.ilike.%${search}%`,
          `customer_contact.ilike.%${search}%`,
          `note.ilike.%${search}%`,
        ].join(",")
      );
    }

    return query
      .order(orderBy, { ascending: asc })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  getTrashed: async ({ search, page = 1, pageSize = 20 } = {}) => {
    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" })
      .not("deleted_at", "is", null);

    if (search) {
      query = query.or(
        [
          `gmail.ilike.%${search}%`,
          `customer_name.ilike.%${search}%`,
          `supplier.ilike.%${search}%`,
          `customer_contact.ilike.%${search}%`,
          `note.ilike.%${search}%`,
        ].join(",")
      );
    }

    return query
      .order("deleted_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
  },

  getById: (id) => supabase.from(TABLE).select("*").eq("id", id).single(),

  create: async (payload) => {
    const sourceStartDate =
      payload.start_date || new Date().toISOString().split("T")[0];

    const sourceType = payload.account_type || "3_months";

    const sourceExpiryDate =
      payload.expiry_date || calcExpiry(sourceStartDate, sourceType);

    const status = resolveStatus(sourceExpiryDate);

    const customerStartDate =
      payload.customer_start_date || payload.start_date || sourceStartDate;

    const customerPackage = payload.customer_package || null;

    const customerExpiry =
      payload.customer_expiry ||
      (customerStartDate && customerPackage
        ? calcExpiry(customerStartDate, customerPackage)
        : null);

    const customerPaid =
      payload.customer_paid !== "" && payload.customer_paid != null
        ? Number(payload.customer_paid) || 0
        : Number(payload.sell_price) || 0;

    const data = cleanPayload({
      ...payload,
      account_type: sourceType,
      start_date: sourceStartDate,
      expiry_date: sourceExpiryDate,
      status,
      customer_start_date: customerStartDate || null,
      customer_package: customerPackage,
      customer_expiry: customerExpiry,
      customer_paid: customerPaid,
      customer_status: payload.customer_status || "using",
    });

    return supabase.from(TABLE).insert(data).select().single();
  },

  update: async (id, payload) => {
    const updates = { ...payload };

    const shouldRecalcSource =
      payload.expiry_date || payload.account_type || payload.start_date;

    const shouldRecalcCustomer =
      payload.customer_expiry ||
      payload.customer_package ||
      payload.customer_start_date;

    if (shouldRecalcSource || shouldRecalcCustomer) {
      const { data: current, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();

      if (error) return { data: null, error };

      if (shouldRecalcSource) {
        const sourceStartDate = updates.start_date || current.start_date;
        const sourceType = updates.account_type || current.account_type;
        const sourceExpiryDate =
          updates.expiry_date || calcExpiry(sourceStartDate, sourceType);

        updates.expiry_date = sourceExpiryDate;
        updates.status = resolveStatus(sourceExpiryDate);
      }

      if (shouldRecalcCustomer) {
        const customerStartDate =
          updates.customer_start_date ||
          current.customer_start_date ||
          updates.start_date ||
          current.start_date;

        const customerPackage =
          updates.customer_package || current.customer_package;

        if (!updates.customer_expiry && customerStartDate && customerPackage) {
          updates.customer_expiry = calcExpiry(customerStartDate, customerPackage);
        }
      }
    }

    if (
      "customer_paid" in updates &&
      (updates.customer_paid === "" || updates.customer_paid == null)
    ) {
      updates.customer_paid = Number(updates.sell_price || 0) || 0;
    }

    return supabase
      .from(TABLE)
      .update(cleanPayload(updates))
      .eq("id", id)
      .select()
      .single();
  },

  delete: (id) =>
    supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id),

  deleteMany: (ids) =>
    supabase
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids),

  restore: (id) =>
    supabase
      .from(TABLE)
      .update({ deleted_at: null })
      .eq("id", id)
      .select()
      .single(),

  restoreMany: (ids) =>
    supabase.from(TABLE).update({ deleted_at: null }).in("id", ids),

  hardDelete: (id) => supabase.from(TABLE).delete().eq("id", id),

  hardDeleteAll: () =>
    supabase.from(TABLE).delete().not("deleted_at", "is", null),

  bulkCreate: async (rows) => {
    const today = new Date().toISOString().split("T")[0];

    const enriched = rows.map((row) => {
      const sourceStartDate = row.start_date || today;
      const sourceType = row.account_type || "3_months";
      const sourceExpiryDate =
        row.expiry_date || calcExpiry(sourceStartDate, sourceType);

      const customerStartDate =
        row.customer_start_date || row.start_date || sourceStartDate;

      const customerPackage = row.customer_package || null;

      const customerExpiry =
        row.customer_expiry ||
        (customerStartDate && customerPackage
          ? calcExpiry(customerStartDate, customerPackage)
          : null);

      const customerPaid =
        row.customer_paid !== "" && row.customer_paid != null
          ? Number(row.customer_paid) || 0
          : Number(row.sell_price) || 0;

      return cleanPayload({
        ...row,
        account_type: sourceType,
        start_date: sourceStartDate,
        expiry_date: sourceExpiryDate,
        status: resolveStatus(sourceExpiryDate),
        customer_start_date: customerStartDate || null,
        customer_package: customerPackage,
        customer_expiry: customerExpiry,
        customer_paid: customerPaid,
        customer_status: row.customer_status || "using",
      });
    });

    return supabase.from(TABLE).insert(enriched).select();
  },

  refreshStatuses: async () => {
    const { data: accounts, error } = await supabase
      .from(TABLE)
      .select("id, expiry_date")
      .is("deleted_at", null);

    if (error) return { data: null, error };
    if (!accounts?.length) return { data: [], error: null };

    const updates = accounts.map(({ id, expiry_date }) => ({
      id,
      status: resolveStatus(expiry_date),
    }));

    return supabase.from(TABLE).upsert(updates, { onConflict: "id" });
  },
};