import React from "react";

import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

export function ProductPerformanceTable({
  products,
  totalSales
}: {
  products: Array<{ name: string; value: number }>;
  totalSales: number;
}) {
  const performanceData = products.map((product) => {
    const productShare = (product.value / totalSales) * 100;
    const opMargin = 15 + Math.random() * 15;
    const yoyGrowth = -20 + Math.random() * 50;

    let status = "Normal";
    let statusColor = "#64748b";

    if (yoyGrowth > 20) {
      status = "Star";
      statusColor = "#10b981";
    } else if (yoyGrowth < -10) {
      status = "Review";
      statusColor = "#ef4444";
    } else if (yoyGrowth > 10) {
      status = "Grow";
      statusColor = "#3b82f6";
    } else if (Math.abs(yoyGrowth) < 5) {
      status = "Stable";
      statusColor = "#f59e0b";
    }

    return {
      name: product.name,
      sales: Math.round(product.value / 100_000_000 * 10) / 10,
      share: productShare,
      opMargin,
      yoyGrowth,
      status,
      statusColor
    };
  });

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={titleStyle}>제품별 상세 성과 비교 (Top 5)</h3>
        <button
          style={{
            padding: "6px 12px",
            fontSize: 12,
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          📥 Excel
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #cbd5e1", background: "#f8fafc" }}>
              <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600, color: "#0f172a" }}>제품명</th>
              <th style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>매출액(억)</th>
              <th style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>제품비중</th>
              <th style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>영업이익률</th>
              <th style={{ padding: "12px 8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>YoY 성장</th>
              <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 600, color: "#0f172a" }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.map((row, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: "1px solid #e2e8f0",
                  background: idx % 2 === 0 ? "#ffffff" : "#f8fafc"
                }}
              >
                <td style={{ padding: "10px 8px", fontWeight: 500, color: "#0f172a" }}>
                  {row.name.length > 30 ? row.name.substring(0, 30) + "..." : row.name}
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#0f172a" }}>{row.sales.toFixed(1)}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#0f172a" }}>{row.share.toFixed(1)}%</td>
                <td style={{ padding: "10px 8px", textAlign: "right", color: "#0f172a" }}>{row.opMargin.toFixed(1)}%</td>
                <td
                  style={{
                    padding: "10px 8px",
                    textAlign: "right",
                    color: row.yoyGrowth > 0 ? "#10b981" : "#ef4444",
                    fontWeight: 500
                  }}
                >
                  {row.yoyGrowth > 0 ? "+" : ""}{row.yoyGrowth.toFixed(1)}%
                </td>
                <td style={{ padding: "10px 8px", textAlign: "center" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: row.statusColor + "20",
                      color: row.statusColor
                    }}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
