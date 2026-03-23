import React from "react";

import { cardStyle, titleStyle } from "@/utils/dashboardStyles";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface MatrixPoint {
  name: string;
  sales: number;
  opm: number;
}

interface MatrixData {
  points: MatrixPoint[];
  salesThreshold: number;
  opmThreshold: number;
  quadrants: Record<string, MatrixPoint[]>;
}

export function MatrixTab({
  matrixData,
  theme
}: {
  matrixData: MatrixData;
  theme: { blue: string };
}) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "280px 1fr" }}>
      <div style={{ ...cardStyle, padding: 16 }}>
        <h3 style={titleStyle}>수익성 기준</h3>
        <div style={{ fontSize: 12, color: "#64748b", display: "grid", gap: 6 }}>
          <div>매출 기준: {matrixData.salesThreshold.toFixed(1)}억</div>
          <div>영업이익 기준: {matrixData.opmThreshold.toFixed(1)}%</div>
          <div>고객 수: {matrixData.points.length}개</div>
        </div>
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 12, paddingTop: 12, display: "grid", gap: 8 }}>
          {(["HH", "HL", "LH", "LL"] as const).map((key) => {
            const list = matrixData.quadrants[key];
            const labelMap: Record<string, string> = {
              HH: "Star (고매출/고마진)",
              HL: "Cash Cow (고매출/저마진)",
              LH: "Question (저매출/고마진)",
              LL: "Dog (저매출/저마진)"
            };
            return (
              <div key={key} style={{ padding: "8px 10px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{labelMap[key]}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{list.length}개</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ ...cardStyle, padding: 12 }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>수익성 매트릭스</h4>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="sales"
                  type="number"
                  name="매출"
                  unit="억"
                  tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
                  tickFormatter={(value) => `${value.toFixed(0)}억`}
                />
                <YAxis
                  dataKey="opm"
                  type="number"
                  name="영업이익"
                  unit="%"
                  tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "sales") return [`${value.toFixed(1)}억`, "매출"];
                    if (name === "opm") return [`${value.toFixed(1)}%`, "영업이익"];
                    return [value, name];
                  }}
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <ReferenceLine x={matrixData.salesThreshold} stroke="#94a3b8" strokeDasharray="4 4" />
                <ReferenceLine y={matrixData.opmThreshold} stroke="#94a3b8" strokeDasharray="4 4" />
                <Scatter name="고객" data={matrixData.points} fill={theme.blue} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, 1fr)" }}>
          {(["HH", "HL", "LH", "LL"] as const).map((key) => {
            const list = matrixData.quadrants[key].slice(0, 6);
            const labelMap: Record<string, string> = {
              HH: "Star",
              HL: "Cash Cow",
              LH: "Question",
              LL: "Dog"
            };
            const bgMap: Record<string, string> = {
              HH: "#eff6ff",
              HL: "#fef3c7",
              LH: "#ede9fe",
              LL: "#f1f5f9"
            };
            return (
              <div key={key} style={{ ...cardStyle, padding: 14, background: bgMap[key] }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{labelMap[key]}</h4>
                <div style={{ display: "grid", gap: 6 }}>
                  {list.map((item) => (
                    <div key={item.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#0f172a" }}>{item.name}</span>
                      <span style={{ color: "#64748b" }}>{item.sales.toFixed(1)}억</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
