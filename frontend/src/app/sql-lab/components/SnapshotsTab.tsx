"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { dashboardService } from "@/services/dashboardService";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

interface SnapshotsTabProps {
  dashboards: Array<{ key: string; name: string }>;
}

export function SnapshotsTab({ dashboards }: SnapshotsTabProps) {
  const [selectedDashboard, setSelectedDashboard] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<{ snapshotDate: string; feedKey: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch snapshots for selected dashboard
  const { data: snapshotsData, mutate: mutateSnapshots } = useSWR(
    selectedDashboard ? ["snapshots", selectedDashboard] : null,
    () => dashboardService.listSnapshots(selectedDashboard)
  );

  // Delete Snapshot
  const handleDeleteSnapshot = useCallback(async () => {
    if (!deleteTarget || !selectedDashboard) return;

    setIsDeleting(true);
    try {
      await dashboardService.deleteSnapshot({
        dashboardKey: selectedDashboard,
        snapshotDate: deleteTarget.snapshotDate,
        feedKey: deleteTarget.feedKey,
      });
      mutateSnapshots();
      setDeleteTarget(null);
    } catch (err) {
      console.error("스냅샷 삭제 실패:", err);
      alert(err instanceof Error ? err.message : "스냅샷 삭제 실패");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, selectedDashboard, mutateSnapshots]);

  return (
    <>
      <div style={cardStyle}>
        <h3 style={{ ...titleStyle, marginBottom: 16 }}>스냅샷 현황</h3>

        {/* Dashboard Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 6 }}>
            대시보드 선택
          </label>
          <select
            value={selectedDashboard}
            onChange={(e) => setSelectedDashboard(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 400,
              padding: "10px 12px",
              fontSize: 13,
              border: "1px solid #cbd5e1",
              borderRadius: 6,
            }}
          >
            <option value="">대시보드를 선택하세요...</option>
            {dashboards.map((d) => (
              <option key={d.key} value={d.key}>
                {d.name} ({d.key})
              </option>
            ))}
          </select>
        </div>

        {/* Snapshot List */}
        {selectedDashboard && (
          <div>
            {!snapshotsData ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>로딩 중...</div>
            ) : !snapshotsData.snapshots || snapshotsData.snapshots.length === 0 ? (
              <div
                style={{ padding: 20, textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 8 }}
              >
                등록된 스냅샷이 없습니다.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                      <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>날짜</th>
                      <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>Feed Keys</th>
                      <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 600 }}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshotsData.snapshots.map(
                      (
                        snapshot: { snapshotDate: string; feeds: Array<{ feedKey: string; uri: string }> },
                        idx: number
                      ) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px 8px", fontWeight: 500 }}>{snapshot.snapshotDate}</td>
                          <td style={{ padding: "10px 8px" }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {snapshot.feeds.map((feed, feedIdx) => (
                                <div key={feedIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>
                                    {feed.feedKey}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteTarget({ snapshotDate: snapshot.snapshotDate, feedKey: feed.feedKey })
                                    }
                                    style={{
                                      padding: "2px 6px",
                                      fontSize: 10,
                                      fontWeight: 500,
                                      background: "#fee2e2",
                                      color: "#991b1b",
                                      border: "none",
                                      borderRadius: 4,
                                      cursor: "pointer",
                                    }}
                                    title={`${feed.feedKey} 삭제`}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "10px 8px", textAlign: "center" }}>
                            <Link
                              href={`/dashboards/${selectedDashboard}?date=${snapshot.snapshotDate}`}
                              style={{
                                padding: "4px 10px",
                                fontSize: 11,
                                fontWeight: 500,
                                background: "#2563eb",
                                color: "#ffffff",
                                textDecoration: "none",
                                borderRadius: 4,
                              }}
                            >
                              보기
                            </Link>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!selectedDashboard && (
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
              <path d="M4 7V4h16v3M9 20h6M12 4v16" />
            </svg>
            <p style={{ margin: 0 }}>대시보드를 선택하면 스냅샷 목록이 표시됩니다.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
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
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              padding: 24,
              width: 400,
              maxWidth: "90%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px 0", color: "#0f172a" }}>
              스냅샷 삭제 확인
            </h3>
            <p style={{ fontSize: 14, color: "#475569", margin: "0 0 16px 0" }}>다음 스냅샷을 삭제하시겠습니까?</p>
            <div style={{ background: "#f8fafc", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <strong>날짜:</strong> {deleteTarget.snapshotDate}
              </div>
              <div style={{ fontSize: 13 }}>
                <strong>Feed Key:</strong>{" "}
                <code style={{ background: "#e2e8f0", padding: "1px 4px", borderRadius: 3 }}>
                  {deleteTarget.feedKey}
                </code>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 6,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteSnapshot}
                disabled={isDeleting}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: isDeleting ? "#94a3b8" : "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                }}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
