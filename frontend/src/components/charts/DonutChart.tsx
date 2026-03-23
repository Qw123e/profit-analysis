import React, { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartCard } from "@/components/molecules/ChartCard";

interface DonutChartProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  height?: number;
  hole?: number;
  margin?: { l?: number; r?: number; t?: number; b?: number };
  colors?: string[];
  legend?: Record<string, unknown>;
  maxLabelLength?: number;
  maxSlices?: number;
  onSelect?: (name: string, isMultiSelect: boolean) => void;
  showPercentText?: boolean;
  legendPosition?: "top" | "left" | "right";
  legendMaxHeight?: number;
  allItems?: Array<{ name: string; value: number }>;
  selectedItems?: string[];
}

export function DonutChart({
  title,
  data,
  height = 340,
  hole = 0.4,
  margin,
  colors,
  legend,
  maxLabelLength = 20,
  maxSlices,
  onSelect,
  showPercentText = false,
  legendPosition = "right",
  legendMaxHeight = 180,
  allItems,
  selectedItems = []
}: DonutChartProps) {
  const formatEokWithRaw = (value: number) => {
    const roundedEok = Math.round(value / 1e8);
    const raw = Math.round(value);
    return `${roundedEok.toLocaleString()}억 (${raw.toLocaleString()})`;
  };

  const normalized = data
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .map((item) => ({ name: item.name, value: item.value }));

  // If no valid data, show empty state
  if (normalized.length === 0) {
    return (
      <div style={{
        padding: "40px 20px",
        textAlign: "center",
        color: "var(--chart-axis)",
        background: "var(--chart-soft-bg)",
        borderRadius: "8px",
        border: "1px solid var(--chart-soft-border)"
      }}>
        <h3 style={{ marginBottom: "8px", fontSize: "16px", fontWeight: 600 }}>{title}</h3>
        <p style={{ fontSize: "14px", margin: 0 }}>표시할 데이터가 없습니다</p>
      </div>
    );
  }

  const sliced = maxSlices && normalized.length > maxSlices
    ? (() => {
        const sorted = [...normalized].sort((a, b) => b.value - a.value);
        const kept = sorted.slice(0, maxSlices - 1);
        const restValue = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.value, 0);
        return restValue > 0 ? [...kept, { name: "기타", value: restValue }] : kept;
      })()
    : normalized;

  const labels = sliced.map((d) =>
    d.name.length > maxLabelLength ? `${d.name.substring(0, maxLabelLength)}...` : d.name
  );
  const totalValue = normalized.reduce((sum, item) => sum + item.value, 0);
  const selectedValue = selectedItems.length
    ? normalized
        .filter((item) => selectedItems.includes(item.name))
        .reduce((sum, item) => sum + item.value, 0)
    : totalValue;
  const selectedPercent = totalValue > 0 ? Math.round((selectedValue / totalValue) * 100) : 0;

  // Generate default colors if not provided (high contrast palette with better text readability)
  const chartColors = colors ?? [
    "#5FB8C7", // Deep Teal (명도 낮춘 블루)
    "#D64933", // Burnt Tangerine (번트 탠저린)
    "#6B6B6B", // Dark Grey (명도 낮춘 회색)
    "#B89AA8", // Mauve (명도 낮춘 라벤더)
    "#3498DB", // Dodger Blue (닷저 블루)
    "#E67E22", // Carrot Orange (캐롯 오렌지)
    "#7F8C8D", // Ashen Grey (명도 낮춘 실버)
    "#2980B9", // Strong Blue (명도 낮춘 코른플라워)
    "#E74C3C", // Alizarin Red (알리자린 레드)
    "#34495E", // Wet Asphalt (웻 아스팔트)
    "#D68A7A", // Dusty Rose (명도 낮춘 코랄)
    "#5D6D7E", // Slate Blue (명도 낮춘 콘크리트)
    "#2874A6", // Navy Blue (명도 낮춘 닷저)
    "#D35400", // Pumpkin Orange (펌킨 오렌지)
    "#1F618D"  // Deep Ocean (명도 낮춘 미드나잇)
  ];

  // Determine layout style based on legend position
  const legendWidth = 200;
  const containerStyle: React.CSSProperties = legendPosition === "top"
    ? {
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        flexDirection: "column"
      }
    : {
        display: "grid",
        gap: 16,
        alignItems: "center",
        gridTemplateColumns:
          legendPosition === "left" ? `${legendWidth}px minmax(0, 1fr)` : `minmax(0, 1fr) ${legendWidth}px`
      };

  const legendStyle: React.CSSProperties = {
    width: legendPosition === "top" ? "100%" : legendWidth,
    maxHeight: legendMaxHeight,
    overflowY: "auto",
    padding: "6px",
    border: "1px solid var(--chart-soft-border)",
    borderRadius: 6,
    background: "var(--chart-soft-bg)"
  };

  // Render legend component
  const renderLegend = () => {
    // Use allItems for legend if provided, otherwise use sliced data
    const legendItems = allItems ?? sliced;
    const totalValue = sliced.reduce((sum, d) => sum + d.value, 0);
    const maxPct = Math.max(...legendItems.map(item => {
      const matchingItem = sliced.find(s => s.name === item.name);
      return matchingItem ? ((matchingItem.value / totalValue) * 100) : 0;
    }));

    return (
      <div style={legendStyle}>
        {legendItems.map((item, idx) => {
          const color = chartColors[idx % chartColors.length];
          // Find matching item in sliced data to get percentage
          const matchingItem = sliced.find(s => s.name === item.name);
          const percentage = matchingItem
            ? ((matchingItem.value / totalValue) * 100).toFixed(1)
            : "0.0";
          const barWidth = maxPct > 0 ? (parseFloat(percentage) / maxPct) * 100 : 0;

          // Determine if this item is selected or not
          const isSelected = selectedItems.length === 0 || selectedItems.includes(item.name);
          const opacity = isSelected ? 1 : 0.3;

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 8px",
                cursor: onSelect ? "pointer" : "default",
                fontSize: 11,
                borderRadius: 8,
                transition: "background 0.15s ease",
                opacity,
                background: "transparent"
              }}
              onClick={(e) => {
                if (onSelect) {
                  const isMultiSelect = e.metaKey || e.ctrlKey;
                  onSelect(item.name, isMultiSelect);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F8FAFE";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: color,
                  flexShrink: 0
                }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#0f172a",
                  letterSpacing: "-0.01em"
                }}
                title={item.name}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0f172a",
                  minWidth: 50,
                  textAlign: "right",
                  flexShrink: 0
                }}
              >
                {percentage}%
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render chart component
  const renderChart = () => (
    <div style={{
      flex: legendPosition === "top" ? "0 0 auto" : 1,
      minWidth: 0,
      width: "100%",
      minHeight: height,
      overflow: "hidden"
    }}>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sliced.map((item, idx) => ({ ...item, label: labels[idx] }))}
              dataKey="value"
              nameKey="label"
              innerRadius={`${Math.round(hole * 100)}%`}
              outerRadius="80%"
              paddingAngle={2}
              labelLine={false}
              label={
                showPercentText
                  ? ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (!percent || percent < 0.05) return null;
                      const RAD = Math.PI / 180;
                      const toNumber = (value: number | string | undefined, fallback: number) => {
                        if (typeof value === "number") return value;
                        if (typeof value === "string") {
                          const parsed = parseFloat(value);
                          if (!Number.isNaN(parsed)) return parsed;
                        }
                        return fallback;
                      };
                      const inner = toNumber(innerRadius, 0);
                      const outer = toNumber(outerRadius, inner + 1);
                      const r = inner + (outer - inner) * 0.55;
                      const x = toNumber(cx, 0) + r * Math.cos(-midAngle * RAD);
                      const y = toNumber(cy, 0) + r * Math.sin(-midAngle * RAD);
                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize={11}
                          fontWeight={700}
                          style={{ pointerEvents: "none" }}
                        >
                          {`${Math.round(percent * 100)}%`}
                        </text>
                      );
                    }
                  : false
              }
              onClick={(entry: { name?: string }) => {
                if (onSelect && entry?.name) {
                  onSelect(entry.name, false);
                }
              }}
            >
              {sliced.map((entry, idx) => (
                <Cell key={entry.name} fill={chartColors[idx % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${Math.round(Number(value) / 1e8).toLocaleString()}억`,
                name
              ]}
              contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
                fontSize: 12,
                background: "var(--chart-tooltip-bg)",
                color: "var(--chart-tooltip-text)"
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <ChartCard
      title={title}
      meta={sliced.length ? `${sliced.length}개` : undefined}
      icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3a9 9 0 1 0 9 9h-9V3z"
            stroke="#2563eb"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 3v9h9"
            stroke="#94a3b8"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
    >
      <div style={containerStyle}>
        {legendPosition === "top" && renderLegend()}
        {legendPosition === "left" && renderLegend()}
        {renderChart()}
        {legendPosition === "right" && renderLegend()}
      </div>
    </ChartCard>
  );
}
