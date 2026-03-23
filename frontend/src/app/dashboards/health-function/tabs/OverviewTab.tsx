import React from "react";

import { BarLineComboChart } from "@/components/charts/BarLineComboChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";
import { numberFormat } from "@/utils/snapshotTransformers";

interface TrendData {
  categories: string[];
  sales: number[];
  opMargin: number[];
  salesRange: [number, number];
  marginRange: [number, number];
}

interface PerformanceRow {
  name: string;
  sales: number;
  contributionProfit: number;
  operatingProfit: number;
  opm: number;
  evaluationClass: string;
}

export function OverviewTab({
  trendData,
  prevYearTrendData,
  currentYear,
  prevYear,
  customerPerformanceBySales,
  customerPerformanceByOp,
  theme,
  onCustomerSelect
}: {
  trendData: TrendData | null;
  prevYearTrendData?: TrendData | null;
  currentYear?: string;
  prevYear?: string;
  customerPerformanceBySales: PerformanceRow[];
  customerPerformanceByOp: PerformanceRow[];
  theme: { blue: string; green: string };
  onCustomerSelect: (name: string) => void;
}) {
  const [hoveredCustomer, setHoveredCustomer] = React.useState<PerformanceRow | null>(null);

  const clickableLinkStyle: React.CSSProperties = {
    color: "#2563eb",
    textDecoration: "underline",
    textUnderlineOffset: 2,
    fontWeight: 600
  };

  // Check if previous year data is available
  const hasPrevYearData = prevYearTrendData && prevYearTrendData.sales.length > 0 && currentYear && prevYear;

  // Create a map of previous year sales by period name for easy lookup
  const prevYearSalesMap = React.useMemo(() => {
    if (!hasPrevYearData || !prevYearTrendData) return new Map<string, number>();
    const map = new Map<string, number>();
    prevYearTrendData.categories.forEach((name, idx) => {
      map.set(name, prevYearTrendData.sales[idx]);
    });
    return map;
  }, [hasPrevYearData, prevYearTrendData]);

  return (
    <div style={{ display: "grid", rowGap: 60, columnGap: 8, gridTemplateColumns: "2.5fr 1fr", gridTemplateRows: "270px 340px", minHeight: 0 }}>
      {trendData ? (
        <div style={{ minHeight: 0 }}>
          <BarLineComboChart
            title="분기별 매출 및 이익률 추이"
            categories={trendData.categories}
            barSeries={
              hasPrevYearData
                ? [
                    {
                      name: `${prevYear}년 매출`,
                      values: trendData.categories.map((cat) => prevYearSalesMap.get(cat) ?? 0),
                      color: "#cbd5e1",
                      hoverPrefix: `${prevYear}년 매출: `
                    },
                    {
                      name: `${currentYear}년 매출`,
                      values: trendData.sales,
                      color: theme.blue,
                      hoverPrefix: `${currentYear}년 매출: `
                    }
                  ]
                : {
                    name: "매출(억원)",
                    values: trendData.sales,
                    color: theme.blue,
                    hoverPrefix: "매출: "
                  }
            }
            showBarLabels={false}
            showLineLabels={false}
            showAxisTicks={true}
            prevYearLineSeries={
              hasPrevYearData && prevYearTrendData
                ? {
                    name: "이익률(%)",
                    values: prevYearTrendData.opMargin,
                    color: "#9ca3af",
                    hoverSuffix: `${prevYear}년 이익률: `
                  }
                : undefined
            }
            lineSeries={{
              name: "이익률(%)",
              values: trendData.opMargin,
              color: theme.green,
              hoverSuffix: "이익률: ",
              opValues: trendData.sales.map((sales, idx) => sales * (trendData.opMargin[idx] / 100))
            }}
            currentYear={currentYear}
            prevYear={prevYear}
            height={260}
            y1Range={trendData.salesRange}
            y2Range={trendData.marginRange}
          />
        </div>
      ) : (
        <div />
      )}
      <div style={{ minHeight: 0 }}>
        <DonutChart
          title="고객사별 매출 비중"
          data={customerPerformanceBySales.slice(0, 8).map((item) => ({ name: item.name, value: item.sales }))}
          maxSlices={8}
          showPercentText
          height={250}
          onSelect={onCustomerSelect}
        />
      </div>

      <div style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={titleStyle}>고객사별 실적(Top10)</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9, color: "#64748b" }}>
            <span style={{ fontWeight: 600 }}>등급:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>Mid</span>
              <span style={{ color: "#94a3b8" }}>·</span>
              <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>Loss</span>
              <span style={{ color: "#94a3b8" }}>·</span>
              <span style={{ background: "#f3f4f6", color: "#4b5563", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>기타</span>
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, color: "#0f172a" }}>#</th>
                <th style={{ padding: "8px 6px", textAlign: "left", fontWeight: 600, color: "#0f172a" }}>고객사</th>
                <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>총매출</th>
                <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>공헌이익</th>
                <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>영업이익</th>
                <th style={{ padding: "8px 6px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>이익률</th>
                <th style={{ padding: "8px 6px", textAlign: "center", fontWeight: 600, color: "#0f172a" }}>등급</th>
              </tr>
            </thead>
            <tbody>
              {customerPerformanceBySales.slice(0, 10).map((customer, idx) => {
                const sales = customer.sales / 100_000_000;
                const contributionProfit = customer.contributionProfit / 100_000_000;
                const opValue = customer.operatingProfit / 100_000_000;
                const profitRate = customer.opm;

                // 등급별 스타일
                const getGradeStyle = (grade: string) => {
                  if (grade === 'Mid') return { background: '#dbeafe', color: '#1e40af', fontWeight: 600 };
                  if (grade === 'Loss') return { background: '#fee2e2', color: '#991b1b', fontWeight: 600 };
                  return { background: '#f3f4f6', color: '#4b5563', fontWeight: 600 };
                };

                return (
                  <tr
                    key={customer.name}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                    onClick={() => onCustomerSelect(customer.name)}
                  >
                    <td style={{ padding: "8px", color: "#64748b" }}>{idx + 1}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={clickableLinkStyle}>{customer.name}</span>
                    </td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#0f172a" }}>{numberFormat(Math.round(sales))}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#0f172a" }}>{numberFormat(Math.round(contributionProfit))}</td>
                    <td style={{ padding: "8px", textAlign: "right", color: opValue < 0 ? "#ef4444" : "#0f172a" }}>
                      {opValue < 0 ? '-' : ''}{numberFormat(Math.abs(Math.round(opValue)))}
                    </td>
                    <td style={{ padding: "8px", textAlign: "right", color: "#0f172a" }}>{profitRate.toFixed(1)}%</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        ...getGradeStyle(customer.evaluationClass)
                      }}>
                        {customer.evaluationClass}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, height: "100%", display: "flex", flexDirection: "column", position: "relative", padding: 0, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1A2332", letterSpacing: "-0.2px", margin: 0 }}>영업이익 기준</h3>
          <span style={{ fontSize: 10, color: "#A3B1BF", fontWeight: 400 }}>단위: 억원</span>
        </div>

        {/* TOP 5 Section */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #F0F2F5" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 10, display: "flex", alignItems: "center", gap: 5, color: "#16A34A" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22C55E", display: "inline-block" }}></span>
            TOP 5
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 110, overflowY: "auto", paddingRight: 4 }}>
            {customerPerformanceByOp.slice(0, 5).map((customer, idx) => {
              const opValue = Math.round(customer.operatingProfit / 100_000_000);
              const maxOp = Math.max(...customerPerformanceByOp.slice(0, 5).map(c => Math.abs(c.operatingProfit / 100_000_000)));
              const barWidth = maxOp > 0 ? Math.min(100, (Math.abs(opValue) / maxOp) * 100) : 0;

              const getRankStyle = () => {
                if (idx === 0) return { background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", color: "#B45309", border: "1px solid rgba(180,83,9,0.1)" };
                if (idx === 1) return { background: "linear-gradient(135deg, #F1F5F9, #E2E8F0)", color: "#64748B", border: "1px solid rgba(100,116,139,0.1)" };
                if (idx === 2) return { background: "linear-gradient(135deg, #FFF7ED, #FED7AA)", color: "#C2410C", border: "1px solid rgba(194,65,12,0.08)" };
                return { background: "rgba(34,197,94,0.07)", color: "#16A34A", border: "1px solid rgba(34,197,94,0.15)" };
              };

              return (
                <div
                  key={customer.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 3px",
                    borderRadius: 6,
                    transition: "background 0.2s ease",
                    cursor: "pointer"
                  }}
                  onClick={() => onCustomerSelect(customer.name)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFE"; setHoveredCustomer(customer); }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; setHoveredCustomer(null); }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, marginRight: 10, flexShrink: 0, ...getRankStyle() }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "#1A2332", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 500 }}>{customer.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ width: 50, height: 4, background: "#F1F3F5", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg, #86EFAC, #22C55E)", borderRadius: 2, width: `${barWidth}%`, transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}></div>
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 500, minWidth: 40, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, color: "#16A34A" }}>
                      {opValue}억 <span style={{ fontSize: 8 }}>▲</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM 5 Section */}
        <div style={{ padding: "12px 18px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 10, display: "flex", alignItems: "center", gap: 5, color: "#DC2626" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#EF4444", display: "inline-block" }}></span>
            BOTTOM 5
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 110, overflowY: "auto", paddingRight: 4 }}>
            {customerPerformanceByOp.slice(-5).reverse().map((customer, idx) => {
              const opValue = Math.round(customer.operatingProfit / 100_000_000);
              const maxOp = Math.max(...customerPerformanceByOp.slice(-5).map(c => Math.abs(c.operatingProfit / 100_000_000)));
              const barWidth = maxOp > 0 ? Math.min(100, (Math.abs(opValue) / maxOp) * 100) : 0;

              return (
                <div
                  key={customer.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 3px",
                    borderRadius: 6,
                    transition: "background 0.2s ease",
                    cursor: "pointer"
                  }}
                  onClick={() => onCustomerSelect(customer.name)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFE"; setHoveredCustomer(customer); }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; setHoveredCustomer(null); }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, marginRight: 10, flexShrink: 0, background: "rgba(239,68,68,0.06)", color: "#DC2626", border: "1px solid rgba(239,68,68,0.12)" }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, color: "#1A2332", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "#3B82F6", textDecoration: "none", fontWeight: 500 }}>{customer.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div style={{ width: 50, height: 4, background: "#F1F3F5", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg, #EF4444, #FCA5A5)", borderRadius: 2, width: `${barWidth}%`, transition: "width 0.8s cubic-bezier(0.22, 1, 0.36, 1)", float: "right" }}></div>
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 500, minWidth: 40, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, color: "#DC2626" }}>
                      {opValue}억 <span style={{ fontSize: 8 }}>▼</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
