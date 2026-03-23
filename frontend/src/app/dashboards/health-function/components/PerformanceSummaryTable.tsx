import React from "react";

import { numberFormat } from "@/utils/snapshotTransformers";
import { cardStyle } from "@/utils/dashboardStyles";

export function PerformanceSummaryTable({
  data
}: {
  data: {
    prevLabel: string;
    currLabel: string;
    rows: Array<{
      label: string;
      prevValue: number | null;
      currValue: number | null;
      bold?: boolean;
    }>;
  } | null;
}) {
  if (!data) return null;

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12
  };

  const thStyle: React.CSSProperties = {
    background: "#0b2a66",
    color: "#ffffff",
    padding: "8px 6px",
    fontWeight: 700,
    border: "1px solid #0f3b8f",
    textAlign: "center"
  };

  const subHeadStyle: React.CSSProperties = {
    background: "#12357a",
    color: "#ffffff",
    padding: "6px 6px",
    fontWeight: 600,
    border: "1px solid #0f3b8f",
    textAlign: "center"
  };

  const cellStyle: React.CSSProperties = {
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    textAlign: "right",
    color: "#0f172a"
  };

  const labelStyle: React.CSSProperties = {
    ...cellStyle,
    textAlign: "left",
    fontWeight: 600,
    background: "#f8fafc"
  };

  const highlightCellStyle: React.CSSProperties = {
    background: "#fff4bf",
    borderLeft: "2px solid #fbbf24",
    borderRight: "2px solid #fbbf24"
  };

  const formatAmount = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return numberFormat(Math.round(value / 100_000_000));
  };

  const formatShare = (value: number | null, sales: number | null) => {
    if (value === null || sales === null || sales === 0) return "-";
    return `${((value / sales) * 100).toFixed(1)}%`;
  };

  return (
    <div style={{ ...cardStyle, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span
          style={{
            padding: "6px 12px",
            background: "#0f172a",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 6
          }}
        >
          실적 요약
        </span>
        <span style={{ fontSize: 11, color: "#64748b" }}>(억원)</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...thStyle }} rowSpan={2}>구분</th>
              <th style={{ ...thStyle }} colSpan={2}>{data.prevLabel}</th>
              <th style={{ ...thStyle }} colSpan={2}>{data.currLabel}</th>
              <th style={{ ...thStyle }} colSpan={2}>전년비</th>
            </tr>
            <tr>
              <th style={subHeadStyle}>금액</th>
              <th style={subHeadStyle}>구성비</th>
              <th style={subHeadStyle}>금액</th>
              <th style={subHeadStyle}>구성비</th>
              <th style={subHeadStyle}>증감액</th>
              <th style={subHeadStyle}>구성비 차이</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => {
              const prevSales = data.rows[0].prevValue;
              const currSales = data.rows[0].currValue;
              const prevShare = formatShare(row.prevValue, prevSales);
              const currShare = formatShare(row.currValue, currSales);
              const diff = row.prevValue !== null && row.currValue !== null ? row.currValue - row.prevValue : null;
              const shareDiff =
                row.prevValue !== null && row.currValue !== null && prevSales && currSales
                  ? (row.currValue / currSales - row.prevValue / prevSales) * 100
                  : null;
              const rowStyle = row.bold
                ? { fontWeight: 700, background: "#f1f5f9" }
                : {};

              return (
                <tr key={`${row.label}-${idx}`} style={rowStyle}>
                  <td style={labelStyle}>{row.label}</td>
                  <td style={cellStyle}>{formatAmount(row.prevValue)}</td>
                  <td style={cellStyle}>{prevShare}</td>
                  <td style={{ ...cellStyle, ...highlightCellStyle }}>{formatAmount(row.currValue)}</td>
                  <td style={{ ...cellStyle, ...highlightCellStyle }}>{currShare}</td>
                  <td style={cellStyle}>{diff === null ? "-" : `${diff > 0 ? "+" : ""}${formatAmount(diff)}`}</td>
                  <td style={cellStyle}>
                    {shareDiff === null ? "-" : `${shareDiff > 0 ? "+" : ""}${shareDiff.toFixed(1)}%p`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
