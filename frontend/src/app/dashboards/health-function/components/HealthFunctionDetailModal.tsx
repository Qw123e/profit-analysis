"use client";

import React, { useEffect, useMemo, useState } from "react";

import { numberFormat } from "@/utils/snapshotTransformers";

interface DetailRow {
  name: string;
  sales: number;
  operatingProfit: number;
  opm: number;
}

type DetailTab = "customer" | "product";

interface HealthFunctionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleSuffix?: string;
  defaultTab?: DetailTab;
  customerRows: DetailRow[];
  productRows: DetailRow[];
  isLoading?: boolean;
  onSelectCustomer?: (name: string) => void;
  onSelectProduct?: (name: string) => void;
}

const toEok = (value: number) => value / 100_000_000;
const formatEok = (value: number) => {
  const eok = toEok(value);
  // If less than 1억 (< 1), show 1 decimal place, otherwise show integer
  if (Math.abs(eok) < 1) {
    return eok.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return Math.round(eok).toLocaleString("ko-KR");
};

export function HealthFunctionDetailModal({
  isOpen,
  onClose,
  title,
  titleSuffix,
  defaultTab = "customer",
  customerRows,
  productRows,
  isLoading = false,
  onSelectCustomer,
  onSelectProduct,
}: HealthFunctionDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>(defaultTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  const headerTitle = useMemo(() => {
    if (!titleSuffix) return title;
    return `${title} · ${titleSuffix}`;
  }, [title, titleSuffix]);

  const rows = activeTab === "customer" ? customerRows : productRows;
  const topRows = rows.slice(0, 20);
  const isRowClickable = activeTab === "customer" ? !!onSelectCustomer : !!onSelectProduct;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.46)",
        backdropFilter: "blur(2px)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(860px, 100%)",
          maxHeight: "88vh",
          overflow: "hidden",
          background: "#ffffff",
          borderRadius: 18,
          border: "1px solid #e2e8f0",
          boxShadow: "0 24px 40px rgba(15, 23, 42, 0.22)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{headerTitle}</h3>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {isLoading ? "데이터 로딩 중..." : "Top 20 · 단위: 억원, %"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              color: "#475569",
              borderRadius: 10,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { key: "customer", label: "고객사별" },
              { key: "product", label: "제품별" },
            ] as const).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: isActive ? "1px solid #2563eb" : "1px solid #e2e8f0",
                    background: isActive ? "#eff6ff" : "#ffffff",
                    color: isActive ? "#1d4ed8" : "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{ overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>#</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#64748b" }}>
                    {activeTab === "customer" ? "고객사" : "제품"}
                  </th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#64748b" }}>매출(억)</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#64748b" }}>영업이익(억)</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600, color: "#64748b" }}>영업이익(%)</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={5} style={{ padding: "24px 12px", textAlign: "center", color: "#94a3b8" }}>
                      상세 데이터를 불러오는 중...
                    </td>
                  </tr>
                )}
                {!isLoading && topRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "24px 12px", textAlign: "center", color: "#94a3b8" }}>
                      데이터가 없습니다.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  topRows.map((row, idx) => (
                    <tr
                      key={`${row.name}-${idx}`}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: isRowClickable ? "pointer" : "default" }}
                      onClick={() => {
                        if (activeTab === "customer") {
                          onSelectCustomer?.(row.name);
                        } else {
                          onSelectProduct?.(row.name);
                        }
                      }}
                    >
                      <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{idx + 1}</td>
                      <td
                        style={{
                          padding: "10px 12px",
                          color: "#0f172a",
                          fontWeight: 600,
                          textDecoration: isRowClickable ? "underline" : "none",
                          textUnderlineOffset: 2
                        }}
                        title={row.name}
                      >
                        {row.name}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: "#0f172a" }}>
                        {formatEok(row.sales)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: row.operatingProfit >= 0 ? "#334155" : "#ef4444",
                        }}
                      >
                        {formatEok(row.operatingProfit)}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          textAlign: "right",
                          color: row.opm >= 0 ? "#10b981" : "#ef4444",
                          fontWeight: 600,
                        }}
                      >
                        {row.opm.toFixed(1)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!isLoading && rows.length > 20 && (
            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
              총 {numberFormat(rows.length)}개 중 상위 20개 표시
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
