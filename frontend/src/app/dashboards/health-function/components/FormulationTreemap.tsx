import React from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

interface TreemapItem {
  name: string;
  size: number;
  fill: string;
  salesLabel?: string;
  opm?: number;
}

interface FormulationTreemapProps {
  data: TreemapItem[];
  selectedFormulations: string[];
  onCellClick: (formulation: string) => void;
}

const DIM_FILL = "#cbd5e1";

const TreemapContent = (props: any) => {
  const { x, y, width, height, name, fill, onCellClick, activeNames = null } = props;
  if (width < 20 || height < 16) return null;

  const safeName = typeof name === "string" ? name : "";
  const activeSet: string[] | null = activeNames;
  const hasDrill = activeSet !== null && activeSet.length > 0;
  const isActive = hasDrill && safeName.length > 0 && activeSet.includes(safeName);
  const cellFill = hasDrill && !isActive ? DIM_FILL : fill;
  const strokeColor = isActive ? "#1e293b" : "#fff";
  const strokeW = isActive ? 2.5 : 1.5;

  const charW = 8;
  const maxChars = Math.max(1, Math.floor((width - 8) / charW));
  const showText = width > 22 && height > 16;
  const label = safeName.length > maxChars ? safeName.slice(0, maxChars) + ".." : safeName;
  const fontSize = width < 40 || height < 24 ? 7 : 9;

  return (
    <g style={{ cursor: "pointer" }} onClick={() => onCellClick?.(safeName)}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={cellFill}
        stroke={strokeColor}
        strokeWidth={strokeW}
        rx={3}
      />
      {showText && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={isActive ? 700 : 600}
          fill={hasDrill && !isActive ? "#64748b" : "#fff"}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>
      )}
    </g>
  );
};

export function FormulationTreemap({ data, selectedFormulations, onCellClick }: FormulationTreemapProps) {
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
        <h3 style={{ fontSize: 12 }}>제형별 매출 비중</h3>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            nameKey="name"
            content={
              <TreemapContent
                onCellClick={onCellClick}
                activeNames={selectedFormulations.length > 0 ? selectedFormulations : null}
              />
            }
          >
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                fontSize: 11,
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as any;
                return (
                  <div style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: "8px 12px", fontSize: 11 }}>
                    <p style={{ fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{d.name}</p>
                    <p style={{ color: "#475569" }}>매출: {d.salesLabel}</p>
                    <p style={{ color: "#475569" }}>영업이익: {d.opm}%</p>
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
