"use client";

import { useState, useEffect, useCallback } from "react";
import type { TargetItem, ThresholdConfig } from "@/types/target";

interface TargetSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: TargetItem[];
  threshold: ThresholdConfig;
  onSaveTargets: (targets: TargetItem[]) => Promise<unknown>;
  onSaveThreshold: (config: ThresholdConfig) => Promise<unknown>;
  availableYears: number[];
  companyCodes?: string[];
  selectedCompany?: string;
  onCompanyChange?: (companyCode?: string) => void;
  isSaving?: boolean;
}

interface MonthRow {
  month: number;
  salesTarget: string;
  opTarget: string;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const COMPANY_NAME_MAP: Record<string, string> = {
  "1400": "BIO",
  "1700": "NBT",
};

const getCompanyDisplayName = (code: string): string => {
  return COMPANY_NAME_MAP[code] ? `${code} (${COMPANY_NAME_MAP[code]})` : code;
};

const createEmptyRows = (): MonthRow[] =>
  MONTHS.map((m) => ({ month: m, salesTarget: "", opTarget: "" }));

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 12,
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  border: "1px solid #f1f5f9",
  maxWidth: 700,
  width: "100%",
  margin: 16,
  maxHeight: "85vh",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid #f1f5f9",
  flexShrink: 0,
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 14,
  borderRadius: 8,
  padding: "8px 12px",
  outline: "none",
  width: "100%",
  textAlign: "right",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 120,
  textAlign: "left",
  cursor: "pointer",
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 500,
  color: "#ffffff",
  backgroundColor: "#3b82f6",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 500,
  color: "#64748b",
  backgroundColor: "#f1f5f9",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};

export function TargetSettingModal({
  isOpen,
  onClose,
  targets,
  threshold,
  onSaveTargets,
  onSaveThreshold,
  availableYears,
  companyCodes,
  selectedCompany,
  onCompanyChange,
  isSaving = false,
}: TargetSettingModalProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [rows, setRows] = useState<MonthRow[]>(createEmptyRows());
  const [editThreshold, setEditThreshold] = useState<ThresholdConfig>({
    ...threshold,
  });
  const [draftTargets, setDraftTargets] = useState<TargetItem[]>([]);

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (!isOpen) return;
    setDraftTargets([...targets]);
    setEditThreshold({ ...threshold });
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [isOpen, targets, threshold, availableYears, selectedYear]);

  // 연도 변경 시 rows 업데이트
  useEffect(() => {
    if (!isOpen) return;
    const newRows = createEmptyRows();
    const companyKey = selectedCompany ?? "ALL";
    draftTargets
      .filter((t) => t.year === selectedYear && (t.company_code ?? "ALL") === companyKey)
      .forEach((t) => {
        const row = newRows.find((r) => r.month === t.month);
        if (row) {
          row.salesTarget = t.sales_target ? String(t.sales_target) : "";
          row.opTarget = t.op_target ? String(t.op_target) : "";
        }
      });
    setRows(newRows);
  }, [selectedYear, draftTargets, isOpen, selectedCompany]);

  const updateRow = useCallback(
    (month: number, field: "salesTarget" | "opTarget", value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.month === month ? { ...r, [field]: value } : r))
      );
      setDraftTargets((prev) => {
        const companyKey = selectedCompany ?? "ALL";
        const filtered = prev.filter(
          (t) =>
            !(
              t.year === selectedYear &&
              t.month === month &&
              (t.company_code ?? "ALL") === companyKey
            )
        );
        const currentRow = rows.find((r) => r.month === month);
        const sales =
          field === "salesTarget"
            ? parseFloat(value) || 0
            : parseFloat(currentRow?.salesTarget || "0") || 0;
        const op =
          field === "opTarget"
            ? parseFloat(value) || 0
            : parseFloat(currentRow?.opTarget || "0") || 0;
        if (sales === 0 && op === 0) return filtered;
        return [
          ...filtered,
          {
            year: selectedYear,
            month,
            sales_target: sales,
            op_target: op,
            company_code: companyKey,
          },
        ];
      });
    },
    [selectedYear, rows, selectedCompany]
  );

  const calcOPM = (sales: string, op: string): string => {
    const s = parseFloat(sales);
    const o = parseFloat(op);
    if (!s || s === 0) return "-";
    return ((o / s) * 100).toFixed(1);
  };

  const handleSave = async () => {
    const companyKey = selectedCompany ?? "ALL";
    const cleanTargets = draftTargets
      .map((t) => ({ ...t, company_code: t.company_code ?? companyKey }))
      .filter((t) => t.sales_target !== 0 || t.op_target !== 0);
    await onSaveTargets(cleanTargets);
    await onSaveThreshold(editThreshold);
    onClose();
  };

  if (!isOpen) return null;

  const yearsToShow =
    availableYears.length > 0
      ? availableYears
      : [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            목표 설정
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: 20 }}>
          {/* Selector Row */}
          <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={selectStyle}
            >
              {yearsToShow.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={selectedCompany ?? ""}
              onChange={(e) => onCompanyChange?.(e.target.value || undefined)}
              style={{ ...selectStyle, width: 180 }}
            >
              <option value="">전체 법인</option>
              {(companyCodes ?? []).map((code) => (
                <option key={code} value={code}>
                  {getCompanyDisplayName(code)}
                </option>
              ))}
            </select>
          </div>

          {/* Target Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: "#64748b",
                      fontWeight: 500,
                      width: 60,
                    }}
                  >
                    월
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    매출 목표(억)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    영업이익(억)
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 12px",
                      color: "#64748b",
                      fontWeight: 500,
                      width: 100,
                    }}
                  >
                    OPM(%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.month}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td
                      style={{
                        padding: "6px 12px",
                        color: "#475569",
                        fontWeight: 500,
                      }}
                    >
                      {row.month}월
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input
                        type="number"
                        value={row.salesTarget}
                        onChange={(e) =>
                          updateRow(row.month, "salesTarget", e.target.value)
                        }
                        style={inputStyle}
                        placeholder="0"
                      />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <input
                        type="number"
                        value={row.opTarget}
                        onChange={(e) =>
                          updateRow(row.month, "opTarget", e.target.value)
                        }
                        style={inputStyle}
                        placeholder="0"
                      />
                    </td>
                    <td style={{ padding: "6px 12px" }}>
                      <div
                        style={{
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          color: "#64748b",
                          fontSize: 14,
                          borderRadius: 8,
                          padding: "8px 12px",
                          textAlign: "right",
                        }}
                      >
                        {calcOPM(row.salesTarget, row.opTarget)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Threshold Settings */}
          <div
            style={{
              marginTop: 24,
              padding: 16,
              backgroundColor: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 12,
              }}
            >
              달성률 기준 설정
            </h3>
            <div
              style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    flexShrink: 0,
                  }}
                />
                <label style={{ fontSize: 14, color: "#475569", whiteSpace: "nowrap" }}>
                  초록 (≥)
                </label>
                <input
                  type="number"
                  value={editThreshold.green_min}
                  onChange={(e) =>
                    setEditThreshold((prev) => ({
                      ...prev,
                      green_min: Number(e.target.value),
                    }))
                  }
                  style={{ ...inputStyle, width: 70 }}
                />
                <span style={{ fontSize: 14, color: "#94a3b8" }}>%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                    flexShrink: 0,
                  }}
                />
                <label style={{ fontSize: 14, color: "#475569", whiteSpace: "nowrap" }}>
                  노랑 (≥)
                </label>
                <input
                  type="number"
                  value={editThreshold.yellow_min}
                  onChange={(e) =>
                    setEditThreshold((prev) => ({
                      ...prev,
                      yellow_min: Number(e.target.value),
                    }))
                  }
                  style={{ ...inputStyle, width: 70 }}
                />
                <span style={{ fontSize: 14, color: "#94a3b8" }}>%</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, color: "#64748b" }}>미만 = 빨강</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            padding: "16px 20px",
            borderTop: "1px solid #f1f5f9",
            flexShrink: 0,
          }}
        >
          <button onClick={onClose} style={buttonSecondaryStyle}>
            취소
          </button>
          <button
            onClick={handleSave}
            style={{
              ...buttonPrimaryStyle,
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
