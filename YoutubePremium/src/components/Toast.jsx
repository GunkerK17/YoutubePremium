import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

const ICONS = {
  success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  error:   { icon: XCircle,     color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  info:    { icon: Info,        color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
};

// Single Toast Item
function ToastItem({ id, type = "info", message, title, duration = 4000, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const config = ICONS[type] || ICONS.info;
  const Icon = config.icon;

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setVisible(true), 10);

    // Progress bar
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 30);

    // Auto remove
    const removeTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
      clearInterval(interval);
    };
  }, [id, duration, onRemove]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(id), 300);
  };

  return (
    <div
      className={`relative flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 overflow-hidden ${
        config.bg
      } ${
        visible
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-8"
      }`}
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${config.color.replace("text-", "bg-")} transition-all duration-75`}
        style={{ width: `${progress}%` }}
      />

      {/* Icon */}
      <Icon size={18} className={`${config.color} flex-shrink-0 mt-0.5`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="text-white text-sm font-semibold leading-tight">{title}</p>
        )}
        <p className={`text-sm leading-snug ${title ? "text-zinc-400 mt-0.5" : "text-zinc-200"}`}>
          {message}
        </p>
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Toast Container
export default function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}