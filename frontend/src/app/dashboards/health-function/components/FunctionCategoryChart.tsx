import React from "react";
import {
  ComposedChart,
  Bar,
  Cell,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CategoryDataItem {
  name: string;
  totalSales: number;
  operatingProfit: number;
  opm: number;
  prevYearSales?: number;
}

interface FunctionCategoryChartProps {
  data: CategoryDataItem[];
  prevYearData?: CategoryDataItem[];
  currentYear?: string;
  prevYear?: string;
  onCategorySelect?: (name: string) => void;
  title?: string;
}

export function FunctionCategoryChart({ data, prevYearData, currentYear, prevYear, onCategorySelect, title }: FunctionCategoryChartProps) {
  // Merge current year data with previous year data
  const hasPrevYearData = prevYearData && prevYearData.length > 0 && currentYear && prevYear;
  const prevYearMap = new Map<string, CategoryDataItem>();

  if (hasPrevYearData) {
    prevYearData.forEach(item => prevYearMap.set(item.name, item));
  }

  const chartData = data.map(item => {
    const prevYearItem = prevYearMap.get(item.name);
    const currentOP = item.operatingProfit;
    const prevYearOP = prevYearItem?.operatingProfit ?? null;

    return {
      ...item,
      prevYearSales: prevYearItem?.totalSales ?? 0,
      prevYearOperatingProfit: prevYearOP,
      // Split operating profit by sign for conditional coloring
      operatingProfitPositive: currentOP >= 0 ? currentOP : null,
      operatingProfitNegative: currentOP < 0 ? currentOP : null,
      prevYearOperatingProfitPositive: prevYearOP !== null && prevYearOP >= 0 ? prevYearOP : null,
      prevYearOperatingProfitNegative: prevYearOP !== null && prevYearOP < 0 ? prevYearOP : null,
    };
  });

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 12,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      padding: 10,
      border: "1px solid #e2e8f0",
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 600, marginBottom: 4, flexShrink: 0 }}>
        <h3 style={{ fontSize: 12 }}>{title ?? "기능카테고리별 매출 & 영업이익 (Top 10)"}</h3>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={40}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}억`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 9, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}억`}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                fontSize: 11,
              }}
              formatter={(value: number, name: string) => {
                return [`${value.toLocaleString()}억`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} />
            {hasPrevYearData && (
              <Bar
                yAxisId="left"
                dataKey="prevYearSales"
                name={`${prevYear}년 매출`}
                radius={[3, 3, 0, 0]}
                barSize={14}
                cursor="pointer"
                onClick={(d: any) => onCategorySelect?.(d.name)}
              >
                {chartData.map((entry) => (
                  <Cell key={`${entry.name}-prev`} fill="#cbd5e1" />
                ))}
              </Bar>
            )}
            <Bar
              yAxisId="left"
              dataKey="totalSales"
              name={hasPrevYearData ? `${currentYear}년 매출` : "매출"}
              radius={[3, 3, 0, 0]}
              barSize={14}
              cursor="pointer"
              onClick={(d: any) => onCategorySelect?.(d.name)}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill="#3b82f6" />
              ))}
            </Bar>
            {/* Previous Year Operating Profit - Positive (Light Green) - positioned over prev year bar (left) */}
            {hasPrevYearData && (
              <Scatter
                yAxisId="right"
                dataKey="prevYearOperatingProfitPositive"
                name={`${prevYear}년 영업이익 (흑자)`}
                fill="#86efac"
                fillOpacity={0.6}
                shape={(props: any) => {
                  const { cx, cy, fill, payload } = props;
                  const value = payload.prevYearOperatingProfitPositive;
                  if (value === null || value === undefined) return <></>;
                  const offset = hasPrevYearData ? -7 : 0; // Move left to align with prev year bar
                  return <circle cx={cx + offset} cy={cy} r={4} fill={fill} fillOpacity={0.6} />;
                }}
              />
            )}
            {/* Previous Year Operating Profit - Negative (Light Red) - positioned over prev year bar (left) */}
            {hasPrevYearData && (
              <Scatter
                yAxisId="right"
                dataKey="prevYearOperatingProfitNegative"
                name={`${prevYear}년 영업이익 (적자)`}
                fill="#fca5a5"
                fillOpacity={0.6}
                shape={(props: any) => {
                  const { cx, cy, fill, payload } = props;
                  const value = payload.prevYearOperatingProfitNegative;
                  if (value === null || value === undefined) return <></>;
                  const offset = hasPrevYearData ? -7 : 0; // Move left to align with prev year bar
                  return <circle cx={cx + offset} cy={cy} r={4} fill={fill} fillOpacity={0.6} />;
                }}
              />
            )}
            {/* Current Year Operating Profit - Positive (Green) - positioned over current year bar (right) */}
            <Scatter
              yAxisId="right"
              dataKey="operatingProfitPositive"
              name={`${hasPrevYearData ? currentYear + '년 ' : ''}영업이익 (흑자)`}
              fill="#10b981"
              shape={(props: any) => {
                const { cx, cy, fill, payload } = props;
                const value = payload.operatingProfitPositive;
                if (value === null || value === undefined) return <></>;
                const offset = hasPrevYearData ? 7 : 0; // Move right to align with current year bar
                return <circle cx={cx + offset} cy={cy} r={4} fill={fill} />;
              }}
            />
            {/* Current Year Operating Profit - Negative (Red) - positioned over current year bar (right) */}
            <Scatter
              yAxisId="right"
              dataKey="operatingProfitNegative"
              name={`${hasPrevYearData ? currentYear + '년 ' : ''}영업이익 (적자)`}
              fill="#ef4444"
              shape={(props: any) => {
                const { cx, cy, fill, payload } = props;
                const value = payload.operatingProfitNegative;
                if (value === null || value === undefined) return <></>;
                const offset = hasPrevYearData ? 7 : 0; // Move right to align with current year bar
                return <circle cx={cx + offset} cy={cy} r={4} fill={fill} />;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
