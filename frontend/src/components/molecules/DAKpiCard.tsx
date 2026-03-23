"use client";

import { KPIStatus, KPI_STATUS_COLORS, KPI_STATUS_LABELS } from "@/types/target";

interface DAKpiCardProps {
  title: string;
  value: string;
  badgeText?: string;
  status?: KPIStatus;
}

export function DAKpiCard({ title, value, badgeText, status = "gray" }: DAKpiCardProps) {
  const badgeColor = KPI_STATUS_COLORS[status];
  const badgeLabel = badgeText ?? KPI_STATUS_LABELS[status];

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        flex: 1,
        minWidth: 0
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: value.startsWith("-") ? "#ef4444" : "#0f172a" }}>
          {value}
        </span>
        {badgeLabel && (
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              background: `${badgeColor}20`,
              color: badgeColor,
              whiteSpace: "nowrap"
            }}
          >
            {badgeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
