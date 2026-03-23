"use client";

import React, { useState } from "react";

export interface DataTableProps {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  pageSize?: number;
  variant?: "light" | "dark";
  title?: string;
  subtitle?: string;
  meta?: string;
  icon?: React.ReactNode;
}

export function DataTable({
  columns,
  rows,
  pageSize = 50,
  variant = "light",
  title,
  subtitle,
  meta,
  icon
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.ceil(rows.length / pageSize);
  const startIdx = currentPage * pageSize;
  const endIdx = startIdx + pageSize;
  const currentRows = rows.slice(startIdx, endIdx);

  const isDark = variant === "dark";
  const cardStyle: React.CSSProperties = {
    background: isDark ? "#111a2e" : "var(--table-bg)",
    borderRadius: 12,
    padding: 16,
    border: isDark ? "1px solid rgba(148, 163, 184, 0.1)" : "1px solid var(--table-border)",
    boxShadow: isDark ? "0 1px 2px rgba(15, 23, 42, 0.2)" : "0 1px 2px rgba(15, 23, 42, 0.06)"
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 12
  };

  const thStyle: React.CSSProperties = {
    padding: "10px 8px",
    textAlign: "left",
    borderBottom: isDark ? "2px solid #334155" : "1px solid var(--table-border)",
    color: isDark ? "#94a3b8" : "var(--table-head-text)",
    fontWeight: 600,
    position: "sticky",
    top: 0,
    background: isDark ? "#111a2e" : "var(--table-head-bg)",
    textTransform: "uppercase",
    fontSize: 10,
    letterSpacing: "0.04em"
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 8px",
    borderBottom: isDark ? "1px solid #1e293b" : "1px solid var(--table-border)",
    color: isDark ? "#e2e8f0" : "var(--table-text)"
  };

  const paginationStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 999,
    border: isDark ? "1px solid #475569" : "1px solid var(--table-border)",
    background: isDark ? "#1e293b" : "var(--table-head-bg)",
    color: isDark ? "#e2e8f0" : "var(--table-text)",
    cursor: "pointer"
  };

  return (
    <div style={cardStyle}>
      {(title || subtitle || meta) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {icon && (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: isDark ? "#1f2a44" : "var(--chart-icon-bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      {icon}
                    </div>
                  )}
              {title && (
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isDark ? "#e2e8f0" : "var(--table-text)" }}>
                  {title}
                </h3>
              )}
            </div>
            {subtitle && (
              <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "var(--table-subtext)", marginTop: 4 }}>
                {subtitle}
              </div>
            )}
          </div>
          {meta && (
            <span
              style={{
                alignSelf: "flex-start",
                fontSize: 10,
                fontWeight: 600,
                color: isDark ? "#cbd5f5" : "var(--table-meta-text)",
                background: isDark ? "#111a2e" : "var(--table-meta-bg)",
                padding: "2px 6px",
                borderRadius: 999
              }}
            >
              {meta}
            </span>
          )}
        </div>
      )}
      <div style={{ maxHeight: 600, overflow: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={thStyle}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: isDark ? "#111a2e" : "var(--table-bg)" }}>
            {currentRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{ transition: "background 0.2s ease" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? "#17233b" : "var(--table-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? "#111a2e" : "var(--table-bg)";
                }}
              >
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} style={tdStyle}>
                    {cell === null ? <span style={{ color: "#64748b" }}>null</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={paginationStyle}>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            style={{
              ...buttonStyle,
              opacity: currentPage === 0 ? 0.5 : 1,
              cursor: currentPage === 0 ? "not-allowed" : "pointer"
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: isDark ? "#94a3b8" : "var(--table-subtext)" }}>
            Page {currentPage + 1} of {totalPages} ({rows.length} rows)
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            style={{
              ...buttonStyle,
              opacity: currentPage === totalPages - 1 ? 0.5 : 1,
              cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer"
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
