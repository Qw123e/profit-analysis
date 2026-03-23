import React from "react";

import { BarLineComboChart } from "@/components/charts/BarLineComboChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { WorldSalesMap } from "@/components/charts/WorldSalesMap";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";
import { numberFormat } from "@/utils/snapshotTransformers";

interface PerformanceRow {
  name: string;
  sales: number;
  operatingProfit: number;
  opm: number;
  salesRatio?: number;
}

interface CountryRow {
  name: string;
  value: number;
}

function toEokRounded(value: number): string {
  return numberFormat(Math.round(value / 100_000_000));
}

export function ChannelTab({
  channelPerformance,
  prevYearChannelPerformance,
  currentYear,
  prevYear,
  salesByCountry,
  onChannelSelect,
  onCountrySelect,
  onCountryExpand
}: {
  channelPerformance: PerformanceRow[];
  prevYearChannelPerformance?: PerformanceRow[];
  currentYear?: string;
  prevYear?: string;
  salesByCountry: CountryRow[];
  onChannelSelect?: (name: string) => void;
  onCountrySelect?: (name: string) => void;
  onCountryExpand?: () => void;
}) {
  const chartRows = channelPerformance.slice(0, 10);
  const channelRows = channelPerformance.slice(0, 14);
  const countryRows = salesByCountry;
  const totalCountrySales = countryRows.reduce((sum, row) => sum + row.value, 0);

  // Prepare previous year data for comparison
  const hasPrevYearData = prevYearChannelPerformance && prevYearChannelPerformance.length > 0 && currentYear && prevYear;
  const prevYearMap = new Map<string, PerformanceRow>();
  if (hasPrevYearData && prevYearChannelPerformance) {
    prevYearChannelPerformance.forEach(row => prevYearMap.set(row.name, row));
  }

  // Calculate KPIs
  const totalSales = channelPerformance.reduce((sum, item) => sum + item.sales, 0);
  const totalOP = channelPerformance.reduce((sum, item) => sum + item.operatingProfit, 0);
  const avg영업이익 = totalSales > 0 ? (totalOP / totalSales) * 100 : 0;
  const topChannel = channelPerformance[0];
  const channelCount = channelPerformance.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* KPI Cards */}
      <div style={{ height: 60, flexShrink: 0, display: "flex", gap: 6 }}>
        <div style={{
          flex: 1,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          padding: "10px 10px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>제품매출</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 0 }}>
              {Math.round(totalSales / 100_000_000).toLocaleString()}
              <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginLeft: 4 }}>억</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>채널수</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginTop: 0 }}>{channelCount}개</p>
          </div>
        </div>

        <div style={{
          flex: 1,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          padding: "10px 10px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>영업이익</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: totalOP >= 0 ? "#0f172a" : "#ef4444", marginTop: 0 }}>
              {Math.round(totalOP / 100_000_000).toLocaleString()}
              <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginLeft: 4 }}>억</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>영업이익</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: avg영업이익 >= 0 ? "#10b981" : "#ef4444", marginTop: 0 }}>
              {avg영업이익.toFixed(1)}%
            </p>
          </div>
        </div>

        <div style={{
          flex: 1,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          padding: "10px 12px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>TOP 채널</p>
            <p style={{
              fontSize: 14,
              fontWeight: 800,
              color: "#3b82f6",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 140,
              marginTop: 0
            }} title={topChannel?.name}>
              {topChannel?.name || "-"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>매출</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#475569", marginTop: 0 }}>
              {topChannel ? Math.round(topChannel.sales / 100_000_000).toLocaleString() : 0}억
            </p>
          </div>
        </div>

        <div style={{
          flex: 1,
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          padding: "10px 10px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>국가수</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 0 }}>
              {countryRows.length}
              <span style={{ fontSize: 10, fontWeight: 500, marginLeft: 4 }}>개</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>국가매출</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", marginTop: 0 }}>
              {Math.round(totalCountrySales / 100_000_000).toLocaleString()}억
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "2fr 1fr", minHeight: 260 }}>
        <BarLineComboChart
          title="채널별 매출 & 영업이익 (Top 10)"
          categories={chartRows.map((item) => item.name)}
          barSeries={
            hasPrevYearData
              ? [
                  {
                    name: `${prevYear}년 매출`,
                    values: chartRows.map((item) => prevYearMap.get(item.name)?.sales ?? 0),
                    color: "#cbd5e1",
                    hoverPrefix: `${prevYear}년 매출: `
                  },
                  {
                    name: `${currentYear}년 매출`,
                    values: chartRows.map((item) => item.sales),
                    color: "#3b82f6",
                    hoverPrefix: `${currentYear}년 매출: `
                  }
                ]
              : {
                  name: "매출(억원)",
                  values: chartRows.map((item) => item.sales),
                  color: "#3b82f6",
                  hoverPrefix: "매출: "
                }
          }
          scatterSeries={{
            name: "영업이익",
            values: chartRows.map((item) => item.operatingProfit),
            color: "#10b981",
            hoverPrefix: "영업이익: "
          }}
          prevYearScatterSeries={
            hasPrevYearData
              ? {
                  name: "영업이익",
                  values: chartRows.map((item) => prevYearMap.get(item.name)?.operatingProfit ?? 0),
                  color: "#86efac",
                  hoverPrefix: `${prevYear}년 영업이익: `
                }
              : undefined
          }
          currentYear={currentYear}
          prevYear={prevYear}
          height={260}
          showBarLabels={false}
          showLineLabels={false}
          showAxisTicks={true}
        />
        <DonutChart
          title="채널별 매출 비중"
          data={chartRows.map((item) => ({ name: item.name, value: item.sales }))}
          maxSlices={10}
          showPercentText
          height={210}
          onSelect={(name) => onChannelSelect?.(name)}
        />
      </div>

      <div style={{ height: 306, display: "flex", gap: 12, flexShrink: 0 }}>
        {/* Detail Table */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={titleStyle}>채널별 실적</h3>
              <span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "4px 8px", borderRadius: 8 }}>단위: 억원, %</span>
            </div>
            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <th style={{ padding: "8px", textAlign: "left", fontWeight: 600, color: "#0f172a" }}>채널</th>
                    <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>매출(억)</th>
                    <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>영업이익(억)</th>
                    <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>영업이익(%)</th>
                    <th style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>매출비중(%)</th>
                  </tr>
                </thead>
                <tbody>
                  {channelRows.map((row) => (
                    <tr
                      key={row.name}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: onChannelSelect ? "pointer" : "default" }}
                      onClick={() => onChannelSelect?.(row.name)}
                    >
                      <td style={{ padding: "8px", color: "#2563eb", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 2 }}>{row.name}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#0f172a" }}>{toEokRounded(row.sales)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: row.operatingProfit >= 0 ? "#0f172a" : "#dc2626" }}>{toEokRounded(row.operatingProfit)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: row.opm >= 0 ? "#64748b" : "#dc2626" }}>{row.opm.toFixed(1)}</td>
                      <td style={{ padding: "8px", textAlign: "right", color: "#64748b" }}>
                        {(typeof row.salesRatio === "number" ? row.salesRatio : 0).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* World Map */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <WorldSalesMap
            data={countryRows.map((item) => ({ name: item.name, value: item.value }))}
            title="국가별 매출 분포"
            onCountryClick={onCountrySelect}
            onExpand={onCountryExpand}
          />
        </div>
      </div>
    </div>
  );
}
