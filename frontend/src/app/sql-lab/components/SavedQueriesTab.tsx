"use client";

import React, { useCallback } from "react";
import { savedQueryService, SavedQuery } from "@/services/savedQueryService";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

interface SavedQueriesTabProps {
  savedQueries: SavedQuery[];
  onLoadQuery: (query: SavedQuery) => void;
  onMutate: () => void;
  currentSql: string;
  currentDatabase: string;
}

export function SavedQueriesTab({
  savedQueries,
  onLoadQuery,
  onMutate,
}: SavedQueriesTabProps) {

  // Delete Saved Query
  const handleDeleteSavedQuery = useCallback(
    async (queryId: number) => {
      if (!confirm("이 쿼리를 삭제하시겠습니까?")) return;

      try {
        await savedQueryService.delete(queryId);
        onMutate();
      } catch (err) {
        console.error("쿼리 삭제 실패:", err);
        alert(err instanceof Error ? err.message : "쿼리 삭제 실패");
      }
    },
    [onMutate]
  );

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={titleStyle}>저장된 쿼리</h3>
      </div>

        {savedQueries.length === 0 ? (
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
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ margin: 0 }}>저장된 쿼리가 없습니다.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>이름</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>설명</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>데이터베이스</th>
                  <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>생성일</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", fontWeight: 600 }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {savedQueries.map((query) => (
                  <tr key={query.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 500 }}>
                      {query.name}
                    </td>
                    <td style={{ padding: "10px 8px", color: "#64748b", fontSize: 12 }}>
                      {query.description || "-"}
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                        {query.database}
                      </code>
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 12, color: "#64748b" }}>
                      {new Date(query.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => onLoadQuery(query)}
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
                          불러오기
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedQuery(query.id)}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
