import React from "react";

import { numberFormat } from "@/utils/snapshotTransformers";
import { cardStyle } from "@/utils/dashboardStyles";

export function CustomerProfitTable({
  data
}: {
  data: {
    prevLabel: string;
    currLabel: string;
    customers: Array<{
      name: string;
      prevSales: number | null;
      prevGross: number | null;
      prevMargin: number | null;
      currSales: number;
      currGross: number;
      currMargin: number;
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
    padding: "7px 6px",
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
    padding: "6px 6px",
    border: "1px solid #d1d5db",
    textAlign: "right",
    color: "#0f172a"
  };

  const labelStyle: React.CSSProperties = {
    ...cellStyle,
    textAlign: "left",
    fontWeight: 600
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

  const formatRate = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(1)}%`;
  };

  return (
    <div style={{ ...cardStyle, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
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
          고객별 손익
        </span>
        <span style={{ fontSize: 11, color: "#64748b" }}>(억원)</span>
      </div>
      <div style={{ overflowX: "auto", maxHeight: 360, overflowY: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle} rowSpan={2}>#</th>
              <th style={thStyle} rowSpan={2}>고객</th>
              <th style={thStyle} colSpan={3}>{data.prevLabel}</th>
              <th style={{ ...thStyle, ...highlightCellStyle }} colSpan={3}>{data.currLabel}</th>
              <th style={thStyle} colSpan={3}>전년비</th>
            </tr>
            <tr>
              <th style={subHeadStyle}>매출</th>
              <th style={subHeadStyle}>매출이익</th>
              <th style={subHeadStyle}>이익률</th>
              <th style={{ ...subHeadStyle, ...highlightCellStyle }}>매출</th>
              <th style={{ ...subHeadStyle, ...highlightCellStyle }}>매출이익</th>
              <th style={{ ...subHeadStyle, ...highlightCellStyle }}>이익률</th>
              <th style={subHeadStyle}>매출</th>
              <th style={subHeadStyle}>매출이익</th>
              <th style={subHeadStyle}>이익률</th>
            </tr>
          </thead>
          <tbody>
            {data.customers.map((row, idx) => {
              const salesDiff = row.prevSales !== null ? row.currSales - row.prevSales : null;
              const grossDiff = row.prevGross !== null ? row.currGross - row.prevGross : null;
              const marginDiff = row.prevMargin !== null ? row.currMargin - row.prevMargin : null;
              return (
                <tr key={`${row.name}-${idx}`}>
                  <td style={{ ...cellStyle, textAlign: "center" }}>{idx + 1}</td>
                  <td style={labelStyle}>{row.name}</td>
                  <td style={cellStyle}>{formatAmount(row.prevSales)}</td>
                  <td style={cellStyle}>{formatAmount(row.prevGross)}</td>
                  <td style={cellStyle}>{formatRate(row.prevMargin)}</td>
                  <td style={{ ...cellStyle, ...highlightCellStyle }}>{formatAmount(row.currSales)}</td>
                  <td style={{ ...cellStyle, ...highlightCellStyle }}>{formatAmount(row.currGross)}</td>
                  <td style={{ ...cellStyle, ...highlightCellStyle }}>{formatRate(row.currMargin)}</td>
                  <td style={cellStyle}>{salesDiff === null ? "-" : `${salesDiff > 0 ? "+" : ""}${formatAmount(salesDiff)}`}</td>
                  <td style={cellStyle}>{grossDiff === null ? "-" : `${grossDiff > 0 ? "+" : ""}${formatAmount(grossDiff)}`}</td>
                  <td style={cellStyle}>{marginDiff === null ? "-" : `${marginDiff > 0 ? "+" : ""}${marginDiff.toFixed(1)}%p`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
