// src/views/LogsView.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  FileText,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";

import { getLogs } from "../services/logService";
import { copyToClipboard } from "../lib/utils";

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: "#fff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const MODULE_CONFIG = {
  support: {
    label: "Hỗ trợ",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.09)",
    border: "rgba(245,158,11,0.22)",
  },
  finance: {
    label: "Tài chính",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.09)",
    border: "rgba(34,197,94,0.22)",
  },
  account: {
    label: "Tài khoản",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.09)",
    border: "rgba(59,130,246,0.22)",
  },
  customer: {
    label: "Khách hàng",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.09)",
    border: "rgba(168,85,247,0.22)",
  },
  system: {
    label: "Hệ thống",
    color: "#a1a1aa",
    bg: "rgba(161,161,170,0.09)",
    border: "rgba(161,161,170,0.22)",
  },
};

const ACTION_CONFIG = {
  create_support_ticket: {
    label: "Tạo ticket",
    icon: AlertTriangle,
    color: "#f59e0b",
  },
  update_support_ticket: {
    label: "Sửa ticket",
    icon: FileText,
    color: "#60a5fa",
  },
  change_support_status: {
    label: "Đổi trạng thái",
    icon: CheckCircle,
    color: "#22c55e",
  },
  delete_support_ticket: {
    label: "Xoá ticket",
    icon: Trash2,
    color: "#ef4444",
  },
  collect_money: {
    label: "Đã gom tiền",
    icon: CheckCircle,
    color: "#22c55e",
  },
  uncollect_money: {
    label: "Huỷ gom tiền",
    icon: X,
    color: "#ef4444",
  },
};

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return `${diffDay} ngày trước`;
}

function Badge({ config }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 999,
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "#111113",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 13,
          background: `${color}18`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 13,
        }}
      >
        <Icon size={18} />
      </div>

      <div style={{ color, fontSize: 23, fontWeight: 900, lineHeight: 1 }}>
        {value}
      </div>

      <div style={{ color: "#71717a", fontSize: 12, marginTop: 7 }}>
        {label}
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 720 }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#141418",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "#141418",
            zIndex: 2,
          }}
        >
          <h2 style={{ margin: 0, color: "#fff", fontSize: 16, fontWeight: 900 }}>
            {title}
          </h2>

          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              border: "none",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "#71717a",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function JsonBlock({ title, data }) {
  if (!data) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          color: "#71717a",
          fontSize: 11,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 10,
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.07)",
          color: "#a1a1aa",
          fontSize: 12,
          lineHeight: 1.5,
          overflowX: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function LogsView({ toast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await getLogs({
          limit: 200,
          module: moduleFilter || undefined,
          action: actionFilter || undefined,
          search: search || undefined,
        });

        setLogs(data ?? []);
      } catch (err) {
        toast?.error?.("Lỗi tải logs: " + err.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [moduleFilter, actionFilter, search, toast]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const q = normalizeText(search);

    return logs.filter((log) => {
      if (!q) return true;

      return (
        normalizeText(log.user_email).includes(q) ||
        normalizeText(log.action).includes(q) ||
        normalizeText(log.module).includes(q) ||
        normalizeText(log.target).includes(q) ||
        normalizeText(log.detail).includes(q) ||
        normalizeText(log.gmail).includes(q) ||
        normalizeText(log.customer_name).includes(q)
      );
    });
  }, [logs, search]);

  const stats = useMemo(() => {
    const support = logs.filter((log) => log.module === "support").length;
    const finance = logs.filter((log) => log.module === "finance").length;
    const account = logs.filter((log) => log.module === "account").length;
    const today = logs.filter((log) => {
      const d = new Date(log.created_at);
      const now = new Date();

      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;

    return {
      total: logs.length,
      support,
      finance,
      account,
      today,
    };
  }, [logs]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort();
  }, [logs]);

  const handleCopy = async (text) => {
    if (!text) return;
    await copyToClipboard(text);
    toast?.success?.("Đã copy!");
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>

        <div className="h-96 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: 0 }}>
            Activity Logs
          </h1>

          <p style={{ color: "#71717a", fontSize: 13, margin: "5px 0 0" }}>
            Nhật ký thao tác: support, finance, account, customer và hệ thống.
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "#a1a1aa",
            cursor: refreshing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          <RefreshCw
            size={14}
            style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
          />
          Làm mới
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
          gap: 12,
        }}
      >
        <StatCard icon={Activity} label="Tổng logs" value={stats.total} color="#a1a1aa" />
        <StatCard icon={Clock} label="Hôm nay" value={stats.today} color="#60a5fa" />
        <StatCard icon={AlertTriangle} label="Support logs" value={stats.support} color="#f59e0b" />
        <StatCard icon={CheckCircle} label="Finance logs" value={stats.finance} color="#22c55e" />
        <StatCard icon={Shield} label="Account logs" value={stats.account} color="#a855f7" />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          padding: 14,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#71717a",
            }}
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm email, action, khách, gmail, nội dung..."
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(event) => setModuleFilter(event.target.value)}
          style={{ ...inputStyle, width: 150, cursor: "pointer" }}
        >
          <option value="">Module</option>
          <option value="support">Hỗ trợ</option>
          <option value="finance">Tài chính</option>
          <option value="account">Tài khoản</option>
          <option value="customer">Khách hàng</option>
          <option value="system">Hệ thống</option>
        </select>

        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          style={{ ...inputStyle, width: 190, cursor: "pointer" }}
        >
          <option value="">Action</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {ACTION_CONFIG[action]?.label || action}
            </option>
          ))}
        </select>

        {(search || moduleFilter || actionFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setModuleFilter("");
              setActionFilter("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.08)",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <X size={12} />
            Xoá lọc
          </button>
        )}
      </div>

      <div
        style={{
          background: "#111113",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  "Thời gian",
                  "Module",
                  "Action",
                  "Người thao tác",
                  "Khách",
                  "Gmail",
                  "Chi tiết",
                  "Thao tác",
                ].map((header) => (
                  <th
                    key={header}
                    style={{
                      padding: "12px 14px",
                      textAlign: header === "Thao tác" ? "center" : "left",
                      color: "#71717a",
                      fontSize: 11,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      height: 220,
                      textAlign: "center",
                      color: "#52525b",
                      fontSize: 14,
                    }}
                  >
                    Chưa có log nào
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const moduleConfig =
                    MODULE_CONFIG[log.module] || MODULE_CONFIG.system;

                  const actionConfig =
                    ACTION_CONFIG[log.action] || {
                      label: log.action || "Không rõ",
                      icon: Activity,
                      color: "#a1a1aa",
                    };

                  const ActionIcon = actionConfig.icon;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.045)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ color: "#e4e4e7", fontSize: 12, fontWeight: 800 }}>
                          {timeAgo(log.created_at)}
                        </div>

                        <div style={{ color: "#71717a", fontSize: 11, marginTop: 3 }}>
                          {formatDateTime(log.created_at)}
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <Badge config={moduleConfig} />
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <ActionIcon size={14} style={{ color: actionConfig.color }} />

                          <span
                            style={{
                              color: actionConfig.color,
                              fontSize: 12,
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {actionConfig.label}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <User size={13} style={{ color: "#71717a" }} />

                          <span
                            style={{
                              color: log.user_email ? "#a1a1aa" : "#3f3f46",
                              fontSize: 12,
                              maxWidth: 180,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {log.user_email || "—"}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <span
                          style={{
                            color: log.customer_name ? "#e4e4e7" : "#3f3f46",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {log.customer_name || "—"}
                        </span>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              color: log.gmail ? "#a1a1aa" : "#3f3f46",
                              fontSize: 12,
                              maxWidth: 190,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {log.gmail || "—"}
                          </span>

                          {log.gmail && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCopy(log.gmail);
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                color: "#52525b",
                                cursor: "pointer",
                                display: "flex",
                                padding: 2,
                              }}
                            >
                              <Copy size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px" }}>
                        <div
                          style={{
                            color: log.detail ? "#a1a1aa" : "#3f3f46",
                            fontSize: 12,
                            maxWidth: 320,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={log.detail || ""}
                        >
                          {log.detail || log.target || "—"}
                        </div>
                      </td>

                      <td style={{ padding: "13px 14px", textAlign: "center" }}>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedLog(log);
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)",
                            color: "#a1a1aa",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết log"
        width={760}
      >
        {selectedLog && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <Badge
                  config={MODULE_CONFIG[selectedLog.module] || MODULE_CONFIG.system}
                />

                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#a1a1aa",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  {ACTION_CONFIG[selectedLog.action]?.label || selectedLog.action}
                </span>
              </div>

              <div style={{ color: "#fff", fontSize: 15, fontWeight: 900 }}>
                {selectedLog.detail || selectedLog.target || "Không có chi tiết"}
              </div>

              <div style={{ color: "#71717a", fontSize: 12, marginTop: 6 }}>
                {formatDateTime(selectedLog.created_at)}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "#71717a", fontSize: 11, marginBottom: 4 }}>
                  Người thao tác
                </div>
                <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 800 }}>
                  {selectedLog.user_email || "—"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "#71717a", fontSize: 11, marginBottom: 4 }}>
                  Target
                </div>
                <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 800 }}>
                  {selectedLog.target || "—"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "#71717a", fontSize: 11, marginBottom: 4 }}>
                  Khách hàng
                </div>
                <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 800 }}>
                  {selectedLog.customer_name || "—"}
                </div>
              </div>

              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ color: "#71717a", fontSize: 11, marginBottom: 4 }}>
                  Gmail
                </div>
                <div style={{ color: "#e4e4e7", fontSize: 13, fontWeight: 800 }}>
                  {selectedLog.gmail || "—"}
                </div>
              </div>
            </div>

            <JsonBlock title="Old value" data={selectedLog.old_value} />
            <JsonBlock title="New value" data={selectedLog.new_value} />
            <JsonBlock title="Meta" data={selectedLog.meta} />
          </div>
        )}
      </Modal>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}