import React from "react";

import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  titleAlign?: "left" | "right";
  children: React.ReactNode;
}

export function ChartCard({ title, subtitle, meta, icon, actions, titleAlign = "left", children }: ChartCardProps) {
  const alignRight = titleAlign === "right";
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1, textAlign: alignRight ? "right" : "left" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: alignRight ? "flex-end" : "flex-start"
            }}
          >
            {icon && (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: "var(--chart-icon-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {icon}
              </div>
            )}
            <h3 style={{ ...titleStyle, whiteSpace: "nowrap" }}>{title}</h3>
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: "var(--chart-subtitle)", marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
        {meta && (
          <span
            style={{
              alignSelf: "flex-start",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--chart-meta-text)",
              background: "var(--chart-meta-bg)",
              padding: "2px 6px",
              borderRadius: 999
            }}
          >
            {meta}
          </span>
        )}
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
