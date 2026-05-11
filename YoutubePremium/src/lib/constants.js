// ─── Account Types ────────────────────────────────────────────────────────────
export const ACCOUNT_TYPES = [
  { value: "1_month",  label: "1 tháng" },
  { value: "3_months", label: "3 tháng" },
  { value: "6_months", label: "6 tháng" },
  { value: "1_year",   label: "1 năm" },
];

// ─── Account Status ───────────────────────────────────────────────────────────
export const ACCOUNT_STATUS = {
  ACTIVE:   "active",
  EXPIRING: "expiring", // <= 7 ngày
  EXPIRED:  "expired",
};

export const ACCOUNT_STATUS_LABEL = {
  active:   "Còn hạn",
  expiring: "Sắp hết hạn",
  expired:  "Hết hạn",
};

export const ACCOUNT_STATUS_VARIANT = {
  active:   "success",
  expiring: "warning",
  expired:  "danger",
};

// ─── Order Status ─────────────────────────────────────────────────────────────
export const ORDER_STATUS = {
  PENDING:    "pending",
  PROCESSING: "processing",
  COMPLETED:  "completed",
  REFUNDED:   "refunded",
  ERROR:      "error",
};

export const ORDER_STATUS_LABEL = {
  pending:    "Chờ xử lý",
  processing: "Đang nâng cấp",
  completed:  "Hoàn thành",
  refunded:   "Refund",
  error:      "Lỗi",
};

export const ORDER_STATUS_VARIANT = {
  pending:    "info",
  processing: "warning",
  completed:  "success",
  refunded:   "default",
  error:      "danger",
};

// ─── Customer Levels ──────────────────────────────────────────────────────────
export const CUSTOMER_LEVELS = {
  MEMBER: "member",
  VIP:    "vip",
  AGENT:  "agent",
};

export const CUSTOMER_LEVEL_LABEL = {
  member: "Member",
  vip:    "VIP",
  agent:  "Đại lý",
};

export const CUSTOMER_LEVEL_VARIANT = {
  member: "default",
  vip:    "vip",
  agent:  "agent",
};

// ─── Roles ────────────────────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  MANAGER:     "manager",
};

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  manager:     "Manager",
};

// ─── Log Actions ──────────────────────────────────────────────────────────────
export const LOG_ACTIONS = {
  CREATE:   "create",
  UPDATE:   "update",
  DELETE:   "delete",
  REFUND:   "refund",
  LOGIN:    "login",
  LOGOUT:   "logout",
};

// ─── Expiry warning threshold (days) ─────────────────────────────────────────
export const EXPIRY_WARNING_DAYS = 7;

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PAGE_SIZE = 20;

// ─── Currency formatter ───────────────────────────────────────────────────────
export const formatVND = (amount) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount ?? 0);

export const formatNumber = (n) =>
  new Intl.NumberFormat("vi-VN").format(n ?? 0);