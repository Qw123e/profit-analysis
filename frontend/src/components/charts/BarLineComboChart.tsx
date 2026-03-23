import React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { ChartCard } from "@/components/molecules/ChartCard";

interface BarSeriesItem {
  name: string;
  values: number[];
  color: string;
  hoverPrefix?: string;
}

interface ScatterSeriesItem {
  name: string;
  values: number[];
  color: string;
  hoverPrefix?: string;
}

interface LineSeriesItem {
  name: string;
  values: number[];
  color: string;
  hoverSuffix?: string;
  opValues?: number[];
}

interface BarLineComboChartProps {
  title: string;
  categories: string[];
  barSeries: BarSeriesItem | BarSeriesItem[]; // Support single or multiple bar series
  lineSeries?: LineSeriesItem; // opValues for showing OP amount in OPM hover (optional)
  prevYearLineSeries?: LineSeriesItem; // Previous year line series
  scatterSeries?: ScatterSeriesItem; // Scatter series for operating profit
  prevYearScatterSeries?: ScatterSeriesItem; // Previous year scatter series
  currentYear?: string;
  prevYear?: string;
  height?: number;
  y1Title?: string;
  y2Title?: string;
  y1Range?: [number, number];
  y2Range?: [number, number];
  showBarLabels?: boolean; // Show labels on bars (default true)
  showLineLabels?: boolean; // Show labels on line (default true)
  showAxisTicks?: boolean; // Show axis tick labels (default false)
}

export function BarLineComboChart({
  title,
  categories,
  barSeries,
  lineSeries,
  prevYearLineSeries,
  scatterSeries,
  prevYearScatterSeries,
  currentYear,
  prevYear,
  height = 450,
  y1Title,
  y2Title,
  y1Range,
  y2Range,
  showBarLabels = true,
  showLineLabels = true,
  showAxisTicks = false
}: BarLineComboChartProps) {
  // Normalize barSeries to always be an array
  const barSeriesArray = Array.isArray(barSeries) ? barSeries : [barSeries];

  const formatEokLabel = (value: number) => `${Math.round(value / 1e8)}억`;
  const formatEokWithRaw = (value: number) => {
    const roundedEok = Math.round(value / 1e8);
    const raw = Math.round(value);
    return `${roundedEok.toLocaleString()}억 (${raw.toLocaleString()})`;
  };
  const isPercentLine = (y2Title?.includes("%") || lineSeries?.name.includes("%") || lineSeries?.name.includes("이익률")) ?? false;
  const formatLineLabel = (value: number) =>
    isPercentLine ? `${value.toFixed(1)}%` : `${Math.round(value / 1e8)}억`;
  const formatAxisTick = (value: number, isPercent: boolean) =>
    isPercent ? Number(value).toFixed(1) : `${Math.round(Number(value) / 1e8)}억`;

  // Build chart data with multiple bar values and split scatter by sign
  const chartData = categories.map((name, idx) => {
    const currentScatterValue = scatterSeries?.values[idx] ?? null;
    const prevYearScatterValue = prevYearScatterSeries?.values[idx] ?? null;

    const dataPoint: any = {
      name,
      lineValue: lineSeries?.values[idx] ?? 0,
      prevYearLineValue: prevYearLineSeries?.values[idx] ?? 0,
      opValue: lineSeries?.opValues?.[idx] ?? 0,
      scatterValue: currentScatterValue,
      // Split current year scatter by sign
      scatterValuePositive: currentScatterValue !== null && currentScatterValue >= 0 ? currentScatterValue : null,
      scatterValueNegative: currentScatterValue !== null && currentScatterValue < 0 ? currentScatterValue : null,
      // Split previous year scatter by sign
      prevYearScatterValuePositive: prevYearScatterValue !== null && prevYearScatterValue >= 0 ? prevYearScatterValue : null,
      prevYearScatterValueNegative: prevYearScatterValue !== null && prevYearScatterValue < 0 ? prevYearScatterValue : null,
    };
    barSeriesArray.forEach((series, seriesIdx) => {
      dataPoint[`barValue${seriesIdx}`] = series.values[idx] ?? 0;
    });
    return dataPoint;
  });

  return (
    <ChartCard
      title={title}
      meta={categories.length ? `${categories.length}개` : undefined}
      icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 19h16M7 16V9M12 16V5M17 16v-3"
            stroke="#10b981"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={showAxisTicks ? { fill: "var(--chart-axis)", fontSize: 11 } : false}
              axisLine={false}
              tickLine={false}
              width={showAxisTicks ? 50 : 10}
              domain={y1Range}
              tickFormatter={(value) => showAxisTicks ? formatAxisTick(value, false) : ""}
              label={y1Title ? { value: y1Title, angle: -90, position: "insideLeft", fill: "var(--chart-axis)", fontSize: 11, offset: showAxisTicks ? 10 : 0 } : undefined}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={showAxisTicks ? { fill: "var(--chart-axis)", fontSize: 11 } : false}
              axisLine={false}
              tickLine={false}
              width={showAxisTicks ? 50 : 10}
              domain={y2Range}
              tickFormatter={(value) => showAxisTicks ? formatAxisTick(value, isPercentLine) : ""}
              label={y2Title ? { value: y2Title, angle: 90, position: "insideRight", fill: "var(--chart-axis)", fontSize: 11, offset: showAxisTicks ? 10 : 0 } : undefined}
            />
            <Tooltip
              formatter={(value: number, _name: string, props) => {
                const dataKey = typeof props?.dataKey === "string" ? props.dataKey : "";
                // Check if it's a bar value
                if (dataKey.startsWith("barValue")) {
                  const seriesIdx = parseInt(dataKey.replace("barValue", "")) || 0;
                  const series = barSeriesArray[seriesIdx];
                  const label = (series.hoverPrefix ?? series.name).replace(/[:\\s]+$/, "");
                  return [formatEokWithRaw(Number(value)), label];
                }
                // Check if it's a scatter value (any scatter-related dataKey)
                if (dataKey.startsWith("scatterValue") || dataKey.startsWith("prevYearScatterValue")) {
                  if (dataKey.startsWith("prevYearScatterValue") && prevYearScatterSeries) {
                    const label = (prevYearScatterSeries.hoverPrefix ?? `${prevYear}년 ${prevYearScatterSeries.name}`).replace(/[:\\s]+$/, "");
                    return [formatEokWithRaw(Number(value)), label];
                  } else if (scatterSeries) {
                    const label = (scatterSeries.hoverPrefix ?? scatterSeries.name).replace(/[:\\s]+$/, "");
                    return [formatEokWithRaw(Number(value)), label];
                  }
                }
                if (!lineSeries) return [String(value), ""];
                const label = (lineSeries.hoverSuffix ?? lineSeries.name).replace(/[:\\s]+$/, "");
                if (isPercentLine) {
                  // If opValues provided, show "12.2% (53억)" format
                  if (lineSeries.opValues && props?.payload) {
                    const opValue = props.payload.opValue ?? 0;
                    const opEok = Math.round(opValue / 1e8);
                    return [`${Number(value).toFixed(1)}% (${opEok}억)`, label];
                  }
                  return [`${Number(value).toFixed(1)}%`, label];
                }
                return [formatEokWithRaw(Number(value)), label];
              }}
              contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)",
                fontSize: 12,
                background: "var(--chart-tooltip-bg)",
                color: "var(--chart-tooltip-text)"
              }}
            />
            <Legend verticalAlign="top" align="left" wrapperStyle={{ fontSize: 11, color: "var(--chart-axis)", paddingBottom: 12, top: 0, left: 0 }} />
            {barSeriesArray.map((series, idx) => (
              <Bar
                key={`bar-${idx}`}
                yAxisId="left"
                dataKey={`barValue${idx}`}
                name={series.name}
                fill={series.color}
                radius={[4, 4, 0, 0]}
                barSize={barSeriesArray.length > 1 ? 14 : 18}
              >
                {showBarLabels && <LabelList position="top" formatter={formatEokLabel} fill="var(--chart-label)" fontSize={11} />}
              </Bar>
            ))}
            {prevYearLineSeries && (
              <Line yAxisId="right" type="monotone" dataKey="prevYearLineValue" name={`${prevYear}년 ${prevYearLineSeries.name}`} stroke="#9ca3af" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5">
                {showLineLabels && <LabelList position="top" formatter={formatLineLabel} fill="var(--chart-label)" fontSize={10} />}
              </Line>
            )}
            {lineSeries && (
              <Line yAxisId="right" type="monotone" dataKey="lineValue" name={lineSeries.name} stroke={lineSeries.color} strokeWidth={2} dot={{ r: 3 }}>
                {showLineLabels && <LabelList position="top" formatter={formatLineLabel} fill="var(--chart-label)" fontSize={10} />}
              </Line>
            )}
            {/* Previous Year Scatter - Positive (Light Green) - positioned over prev year bar (left) */}
            {prevYearScatterSeries && (
              <Scatter
                yAxisId="right"
                dataKey="prevYearScatterValuePositive"
                name={`${prevYear}년 ${prevYearScatterSeries.name} (양수)`}
                fill="#86efac"
                fillOpacity={0.6}
                shape={(props: any) => {
                  const { cx, cy, fill, payload } = props;
                  const value = payload.prevYearScatterValuePositive;
                  if (value === null || value === undefined) return <></>;
                  const offset = prevYearScatterSeries ? -7 : 0; // Move left to align with prev year bar
                  return <circle cx={cx + offset} cy={cy} r={4} fill={fill} fillOpacity={0.6} />;
                }}
              />
            )}
            {/* Previous Year Scatter - Negative (Light Red) - positioned over prev year bar (left) */}
            {prevYearScatterSeries && (
              <Scatter
                yAxisId="right"
                dataKey="prevYearScatterValueNegative"
                name={`${prevYear}년 ${prevYearScatterSeries.name} (음수)`}
                fill="#fca5a5"
                fillOpacity={0.6}
                shape={(props: any) => {
                  const { cx, cy, fill, payload } = props;
                  const value = payload.prevYearScatterValueNegative;
                  if (value === null || value === undefined) return <></>;
                  const offset = prevYearScatterSeries ? -7 : 0; // Move left to align with prev year bar
                  return <circle cx={cx + offset} cy={cy} r={4} fill={fill} fillOpacity={0.6} />;
                }}
              />
            )}
            {/* Current Year Scatter - Positive (Green) - positioned over current year bar (right) */}
            {scatterSeries && (
              <Scatter
                yAxisId="right"
                dataKey="scatterValuePositive"
                name={`${currentYear ? currentYear + '년 ' : ''}${scatterSeries.name} (양수)`}
                fill="#10b981"
                shape={(props: any) => {
                  const { cx, cy, fill, payload } = props;
                  const value = payload.scatterValuePositive;
                  if (value === null || value === undefined) return <></>;
                  const offset = prevYearScatterSeries ? 7 : 0; // Move right to align with current year bar
                  return <circle cx={cx + offset} cy={cy} r={4} fill={fill} />;
                }}
              />
            )}
            {/* Current Year Scatter - Negative (Red) - positioned over current year bar (right) */}
            {scatterSeries && (
              <Scatter
                yAxisId="right"
                dataKey="scatterValueNegative"
                name={`${currentYear ? currentYear + '년 ' : ''}${scatterSeries.name} (음수)`}
                fill="#ef4444"
                shape={(props: any) => {
                  const { cx, cy, fill, payload } = props;
                  const value = payload.scatterValueNegative;
                  if (value === null || value === undefined) return <></>;
                  const offset = prevYearScatterSeries ? 7 : 0; // Move right to align with current year bar
                  return <circle cx={cx + offset} cy={cy} r={4} fill={fill} />;
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
