"use client";

import React from "react";
import { QueryExecutionLog } from "@/services/scheduledQueryService";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

interface ExecutionLogsTabProps {
  executionLogs: QueryExecutionLog[];
}

export function ExecutionLogsTab({ executionLogs }: ExecutionLogsTabProps) {
  return (
    <div style={cardStyle}>
      <h3 style={{ ...titleStyle, marginBottom: 16 }}>실행 로그</h3>

      {executionLogs.length === 0 ? (
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
          <p style={{ margin: 0 }}>실행 로그가 없습니다.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>실행 시간</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>타입</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>상태</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>처리 행수</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>실행 시간</th>
                <th style={{ padding: "12px 8px", textAlign: "left", fontWeight: 600 }}>에러</th>
              </tr>
            </thead>
            <tbody>
              {executionLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 8px", fontSize: 12 }}>
                    {new Date(log.started_at).toLocaleString("ko-KR")}
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 500,
                        borderRadius: 4,
                        background: log.execution_type === "scheduled" ? "#dbeafe" : "#f3f4f6",
                        color: log.execution_type === "scheduled" ? "#1e40af" : "#374151",
                      }}
                    >
                      {log.execution_type === "scheduled" ? "스케줄" : "수동"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 500,
                        borderRadius: 4,
                        background:
                          log.status === "success"
                            ? "#dcfce7"
                            : log.status === "failed"
                            ? "#fee2e2"
                            : "#fef3c7",
                        color:
                          log.status === "success"
                            ? "#166534"
                            : log.status === "failed"
                            ? "#991b1b"
                            : "#92400e",
                      }}
                    >
                      {log.status === "success" ? "성공" : log.status === "failed" ? "실패" : "실행 중"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 8px", fontSize: 12 }}>
                    {log.rows_affected !== null ? log.rows_affected.toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: "10px 8px", fontSize: 12 }}>
                    {log.execution_time_ms !== null ? `${(log.execution_time_ms / 1000).toFixed(2)}s` : "-"}
                  </td>
                  <td style={{ padding: "10px 8px", fontSize: 11, color: "#dc2626", maxWidth: 200 }}>
                    {log.error_message ? (
                      <span title={log.error_message}>
                        {log.error_message.length > 50
                          ? log.error_message.slice(0, 50) + "..."
                          : log.error_message}
                      </span>
                    ) : (
                      "-"
                    )}
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
