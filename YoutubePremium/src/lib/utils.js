import { ACCOUNT_STATUS, EXPIRY_WARNING_DAYS } from "./constants";

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const diff = date - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function resolveStatus(expiryDate) {
  const days = daysUntil(expiryDate);
  if (days === null) return ACCOUNT_STATUS.EXPIRED;
  if (days <= 0) return ACCOUNT_STATUS.EXPIRED;
  if (days <= EXPIRY_WARNING_DAYS) return ACCOUNT_STATUS.EXPIRING;
  return ACCOUNT_STATUS.ACTIVE;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function addMonths(date, months) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

export const TYPE_MONTHS = {
  "1_month":  1,
  "3_months": 3,
  "6_months": 6,
  "1_year":   12,
};

export function calcExpiry(startDate, accountType) {
  const months = TYPE_MONTHS[accountType] ?? 1;
  return addMonths(startDate, months);
}

export function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount ?? 0);
}

export function parseVND(str) {
  return parseInt(str?.toString().replace(/\D/g, "") || "0", 10);
}

export function truncate(str, n = 30) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
}

export function exportToCSV(data, filename = "export.csv") {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const rows = [
    keys.join(","),
    ...data.map((r) => keys.map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const USD_RATE = 25500

export function calcProratedUsd({
  customerStartDate,
  planStartDate = '2026-04-01',
  planEndDate = '2027-04-01',
  fullPriceUsd = 80,
}) {
  if (!customerStartDate) return fullPriceUsd

  const start = new Date(planStartDate)
  const end = new Date(planEndDate)
  const customerStart = new Date(customerStartDate)

  if (Number.isNaN(customerStart.getTime())) return fullPriceUsd

  // Nếu mua trước hoặc đúng ngày mở gói thì tính full
  if (customerStart <= start) return fullPriceUsd

  // Nếu mua sau ngày hết hạn thì 0
  if (customerStart >= end) return 0

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
  const remainDays = Math.ceil((end - customerStart) / (1000 * 60 * 60 * 24))

  const price = (fullPriceUsd * remainDays) / totalDays

  return Math.round(price * 100) / 100
}

export function calcProratedVnd({
  customerStartDate,
  planStartDate = '2026-04-01',
  planEndDate = '2027-04-01',
  fullPriceUsd = 80,
  usdRate = USD_RATE,
}) {
  const usd = calcProratedUsd({
    customerStartDate,
    planStartDate,
    planEndDate,
    fullPriceUsd,
  })

  return Math.round(usd * usdRate)
}

export function dateToInputVN(value) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()

  return `${dd}/${mm}/${yyyy}`
}

export function vnDateToISO(value) {
  if (!value) return ""

  const raw = String(value).trim()

  // Nếu đã là yyyy-mm-dd thì giữ nguyên
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number)
    const parsed = new Date(raw)
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== y ||
      parsed.getUTCMonth() + 1 !== m ||
      parsed.getUTCDate() !== d
    ) {
      return ""
    }
    return raw
  }

  // Nhận dd/mm/yyyy hoặc dd-mm-yyyy
  const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (!match) return ""

  const [, dRaw, mRaw, yRaw] = match
  const dd = String(dRaw).padStart(2, "0")
  const mm = String(mRaw).padStart(2, "0")
  const yyyy = String(yRaw)
  const iso = `${yyyy}-${mm}-${dd}`
  const parsed = new Date(iso)

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== Number(yyyy) ||
    parsed.getUTCMonth() + 1 !== Number(mm) ||
    parsed.getUTCDate() !== Number(dd)
  ) {
    return ""
  }

  return iso
}

export function isoDateToVN(value) {
  if (!value) return ""

  const raw = String(value).trim()

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ""

  const [, y, m, d] = match
  return `${d}/${m}/${y}`
}
