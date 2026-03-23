"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { DashboardExampleChart } from "@/components/organisms/DashboardExampleChart";
import { DataTable } from "@/components/molecules/DataTable";
import { useDashboardSnapshot } from "@/hooks/useDashboardSnapshot";

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  const [mainTab, setMainTab] = useState<"raw" | "charts">("charts");

  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const date = dateParam && dateParam !== "YYYY-MM-DD" ? dateParam : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, error, isLoading } = useDashboardSnapshot({ dashboardKey: "test", date });
  const feedKey = useMemo(() => {
    const keys = Object.keys(data?.feeds ?? {});
    if (keys.length === 0) return undefined;
    if (keys.includes("example")) return "example";
    return keys[0];
  }, [data]);
  const feed = feedKey ? data?.feeds?.[feedKey] : undefined;

  if (!mounted) {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }

  if (isLoading) {
    return <main style={{ padding: 24 }}>Loading...</main>;
  }
  if (error) {
    return <main style={{ padding: 24 }}>Failed to load snapshot</main>;
  }

  if (!data) {
    return <main style={{ padding: 24 }}>데이터가 없습니다. 스냅샷을 먼저 업로드해 주세요.</main>;
  }

  return (
    <main style={{ padding: 24, background: "#0b1220", minHeight: "100vh", color: "#e8eefc" }}>
      <ErrorBoundary>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: 4 }}>test</h1>
            <div style={{ opacity: 0.85 }}>snapshotDate: {data?.snapshotDate ?? "N/A"}</div>
          </div>
          <Link
            href="/dashboards"
            style={{ color: "#8ab4ff", fontWeight: 600, textDecoration: "none" }}
          >
            ← Dashboards
          </Link>
        </div>

        {feed && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <TabButton active={mainTab === "charts"} onClick={() => setMainTab("charts")} label="Charts" />
            <TabButton active={mainTab === "raw"} onClick={() => setMainTab("raw")} label="Raw Data" />
          </div>
        )}

        {mainTab === "raw" && feed && (
          <DataTable columns={feed.columns} rows={feed.rows.map((row) => row.map((cell) => cell))} />
        )}

        {mainTab === "charts" && (
          <div style={cardStyle}>
            <h3 style={titleStyle}>기본 대시보드</h3>
            <p style={{ opacity: 0.7, marginBottom: 16 }}>
              스냅샷 데이터를 업로드하고 차트를 추가해주세요.
            </p>
            <DashboardExampleChart feed={feed} />
          </div>
        )}
      </ErrorBoundary>
    </main>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Dashboard render error", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: "#2e1a1a", color: "#ffb3b3", padding: 16, borderRadius: 12 }}>
          렌더링 중 오류가 발생했습니다. 콘솔 로그를 확인하세요.
          <div style={{ opacity: 0.8, marginTop: 6 }}>{this.state.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

const cardStyle: React.CSSProperties = {
  background: "#111a2e",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #1e2740"
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: 16,
  fontWeight: 700
};

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: active ? "1px solid #4f6ddf" : "1px solid #31405f",
        background: active ? "#20305a" : "#111a2e",
        color: "#e8eefc",
        cursor: "pointer"
      }}
    >
      {label}
    </button>
  );
}
