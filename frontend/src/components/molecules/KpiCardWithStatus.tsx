import type { KPIStatus } from "@/types/target";
import { KPI_STATUS_COLORS, KPI_STATUS_LABELS } from "@/types/target";

interface KpiCardWithStatusProps {
  title: string;
  value: string;
  suffix?: string;
  achievementRate?: number | null;
  status: KPIStatus;
  variant?: "dark" | "light";
}

export function KpiCardWithStatus({
  title,
  value,
  suffix,
  achievementRate,
  status,
  variant = "light",
}: KpiCardWithStatusProps) {
  const cardStyle =
    variant === "dark"
      ? {
          background: "#111a2e",
          border: "1px solid #1e2740",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.2)",
          color: "#e8eefc",
        }
      : {
          background: "#ffffff",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          color: "#0f172a",
        };

  const statusColor = KPI_STATUS_COLORS[status];
  const statusLabel = KPI_STATUS_LABELS[status];

  return (
    <div style={{ ...cardStyle, borderRadius: 12, padding: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: variant === "dark" ? "#94a3b8" : "#64748b",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
        {value}
        {suffix && ` ${suffix}`}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: statusColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: variant === "dark" ? "#94a3b8" : "#64748b",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {achievementRate !== undefined && achievementRate !== null && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: variant === "dark" ? "#64748b" : "#94a3b8",
            marginTop: 4,
          }}
        >
          달성률 {achievementRate.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
