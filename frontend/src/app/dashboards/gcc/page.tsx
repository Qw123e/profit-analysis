"use client";

export const dynamic = 'force-dynamic';

// ============================================
// 1. IMPORTS
// All external dependencies and internal modules
// - React hooks and Next.js utilities
// - UI components (molecules/atoms)
// - Services, utilities, types
// ============================================
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

import { dashboardService } from "@/services/dashboardService";
import { DataTable } from "@/components/molecules/DataTable";
import { ErrorBoundary } from "@/components/molecules/ErrorBoundary";
import { TabButton } from "@/components/molecules/TabButton";
import { DashboardHeader } from "@/components/molecules/DashboardHeader";
import { LoadingSpinner } from "@/components/atoms/LoadingSpinner";
import { numberFormat } from "@/utils/snapshotTransformers";
import { cardStyle, mainContainerStyle } from "@/utils/dashboardStyles";
import { theme } from "@/utils/theme";
import type { GccAggregatedDataResponse } from "@/types/snapshot";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ChartCard } from "@/components/molecules/ChartCard";

// ============================================
// 2. TYPES (Dashboard-specific)
// Interface and type definitions unique to this dashboard
// - CategorySeries: Data structure for time-series comparison
// - SummaryBlock: Structure for summary statistics display
// - Tab types: GccTab (main tabs), LabTab (sub-tabs)
// ============================================
interface CategorySeries {
  key: string;
  label: string;
  prevMonth: number;
  currMonth: number;
  prevYtd: number;
  currYtd: number;
  monthGrowth: number;
  ytdGrowth: number;
}

interface SummaryBlock {
  title: string;
  totalText: string;
  deltaText: string;
  highlightUp: string;
  highlightDown: string;
  deltaIsUp: boolean;
}

type GccTab = "summary" | "research";

// ============================================
// 3. UTILS (Dashboard-specific)
// Helper functions and constants for data formatting and computation
// - Tab-to-section mapping
// - Style constants (chart layout, etc.)
// - Format functions (formatPercent, formatEok, formatCount)
// - Business logic helpers (buildHighlights, buildSummary)
// ============================================
const SECTION_BY_TAB: Record<GccTab, string[]> = {
  summary: ["summary2"],
  research: ["research"]
};

const sectionGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))"
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatSignedPercent = (value: number) => {
  const sign = value >= 0 ? "▲" : "▼";
  return `${sign}${Math.abs(Math.round(value))}%`;
};

const formatEok = (value: number) => `${numberFormat(Number((value / 1e8).toFixed(1)))}억`;

const formatCount = (value: number) => `${numberFormat(Math.round(value))}건`;

const buildHighlights = (series: CategorySeries[]) => {
  const monthSorted = [...series].filter((s) => s.prevMonth > 0).sort((a, b) => b.monthGrowth - a.monthGrowth);
  const up = monthSorted.slice(0, 2).map((s) => `${s.label}${formatSignedPercent(s.monthGrowth)}`).join(", ");
  const down = monthSorted
    .slice(-2)
    .reverse()
    .map((s) => `${s.label}${formatSignedPercent(s.monthGrowth)}`)
    .join(", ");
  return { up, down };
};

const buildSummary = (
  title: string,
  totalCurr: number,
  totalPrev: number,
  unitFormatter: (value: number) => string,
  highlight: { up: string; down: string },
  year: number,
  month: number
): SummaryBlock => {
  const delta = totalCurr - totalPrev;
  const deltaRate = totalPrev > 0 ? (delta / totalPrev) * 100 : 0;
  const totalText = `${year}년 ${month}월 ${title} ${unitFormatter(totalCurr)}`;
  const deltaText = `전년 동기 대비 ${unitFormatter(Math.abs(delta))} ${delta >= 0 ? "증가" : "감소"} (${formatSignedPercent(deltaRate)})`;
  return {
    title,
    totalText,
    deltaText,
    highlightUp: highlight.up,
    highlightDown: highlight.down,
    deltaIsUp: delta >= 0
  };
};

// ============================================
// 4. MAIN COMPONENT
// Primary dashboard component with full lifecycle management
// Structure:
//   4.1. State Management - React state and URL params
//   4.2. Data Fetching - SWR hooks for backend data
//   4.3. Event Handlers - User interaction handlers
//   4.4. Loading/Error States - Conditional rendering
//   4.5. Render - JSX layout with tabs, filters, and charts
// ============================================
export default function GccDashboardPage() {
  // --- 4.1. State Management ---
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<GccTab>("summary");
  const [selectedCompid, setSelectedCompid] = useState<string | undefined>(undefined);
  const [summary2BaseMonth, setSummary2BaseMonth] = useState<string>("2025-08");

  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const date = dateParam && dateParam !== "YYYY-MM-DD" ? dateParam : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 4.2. Data Fetching ---
  const basePayload = useMemo(
    () => ({
      compid: selectedCompid,
      summary2_month: summary2BaseMonth
    }),
    [selectedCompid, summary2BaseMonth]
  );

  const activeSections = useMemo(() => {
    return SECTION_BY_TAB[activeTab];
  }, [activeTab]);

  const aggPayload = useMemo(
    () => ({
      ...basePayload,
      sections: activeSections ?? undefined
    }),
    [basePayload, activeSections]
  );

  const { data: aggData, error, isLoading } = useSWR(
    activeSections ? ["gccAggregated", aggPayload] : null,
    () => dashboardService.getGccAggregatedData(aggPayload),
    { revalidateOnFocus: false }
  );

  const [lastAggData, setLastAggData] = useState<GccAggregatedDataResponse | null>(null);

  useEffect(() => {
    if (aggData) {
      setLastAggData(aggData);
    }
  }, [aggData]);

  const metaData = aggData ?? lastAggData;
  const tabData = aggData ?? null;

  // Period options are auto-populated from backend data
  // No manual logging needed - use React DevTools to inspect state

  const monthOptions = metaData?.filterOptions?.periods ?? [];
  const compidOptions = metaData?.filterOptions?.compids ?? [];
  const summary2MonthOptions = monthOptions.includes(summary2BaseMonth)
    ? monthOptions
    : [...monthOptions, summary2BaseMonth].filter(Boolean).sort();

  const [latestYear, latestMonthNum] = (metaData?.latestMonth ?? "").split("-");
  const latestYearNum = Number(latestYear);
  const latestMonthNumInt = Number(latestMonthNum);
  const latestLabel =
    Number.isFinite(latestYearNum) && Number.isFinite(latestMonthNumInt) && latestYearNum > 0 && latestMonthNumInt > 0
      ? { year: latestYearNum, month: latestMonthNumInt }
      : null;
  const prevMonthLabel = latestLabel ? `${latestLabel.year - 1}년 ${latestLabel.month}월` : "전년 동월";
  const currMonthLabel = latestLabel ? `${latestLabel.year}년 ${latestLabel.month}월` : "당월";
  const prevYtdLabel = latestLabel ? `${latestLabel.year - 1}년 누적` : "전년 누적";
  const currYtdLabel = latestLabel ? `${latestLabel.year}년 누적` : "당해 누적";
  const prevYearLabel = latestLabel ? `${latestLabel.year - 1}년` : "전년";
  const currYearLabel = latestLabel ? `${latestLabel.year}년` : "당해";

  const salesSeries = tabData?.summarySales ?? [];
  const firstInSeries = tabData?.summaryFirstIn ?? [];
  const requestSeries = tabData?.summaryRequest ?? [];
  const strategicSeries = tabData?.strategicSales ?? [];
  const firstInScMu = tabData?.summaryScMuFirstIn;
  const requestScMu = tabData?.summaryScMuRequest;
  const adoptionRates = tabData?.adoptionRates ?? [];
  const adoptionMonthly = tabData?.adoptionMonthly ?? [];

  const salesSummary = useMemo(() => {
    if (!latestYearNum || !latestMonthNumInt || salesSeries.length === 0) return null;
    const totalPrev = salesSeries.reduce((sum, s) => sum + s.prevMonth, 0);
    const totalCurr = salesSeries.reduce((sum, s) => sum + s.currMonth, 0);
    const highlight = buildHighlights(salesSeries);
    return buildSummary(
      "제품 매출",
      totalCurr,
      totalPrev,
      formatEok,
      highlight,
      latestYearNum,
      latestMonthNumInt
    );
  }, [latestYearNum, latestMonthNumInt, salesSeries]);

  const firstInSummary = useMemo(() => {
    if (!latestYearNum || !latestMonthNumInt || firstInSeries.length === 0) return null;
    const totalPrev = firstInSeries.reduce((sum, s) => sum + s.prevMonth, 0);
    const totalCurr = firstInSeries.reduce((sum, s) => sum + s.currMonth, 0);
    const highlight = buildHighlights(firstInSeries);
    return buildSummary(
      "초도 건수",
      totalCurr,
      totalPrev,
      formatCount,
      highlight,
      latestYearNum,
      latestMonthNumInt
    );
  }, [latestYearNum, latestMonthNumInt, firstInSeries]);

  const requestSummary = useMemo(() => {
    if (!latestYearNum || !latestMonthNumInt || requestSeries.length === 0) return null;
    const totalPrev = requestSeries.reduce((sum, s) => sum + s.prevMonth, 0);
    const totalCurr = requestSeries.reduce((sum, s) => sum + s.currMonth, 0);
    const highlight = buildHighlights(requestSeries);
    return buildSummary(
      "의뢰 건수",
      totalCurr,
      totalPrev,
      formatCount,
      highlight,
      latestYearNum,
      latestMonthNumInt
    );
  }, [latestYearNum, latestMonthNumInt, requestSeries]);

  const [rawPage, setRawPage] = useState(0);
  const rawPageSize = 50;

  useEffect(() => {
    if (monthOptions.length > 0 && !summary2BaseMonth) {
      setSummary2BaseMonth(monthOptions[monthOptions.length - 1]);
    }
  }, [monthOptions, summary2BaseMonth]);

  const summary2Month = tabData?.summary2Month ?? summary2BaseMonth ?? "2025-08";
  const [summary2YearRaw, summary2MonthRaw] = summary2Month.split("-");
  const summary2Year = Number(summary2YearRaw);
  const summary2MonthNum = Number(summary2MonthRaw);
  const summary2PrevLabel = summary2Year ? `${summary2Year - 1}년 ${summary2MonthNum}월` : "전년 동월";
  const summary2CurrLabel = summary2Year ? `${summary2Year}년 ${summary2MonthNum}월` : "당월";
  const summary2PrevYtdLabel = summary2Year ? `${summary2Year - 1}년 누적` : "전년 누적";
  const summary2CurrYtdLabel = summary2Year ? `${summary2Year}년 누적` : "당해 누적";
  const summary2PrevYearLabel = summary2Year ? `${summary2Year - 1}년` : "전년";
  const summary2CurrYearLabel = summary2Year ? `${summary2Year}년` : "당해";

  const summary2SalesSeries = tabData?.summary2Sales ?? [];
  const summary2FirstInSeries = tabData?.summary2FirstIn ?? [];
  const summary2RequestSeries = tabData?.summary2Request ?? [];
  const summary2StrategicSales = tabData?.summary2StrategicSales ?? [];
  const summary2ScMuFirstIn = tabData?.summary2ScMuFirstIn;
  const summary2ScMuRequest = tabData?.summary2ScMuRequest;
  const summary2AdoptionRates = tabData?.summary2AdoptionRates ?? [];
  const summary2RequestTotal = tabData?.summary2RequestTotal ?? 0;
  const summary2ConfirmTotal = tabData?.summary2ConfirmTotal ?? 0;
  const summary2AdoptionRate =
    summary2RequestTotal > 0 ? Math.round((summary2ConfirmTotal / summary2RequestTotal) * 100) : 0;
  const summary2HasData =
    summary2SalesSeries.length > 0 || summary2FirstInSeries.length > 0 || summary2RequestSeries.length > 0;
  const hasFilteredData = activeTab === "summary" ? summary2HasData : metaData?.hasData ?? false;

  const summary2SalesSummary = useMemo(() => {
    if (!summary2Year || !summary2MonthNum || summary2SalesSeries.length === 0) return null;
    const totalPrev = summary2SalesSeries.reduce((sum, s) => sum + s.prevMonth, 0);
    const totalCurr = summary2SalesSeries.reduce((sum, s) => sum + s.currMonth, 0);
    const highlight = buildHighlights(summary2SalesSeries);
    return buildSummary(
      "제품 매출",
      totalCurr,
      totalPrev,
      formatEok,
      highlight,
      summary2Year,
      summary2MonthNum
    );
  }, [summary2Year, summary2MonthNum, summary2SalesSeries]);

  const summary2FirstInSummary = useMemo(() => {
    if (!summary2Year || !summary2MonthNum || summary2FirstInSeries.length === 0) return null;
    const totalPrev = summary2FirstInSeries.reduce((sum, s) => sum + s.prevMonth, 0);
    const totalCurr = summary2FirstInSeries.reduce((sum, s) => sum + s.currMonth, 0);
    const highlight = buildHighlights(summary2FirstInSeries);
    return buildSummary(
      "초도 건수",
      totalCurr,
      totalPrev,
      formatCount,
      highlight,
      summary2Year,
      summary2MonthNum
    );
  }, [summary2Year, summary2MonthNum, summary2FirstInSeries]);

  const summary2RequestSummary = useMemo(() => {
    if (!summary2Year || !summary2MonthNum || summary2RequestSeries.length === 0) return null;
    const totalPrev = summary2RequestSeries.reduce((sum, s) => sum + s.prevMonth, 0);
    const totalCurr = summary2RequestSeries.reduce((sum, s) => sum + s.currMonth, 0);
    const highlight = buildHighlights(summary2RequestSeries);
    return buildSummary(
      "의뢰 건수",
      totalCurr,
      totalPrev,
      formatCount,
      highlight,
      summary2Year,
      summary2MonthNum
    );
  }, [summary2Year, summary2MonthNum, summary2RequestSeries]);
  // --- 4.3. Loading/Error States ---
  if (!mounted) {
    return (
      <main style={mainContainerStyle}>
        <LoadingSpinner message="초기화 중..." />
      </main>
    );
  }

  if (isLoading && !metaData) {
    return (
      <main style={mainContainerStyle}>
        <LoadingSpinner message="스냅샷 불러오는 중..." />
      </main>
    );
  }

  if (error && !metaData) {
    const isForbidden = error.message.includes("403");
    return (
      <main style={mainContainerStyle}>
        {isForbidden ? "Access denied. You do not have permission." : "Failed to load snapshot"}
      </main>
    );
  }

  if (!metaData) {
    return (
      <main style={mainContainerStyle}>
        데이터가 없습니다. 스냅샷을 먼저 업로드해 주세요.
      </main>
    );
  }

  // --- 4.4. Render ---
  const filterLabelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 6 };
  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#334155",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease"
  };

  return (
    <main style={mainContainerStyle}>
      <ErrorBoundary>
        <DashboardHeader
          title="GCC Dashboard"
          subtitle={`sales: ${metaData?.salesSnapshotDate || "N/A"} · other: ${metaData?.otherSnapshotDate || "N/A"}`}
        />

        <div
          style={{
            background: "#ffffff",
            borderRadius: 12,
            padding: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
            marginBottom: 16
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px solid #e2e8f0"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                stroke="#2563eb"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#334155" }}>분석 조건 (Filter)</h3>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))" }}>
            <div>
              <div style={filterLabelStyle}>법인</div>
              <select
                value={selectedCompid ?? ""}
                onChange={(e) => setSelectedCompid(e.target.value || undefined)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.25)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
                style={selectStyle}
              >
                <option value="">전체</option>
                {compidOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={filterLabelStyle}>기준월</div>
              <select
                value={summary2BaseMonth}
                onChange={(e) => setSummary2BaseMonth(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.25)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
                style={selectStyle}
              >
                {summary2MonthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedCompid(undefined);
                  setSummary2BaseMonth(summary2MonthOptions[summary2MonthOptions.length - 1] || "2025-08");
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#f1f5f9",
                  color: "#334155",
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        {!hasFilteredData && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 8,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontSize: 13
            }}
          >
            선택한 조건에 데이터가 없습니다. 필터를 조정해 주세요.
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <TabButton active={activeTab === "summary"} onClick={() => setActiveTab("summary")} label="요약" />
          <TabButton active={activeTab === "research"} onClick={() => setActiveTab("research")} label="연구경영" />
        </div>



        {activeTab === "summary" && (
          <div style={{ display: "grid", gap: 24 }}>
            {/* 매출 현황 */}
            <section style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>R&I Unit</div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>R&I 제품 매출 현황</h2>
              </div>
              {summary2SalesSummary && (
                <div style={{ fontSize: 16 }}>
                  <div style={{ fontWeight: 600 }}>{summary2SalesSummary.totalText}</div>
                  <div style={{ color: summary2SalesSummary.deltaIsUp ? theme.green : theme.red }}>
                    {summary2SalesSummary.deltaText}
                  </div>
                  <ul style={{ margin: "8px 0 0 18px", color: "#475569" }}>
                    <li>증가 Top: {summary2SalesSummary.highlightUp || "데이터 없음"}</li>
                    <li>감소 Top: {summary2SalesSummary.highlightDown || "데이터 없음"}</li>
                  </ul>
                </div>
              )}
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 0.85fr)", alignItems: "stretch" }}>
                <ChartCard
                  title={`전년 동월 대비 (${summary2MonthNum || "-"}월)`}
                  meta="억"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19h16M7 16V9M12 16V5M17 16v-3" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <ComparisonComboChart
                    data={summary2SalesSeries.map((s) => ({
                      label: s.label,
                      prevMonth: s.prevMonth / 1e8,
                      currMonth: s.currMonth / 1e8,
                      prevYtd: s.prevYtd / 1e8,
                      currYtd: s.currYtd / 1e8
                    }))}
                    prevMonthLabel={summary2PrevLabel}
                    currMonthLabel={summary2CurrLabel}
                    prevYtdLabel={summary2PrevYtdLabel}
                    currYtdLabel={summary2CurrYtdLabel}
                    valueUnit="억"
                  />
                </ChartCard>
                <ChartCard
                  title="전략 제품 매출 (당월)"
                  meta="억"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19h16M6 16l4-8 4 5 4-9" stroke="#1d4ed8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  <StrategicSalesBarChart
                    data={summary2StrategicSales.map((item) => ({
                      label: item.label === "베이스메이크업" ? "베이스" : item.label,
                      prev: Number((item.prev / 1e8).toFixed(1)),
                      curr: Number((item.curr / 1e8).toFixed(1))
                    }))}
                    prevLabel={summary2PrevLabel}
                    currLabel={summary2CurrLabel}
                    valueUnit="억"
                  />
                </ChartCard>
              </div>
              <ChartCard title="성장률">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>구분</th>
                      {summary2SalesSeries.map((s) => (
                        <th key={s.key} style={{ padding: 8, textAlign: "right" }}>
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: 8, fontWeight: 600 }}>{summary2CurrLabel} (전년 동월 대비)</td>
                      {summary2SalesSeries.map((s) => (
                        <td
                          key={s.key}
                          style={{
                            padding: 8,
                            textAlign: "right",
                            color: s.monthGrowth < 0 ? theme.red : theme.green
                          }}
                        >
                          {formatPercent(s.monthGrowth)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 8, fontWeight: 600 }}>{summary2CurrYtdLabel} (전년 누적 대비)</td>
                      {summary2SalesSeries.map((s) => (
                        <td
                          key={s.key}
                          style={{
                            padding: 8,
                            textAlign: "right",
                            color: s.ytdGrowth < 0 ? theme.red : theme.green
                          }}
                        >
                          {formatPercent(s.ytdGrowth)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </ChartCard>
            </section>

            {/* 초도 생산 현황 */}
            <section style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>R&I Unit</div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>초도생산 현황</h2>
              </div>
              {summary2FirstInSummary && (
                <div style={{ fontSize: 16 }}>
                  <div style={{ fontWeight: 600 }}>{summary2FirstInSummary.totalText}</div>
                  <div style={{ color: summary2FirstInSummary.deltaIsUp ? theme.green : theme.red }}>
                    {summary2FirstInSummary.deltaText}
                  </div>
                  <ul style={{ margin: "8px 0 0 18px", color: "#475569" }}>
                    <li>증가 Top: {summary2FirstInSummary.highlightUp || "데이터 없음"}</li>
                    <li>감소 Top: {summary2FirstInSummary.highlightDown || "데이터 없음"}</li>
                  </ul>
                </div>
              )}
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
                <ChartCard
                  title={`전년 동월 대비 (${summary2MonthNum || "-"}월)`}
                  meta="건"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19h16M7 16V9M12 16V5M17 16v-3" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <ComparisonComboChart
                    data={summary2FirstInSeries.map((s) => ({
                      label: s.label,
                      prevMonth: s.prevMonth,
                      currMonth: s.currMonth,
                      prevYtd: s.prevYtd,
                      currYtd: s.currYtd
                    }))}
                    prevMonthLabel={summary2PrevLabel}
                    currMonthLabel={summary2CurrLabel}
                    prevYtdLabel={summary2PrevYtdLabel}
                    currYtdLabel={summary2CurrYtdLabel}
                    valueUnit="건"
                  />
                </ChartCard>
                <ChartCard
                  title="SC/MU 누적 초도건수"
                  meta="건"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 19V9M12 19V5M19 19V12" stroke="#1d4ed8" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <SimpleGroupedBarChart
                    data={[
                      { label: "SC", prev: summary2ScMuFirstIn?.prev.sc ?? 0, curr: summary2ScMuFirstIn?.curr.sc ?? 0 },
                      { label: "MU", prev: summary2ScMuFirstIn?.prev.mu ?? 0, curr: summary2ScMuFirstIn?.curr.mu ?? 0 }
                    ]}
                    prevLabel={summary2PrevYearLabel}
                    currLabel={summary2CurrYearLabel}
                    valueUnit="건"
                  />
                </ChartCard>
              </div>
              <ChartCard title="성장률">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>구분</th>
                      {summary2FirstInSeries.map((s) => (
                        <th key={s.key} style={{ padding: 8, textAlign: "right" }}>
                          {s.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: 8, fontWeight: 600 }}>{summary2CurrLabel} (전년 동월 대비)</td>
                      {summary2FirstInSeries.map((s) => (
                        <td
                          key={s.key}
                          style={{
                            padding: 8,
                            textAlign: "right",
                            color: s.monthGrowth < 0 ? theme.red : theme.green
                          }}
                        >
                          {formatPercent(s.monthGrowth)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: 8, fontWeight: 600 }}>{summary2CurrYtdLabel} (전년 누적 대비)</td>
                      {summary2FirstInSeries.map((s) => (
                        <td
                          key={s.key}
                          style={{
                            padding: 8,
                            textAlign: "right",
                            color: s.ytdGrowth < 0 ? theme.red : theme.green
                          }}
                        >
                          {formatPercent(s.ytdGrowth)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </ChartCard>
            </section>

            {/* 신제품 의뢰 및 채택률 */}
            <section style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748b" }}>R&I Unit</div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>신제품 의뢰 및 채택률 현황</h2>
              </div>
              {summary2RequestSummary && (
                <div style={{ fontSize: 16 }}>
                  <div style={{ fontWeight: 600 }}>{summary2RequestSummary.totalText}</div>
                  <div style={{ color: summary2RequestSummary.deltaIsUp ? theme.green : theme.red }}>
                    {summary2RequestSummary.deltaText}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#475569" }}>
                    채택률(의뢰/확정): {summary2AdoptionRate}%
                  </div>
                  <ul style={{ margin: "8px 0 0 18px", color: "#475569" }}>
                    <li>증가 Top: {summary2RequestSummary.highlightUp || "데이터 없음"}</li>
                    <li>감소 Top: {summary2RequestSummary.highlightDown || "데이터 없음"}</li>
                  </ul>
                </div>
              )}
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
                <ChartCard
                  title={`전년 동월 대비 (의뢰 건수, ${summary2MonthNum || "-"}월)`}
                  meta="건"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19h16M7 16V9M12 16V5M17 16v-3" stroke="#2563eb" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <ComparisonComboChart
                    data={summary2RequestSeries.map((s) => ({
                      label: s.label,
                      prevMonth: s.prevMonth,
                      currMonth: s.currMonth,
                      prevYtd: s.prevYtd,
                      currYtd: s.currYtd
                    }))}
                    prevMonthLabel={summary2PrevLabel}
                    currMonthLabel={summary2CurrLabel}
                    prevYtdLabel={summary2PrevYtdLabel}
                    currYtdLabel={summary2CurrYtdLabel}
                    valueUnit="건"
                  />
                </ChartCard>
                <ChartCard
                  title="SC/MU 누적 의뢰건수"
                  meta="건"
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M5 19V9M12 19V5M19 19V12" stroke="#1d4ed8" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  }
                >
                  <SimpleGroupedBarChart
                    data={[
                      { label: "SC", prev: summary2ScMuRequest?.prev.sc ?? 0, curr: summary2ScMuRequest?.curr.sc ?? 0 },
                      { label: "MU", prev: summary2ScMuRequest?.prev.mu ?? 0, curr: summary2ScMuRequest?.curr.mu ?? 0 }
                    ]}
                    prevLabel={summary2PrevYearLabel}
                    currLabel={summary2CurrYearLabel}
                    valueUnit="건"
                  />
                </ChartCard>
              </div>
              <ChartCard title="채택률 (의뢰 / 확정)">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>구분</th>
                      {summary2AdoptionRates?.map((item) => (
                        <th key={item.label} style={{ padding: 8, textAlign: "right" }}>
                          {item.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: 8, fontWeight: 600 }}>채택률</td>
                      {summary2AdoptionRates?.map((item) => (
                        <td key={item.label} style={{ padding: 8, textAlign: "right" }}>
                          {formatPercent(item.rate)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </ChartCard>
            </section>
          </div>
        )}

        {activeTab === "research" && aggData?.researchKpis && (
          <div style={{ display: "grid", gap: 24 }}>
            {/* Top section: KPI cards (left) + Monthly Trend (right) */}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24 }}>
              {/* Left: KPI Cards (vertical) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 320 }}>
                <ResearchKpiCard
                  title="신제품 의뢰"
                  value={aggData.researchKpis.request_count}
                  unit="건"
                  yoyChange={aggData.researchKpis.request_yoy}
                  momChange={aggData.researchKpis.request_mom}
                />
                <ResearchKpiCard
                  title="처방확정"
                  value={aggData.researchKpis.confirm_count}
                  unit="건"
                  yoyChange={aggData.researchKpis.confirm_yoy}
                  momChange={aggData.researchKpis.confirm_mom}
                />
                <ResearchKpiCard
                  title="채택률"
                  value={aggData.researchKpis.adoption_rate}
                  unit="%"
                  yoyChange={aggData.researchKpis.adoption_yoy}
                  momChange={aggData.researchKpis.adoption_mom}
                  avgValue={aggData.researchKpis.avg_adoption_rate}
                />
              </div>

              {/* Right: Monthly Trend Chart */}
              <ChartCard title="월별 추이">
                <ResearchMonthlyTrendChart data={aggData.researchMonthly} />
              </ChartCard>
            </div>

            {/* Bottom section: Category Comparison Chart (full width) */}
            <ChartCard title="유형별 신제품의뢰">
              <ResearchCategoryComparisonChart data={aggData.researchCategoryComparison} />
            </ChartCard>
          </div>
        )}

      </ErrorBoundary>
    </main>
  );
}

type ComparisonPoint = {
  label: string;
  prevMonth: number;
  currMonth: number;
  prevYtd: number;
  currYtd: number;
};

const GCC_BAR_BLUE = "#2b4d89";

function ComparisonComboChart({
  data,
  prevMonthLabel,
  currMonthLabel,
  prevYtdLabel,
  currYtdLabel,
  height = 360,
  valueUnit = "억"
}: {
  data: ComparisonPoint[];
  prevMonthLabel: string;
  currMonthLabel: string;
  prevYtdLabel: string;
  currYtdLabel: string;
  height?: number;
  valueUnit?: "억" | "건";
}) {
  const formatValueLabel = (value: number) =>
    valueUnit === "건" ? `${Math.round(value)}건` : `${Math.round(value)}억`;
  const formatValueWithRaw = (value: number) =>
    valueUnit === "건"
      ? `${Math.round(value).toLocaleString()}건`
      : `${Math.round(value).toLocaleString()}억 (${Math.round(value).toLocaleString()})`;

  // Filter out negative values and ensure all data points are >= 0
  const cleanData = data.map(d => ({
    ...d,
    prevMonth: Math.max(0, d.prevMonth),
    currMonth: Math.max(0, d.currMonth),
    prevYtd: Math.max(0, d.prevYtd),
    currYtd: Math.max(0, d.currYtd)
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={cleanData} margin={{ top: 56, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} domain={[0, 'auto']} allowDataOverflow={false} />
          <Tooltip
            formatter={(value: number, name: string) => [formatValueWithRaw(Number(value)), name]}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
          />
          <Legend
            verticalAlign="top"
            align="left"
            wrapperStyle={{ fontSize: 11, color: "#64748b", paddingBottom: 12, top: -10 }}
            formatter={(value, entry) => (
              <span style={{ color: entry?.color ?? "#64748b" }}>{value}</span>
            )}
          />
          <Bar dataKey="prevMonth" name={prevMonthLabel} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={16}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={11} />
          </Bar>
          <Bar dataKey="currMonth" name={currMonthLabel} fill={GCC_BAR_BLUE} radius={[4, 4, 0, 0]} barSize={16}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={11} />
          </Bar>
          <Line dataKey="prevYtd" name={prevYtdLabel} stroke="#94a3b8" strokeWidth={2} dot={{ r: 2 }}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={10} />
          </Line>
          <Line dataKey="currYtd" name={currYtdLabel} stroke={GCC_BAR_BLUE} strokeWidth={2} dot={{ r: 2 }}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={10} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleGroupedBarChart({
  data,
  prevLabel,
  currLabel,
  height = 360,
  valueUnit = "억"
}: {
  data: Array<{ label: string; prev: number; curr: number }>;
  prevLabel: string;
  currLabel: string;
  height?: number;
  valueUnit?: "억" | "건";
}) {
  const formatValueLabel = (value: number) =>
    valueUnit === "건" ? `${Math.round(value)}건` : `${Math.round(value)}억`;
  const formatValueWithRaw = (value: number) =>
    valueUnit === "건"
      ? `${Math.round(value).toLocaleString()}건`
      : `${Math.round(value).toLocaleString()}억 (${Math.round(value).toLocaleString()})`;

  // Filter out negative values
  const cleanData = data.map(d => ({
    ...d,
    prev: Math.max(0, d.prev),
    curr: Math.max(0, d.curr)
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={cleanData} margin={{ top: 56, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} domain={[0, 'auto']} allowDataOverflow={false} />
          <Tooltip
            formatter={(value: number, name: string) => [formatValueWithRaw(Number(value)), name]}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
          />
          <Legend
            verticalAlign="top"
            align="left"
            wrapperStyle={{ fontSize: 11, color: "#64748b", paddingBottom: 12, top: -10 }}
            formatter={(value, entry) => (
              <span style={{ color: entry?.color ?? "#64748b" }}>{value}</span>
            )}
          />
          <Bar dataKey="prev" name={prevLabel} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={16}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={11} />
          </Bar>
          <Bar dataKey="curr" name={currLabel} fill={GCC_BAR_BLUE} radius={[4, 4, 0, 0]} barSize={16}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleLineChart({
  data,
  height = 320
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const formatPercentLabel = (value: number) => `${value}%`;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} domain={[0, 'auto']} allowDataOverflow={false} />
          <Tooltip
            formatter={(value: number) => `${Number(value).toFixed(1)}%`}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
          />
          <Line type="monotone" dataKey="value" stroke={GCC_BAR_BLUE} strokeWidth={2} dot={{ r: 3 }}>
            <LabelList position="top" formatter={formatPercentLabel} fill="#64748b" fontSize={10} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimpleBarChart({
  data,
  height = 320
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const formatEokLabel = (value: number) => `${Math.round(value)}%`;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} domain={[0, 'auto']} allowDataOverflow={false} />
          <Tooltip
            formatter={(value: number) => `${Number(value).toFixed(1)}%`}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
          />
          <Bar dataKey="value" fill={GCC_BAR_BLUE} radius={[4, 4, 0, 0]} barSize={16}>
            <LabelList position="top" formatter={formatEokLabel} fill="#64748b" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StrategicSalesBarChart({
  data,
  prevLabel,
  currLabel,
  height = 320,
  valueUnit = "억"
}: {
  data: Array<{ label: string; prev: number; curr: number }>;
  prevLabel: string;
  currLabel: string;
  height?: number;
  valueUnit?: "억" | "건";
}) {
  const formatValueLabel = (value: number) => `${value.toFixed(1)}${valueUnit}`;
  const formatTooltip = (value: number) => `${Number(value).toFixed(1)}${valueUnit}`;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 56, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatTooltip(Number(value)), name]}
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
          />
          <Legend
            verticalAlign="top"
            align="left"
            wrapperStyle={{ fontSize: 11, color: "#64748b", paddingBottom: 12, top: -10 }}
            formatter={(value, entry) => (
              <span style={{ color: entry?.color ?? "#64748b" }}>{value}</span>
            )}
          />
          <ReferenceLine y={0} stroke="#e2e8f0" />
          <Bar dataKey="prev" name={prevLabel} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={14}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={11} />
          </Bar>
          <Bar dataKey="curr" name={currLabel} fill={GCC_BAR_BLUE} radius={[4, 4, 0, 0]} barSize={14}>
            <LabelList position="top" formatter={formatValueLabel} fill="#64748b" fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================
// 5. CHART COMPONENTS (Inline)
// Note: This dashboard uses inline chart definitions within
// the main component render section instead of separate
// chart component functions. All charts use ChartCard wrapper.
// ============================================

// Research Performance Components
interface ResearchKpiCardProps {
  title: string;
  value: number;
  unit: string;
  yoyChange: number;
  momChange: number;
  avgValue?: number;
}

function ResearchKpiCard({ title, value, unit, yoyChange, momChange, avgValue }: ResearchKpiCardProps) {
  const formatChange = (val: number, isPercent: boolean = false) => {
    const sign = val >= 0 ? "▲" : "▼";
    const absVal = Math.abs(val);
    return `${sign} ${isPercent ? absVal.toFixed(1) : Math.round(absVal)}${isPercent ? "pp" : unit}`;
  };

  const isPercent = unit === "%";
  const displayValue = isPercent ? value.toFixed(1) : numberFormat(Math.round(value));

  return (
    <div
      style={{
        background: title === "처방확정" ? "#dbeafe" : title === "채택률" ? "#dbeafe" : "#f3f4f6",
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0"
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title} {displayValue}{unit}</div>
      <div style={{ fontSize: 13, color: "#475569", marginBottom: 4 }}>
        전년동기 比 <span style={{ color: yoyChange >= 0 ? theme.green : theme.red, fontWeight: 600 }}>
          {formatChange(yoyChange, isPercent)}
        </span>, 전월 比 <span style={{ color: momChange >= 0 ? theme.green : theme.red, fontWeight: 600 }}>
          {formatChange(momChange, isPercent)}
        </span>
      </div>
      {avgValue !== undefined && (
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, paddingTop: 8, borderTop: "1px solid #cbd5e1" }}>
          평균 채택률: {avgValue.toFixed(1)}% (최근 12개월)
        </div>
      )}
    </div>
  );
}

interface ResearchMonthlyTrendChartProps {
  data: { month: string; request_count: number; confirm_count: number; adoption_rate: number }[];
}

function ResearchMonthlyTrendChart({ data }: ResearchMonthlyTrendChartProps) {
  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 60, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 50]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
            formatter={(value: number, name: string) => {
              if (name === "채택률") return [`${value.toFixed(1)}%`, name];
              return [`${Math.round(value)}건`, name];
            }}
          />
          <Legend
            verticalAlign="top"
            align="left"
            wrapperStyle={{ fontSize: 11, color: "#64748b", paddingBottom: 12, top: -10 }}
          />
          <Bar yAxisId="left" dataKey="request_count" name="신제품 의뢰" fill="#cbd5e1" stackId="a" radius={[0, 0, 0, 0]}>
            <LabelList position="top" fill="#334155" fontSize={10} formatter={(val: number) => Math.round(val)} />
          </Bar>
          <Bar yAxisId="left" dataKey="confirm_count" name="처방확정" fill={GCC_BAR_BLUE} stackId="a" radius={[4, 4, 0, 0]}>
            <LabelList position="top" fill="#1e3a8a" fontSize={10} formatter={(val: number) => Math.round(val)} />
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="adoption_rate"
            name="채택률"
            stroke="#1d4ed8"
            strokeWidth={0}
            dot={{ r: 16, fill: "#1d4ed8", stroke: "#1d4ed8", strokeWidth: 2 }}
          >
            <LabelList
              position="center"
              fill="#ffffff"
              fontSize={9}
              fontWeight={600}
              formatter={(val: number) => `${val.toFixed(1)}%`}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ResearchCategoryComparisonChartProps {
  data: { category: string; prev_month: number; curr_month: number; prev_cumulative: number; curr_cumulative: number }[];
}

function ResearchCategoryComparisonChart({ data }: ResearchCategoryComparisonChartProps) {
  return (
    <div style={{ width: "100%", height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 56, right: 60, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
          <YAxis yAxisId="right" orientation="right" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
              fontSize: 12
            }}
            formatter={(value: number) => `${Math.round(value)}건`}
          />
          <Legend
            verticalAlign="top"
            align="left"
            wrapperStyle={{ fontSize: 11, color: "#64748b", paddingBottom: 12, top: -10 }}
          />
          <Bar yAxisId="left" dataKey="prev_month" name="전년 동월" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={18}>
            <LabelList position="top" fill="#64748b" fontSize={10} formatter={(val: number) => Math.round(val) || ''} />
          </Bar>
          <Bar yAxisId="left" dataKey="curr_month" name="당월" fill={GCC_BAR_BLUE} radius={[4, 4, 0, 0]} barSize={18}>
            <LabelList position="top" fill="#64748b" fontSize={10} formatter={(val: number) => Math.round(val) || ''} />
          </Bar>
          <Line yAxisId="right" type="linear" dataKey="prev_cumulative" name="전년 누적" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }}>
            <LabelList position="top" fill="#64748b" fontSize={9} formatter={(val: number) => Math.round(val)} />
          </Line>
          <Line yAxisId="right" type="linear" dataKey="curr_cumulative" name="당해 누적" stroke={GCC_BAR_BLUE} strokeWidth={2} dot={{ r: 3 }}>
            <LabelList position="top" fill="#64748b" fontSize={9} formatter={(val: number) => Math.round(val)} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
