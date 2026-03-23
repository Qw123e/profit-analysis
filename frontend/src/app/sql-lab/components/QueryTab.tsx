"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { athenaService, QueryStatusResponse, QueryResultResponse } from "@/services/athenaService";
import { dashboardService } from "@/services/dashboardService";
import { savedQueryService } from "@/services/savedQueryService";
import { DataTable } from "@/components/molecules/DataTable";
import { cardStyle, titleStyle } from "@/utils/dashboardStyles";

interface QueryTabProps {
  dashboards: Array<{ key: string; name: string }>;
  sql: string;
  database: string;
  onSqlChange: (sql: string) => void;
  onDatabaseChange: (database: string) => void;
  onSnapshotSaved?: () => void;
}

interface QueryState {
  executionId: string | null;
  status: QueryStatusResponse["status"] | null;
  error: string | null;
  isRunning: boolean;
  isTestMode: boolean;
}

export function QueryTab({ dashboards, sql, database, onSqlChange, onDatabaseChange, onSnapshotSaved }: QueryTabProps) {
  const [queryState, setQueryState] = useState<QueryState>({
    executionId: null,
    status: null,
    error: null,
    isRunning: false,
    isTestMode: false,
  });
  const [results, setResults] = useState<QueryResultResponse | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  // Save Snapshot Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [snapshotDashboardKey, setSnapshotDashboardKey] = useState("");
  const [snapshotFeedKey, setSnapshotFeedKey] = useState("");
  const [snapshotDate, setSnapshotDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Save Query Modal
  const [showSaveQueryModal, setShowSaveQueryModal] = useState(false);
  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [saveQueryMessage, setSaveQueryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate Mock Results (3 test cases)
  const generateMockResults = (testCase: 1 | 2 | 3): QueryResultResponse => {
    const mockExecutionId = `mock-execution-${Date.now()}`;

    if (testCase === 1) {
      // Test Case 1: 고객별 매출 데이터
      return {
        execution_id: mockExecutionId,
        columns: ["고객명", "총매출", "영업이익", "판관비"],
        rows: [
          ["삼성전자", "125000000000", "25000000000", "15000000000"],
          ["LG전자", "98000000000", "18000000000", "12000000000"],
          ["현대자동차", "156000000000", "32000000000", "20000000000"],
          ["SK하이닉스", "89000000000", "15000000000", "9000000000"],
          ["포스코", "72000000000", "12000000000", "8000000000"],
          ["네이버", "45000000000", "9000000000", "5000000000"],
          ["카카오", "38000000000", "7000000000", "4500000000"],
          ["셀트리온", "52000000000", "11000000000", "6000000000"],
          ["한화솔루션", "67000000000", "13000000000", "8500000000"],
          ["롯데케미칼", "54000000000", "9500000000", "6500000000"],
        ],
        total_rows: 10,
        offset: 0,
        limit: pageSize,
        has_more: false,
      };
    } else if (testCase === 2) {
      // Test Case 2: 월별 매출 추이 데이터
      return {
        execution_id: mockExecutionId,
        columns: ["년월", "매출액", "영업이익", "순이익", "거래건수"],
        rows: [
          ["2024-01", "45000000000", "8000000000", "6000000000", "1250"],
          ["2024-02", "52000000000", "9500000000", "7200000000", "1380"],
          ["2024-03", "48000000000", "8800000000", "6500000000", "1290"],
          ["2024-04", "55000000000", "10200000000", "7800000000", "1450"],
          ["2024-05", "58000000000", "11000000000", "8300000000", "1520"],
          ["2024-06", "62000000000", "12000000000", "9000000000", "1620"],
          ["2024-07", "59000000000", "11500000000", "8600000000", "1580"],
          ["2024-08", "64000000000", "12500000000", "9500000000", "1680"],
          ["2024-09", "61000000000", "11800000000", "8900000000", "1610"],
          ["2024-10", "67000000000", "13000000000", "9800000000", "1720"],
          ["2024-11", "69000000000", "13500000000", "10200000000", "1780"],
          ["2024-12", "72000000000", "14000000000", "10500000000", "1850"],
        ],
        total_rows: 12,
        offset: 0,
        limit: pageSize,
        has_more: false,
      };
    } else {
      // Test Case 3: 제품별 매출 데이터
      return {
        execution_id: mockExecutionId,
        columns: ["제품명", "제품코드", "카테고리", "단가", "판매수량", "총매출"],
        rows: [
          ["갤럭시 S24", "PROD-001", "스마트폰", "1200000", "45000", "54000000000"],
          ["아이폰 15", "PROD-002", "스마트폰", "1350000", "38000", "51300000000"],
          ["갤럭시 북4", "PROD-003", "노트북", "1800000", "22000", "39600000000"],
          ["맥북 프로", "PROD-004", "노트북", "2500000", "18000", "45000000000"],
          ["아이패드 프로", "PROD-005", "태블릿", "1100000", "25000", "27500000000"],
          ["갤럭시 탭", "PROD-006", "태블릿", "950000", "28000", "26600000000"],
          ["에어팟 프로", "PROD-007", "이어폰", "320000", "65000", "20800000000"],
          ["갤럭시 버즈", "PROD-008", "이어폰", "250000", "72000", "18000000000"],
          ["애플워치", "PROD-009", "스마트워치", "550000", "42000", "23100000000"],
          ["갤럭시 워치", "PROD-010", "스마트워치", "480000", "38000", "18240000000"],
        ],
        total_rows: 10,
        offset: 0,
        limit: pageSize,
        has_more: false,
      };
    }
  };

  // Execute Test Query
  const executeTestQuery = useCallback(
    async (testCase: 1 | 2 | 3) => {
      setQueryState({
        executionId: null,
        status: null,
        error: null,
        isRunning: true,
        isTestMode: true,
      });
      setResults(null);
      setPage(0);

      // Simulate query execution delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setQueryState((prev) => ({
        ...prev,
        executionId: `mock-execution-${Date.now()}`,
        status: "QUEUED",
      }));

      await new Promise((resolve) => setTimeout(resolve, 800));

      setQueryState((prev) => ({ ...prev, status: "RUNNING" }));

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const mockResults = generateMockResults(testCase);
      setResults(mockResults);
      setQueryState((prev) => ({
        ...prev,
        status: "SUCCEEDED",
        isRunning: false,
      }));
    },
    [pageSize]
  );

  // Execute Query
  const executeQuery = useCallback(async () => {
    if (!sql.trim()) {
      setQueryState((prev) => ({ ...prev, error: "SQL 쿼리를 입력해주세요." }));
      return;
    }

    setQueryState({
      executionId: null,
      status: null,
      error: null,
      isRunning: true,
      isTestMode: false,
    });
    setResults(null);
    setPage(0);

    try {
      const startResponse = await athenaService.executeQuery(sql, database);
      setQueryState((prev) => ({
        ...prev,
        executionId: startResponse.execution_id,
        status: "QUEUED",
      }));

      const finalStatus = await athenaService.pollUntilComplete(
        startResponse.execution_id,
        (status) => {
          setQueryState((prev) => ({ ...prev, status: status.status }));
        }
      );

      if (finalStatus.status === "SUCCEEDED") {
        const resultsData = await athenaService.getQueryResults(
          startResponse.execution_id,
          pageSize,
          0
        );
        setResults(resultsData);
        setQueryState((prev) => ({ ...prev, isRunning: false }));
      } else {
        setQueryState((prev) => ({
          ...prev,
          isRunning: false,
          error: finalStatus.state_change_reason || `쿼리 실패: ${finalStatus.status}`,
        }));
      }
    } catch (err) {
      setQueryState((prev) => ({
        ...prev,
        isRunning: false,
        error: err instanceof Error ? err.message : "알 수 없는 오류",
      }));
    }
  }, [sql, database]);

  // Pagination
  const loadPage = useCallback(
    async (newPage: number) => {
      if (!queryState.executionId) return;

      try {
        const resultsData = await athenaService.getQueryResults(
          queryState.executionId,
          pageSize,
          newPage * pageSize
        );
        setResults(resultsData);
        setPage(newPage);
      } catch (err) {
        console.error("페이지 로드 실패:", err);
      }
    },
    [queryState.executionId]
  );

  // Save Query
  const handleSaveQuery = useCallback(async () => {
    if (!sql.trim()) {
      setSaveQueryMessage({ type: "error", text: "저장할 쿼리를 입력해주세요." });
      return;
    }

    if (!queryName.trim()) {
      setSaveQueryMessage({ type: "error", text: "쿼리 이름을 입력해주세요." });
      return;
    }

    setSaveQueryMessage(null);

    try {
      await savedQueryService.create({
        name: queryName,
        description: queryDescription || undefined,
        sql: sql,
        database: database,
      });

      setSaveQueryMessage({ type: "success", text: "쿼리가 저장되었습니다." });
      setTimeout(() => {
        setShowSaveQueryModal(false);
        setQueryName("");
        setQueryDescription("");
        setSaveQueryMessage(null);
      }, 1500);
    } catch (err) {
      setSaveQueryMessage({
        type: "error",
        text: err instanceof Error ? err.message : "쿼리 저장 실패",
      });
    }
  }, [sql, database, queryName, queryDescription]);

  // Save Snapshot
  const handleSaveSnapshot = useCallback(async () => {
    if (!queryState.executionId) return;

    setSaveMessage(null);

    try {
      // Test mode: use direct upload API
      if (queryState.isTestMode && results) {
        await dashboardService.uploadSnapshotDirect({
          dashboardKey: snapshotDashboardKey,
          feedKey: snapshotFeedKey,
          snapshotDate: snapshotDate,
          columns: results.columns,
          rows: results.rows,
        });

        setSaveMessage({ type: "success", text: "테스트 스냅샷이 성공적으로 저장되었습니다." });
        onSnapshotSaved?.();
      } else {
        // Normal mode: use Athena execution ID
        const response = await athenaService.saveAsSnapshot(queryState.executionId, {
          dashboard_key: snapshotDashboardKey,
          feed_key: snapshotFeedKey,
          snapshot_date: snapshotDate,
        });

        if (response.success) {
          setSaveMessage({ type: "success", text: response.message });
          onSnapshotSaved?.();
        } else {
          setSaveMessage({ type: "error", text: response.message });
        }
      }
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "스냅샷 저장 실패",
      });
    }
  }, [
    queryState.executionId,
    queryState.isTestMode,
    results,
    snapshotDashboardKey,
    snapshotFeedKey,
    snapshotDate,
    onSnapshotSaved,
  ]);

  // Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        executeQuery();
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("keydown", handleKeyDown);
      return () => textarea.removeEventListener("keydown", handleKeyDown);
    }
  }, [executeQuery]);

  return (
    <>
      {/* SQL Editor Section */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={titleStyle}>SQL Editor</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "#64748b" }}>Database:</label>
            <input
              type="text"
              value={database}
              onChange={(e) => onDatabaseChange(e.target.value)}
              style={{
                padding: "6px 10px",
                fontSize: 12,
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                width: 150,
              }}
              placeholder="default"
            />
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={sql}
          onChange={(e) => onSqlChange(e.target.value)}
          style={{
            width: "100%",
            minHeight: 200,
            padding: 12,
            fontSize: 13,
            fontFamily: "monospace",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            resize: "vertical",
            backgroundColor: "#f8fafc",
            color: "#0f172a",
          }}
          placeholder="SELECT * FROM your_table LIMIT 100"
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={executeQuery}
              disabled={queryState.isRunning}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                background: queryState.isRunning ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: queryState.isRunning ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {queryState.isRunning ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      border: "2px solid #ffffff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  실행 중...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  실행 (⌘+Enter)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowSaveQueryModal(true)}
              disabled={queryState.isRunning || !sql.trim()}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                background: queryState.isRunning || !sql.trim() ? "#94a3b8" : "#f59e0b",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: queryState.isRunning || !sql.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              쿼리 저장
            </button>

            <div style={{ width: 1, height: 30, background: "#cbd5e1" }} />

            <button
              type="button"
              onClick={() => executeTestQuery(1)}
              disabled={queryState.isRunning}
              style={{
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: queryState.isRunning ? "#94a3b8" : "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: queryState.isRunning ? "not-allowed" : "pointer",
              }}
            >
              테스트 쿼리 1
            </button>

            <button
              type="button"
              onClick={() => executeTestQuery(2)}
              disabled={queryState.isRunning}
              style={{
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: queryState.isRunning ? "#94a3b8" : "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: queryState.isRunning ? "not-allowed" : "pointer",
              }}
            >
              테스트 쿼리 2
            </button>

            <button
              type="button"
              onClick={() => executeTestQuery(3)}
              disabled={queryState.isRunning}
              style={{
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 600,
                background: queryState.isRunning ? "#94a3b8" : "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                cursor: queryState.isRunning ? "not-allowed" : "pointer",
              }}
            >
              테스트 쿼리 3
            </button>

            {queryState.status && (
              <span
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  background:
                    queryState.status === "SUCCEEDED"
                      ? "#dcfce7"
                      : queryState.status === "FAILED"
                      ? "#fee2e2"
                      : "#fef3c7",
                  color:
                    queryState.status === "SUCCEEDED"
                      ? "#166534"
                      : queryState.status === "FAILED"
                      ? "#991b1b"
                      : "#92400e",
                }}
              >
                {queryState.status}
              </span>
            )}

            {queryState.isTestMode && queryState.status === "SUCCEEDED" && (
              <span
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 6,
                  background: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                }}
              >
                테스트 모드
              </span>
            )}
          </div>
        </div>

        {queryState.error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {queryState.error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {results && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h3 style={titleStyle}>Results</h3>
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {results.total_rows.toLocaleString()} rows
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
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
              스냅샷으로 저장
            </button>
          </div>

          <DataTable columns={results.columns} rows={results.rows} pageSize={pageSize} />

          {/* Pagination */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => loadPage(page - 1)}
              disabled={page === 0}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                cursor: page === 0 ? "not-allowed" : "pointer",
                opacity: page === 0 ? 0.5 : 1,
              }}
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => loadPage(page + 1)}
              disabled={!results.has_more}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#0f172a",
                cursor: !results.has_more ? "not-allowed" : "pointer",
                opacity: !results.has_more ? 0.5 : 1,
              }}
            >
              다음
            </button>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {results.offset + 1} - {Math.min(results.offset + results.rows.length, results.total_rows)} /{" "}
              {results.total_rows.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Save Snapshot Modal */}
      {showSaveModal && (
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
          onClick={() => setShowSaveModal(false)}
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
              스냅샷으로 저장
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  Dashboard
                </label>
                <select
                  value={snapshotDashboardKey}
                  onChange={(e) => setSnapshotDashboardKey(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                  }}
                >
                  <option value="">대시보드 선택...</option>
                  {dashboards.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name} ({d.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  Feed Key
                </label>
                <input
                  type="text"
                  value={snapshotFeedKey}
                  onChange={(e) => setSnapshotFeedKey(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                  }}
                  placeholder="example"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  Snapshot Date
                </label>
                <input
                  type="date"
                  value={snapshotDate}
                  onChange={(e) => setSnapshotDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>

            {saveMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 13,
                  background: saveMessage.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: saveMessage.type === "success" ? "#166534" : "#991b1b",
                }}
              >
                {saveMessage.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
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
                onClick={handleSaveSnapshot}
                disabled={!snapshotDashboardKey}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: snapshotDashboardKey ? "#2563eb" : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  cursor: snapshotDashboardKey ? "pointer" : "not-allowed",
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Query Modal */}
      {showSaveQueryModal && (
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
            setShowSaveQueryModal(false);
            setQueryName("");
            setQueryDescription("");
            setSaveQueryMessage(null);
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
              쿼리 저장
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  쿼리 이름 *
                </label>
                <input
                  type="text"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                  }}
                  placeholder="예: 고객별 월별 매출 조회"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  설명 (선택)
                </label>
                <textarea
                  value={queryDescription}
                  onChange={(e) => setQueryDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    minHeight: 80,
                    resize: "vertical",
                  }}
                  placeholder="쿼리에 대한 설명을 입력하세요"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#475569", marginBottom: 4 }}>
                  SQL 미리보기
                </label>
                <pre
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 11,
                    fontFamily: "monospace",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    background: "#f8fafc",
                    color: "#475569",
                    maxHeight: 150,
                    overflow: "auto",
                    margin: 0,
                  }}
                >
                  {sql}
                </pre>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  background: "#f1f5f9",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                Database: <strong>{database}</strong>
              </div>
            </div>

            {saveQueryMessage && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 6,
                  fontSize: 13,
                  background: saveQueryMessage.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: saveQueryMessage.type === "success" ? "#166534" : "#991b1b",
                }}
              >
                {saveQueryMessage.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setShowSaveQueryModal(false);
                  setQueryName("");
                  setQueryDescription("");
                  setSaveQueryMessage(null);
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
                onClick={handleSaveQuery}
                disabled={!queryName.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  background: queryName.trim() ? "#2563eb" : "#94a3b8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  cursor: queryName.trim() ? "pointer" : "not-allowed",
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for spinner animation */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
