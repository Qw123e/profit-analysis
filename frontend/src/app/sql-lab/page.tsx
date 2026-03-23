"use client";

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { dashboardService } from "@/services/dashboardService";
import { savedQueryService, SavedQuery } from "@/services/savedQueryService";
import { scheduledQueryService } from "@/services/scheduledQueryService";
import { mainContainerStyle } from "@/utils/dashboardStyles";

// Tab Components
import { QueryTab } from "./components/QueryTab";
import { SavedQueriesTab } from "./components/SavedQueriesTab";
import { SchedulesTab } from "./components/SchedulesTab";
import { ExecutionLogsTab } from "./components/ExecutionLogsTab";
import { SnapshotsTab } from "./components/SnapshotsTab";

export default function SqlLabPage() {
  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<"query" | "snapshots" | "saved" | "schedules" | "logs">("query");
  const [currentSql, setCurrentSql] = useState<string>(`SELECT * FROM your_table LIMIT 100`);
  const [currentDatabase, setCurrentDatabase] = useState<string>("default");

  // --- Data Fetching ---
  const { data: dashboardsData } = useSWR("dashboards", () => dashboardService.listDashboards());
  const dashboards = dashboardsData?.items ?? [];

  const { data: savedQueriesData, mutate: mutateSavedQueries } = useSWR("saved-queries", () =>
    savedQueryService.list()
  );
  const savedQueries = savedQueriesData?.items ?? [];

  const { data: scheduledQueriesData, mutate: mutateScheduledQueries } = useSWR("scheduled-queries", () =>
    scheduledQueryService.list()
  );
  const scheduledQueries = scheduledQueriesData?.items ?? [];

  const { data: executionLogsData, mutate: mutateExecutionLogs } = useSWR("execution-logs", () => scheduledQueryService.listLogs());
  const executionLogs = executionLogsData?.items ?? [];
  const totalLogs = executionLogsData?.total ?? 0;

  // --- Event Handlers ---
  const handleLoadQuery = (query: SavedQuery) => {
    setCurrentSql(query.sql);
    setCurrentDatabase(query.database);
    setActiveTab("query");
  };

  return (
    <main style={mainContainerStyle}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", margin: 0 }}>SQL Lab</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Athena SQL 쿼리를 실행하고 결과를 스냅샷으로 저장할 수 있습니다.
          </p>
        </div>
        <Link
          href="/dashboards"
          style={{
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 600,
            background: "#0f172a",
            color: "#ffffff",
            textDecoration: "none",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          대시보드 목록
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TabButton active={activeTab === "query"} onClick={() => setActiveTab("query")} label="SQL 쿼리" />
        <TabButton
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
          label={`저장된 쿼리 (${savedQueries.length})`}
        />
        <TabButton
          active={activeTab === "schedules"}
          onClick={() => setActiveTab("schedules")}
          label={`스케줄 관리 (${scheduledQueries.length})`}
        />
        <TabButton
          active={activeTab === "logs"}
          onClick={() => setActiveTab("logs")}
          label={`실행 로그 (${totalLogs})`}
        />
        <TabButton active={activeTab === "snapshots"} onClick={() => setActiveTab("snapshots")} label="스냅샷 현황" />
      </div>

      {/* Tab Content */}
      {activeTab === "query" && (
        <QueryTab
          dashboards={dashboards}
          sql={currentSql}
          database={currentDatabase}
          onSqlChange={setCurrentSql}
          onDatabaseChange={setCurrentDatabase}
        />
      )}

      {activeTab === "saved" && (
        <SavedQueriesTab
          savedQueries={savedQueries}
          onLoadQuery={handleLoadQuery}
          onMutate={mutateSavedQueries}
          currentSql={currentSql}
          currentDatabase={currentDatabase}
        />
      )}

      {activeTab === "schedules" && (
        <SchedulesTab
          scheduledQueries={scheduledQueries}
          savedQueries={savedQueries}
          dashboards={dashboards}
          onMutate={mutateScheduledQueries}
          onMutateLogs={mutateExecutionLogs}
        />
      )}

      {activeTab === "logs" && <ExecutionLogsTab executionLogs={executionLogs} />}

      {activeTab === "snapshots" && <SnapshotsTab dashboards={dashboards} />}
    </main>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 20px",
        fontSize: 13,
        fontWeight: 600,
        background: active ? "#2563eb" : "#f1f5f9",
        color: active ? "#ffffff" : "#475569",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
