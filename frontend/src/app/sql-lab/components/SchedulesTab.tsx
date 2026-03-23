"use client";

import React, { useState, useCallback } from "react";
import { scheduledQueryService, ScheduledQuery } from "@/services/scheduledQueryService";
import { SavedQuery } from "@/services/savedQueryService";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

interface SchedulesTabProps {
  scheduledQueries: ScheduledQuery[];
  savedQueries: SavedQuery[];
  dashboards: Array<{ key: string; name: string }>;
  onMutate: () => void;
  onMutateLogs?: () => void;
}

export function SchedulesTab({ scheduledQueries, savedQueries, dashboards, onMutate, onMutateLogs }: SchedulesTabProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [scheduleSavedQueryId, setScheduleSavedQueryId] = useState<number | null>(null);
  const [scheduleDashboardKey, setScheduleDashboardKey] = useState("");
  const [scheduleFeedKey, setScheduleFeedKey] = useState("");
  const [scheduleCron, setScheduleCron] = useState("0 9 * * *");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [runningIds, setRunningIds] = useState<Set<number>>(new Set());
  const [runMessages, setRunMessages] = useState<Record<number, { type: "success" | "error"; text: string }>>({});

  // Get saved query name by ID
  const getSavedQueryName = (savedQueryId: number): string => {
    const query = savedQueries.find((q) => q.id === savedQueryId);
    return query ? query.name : `Query #${savedQueryId}`;
  };

  // Open Edit Modal
  const handleEditSchedule = useCallback((schedule: ScheduledQuery) => {
    setEditingScheduleId(schedule.id);
    setScheduleSavedQueryId(schedule.saved_query_id);
    setScheduleDashboardKey(schedule.dashboard_key);
    setScheduleFeedKey(schedule.feed_key);
    setScheduleCron(schedule.schedule_cron);
    setScheduleDescription(schedule.description || "");
    setShowScheduleModal(true);
  }, []);

  // Create or Update Schedule
  const handleSaveSchedule = useCallback(async () => {
    if (!scheduleSavedQueryId || !scheduleDashboardKey.trim() || !scheduleFeedKey.trim()) {
      setScheduleMessage({ type: "error", text: "모든 필수 항목을 입력해주세요." });
      return;
    }

    setScheduleMessage(null);
    try {
      if (editingScheduleId) {
        // Update existing schedule
        await scheduledQueryService.update(editingScheduleId, {
          schedule_cron: scheduleCron,
          description: scheduleDescription || undefined,
        });
        setScheduleMessage({ type: "success", text: "스케줄이 수정되었습니다." });
      } else {
        // Create new schedule
        await scheduledQueryService.create({
          saved_query_id: scheduleSavedQueryId,
          dashboard_key: scheduleDashboardKey,
          feed_key: scheduleFeedKey,
          schedule_cron: scheduleCron,
          description: scheduleDescription || undefined,
          is_active: true,
        });
        setScheduleMessage({ type: "success", text: "스케줄이 생성되었습니다." });
      }
      onMutate();
      setTimeout(() => {
        setShowScheduleModal(false);
        setEditingScheduleId(null);
        setScheduleSavedQueryId(null);
        setScheduleDashboardKey("");
        setScheduleFeedKey("");
        setScheduleCron("0 9 * * *");
        setScheduleDescription("");
        setScheduleMessage(null);
      }, 1000);
    } catch (err) {
      setScheduleMessage({
        type: "error",
        text: err instanceof Error ? err.message : editingScheduleId ? "스케줄 수정 실패" : "스케줄 생성 실패",
      });
    }
  }, [editingScheduleId, scheduleSavedQueryId, scheduleDashboardKey, scheduleFeedKey, scheduleCron, scheduleDescription, onMutate]);

  // Delete Schedule
  const handleDeleteSchedule = useCallback(
    async (scheduleId: number) => {
      if (!confirm("이 스케줄을 삭제하시겠습니까?")) return;

      try {
        await scheduledQueryService.delete(scheduleId);
        onMutate();
      } catch (err) {
        console.error("스케줄 삭제 실패:", err);
        alert(err instanceof Error ? err.message : "스케줄 삭제 실패");
      }
    },
    [onMutate]
  );

  // Toggle Schedule Active
  const handleToggleSchedule = useCallback(
    async (scheduleId: number, currentActive: boolean) => {
      try {
        await scheduledQueryService.update(scheduleId, { is_active: !currentActive });
        onMutate();
      } catch (err) {
        console.error("스케줄 활성화 토글 실패:", err);
        alert(err instanceof Error ? err.message : "스케줄 활성화 토글 실패");
      }
    },
    [onMutate]
  );

  // Run Schedule Now (Manual)
  const handleRunNow = useCallback(
    async (scheduleId: number) => {
      setRunningIds((prev) => new Set(prev).add(scheduleId));
      setRunMessages((prev) => ({ ...prev, [scheduleId]: undefined as never }));
      try {
        await scheduledQueryService.runNow(scheduleId);
        setRunMessages((prev) => ({
          ...prev,
          [scheduleId]: { type: "success", text: "실행 요청됨 — 로그에서 결과 확인" },
        }));
        onMutate();
        onMutateLogs?.();
        setTimeout(() => {
          setRunMessages((prev) => { const next = { ...prev }; delete next[scheduleId]; return next; });
        }, 4000);
      } catch (err) {
        setRunMessages((prev) => ({
          ...prev,
          [scheduleId]: { type: "error", text: err instanceof Error ? err.message : "실행 실패" },
        }));
        setTimeout(() => {
          setRunMessages((prev) => { const next = { ...prev }; delete next[scheduleId]; return next; });
        }, 4000);
      } finally {
        setRunningIds((prev) => { const next = new Set(prev); next.delete(scheduleId); return next; });
      }
    },
    [onMutate, onMutateLogs]
  );

  return (
    <>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={titleStyle}>스케줄 관리</h3>
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            + 스케줄 추가
          </button>
        </div>

        {scheduledQueries.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 8 }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ margin: "0 auto 12px" }}
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ margin: 0 }}>등록된 스케줄이 없습니다.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>저장된 쿼리</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>대시보드</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>Feed Key</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>Cron</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>설명</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>마지막 실행</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 600 }}>상태</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 600, minWidth: 220 }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {scheduledQueries.map((schedule) => (
                  <tr key={schedule.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 500, color: "#2563eb" }}>
                      {getSavedQueryName(schedule.saved_query_id)}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#64748b", fontSize: 12 }}>
                      {schedule.dashboard_key}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                        {schedule.feed_key}
                      </code>
                    </td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", fontSize: 11 }}>
                      {schedule.schedule_cron}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#64748b", fontSize: 12 }}>
                      {schedule.description || "-"}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 12, color: "#64748b" }}>
                      {schedule.last_run_at
                        ? new Date(schedule.last_run_at).toLocaleString("ko-KR")
                        : "실행 이력 없음"}
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 500,
                          borderRadius: 4,
                          background: schedule.is_active ? "#dcfce7" : "#fee2e2",
                          color: schedule.is_active ? "#166534" : "#991b1b",
                        }}
                      >
                        {schedule.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {/* 지금 실행 버튼 */}
                          <button
                            type="button"
                            onClick={() => handleRunNow(schedule.id)}
                            disabled={runningIds.has(schedule.id)}
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                              background: runningIds.has(schedule.id) ? "#9ca3af" : "#7c3aed",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 4,
                              cursor: runningIds.has(schedule.id) ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            {runningIds.has(schedule.id) ? "⏳" : "▶"} 지금 실행
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditSchedule(schedule)}
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 500,
                              background: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 500,
                              background: schedule.is_active ? "#f59e0b" : "#10b981",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            {schedule.is_active ? "비활성화" : "활성화"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            style={{
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 500,
                              background: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            삭제
                          </button>
                        </div>
                        {/* 실행 결과 메시지 */}
                        {runMessages[schedule.id] && (
                          <div
                            style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: runMessages[schedule.id].type === "success" ? "#dcfce7" : "#fee2e2",
                              color: runMessages[schedule.id].type === "success" ? "#166534" : "#991b1b",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {runMessages[schedule.id].type === "success" ? "✅" : "❌"} {runMessages[schedule.id].text}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowScheduleModal(false);
            setEditingScheduleId(null);
            setScheduleSavedQueryId(null);
            setScheduleDashboardKey("");
            setScheduleFeedKey("");
            setScheduleCron("0 9 * * *");
            setScheduleDescription("");
            setScheduleMessage(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: 24,
              width: 500,
              maxWidth: "90%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px 0", color: "#0f172a" }}>
              {editingScheduleId ? "스케줄 수정" : "스케줄 추가"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  저장된 쿼리 선택 *
                </label>
                <select
                  value={scheduleSavedQueryId || ""}
                  onChange={(e) => setScheduleSavedQueryId(Number(e.target.value))}
                  disabled={!!editingScheduleId}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: editingScheduleId ? "#f8fafc" : "#ffffff",
                    cursor: editingScheduleId ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">쿼리를 선택하세요...</option>
                  {savedQueries.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
                {editingScheduleId && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    수정 시에는 쿼리를 변경할 수 없습니다.
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  대시보드 키 *
                </label>
                <select
                  value={scheduleDashboardKey}
                  onChange={(e) => setScheduleDashboardKey(e.target.value)}
                  disabled={!!editingScheduleId}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: editingScheduleId ? "#f8fafc" : "#ffffff",
                    cursor: editingScheduleId ? "not-allowed" : "pointer",
                  }}
                >
                  <option value="">대시보드를 선택하세요...</option>
                  {dashboards.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name} ({d.key})
                    </option>
                  ))}
                </select>
                {editingScheduleId && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    수정 시에는 대시보드를 변경할 수 없습니다.
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  Feed Key *
                </label>
                <input
                  type="text"
                  value={scheduleFeedKey}
                  onChange={(e) => setScheduleFeedKey(e.target.value)}
                  disabled={!!editingScheduleId}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: editingScheduleId ? "#f8fafc" : "#ffffff",
                    cursor: editingScheduleId ? "not-allowed" : "text",
                  }}
                  placeholder="example"
                />
                {editingScheduleId && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    수정 시에는 Feed Key를 변경할 수 없습니다.
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  Cron 표현식 *
                </label>
                <input
                  type="text"
                  value={scheduleCron}
                  onChange={(e) => setScheduleCron(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    fontFamily: "monospace",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                  }}
                  placeholder="0 9 * * *"
                />
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  예: 0 9 * * * (매일 오전 9시), 0 0 * * 1 (매주 월요일 자정)
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  설명 (선택)
                </label>
                <textarea
                  value={scheduleDescription}
                  onChange={(e) => setScheduleDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    minHeight: 60,
                    resize: "vertical",
                  }}
                  placeholder="스케줄 설명을 입력하세요"
                />
              </div>
            </div>

            {scheduleMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 13,
                  background: scheduleMessage.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: scheduleMessage.type === "success" ? "#166534" : "#991b1b",
                }}
              >
                {scheduleMessage.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowScheduleModal(false);
                  setEditingScheduleId(null);
                  setScheduleSavedQueryId(null);
                  setScheduleDashboardKey("");
                  setScheduleFeedKey("");
                  setScheduleCron("0 9 * * *");
                  setScheduleDescription("");
                  setScheduleMessage(null);
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={!scheduleSavedQueryId || !scheduleDashboardKey.trim() || !scheduleFeedKey.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background:
                    scheduleSavedQueryId && scheduleDashboardKey.trim() && scheduleFeedKey.trim()
                      ? "#2563eb"
                      : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  cursor:
                    scheduleSavedQueryId && scheduleDashboardKey.trim() && scheduleFeedKey.trim()
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {editingScheduleId ? "수정" : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
