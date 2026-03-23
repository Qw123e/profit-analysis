"use client";

import React, { useState, useEffect } from "react";

import type { AIInsightResponse, KeyInsight, Risk, Opportunity, ActionItem } from "@/types/ai";
import type { FilterValue } from "@/types/common";

interface FilterCondition {
  label: string;
  value: string;
}

interface FilterOption {
  key: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  value: FilterValue;
}

interface AIInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onAnalyze: (filters: Record<string, FilterValue>) => void;
  isLoading: boolean;
  data?: AIInsightResponse | null;
  error?: string | null;
  filterConditions?: FilterCondition[];
  filterOptions?: FilterOption[];
  currentFilters?: Record<string, FilterValue>;
}

export function AIInsightModal({
  isOpen,
  onClose,
  onRefresh,
  onAnalyze,
  isLoading,
  data,
  error,
  filterConditions = [],
  filterOptions = [],
  currentFilters = {},
}: AIInsightModalProps) {
  const [editMode, setEditMode] = useState(true);
  const [localFilters, setLocalFilters] = useState<Record<string, FilterValue>>({});
  const [appliedFilters, setAppliedFilters] = useState<Record<string, FilterValue>>({});

  useEffect(() => {
    if (isOpen) {
      // Only initialize filters when modal first opens and in edit mode
      // Don't reset during analysis (when loading or data exists)
      if (!isLoading && !data) {
        setLocalFilters(currentFilters);
        setEditMode(true);
      } else if (data) {
        setEditMode(false);
      }
    }
  }, [isOpen, currentFilters, data, isLoading]);

  // Separate effect to handle edit mode when data changes
  useEffect(() => {
    if (isOpen && data) {
      setEditMode(false);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const executiveSummary = data?.executive_summary?.trim() ?? "";
  const keyInsights = data?.key_insights ?? [];
  const risks = data?.risks ?? [];
  const opportunities = data?.opportunities ?? [];
  const actionItems = data?.action_items ?? [];
  const outlook = data?.outlook?.trim() ?? "";
  const hasStructured =
    Boolean(executiveSummary) ||
    keyInsights.length > 0 ||
    risks.length > 0 ||
    opportunities.length > 0 ||
    actionItems.length > 0 ||
    Boolean(outlook);

  // Helper functions for styling
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" };
      case "medium": return { bg: "#fef9ec", border: "#fde68a", text: "#d97706" };
      case "low": return { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" };
      default: return { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" };
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive": return { bg: "#f0fdf4", icon: "📈", iconColor: "#16a34a" };
      case "negative": return { bg: "#fef2f2", icon: "📉", iconColor: "#dc2626" };
      case "neutral": return { bg: "#f8fafc", icon: "➡️", iconColor: "#64748b" };
      default: return { bg: "#f8fafc", icon: "ℹ️", iconColor: "#64748b" };
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" };
      case "medium": return { bg: "#fef9ec", border: "#fcd34d", text: "#d97706" };
      case "low": return { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb" };
      default: return { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b" };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "즉시": return { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", icon: "🔥" };
      case "이번주": return { bg: "#fef9ec", border: "#fcd34d", text: "#d97706", icon: "⚡" };
      case "이번달": return { bg: "#eff6ff", border: "#bfdbfe", text: "#2563eb", icon: "📅" };
      default: return { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b", icon: "📋" };
    }
  };

  const handleAnalyzeClick = () => {
    setAppliedFilters(localFilters); // Save the filters used for this analysis
    onAnalyze(localFilters);
    setEditMode(false);
  };

  const handleBackToEdit = () => {
    // Restore the previously applied filters when going back to edit
    setLocalFilters(appliedFilters);
    setEditMode(true);
  };

  const handleRefresh = () => {
    // Re-analyze with the same filters that were applied
    onAnalyze(appliedFilters);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.46)",
        backdropFilter: "blur(2px)",
        zIndex: 65,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(720px, 100%)",
          maxHeight: "88vh",
          overflow: "hidden",
          background: "#ffffff",
          borderRadius: 16,
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
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>🤖 AI 경영 분석</h3>
            <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span>경영진 브리핑용 인사이트 · B2B 제조업 특화</span>
              {data?.model && <span>· {data.model}</span>}
              {!editMode && Object.keys(appliedFilters).length > 0 && (
                <>
                  <span>·</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {filterOptions
                      .filter(opt => appliedFilters[opt.key])
                      .map((opt, idx) => {
                        const selectedOption = opt.options.find(o => o.value === String(appliedFilters[opt.key]));
                        return selectedOption ? (
                          <span
                            key={idx}
                            style={{
                              background: "#f1f5f9",
                              color: "#475569",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            {opt.label}: {selectedOption.label}
                          </span>
                        ) : null;
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!editMode && (
              <>
                <button
                  type="button"
                  onClick={handleBackToEdit}
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#475569",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  disabled={isLoading}
                >
                  필터 수정
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  style={{
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#475569",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  disabled={isLoading}
                >
                  다시 분석
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "none",
                background: "#f1f5f9",
                color: "#475569",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>

        <div style={{ padding: 18, overflow: "auto" }}>
          {/* Filter Edit Mode */}
          {editMode && (
            <div style={{ display: "grid", gap: 16 }}>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
                  📊 분석 조건 설정
                </div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
                  AI가 분석할 데이터의 범위를 설정해주세요. 필터를 조정하여 특정 기간, 고객, 제품 등에 대한 심층 분석을 받을 수 있습니다.
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {filterOptions.map((filter) => (
                  <div key={filter.key}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#334155",
                        marginBottom: 6,
                      }}
                    >
                      {filter.label}
                    </label>
                    <select
                      value={String(localFilters[filter.key] ?? "")}
                      onChange={(e) =>
                        setLocalFilters((prev) => ({
                          ...prev,
                          [filter.key]: e.target.value || undefined,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 13,
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        background: "#ffffff",
                        color: "#0f172a",
                        cursor: "pointer",
                      }}
                    >
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAnalyzeClick}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: isLoading ? "#cbd5e1" : "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isLoading ? (
                  <>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #ffffff",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    🚀 AI 분석 시작
                  </>
                )}
              </button>

              <style jsx>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {/* Results Mode */}
          {!editMode && (
            <>
              {isLoading && (
                <div style={{ color: "#64748b", fontSize: 13 }}>AI가 경영 인사이트를 생성 중입니다...</div>
              )}
              {!isLoading && error && (
                <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
              )}
              {!isLoading && !error && data && (
                <div style={{ display: "grid", gap: 14 }}>
                  {/* Executive Summary */}
                  <section
                    style={{
                      border: "2px solid #bae6fd",
                      borderRadius: 12,
                      padding: "14px 16px",
                      background: "#f0f9ff",
                      boxShadow: "0 2px 4px rgba(14, 116, 144, 0.1)"
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: "#0369a1",
                        color: "#ffffff",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 10
                      }}
                    >
                      📊 경영진 요약
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: "#0f172a", fontWeight: 500 }}>
                      {executiveSummary || "요약 내용이 없습니다."}
                    </div>
                  </section>

                  {/* Key Insights */}
                  {keyInsights.length > 0 && (
                    <section>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                        💡 핵심 인사이트
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {keyInsights.map((insight, idx) => {
                          const urgencyStyle = getUrgencyColor(insight.urgency);
                          const impactStyle = getImpactColor(insight.impact);
                          return (
                            <div
                              key={idx}
                              style={{
                                border: `1px solid ${urgencyStyle.border}`,
                                borderRadius: 10,
                                padding: "12px 14px",
                                background: impactStyle.bg,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1 }}>
                                  {impactStyle.icon} {insight.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: urgencyStyle.text,
                                    background: urgencyStyle.bg,
                                    border: `1px solid ${urgencyStyle.border}`,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    whiteSpace: "nowrap",
                                    marginLeft: 8
                                  }}
                                >
                                  {insight.urgency === "high" ? "🔴 긴급" : insight.urgency === "medium" ? "🟡 주의" : "🟢 모니터링"}
                                </div>
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.6, color: "#1e293b" }}>
                                {insight.detail}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {/* Risks */}
                    <section>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>⚠️ 리스크</div>
                      {risks.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>리스크 항목이 없습니다.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {risks.map((risk, idx) => {
                            const severityStyle = getSeverityColor(risk.severity);
                            return (
                              <div
                                key={idx}
                                style={{
                                  border: `1px solid ${severityStyle.border}`,
                                  borderRadius: 10,
                                  padding: "10px 12px",
                                  background: severityStyle.bg,
                                }}
                              >
                                <div style={{ fontSize: 12, fontWeight: 700, color: severityStyle.text, marginBottom: 4 }}>
                                  {risk.severity === "high" ? "🔴" : risk.severity === "medium" ? "🟡" : "🟢"} {risk.risk}
                                </div>
                                <div style={{ fontSize: 11, color: "#475569", marginTop: 6, paddingTop: 6, borderTop: "1px solid #e2e8f0" }}>
                                  <strong>대응:</strong> {risk.mitigation}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Opportunities */}
                    <section>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#047857", marginBottom: 8 }}>🎯 기회</div>
                      {opportunities.length === 0 ? (
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>기회 항목이 없습니다.</div>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          {opportunities.map((opp, idx) => (
                            <div
                              key={idx}
                              style={{
                                border: "1px solid #a7f3d0",
                                borderRadius: 10,
                                padding: "10px 12px",
                                background: "#ecfdf5",
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#047857", marginBottom: 4 }}>
                                💚 {opp.opportunity}
                              </div>
                              <div style={{ fontSize: 11, color: "#475569", marginTop: 6, paddingTop: 6, borderTop: "1px solid #d1fae5" }}>
                                <strong>기대효과:</strong> {opp.potential_impact}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Action Items */}
                  {actionItems.length > 0 && (
                    <section>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>
                        ✅ 실행 과제
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {actionItems.map((action, idx) => {
                          const priorityStyle = getPriorityColor(action.priority);
                          return (
                            <div
                              key={idx}
                              style={{
                                border: `2px solid ${priorityStyle.border}`,
                                borderRadius: 10,
                                padding: "12px 14px",
                                background: priorityStyle.bg,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1 }}>
                                  {action.action}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: priorityStyle.text,
                                    background: "#ffffff",
                                    border: `1px solid ${priorityStyle.border}`,
                                    padding: "3px 10px",
                                    borderRadius: 999,
                                    whiteSpace: "nowrap",
                                    marginLeft: 8
                                  }}
                                >
                                  {priorityStyle.icon} {action.priority}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#475569", marginTop: 6 }}>
                                <span><strong>담당:</strong> {action.owner}</span>
                                <span><strong>기한:</strong> {action.timeline}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Outlook */}
                  {outlook && (
                    <section
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "12px 14px",
                        background: "#f8fafc",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                        🔮 전망
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.6, color: "#1e293b" }}>
                        {outlook}
                      </div>
                    </section>
                  )}

                  {!hasStructured && data?.raw && (
                    <section
                      style={{
                        border: "1px dashed #cbd5f5",
                        borderRadius: 12,
                        padding: "12px 14px",
                        background: "#eef2ff",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#4c51bf", marginBottom: 6 }}>원문</div>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: 11,
                          lineHeight: 1.6,
                          color: "#1e293b",
                          margin: 0,
                        }}
                      >
                        {data.raw}
                      </pre>
                    </section>
                  )}
                </div>
              )}
              {!isLoading && !error && !data && (
                <div style={{ color: "#94a3b8", fontSize: 13 }}>표시할 인사이트가 없습니다.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
