import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { ChartCard } from "@/components/molecules/ChartCard";

interface HorizontalBarChartProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  color: string;
  height?: number;
  leftMargin?: number;
  maxLabelLength?: number;
  onSelect?: (name: string) => void;
  titleAlign?: "left" | "right";
}

export function HorizontalBarChart({
  title,
  data,
  color,
  height = 420,
  leftMargin = 120,
  maxLabelLength = 30,
  onSelect,
  titleAlign = "right"
}: HorizontalBarChartProps) {
  const formatEokWithRaw = (value: number) => {
    const roundedEok = Math.round(value / 1e8);
    const raw = Math.round(value);
    return `${roundedEok.toLocaleString()}억 (${raw.toLocaleString()})`;
  };
  const formatEokLabel = (value: number) => `${Math.round(value / 1e8)}억`;

  const labels = data.map((d) =>
    d.name.length > maxLabelLength ? `${d.name.substring(0, maxLabelLength)}...` : d.name
  );

  const chartData = data.map((item, idx) => ({
    name: labels[idx],
    value: item.value,
    originalName: item.name
  }));

  return (
    <ChartCard
      title={title}
      meta={data.length ? `${data.length}개` : undefined}
      titleAlign={titleAlign}
      icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 7h14M5 12h10M5 17h6"
            stroke="#7c3aed"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
            <XAxis
              type="number"
              tick={false}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={leftMargin}
              tick={{ fill: "var(--chart-axis)", fontSize: 11, textAnchor: "end" }}
              tickMargin={6}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => formatEokWithRaw(Number(value))}
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
            <Bar
              dataKey="value"
              fill={color}
              radius={[0, 6, 6, 0]}
              barSize={14}
              onClick={(entry) => {
                if (onSelect && entry?.originalName) {
                  onSelect(entry.originalName);
                }
              }}
            >
              <LabelList position="right" formatter={formatEokLabel} fill="var(--chart-label)" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
