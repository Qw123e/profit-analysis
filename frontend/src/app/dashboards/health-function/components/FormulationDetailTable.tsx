import React from "react";

interface DetailDataItem {
  foodType: string;
  functionCategory: string;
  formulation: string;
  totalSales: number;
  operatingProfit: number;
  opm: number;
}

interface FormulationDetailTableProps {
  data: DetailDataItem[];
  categoryMode?: "function" | "formulation";
  onDetailSelect?: (row: { foodType: string; functionCategory: string; formulation: string }) => void;
}

export function FormulationDetailTable({ data, categoryMode = "function", onDetailSelect }: FormulationDetailTableProps) {
  const isFormulationMode = categoryMode === "formulation";
  const primaryLabel = isFormulationMode ? "제형 카테고리" : "기능 카테고리";
  const secondaryLabel = isFormulationMode ? "기능" : "제형";
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 12,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      padding: 12,
      border: "1px solid #e2e8f0",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#334155", fontWeight: 600 }}>
          <h3 style={{ fontSize: 12 }}>계층별 상세 실적</h3>
        </div>
        <span style={{ fontSize: 9, color: "#94a3b8", background: "#f8fafc", padding: "2px 6px", borderRadius: 4 }}>
          단위: 억원, %
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <table style={{ width: "100%", fontSize: 12, textAlign: "left", borderSpacing: 0 }}>
          <thead style={{ background: "#f8fafc", color: "#64748b", textTransform: "uppercase", fontWeight: 600, fontSize: 9, position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            <tr>
              <th style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>식품분류</th>
              <th style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>{primaryLabel}</th>
              <th style={{ padding: "8px", borderBottom: "1px solid #cbd5e1" }}>{secondaryLabel}</th>
              <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #cbd5e1" }}>매출(억)</th>
              <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #cbd5e1" }}>영업이익(억)</th>
              <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #cbd5e1" }}>영업이익(%)</th>
            </tr>
          </thead>
          <tbody style={{ background: "#ffffff" }}>
            {data.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff80")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => onDetailSelect?.({ foodType: row.foodType, functionCategory: row.functionCategory, formulation: row.formulation })}
              >
                <td style={{ padding: "6px 8px", fontSize: 10, color: "#64748b" }}>{row.foodType}</td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontSize: 10,
                    fontWeight: 500,
                    color: "#3b82f6",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 120,
                    textDecoration: "underline",
                    textDecorationColor: "#bfdbfe"
                  }}
                  title={isFormulationMode ? row.formulation : row.functionCategory}
                >
                  {isFormulationMode ? row.formulation : row.functionCategory}
                </td>
                <td style={{ padding: "6px 8px", fontSize: 10, color: "#475569" }}>
                  {isFormulationMode ? row.functionCategory : row.formulation}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontSize: 10, fontWeight: 500, color: "#334155" }}>
                  {row.totalSales.toLocaleString()}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontSize: 10, color: row.operatingProfit >= 0 ? "#475569" : "#ef4444" }}>
                  {row.operatingProfit.toLocaleString()}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontSize: 10, color: row.opm >= 0 ? "#10b981" : "#ef4444" }}>
                  {row.opm.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
