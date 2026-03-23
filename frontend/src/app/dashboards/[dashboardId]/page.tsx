"use client";

// ============================================
// 1. IMPORTS
// All external dependencies and internal modules
// - React hooks and Next.js utilities
// - UI components and custom hooks
// - Utilities and types
// ============================================
import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import { DashboardExampleChart } from "@/components/organisms/DashboardExampleChart";
import { DataTable } from "@/components/molecules/DataTable";
import { ErrorBoundary } from "@/components/molecules/ErrorBoundary";
import { TabButton } from "@/components/molecules/TabButton";
import { DashboardHeader } from "@/components/molecules/DashboardHeader";
import { useDashboardPage } from "@/hooks/useDashboardPage";
import { mainContainerStyle } from "@/utils/dashboardStyles";
import type { TabType } from "@/types/common";

// ============================================
// 2. TYPES (Dashboard-specific)
// Note: This is a generic fallback dashboard
// Uses common TabType from @/types/common
// ============================================

// ============================================
// 3. UTILS (Dashboard-specific)
// Note: No dashboard-specific utilities needed
// Uses common utilities from @/utils
// ============================================

// ============================================
// 4. MAIN COMPONENT
// Generic fallback dashboard for dynamically created dashboards
// Structure:
//   4.1. State Management - Tab state only
//   4.2. Data Fetching - Uses custom hook (useDashboardPage)
//   4.3. Loading/Error States - Simplified conditional rendering
//   4.4. Render - Basic layout with Charts/Raw Data tabs
// ============================================
export default function GenericDashboardPage() {
  const [mainTab, setMainTab] = useState<TabType>("charts");

  const params = useParams<{ dashboardId: string }>();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const date = dateParam && dateParam !== "YYYY-MM-DD" ? dateParam : undefined;

  const dashboardId = params.dashboardId;
  const { mounted, data, error, isLoading, feed } = useDashboardPage(dashboardId, date);

  if (!mounted || isLoading) {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }

  if (error) {
    const isForbidden = error.message.includes("403");
    return (
      <main style={{ padding: 24 }}>
        {isForbidden ? "Access denied. You do not have permission." : "Failed to load snapshot"}
      </main>
    );
  }

  if (!data) {
    return <main style={{ padding: 24 }}>데이터가 없습니다. 스냅샷을 먼저 업로드해 주세요.</main>;
  }

  return (
    <main style={mainContainerStyle}>
      <ErrorBoundary>
        <DashboardHeader
          title={dashboardId}
          subtitle={`snapshotDate: ${data?.snapshotDate ?? "N/A"}`}
          backHref="/dashboards"
          backLabel="← Dashboards"
        />

        {feed && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <TabButton active={mainTab === "charts"} onClick={() => setMainTab("charts")} label="Charts" />
            <TabButton active={mainTab === "raw"} onClick={() => setMainTab("raw")} label="Raw Data" />
          </div>
        )}

        {mainTab === "raw" && feed && (
          <DataTable columns={feed.columns} rows={feed.rows} />
        )}

        {mainTab === "charts" && (
          <DashboardExampleChart feed={feed} />
        )}
      </ErrorBoundary>
    </main>
  );
}

// ============================================
// 5. CHART COMPONENTS (Inline)
// Note: This dashboard delegates chart rendering to
// DashboardExampleChart component (@/components/organisms)
// No inline chart components needed here
// ============================================
