"use client";

import React from "react";

import { BarLineComboChart } from "@/components/charts/BarLineComboChart";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";
import { buildTrendData } from "@/app/dashboards/health-function/utils/healthFunctionTransforms";

interface TrendData {
  categories: string[];
  sales: number[];
  opMargin: number[];
  salesRange: [number, number];
  marginRange: [number, number];
}

interface DetailMetrics {
  totalSales: number;
  totalOP: number;
  opMargin: number;
  byPeriod: Array<{ name: string; sales: number; op: number }>;
  channelPerformance: Array<{ name: string; sales: number }>;
  topItems: Array<{ name: string; value: number }>;
}

interface CustomerDrillDownModalProps {
  isOpen: boolean;
  entityName: string;
  entityType?: "customer" | "product";
  title?: string;
  subtitle?: string;
  topItemsTitle?: string;
  topItemsLabel?: string;
  metrics: DetailMetrics | null;
  trendData: TrendData | null;
  onClose: () => void;
  theme: { blue: string; green: string; purple: string };
}

function toEok(value: number): string {
  const eok = value / 100_000_000;
  // If less than 1억 (< 1), show 1 decimal place, otherwise show integer
  if (Math.abs(eok) < 1) {
    return eok.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return Math.round(eok).toLocaleString("ko-KR");
}

function toEokOneDecimal(value: number): string {
  return (value / 100_000_000).toLocaleString("ko-KR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function toQuarterLabel(label: string): { key: string; order: number } {
  const raw = String(label).trim();
  if (!raw) return { key: "-", order: 0 };
  if (raw.includes("Q")) {
    const match = raw.match(/(\d{4})\D*(\d)Q/i);
    if (match) {
      return { key: `${match[1]}-${match[2]}Q`, order: Number(match[1]) * 10 + Number(match[2]) };
    }
    const justQ = raw.match(/(\d)Q/i);
    if (justQ) {
      return { key: `${justQ[1]}Q`, order: Number(justQ[1]) };
    }
    return { key: raw, order: 0 };
  }
  const monthMatch = raw.match(/(\d{1,2})\s*월$/);
  if (monthMatch) {
    const month = Number(monthMatch[1]);
    const q = Math.min(4, Math.max(1, Math.ceil(month / 3)));
    return { key: `${q}Q`, order: q };
  }
  const ymMatch = raw.match(/(\d{4})\D+(\d{1,2})/);
  if (ymMatch) {
    const year = Number(ymMatch[1]);
    const month = Number(ymMatch[2]);
    const q = Math.min(4, Math.max(1, Math.ceil(month / 3)));
    return { key: `${year}-${q}Q`, order: year * 10 + q };
  }
  return { key: raw, order: 0 };
}

function aggregateToQuarter(rows: Array<{ name: string; sales: number; op: number }>) {
  const hasMonthly = rows.some((row) => /월$/.test(row.name));
  if (!hasMonthly) return rows;
  const acc = new Map<string, { sales: number; op: number; order: number }>();
  rows.forEach((row) => {
    const { key, order } = toQuarterLabel(row.name);
    const current = acc.get(key) ?? { sales: 0, op: 0, order };
    current.sales += row.sales;
    current.op += row.op;
    current.order = Math.min(current.order, order || current.order);
    acc.set(key, current);
  });
  return Array.from(acc.entries())
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, value]) => ({ name: key, sales: value.sales, op: value.op }));
}

export function CustomerDrillDownModal({
  isOpen,
  entityName,
  entityType = "customer",
  title,
  subtitle,
  topItemsTitle,
  topItemsLabel,
  metrics,
  trendData,
  onClose,
  theme,
}: CustomerDrillDownModalProps) {
  if (!isOpen) return null;

  const resolvedTitle = title ?? "네트워크 채널 상세";
  const resolvedSubtitle = subtitle ?? `${entityName} 상세 분석`;
  const resolvedTopTitle = topItemsTitle ?? `Top 5 ${entityType === "customer" ? "제품" : "고객사"}`;
  const resolvedTopLabel = topItemsLabel ?? (entityType === "customer" ? "제품" : "고객사");

  const channelTotal = (metrics?.channelPerformance ?? []).reduce((sum, row) => sum + row.sales, 0);
  const periodRows = React.useMemo(
    () => aggregateToQuarter(metrics?.byPeriod ?? []),
    [metrics?.byPeriod]
  );
  const detailTrendData = React.useMemo(() => {
    if (!metrics) return trendData;
    return buildTrendData(periodRows.map((row) => ({ name: row.name, sales: row.sales, op: row.op })));
  }, [metrics, periodRows, trendData]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.46)",
        backdropFilter: "blur(2px)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(1220px, 100%)",
          maxHeight: "90vh",
          overflow: "hidden",
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #dbe3ee",
          boxShadow: "0 24px 40px rgba(15, 23, 42, 0.22)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h3 style={{ ...titleStyle, marginBottom: 2 }}>{resolvedTitle}</h3>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>{resolvedSubtitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              color: "#64748b",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            닫기
          </button>
        </div>

        {metrics ? (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", maxHeight: "calc(90vh - 62px)" }}>
            <div style={{ borderRight: "1px solid #e2e8f0", padding: 12, overflow: "auto" }}>
              <div style={{ ...cardStyle, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>{entityName}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>매출</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{toEok(metrics.totalSales)}억</div>
                  </div>
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>영업이익</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{toEok(metrics.totalOP)}억</div>
                  </div>
                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>영업이익</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: metrics.opMargin >= 0 ? "#059669" : "#dc2626", lineHeight: 1.1 }}>{metrics.opMargin.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div style={{ ...cardStyle, padding: 12, marginBottom: 10 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 8 }}>🍊 {resolvedTopTitle}</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                      <th style={{ padding: "7px 6px", textAlign: "left", color: "#64748b", fontWeight: 700 }}>#</th>
                      <th style={{ padding: "7px 6px", textAlign: "left", color: "#64748b", fontWeight: 700 }}>{resolvedTopLabel}</th>
                      <th style={{ padding: "7px 6px", textAlign: "right", color: "#64748b", fontWeight: 700 }}>매출(억)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.topItems.slice(0, 5).map((row, idx) => (
                      <tr key={row.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "6px", color: "#94a3b8" }}>{idx + 1}</td>
                        <td style={{ padding: "6px", color: "#0f172a", maxWidth: 165, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.name}>
                          {row.name}
                        </td>
                        <td style={{ padding: "6px", textAlign: "right", color: "#334155", fontWeight: 700 }}>{toEok(row.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ ...cardStyle, padding: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 8 }}>📊 채널 구성</h4>
                <div style={{ display: "grid", gap: 9 }}>
                  {metrics.channelPerformance.slice(0, 6).map((row) => {
                    const ratio = channelTotal > 0 ? (row.sales / channelTotal) * 100 : 0;
                    return (
                      <div key={row.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#334155", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{ratio.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0" }}>
                          <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #76aaf3, #4f8fe9)", width: `${Math.max(2, ratio)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: 12, overflow: "auto", height: "100%", minHeight: 0 }}>
              <div style={{ ...cardStyle, padding: 12, marginBottom: 10, overflowX: "auto" }}>
                {detailTrendData && (
                  <div style={{ minWidth: detailTrendData.categories.length > 8 ? `${detailTrendData.categories.length * 80}px` : "100%" }}>
                    <BarLineComboChart
                      title="분기별 매출·이익 추이"
                      categories={detailTrendData.categories}
                      barSeries={{
                        name: "매출(억원)",
                        values: detailTrendData.sales,
                        color: theme.blue,
                        hoverPrefix: "매출: "
                      }}
                      showBarLabels={false}
                      showLineLabels={false}
                      showAxisTicks={true}
                      lineSeries={{
                        name: "영업이익(%)",
                        values: detailTrendData.opMargin,
                        color: theme.green,
                        hoverSuffix: "영업이익: ",
                        opValues: detailTrendData.sales.map((sales, idx) => sales * (detailTrendData.opMargin[idx] / 100))
                      }}
                      height={240}
                      y1Range={detailTrendData.salesRange}
                      y2Range={detailTrendData.marginRange}
                    />
                  </div>
                )}
              </div>

              <div style={{ ...cardStyle, padding: 12 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#334155", marginBottom: 8 }}>분기별 상세</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                      <th style={{ padding: "8px 7px", textAlign: "left", fontWeight: 700, color: "#64748b" }}>분기</th>
                      <th style={{ padding: "8px 7px", textAlign: "right", fontWeight: 700, color: "#64748b" }}>매출(억)</th>
                      <th style={{ padding: "8px 7px", textAlign: "right", fontWeight: 700, color: "#64748b" }}>영업이익(억)</th>
                      <th style={{ padding: "8px 7px", textAlign: "right", fontWeight: 700, color: "#64748b" }}>영업이익</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodRows.map((row) => {
                      const opm = row.sales > 0 ? (row.op / row.sales) * 100 : 0;
                      return (
                        <tr key={row.name} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "7px", color: "#334155", fontWeight: 600 }}>{row.name}</td>
                          <td style={{ padding: "7px", textAlign: "right", color: "#334155" }}>{toEokOneDecimal(row.sales)}</td>
                          <td style={{ padding: "7px", textAlign: "right", color: row.op >= 0 ? "#334155" : "#dc2626" }}>{toEokOneDecimal(row.op)}</td>
                          <td style={{ padding: "7px", textAlign: "right", color: opm >= 0 ? "#059669" : "#dc2626", fontWeight: 700 }}>{opm.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...cardStyle, margin: 14, padding: 18, color: "#64748b", fontSize: 12 }}>상세 데이터를 불러오는 중...</div>
        )}
      </div>
    </div>
  );
}
