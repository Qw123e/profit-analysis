import React, { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

import { BarLineComboChart } from "@/components/charts/BarLineComboChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";
import { numberFormat } from "@/utils/snapshotTransformers";

// @ts-ignore - react-plotly.js does not have type definitions
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div style={{ padding: 20, textAlign: "center" }}>Loading chart...</div>
}) as any;

interface ScatterPoint {
  name: string;
  sales: number;
  operatingProfit: number;
  opm: number;
}

interface MatrixData {
  salesThreshold: number;
  opmThreshold: number;
  points: ScatterPoint[];
  quadrants: Record<string, ScatterPoint[]>;
}

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
  topProducts: Array<{ name: string; value: number }>;
}

export function ScatterTab({
  matrixData,
  scatterQuadrant,
  onQuadrantChange,
  scatterPoints,
  analysisType,
  onAnalysisTypeChange,
  onSelectCustomer,
  selectedCustomer,
  customerDetailMetrics,
  customerDetailTrend,
  theme,
  onCloseDetail
}: {
  matrixData: MatrixData;
  scatterQuadrant: "ALL" | "HH" | "HL" | "LH" | "LL";
  onQuadrantChange: (value: "ALL" | "HH" | "HL" | "LH" | "LL") => void;
  scatterPoints: ScatterPoint[];
  analysisType: "customer" | "product";
  onAnalysisTypeChange: (type: "customer" | "product") => void;
  onSelectCustomer: (name: string) => void;
  selectedCustomer: string | null;
  customerDetailMetrics: DetailMetrics | null;
  customerDetailTrend: TrendData | null;
  theme: { blue: string; green: string; purple: string };
  onCloseDetail: () => void;
}) {
  const [baselineMode, setBaselineMode] = useState<"data" | "target" | "manual">("data");
  const [manualSalesThreshold, setManualSalesThreshold] = useState(matrixData.salesThreshold);
  const [manualOpmThreshold, setManualOpmThreshold] = useState(matrixData.opmThreshold);

  const quadrantColors: Record<"HH" | "HL" | "LH" | "LL", string> = {
    HH: "#10b981",
    HL: "#3b82f6",
    LH: "#f59e0b",
    LL: "#ef4444"
  };
  const quadrantLabels: Record<"HH" | "HL" | "LH" | "LL", string> = {
    HH: "Star",
    HL: "Niche",
    LH: "Bleeding",
    LL: "Sunset"
  };
  const quadrantDescriptions: Record<"HH" | "HL" | "LH" | "LL", string> = {
    HH: "고매출·고이익률",
    HL: "저매출·고이익률",
    LH: "고매출·저이익률",
    LL: "저매출·저이익률"
  };
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomRange, setZoomRange] = useState<{ x: [number, number] | null; y: [number, number] | null }>({ x: null, y: null });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activePoints = scatterPoints.length > 0 ? scatterPoints : matrixData.points;

  const effectiveSalesThreshold = baselineMode === "manual" ? manualSalesThreshold : matrixData.salesThreshold;
  const effectiveOpmThreshold = baselineMode === "manual" ? manualOpmThreshold : matrixData.opmThreshold;

  // Recalculate quadrants based on current thresholds - ALWAYS use matrixData.points (unfiltered)
  const recalculatedQuadrants = useMemo(() => {
    const quadrants: Record<"HH" | "HL" | "LH" | "LL", ScatterPoint[]> = {
      HH: [],
      HL: [],
      LH: [],
      LL: []
    };

    // Always use matrixData.points for quadrant calculation (unfiltered)
    matrixData.points.forEach((point) => {
      if (point.sales >= effectiveSalesThreshold && point.opm >= effectiveOpmThreshold) {
        quadrants.HH.push(point);
      } else if (point.sales < effectiveSalesThreshold && point.opm >= effectiveOpmThreshold) {
        quadrants.HL.push(point);
      } else if (point.sales >= effectiveSalesThreshold && point.opm < effectiveOpmThreshold) {
        quadrants.LH.push(point);
      } else {
        quadrants.LL.push(point);
      }
    });

    return quadrants;
  }, [matrixData.points, effectiveSalesThreshold, effectiveOpmThreshold]);

  // Calculate quadrant statistics based on recalculated quadrants (unfiltered data)
  const quadrantStats = useMemo(() => {
    const stats: Record<"HH" | "HL" | "LH" | "LL", { count: number; totalSales: number }> = {
      HH: { count: 0, totalSales: 0 },
      HL: { count: 0, totalSales: 0 },
      LH: { count: 0, totalSales: 0 },
      LL: { count: 0, totalSales: 0 }
    };

    (["HH", "HL", "LH", "LL"] as const).forEach((key) => {
      const points = recalculatedQuadrants[key];
      stats[key].count = points.length;
      stats[key].totalSales = points.reduce((sum, p) => sum + p.sales, 0);
    });

    return stats;
  }, [recalculatedQuadrants]);

  const handleRelayout = useCallback((event: Record<string, unknown>) => {
    // Handle dragging of reference lines
    const newX0 = event['shapes[0].x0'];
    if (newX0 !== undefined) {
      const newSales = parseFloat(String(newX0));
      if (Number.isFinite(newSales)) {
        setBaselineMode('manual');
        setManualSalesThreshold(Number(newSales.toFixed(1)));
      }
    }
    const newY0 = event['shapes[1].y0'];
    if (newY0 !== undefined) {
      const newOpm = parseFloat(String(newY0));
      if (Number.isFinite(newOpm)) {
        setBaselineMode('manual');
        setManualOpmThreshold(Number(newOpm.toFixed(1)));
      }
    }
    // Handle zoom
    if (event['xaxis.range[0]'] !== undefined && event['xaxis.range[1]'] !== undefined) {
      setZoomRange(prev => ({
        ...prev,
        x: [Number(event['xaxis.range[0]']), Number(event['xaxis.range[1]'])],
      }));
    }
    if (event['yaxis.range[0]'] !== undefined && event['yaxis.range[1]'] !== undefined) {
      setZoomRange(prev => ({
        ...prev,
        y: [Number(event['yaxis.range[0]']), Number(event['yaxis.range[1]'])],
      }));
    }
    if (event['xaxis.autorange'] === true && event['yaxis.autorange'] === true) {
      setZoomRange({ x: null, y: null });
      setZoomLevel(1);
    }
  }, []);

  const handlePlotlyClick = useCallback((event: any) => {
    if (event.points && event.points.length > 0) {
      const name = event.points[0].customdata;
      if (name) onSelectCustomer(String(name));
    }
  }, [onSelectCustomer]);

  const dataRanges = useMemo(() => {
    if (activePoints.length === 0) return { xMin: -1, xMax: 10, yMin: -10, yMax: 10 };
    const xs = activePoints.map(p => p.sales);
    const ys = activePoints.map(p => p.opm);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const xPad = (xMax - xMin) * 0.05 || 1;
    const yPad = (yMax - yMin) * 0.05 || 1;
    return { xMin: xMin - xPad, xMax: xMax + xPad, yMin: yMin - yPad, yMax: yMax + yPad };
  }, [activePoints]);

  const handleZoom = useCallback((factor: number) => {
    const curX: [number, number] = zoomRange.x ?? [dataRanges.xMin, dataRanges.xMax];
    const curY: [number, number] = zoomRange.y ?? [dataRanges.yMin, dataRanges.yMax];
    const xC = (curX[0] + curX[1]) / 2;
    const yC = (curY[0] + curY[1]) / 2;
    const xH = ((curX[1] - curX[0]) / 2) * factor;
    const yH = ((curY[1] - curY[0]) / 2) * factor;
    setZoomRange({ x: [xC - xH, xC + xH], y: [yC - yH, yC + yH] });
  }, [zoomRange, dataRanges]);

  const handleResetZoom = useCallback(() => {
    setZoomRange({ x: null, y: null });
    setZoomLevel(1);
  }, []);

  const plotData = useMemo(() => {
    return (["HH", "HL", "LH", "LL"] as const).map((key) => {
      if (scatterQuadrant !== "ALL" && scatterQuadrant !== key) return null;
      const data = scatterQuadrant === "ALL" ? recalculatedQuadrants[key] : scatterPoints;
      return {
        x: data.map(p => p.sales),
        y: data.map(p => p.opm),
        text: data.map(p => p.name),
        customdata: data.map(p => p.name),
        mode: 'markers' as const,
        type: 'scatter' as const,
        name: quadrantLabels[key],
        marker: {
          color: quadrantColors[key],
          size: 8,
          opacity: 0.75,
          line: { width: 1, color: 'rgba(255,255,255,0.8)' },
        },
        hovertemplate: '<b>%{text}</b><br>매출: %{x:.1f}억<br>영업이익: %{y:.1f}%<extra></extra>',
      };
    }).filter(Boolean);
  }, [scatterQuadrant, recalculatedQuadrants, scatterPoints, quadrantLabels, quadrantColors]);

  const plotLayout = useMemo(() => ({
    autosize: true,
    margin: { t: 40, r: 40, b: 60, l: 70 },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    font: { family: 'system-ui, -apple-system, sans-serif', size: 11, color: '#64748b' },
    dragmode: 'pan' as const,
    xaxis: {
      title: { text: '매출 (억원)', font: { size: 12, color: '#0f172a' } },
      gridcolor: '#e2e8f0',
      gridwidth: 1,
      zeroline: false,
      tickfont: { size: 10, color: '#64748b' },
      ...(zoomRange.x ? { range: zoomRange.x, autorange: false } : {}),
    },
    yaxis: {
      title: { text: '영업이익 (%)', font: { size: 12, color: '#0f172a' } },
      gridcolor: '#e2e8f0',
      gridwidth: 1,
      zeroline: false,
      tickfont: { size: 10, color: '#64748b' },
      ...(zoomRange.y ? { range: zoomRange.y, autorange: false } : {}),
    },
    shapes: [
      {
        type: 'line' as const,
        x0: effectiveSalesThreshold,
        x1: effectiveSalesThreshold,
        y0: 0,
        y1: 1,
        yref: 'paper' as const,
        line: { color: 'rgba(148, 163, 184, 0.6)', width: 1.5, dash: 'dash' as const },
        editable: true,
      },
      {
        type: 'line' as const,
        x0: 0,
        x1: 1,
        xref: 'paper' as const,
        y0: effectiveOpmThreshold,
        y1: effectiveOpmThreshold,
        line: { color: 'rgba(148, 163, 184, 0.6)', width: 1.5, dash: 'dash' as const },
        editable: true,
      },
    ],
    showlegend: false,
    hovermode: 'closest' as const,
  }), [effectiveSalesThreshold, effectiveOpmThreshold, zoomRange]);

  const plotConfig = useMemo(() => ({
    displayModeBar: false,
    responsive: true,
    scrollZoom: true,
    edits: { shapePosition: true },
  }), []);

  return (
    <div style={{ display: "flex", gap: 12, minHeight: 0, height: "100%" }}>
      {/* Left Sidebar */}
      <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* 1. 핵심 기능 */}
        <div style={{ ...cardStyle, padding: 10 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>핵심 기능</h3>
          <div style={{ display: "flex", gap: 5 }}>
            <button
              type="button"
              onClick={() => onAnalysisTypeChange("customer")}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: 7,
                border: analysisType === "customer" ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                background: analysisType === "customer" ? "#eff6ff" : "#ffffff",
                color: analysisType === "customer" ? "#1e40af" : "#64748b",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              고객별
            </button>
            <button
              type="button"
              onClick={() => onAnalysisTypeChange("product")}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: 7,
                border: analysisType === "product" ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                background: analysisType === "product" ? "#eff6ff" : "#ffffff",
                color: analysisType === "product" ? "#1e40af" : "#64748b",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              제품별
            </button>
          </div>
        </div>

        {/* 2. 기준선 설정 */}
        <div style={{ ...cardStyle, padding: 10 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>기준선 설정</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {(["data", "target", "manual"] as const).map((mode) => (
              <label
                key={mode}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 7px",
                  borderRadius: 5,
                  cursor: "pointer",
                  background: baselineMode === mode ? "#f1f5f9" : "transparent"
                }}
              >
                <input
                  type="radio"
                  name="baselineMode"
                  checked={baselineMode === mode}
                  onChange={() => setBaselineMode(mode)}
                  style={{ cursor: "pointer" }}
                />
                <span style={{ fontSize: 11, color: "#0f172a", fontWeight: baselineMode === mode ? 600 : 400 }}>
                  {mode === "data" && "데이터 기반 (중앙값)"}
                  {mode === "target" && "목표 기반"}
                  {mode === "manual" && "수동 설정"}
                </span>
              </label>
            ))}
          </div>
          {baselineMode === "manual" && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
              <div>
                <label style={{ fontSize: 9, color: "#64748b", display: "block", marginBottom: 3 }}>매출 기준(억)</label>
                <input
                  type="number"
                  value={manualSalesThreshold}
                  onChange={(e) => setManualSalesThreshold(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "5px 7px",
                    fontSize: 10,
                    border: "1px solid #e2e8f0",
                    borderRadius: 5,
                    outline: "none"
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 9, color: "#64748b", display: "block", marginBottom: 3 }}>영업이익 기준(%)</label>
                <input
                  type="number"
                  value={manualOpmThreshold}
                  onChange={(e) => setManualOpmThreshold(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "5px 7px",
                    fontSize: 10,
                    border: "1px solid #e2e8f0",
                    borderRadius: 5,
                    outline: "none"
                  }}
                />
              </div>
            </div>
          )}
          {/* Statistics */}
          <div style={{ marginTop: 10, padding: "8px", background: "#f8fafc", borderRadius: 7, fontSize: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: "#64748b" }}>매출 기준:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{numberFormat(Math.round(effectiveSalesThreshold))}억</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ color: "#64748b" }}>이익률 기준:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{effectiveOpmThreshold.toFixed(1)}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>계좌 수:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{matrixData.points.length}개</span>
            </div>
          </div>
        </div>

        {/* 3. 사분면 현황 */}
        <div style={{ ...cardStyle, padding: 10, display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>사분면 현황</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
            {(["HL", "HH", "LL", "LH"] as const).map((key) => {
              const percent = matrixData.points.length > 0 ? ((quadrantStats[key].count / matrixData.points.length) * 100).toFixed(1) : "0.0";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onQuadrantChange(scatterQuadrant === key ? "ALL" : key)}
                  style={{
                    padding: "8px",
                    borderRadius: 7,
                    border: scatterQuadrant === key ? `2px solid ${quadrantColors[key]}` : "1px solid #e2e8f0",
                    background: scatterQuadrant === key ? `${quadrantColors[key]}15` : "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: quadrantColors[key] }}>
                      {quadrantDescriptions[key]} ({quadrantLabels[key]})
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                      {quadrantStats[key].count}개
                    </span>
                    <span style={{ fontSize: 9, color: "#64748b" }}>
                      ({numberFormat(Math.round(quadrantStats[key].totalSales))}억원)
                    </span>
                    <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: "auto" }}>
                      {percent}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0, minHeight: 0 }}>
        {/* Scatter Chart */}
        <div style={{ ...cardStyle, padding: 16, height: 400, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
            <h3 style={{ ...titleStyle, fontSize: 12 }}>산포도 분석 {analysisType === "customer" ? "(고객별)" : "(제품별)"}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>확대/축소</span>
              <button
                type="button"
                onClick={() => handleZoom(0.8)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                확대
              </button>
              <button
                type="button"
                onClick={() => handleZoom(1.25)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                축소
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                초기화
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            {mounted && (
              <Plot
                data={plotData}
                layout={plotLayout}
                config={plotConfig}
                onClick={handlePlotlyClick}
                onRelayout={handleRelayout}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler={true}
              />
            )}
            {!mounted && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontSize: 12 }}>
                차트 로딩 중...
              </div>
            )}
          </div>
          <div style={{ marginTop: 8, padding: "6px 10px", background: "#eff6ff", borderRadius: 6, fontSize: 10, color: "#2563eb", fontStyle: "italic" }}>
            💡 차트 위 기준선을 드래그하여 이동할 수 있습니다
          </div>
        </div>

        {/* Detail Table */}
        <div style={{ ...cardStyle, padding: 14, height: 234, display: "flex", flexDirection: "column" }}>
          <h3 style={{ ...titleStyle, fontSize: 11, marginBottom: 7 }}>상세 리스트</h3>
          <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: "7px", textAlign: "left", fontWeight: 600, color: "#0f172a" }}>고객명</th>
                  <th style={{ padding: "7px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>매출(억)</th>
                  <th style={{ padding: "7px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>영업이익(억)</th>
                  <th style={{ padding: "7px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>영업이익(%)</th>
                </tr>
              </thead>
              <tbody>
                {scatterPoints.slice(0, 20).map((row) => (
                  <tr
                    key={row.name}
                    style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                    onClick={() => onSelectCustomer(row.name)}
                  >
                    <td style={{ padding: "7px", color: "#0f172a", fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>{row.name}</td>
                    <td style={{ padding: "7px", textAlign: "right", color: "#0f172a" }}>{numberFormat(Math.round(row.sales))}</td>
                    <td style={{ padding: "7px", textAlign: "right", color: "#0f172a" }}>{numberFormat(Math.round(row.operatingProfit))}</td>
                    <td style={{ padding: "7px", textAlign: "right", color: "#64748b" }}>{row.opm.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
