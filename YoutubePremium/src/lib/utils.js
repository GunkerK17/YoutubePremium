import { ACCOUNT_STATUS, EXPIRY_WARNING_DAYS } from "./constants";

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Days remaining from today to a date string */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Resolve account status from expiry date */
export function resolveStatus(expiryDate) {
  const days = daysUntil(expiryDate);
  if (days === null) return ACCOUNT_STATUS.EXPIRED;
  if (days <= 0) return ACCOUNT_STATUS.EXPIRED;
  if (days <= EXPIRY_WARNING_DAYS) return ACCOUNT_STATUS.EXPIRING;
  return ACCOUNT_STATUS.ACTIVE;
}

/** Format date to dd/mm/yyyy */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

/** Format datetime to dd/mm/yyyy HH:MM */
export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** ISO string for N months from now */
export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

// ─── Account type → months mapping ───────────────────────────────────────────
export const TYPE_MONTHS = {
  "1_month":  1,
  "3_months": 3,
  "6_months": 6,
  "1_year":   12,
};

/** Calculate expiry date from start + account type */
export function calcExpiry(startDate, accountType) {
  const months = TYPE_MONTHS[accountType] ?? 1;
  return addMonths(startDate, months);
}

// ─── Number helpers ───────────────────────────────────────────────────────────
export function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND",
  }).format(amount ?? 0);
}

export function parseVND(str) {
  return parseInt(str?.toString().replace(/\D/g, "") || "0", 10);
}

// ─── String helpers ───────────────────────────────────────────────────────────
export function truncate(str, n = 30) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
}

// ─── Export to Excel ──────────────────────────────────────────────────────────
export function exportToCSV(data, filename = "export.csv") {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(","), ...data.map((r) => keys.map((k) => `"${r[k] ?? ""}"`).join(","))];
  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Copy to clipboard ────────────────────────────────────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ─── Debounce ─────────────────────────────────────────────────────────────────
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─── Generate unique ID ───────────────────────────────────────────────────────
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}