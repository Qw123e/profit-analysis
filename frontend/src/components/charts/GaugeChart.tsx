import React, { useRef, useState, useEffect } from "react";

import { ChartCard } from "@/components/molecules/ChartCard";
import { numberFormat } from "@/utils/snapshotTransformers";

interface GaugeChartProps {
  title: string;
  current: number;
  target: number;
  height?: number;
}

export function GaugeChart({ title, current, target, height = 450 }: GaugeChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const achievementRate = target > 0 ? Math.min((current / target) * 100, 150) : 0;
  const ratio = Math.min(achievementRate, 100) / 100;
  const { w, h } = size;
  const cx = w / 2;
  const pad = 6;
  const footerH = 40;
  const maxR = Math.min(w / 2 - pad, h - footerH - pad);
  const outerR = Math.max(maxR, 20);
  const innerR = outerR * 0.58;
  const strokeW = outerR - innerR;
  const midR = (outerR + innerR) / 2;
  const cy = h - footerH;

  const arcPath = (r: number, startDeg: number, endDeg: number) => {
    const s = (startDeg * Math.PI) / 180;
    const e = (endDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy - r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy - r * Math.sin(e);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1},${y1} A ${r},${r} 0 ${large} 0 ${x2},${y2}`;
  };

  const endAngle = 180 * ratio;

  return (
    <ChartCard
      title={title}
      meta={`목표 ${numberFormat(Math.round(target / 100_000_000))}억`}
      icon={
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 17a8 8 0 1 1 16 0"
            stroke="#0d9488"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M12 12l4-3"
            stroke="#0d9488"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", height, minHeight: 0 }}>
        <div ref={containerRef} style={{ flex: 1, minHeight: 0, width: "100%" }}>
          {w > 0 && (
            <svg width={w} height={h} style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path
                d={arcPath(midR, 0, 180)}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={strokeW}
                strokeLinecap="round"
              />
              {ratio > 0 && (
                <path
                  d={arcPath(midR, 180 - endAngle, 180)}
                  fill="none"
                  stroke="url(#gaugeGrad)"
                  strokeWidth={strokeW}
                  strokeLinecap="round"
                />
              )}
              <text
                x={cx}
                y={cy - midR * 0.45}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(16, Math.min(26, w * 0.12))}
                fontWeight={700}
                fill="#0d9488"
              >
                {achievementRate.toFixed(1)}%
              </text>
              <text
                x={cx}
                y={cy - midR * 0.15}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fill="#94a3b8"
              >
                vs Target
              </text>
              <text
                x={cx}
                y={cy + 14}
                textAnchor="middle"
                fontSize={10}
                fill="#64748b"
              >
                연간 목표:{" "}
                <tspan fontWeight={700} fill="#334155">
                  {numberFormat(Math.round(target / 100_000_000))}
                </tspan>{" "}
                억원
              </text>
              <text
                x={cx}
                y={cy + 28}
                textAnchor="middle"
                fontSize={10}
                fill="#64748b"
              >
                현재 매출:{" "}
                <tspan fontWeight={700} fill="#0d9488">
                  {numberFormat(Math.round(current / 100_000_000))}
                </tspan>{" "}
                억원
              </text>
            </svg>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
