// Components barrel export
export { default as Sidebar } from "./Sidebar";
export { default as Toast } from "./Toast";

// ─── Shared UI primitives ────────────────────────────────────────────────────

// Badge
export function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default:  "bg-zinc-800 text-zinc-300 border-zinc-700",
    success:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    warning:  "bg-amber-500/15 text-amber-400 border-amber-500/25",
    danger:   "bg-red-500/15 text-red-400 border-red-500/25",
    info:     "bg-blue-500/15 text-blue-400 border-blue-500/25",
    vip:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    agent:    "bg-purple-500/15 text-purple-400 border-purple-500/25",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
}

// Button
export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const variants = {
    primary:   "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10",
    ghost:     "hover:bg-white/5 text-zinc-400 hover:text-white",
    danger:    "bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/20",
    success:   "bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/20",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-sm gap-2",
  };
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// Card
export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-zinc-900/60 border border-white/5 rounded-xl backdrop-blur-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Input
export function Input({ label, error, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-zinc-900 border ${
          error ? "border-red-500/50 focus:border-red-500" : "border-white/8 focus:border-red-500/50"
        } text-white text-sm rounded-lg px-3 py-2.5 outline-none transition-colors placeholder:text-zinc-600 ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

// Select
export function Select({ label, error, children, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-zinc-900 border ${
          error ? "border-red-500/50" : "border-white/8 focus:border-red-500/50"
        } text-white text-sm rounded-lg px-3 py-2.5 outline-none transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

// Modal
export function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`relative w-full ${width} bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// Stat Card
export function StatCard({ title, value, sub, icon: Icon, trend, color = "red" }) {
  const colors = {
    red:     { icon: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/15" },
    emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
    amber:   { icon: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/15" },
    blue:    { icon: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/15" },
    purple:  { icon: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/15" },
  };
  const c = colors[color] || colors.red;
  return (
    <Card className={`p-5 border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{title}</p>
          <p className="text-white text-2xl font-bold mt-1 tracking-tight">{value}</p>
          {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
          {trend !== undefined && (
            <p className={`text-xs mt-1.5 font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% so với tháng trước
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={20} className={c.icon} />
          </div>
        )}
      </div>
    </Card>
  );
}

// Loading Skeleton
export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />
  );
}

// Empty State
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
          <Icon size={24} className="text-zinc-600" />
        </div>
      )}
      <p className="text-white font-medium">{title}</p>
      {description && <p className="text-zinc-500 text-sm mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}