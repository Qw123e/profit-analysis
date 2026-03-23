import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { ChartCard } from "@/components/molecules/ChartCard";

interface BarSeries {
  name: string;
  values: number[];
  color: string;
}

interface GroupedBarChartProps {
  title: string;
  categories: string[];
  series: BarSeries[];
  height?: number;
  legend?: Record<string, unknown>;
  onSelect?: (category: string) => void;
  selectedCategory?: string;
}

export function GroupedBarChart({ title, categories, series, height = 340, legend, onSelect, selectedCategory }: GroupedBarChartProps) {
  const formatEokWithRaw = (value: number) => {
    const roundedEok = Math.round(value / 1e8);
    const raw = Math.round(value);
    return `${roundedEok.toLocaleString()}억 (${raw.toLocaleString()})`;
  };
  const formatEokLabel = (value: number) => `${Math.round(value / 1e8)}억`;

  const chartData = categories.map((name, idx) => {
    const row: Record<string, number | string> = { name };
    series.forEach((item, seriesIdx) => {
      row[`series_${seriesIdx}`] = item.values[idx] ?? 0;
    });
    return row;
  });

  // Calculate opacity for each bar based on selection
  const getOpacity = (category: string) => {
    if (!selectedCategory) return 1;
    return category === selectedCategory ? 1 : 0.3;
  };

  return (
    <ChartCard
      title={title}
      meta={categories.length ? `${categories.length}개` : undefined}
      icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 19V9M12 19V5M19 19V12"
            stroke="#2563eb"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={false}
              axisLine={false}
              tickLine={false}
              width={10}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatEokWithRaw(Number(value)), name]}
              contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
                fontSize: 12,
                background: "var(--chart-tooltip-bg)",
                color: "var(--chart-tooltip-text)"
              }}
              cursor={{ fill: "var(--chart-cursor)" }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              wrapperStyle={{ fontSize: 11, color: "var(--chart-axis)", paddingBottom: 12, top: 0, left: 0 }}
            />
            {series.map((item, idx) => (
              <Bar
                key={item.name}
                dataKey={`series_${idx}`}
                name={item.name}
                fill={item.color}
                radius={[4, 4, 0, 0]}
                barSize={18}
                onClick={(data) => {
                  if (onSelect && data?.name) {
                    onSelect(data.name as string);
                  }
                }}
                style={{ cursor: onSelect ? "pointer" : "default" }}
              >
                {chartData.map((entry, cellIdx) => (
                  <Cell
                    key={`cell-${cellIdx}`}
                    fill={item.color}
                    fillOpacity={getOpacity(entry.name as string)}
                  />
                ))}
                <LabelList position="top" formatter={formatEokLabel} fill="var(--chart-label)" fontSize={11} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
