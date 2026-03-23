"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { dashboardService } from "@/services/dashboardService";
import { useAuth } from "@/hooks/useAuth";
import { logEvent } from "@/utils/logger";
import type { DashboardItem } from "@/types/dashboard";
import type { DashboardSnapshotResponse } from "@/types/snapshot";

export default function DashboardUploadPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { data, error, isLoading } = useSWR("dashboards", dashboardService.listDashboards);
  const dashboards: DashboardItem[] = data?.items ?? [];
  const today = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const kst = new Date(utc + 9 * 60 * 60000);
    return kst.toISOString().slice(0, 10);
  }, []);

  const [dashboardKey, setDashboardKey] = useState("");
  const [feedKey, setFeedKey] = useState("example");
  const [snapshotDate, setSnapshotDate] = useState("");
  const [columns, setColumns] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshotResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dashboardKey) {
      setMessage("대시보드를 선택하세요.");
      return;
    }
    if (!file) {
      setMessage("업로드할 파일을 선택하세요.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setSnapshot(null);
    try {
      const res = await dashboardService.uploadSnapshot({
        dashboardKey,
        file,
        feedKey: feedKey || undefined,
        date: snapshotDate || today,
        columns: columns || undefined
      });
      logEvent({
        eventName: "snapshot_upload",
        user,
        eventProperties: {
          dashboard_key: dashboardKey,
          feed_key: feedKey || "example",
          snapshot_date: snapshotDate || today,
          column_names: columns || null
        }
      });
      setSnapshot(res);
      setMessage("업로드 성공! 대시보드 스냅샷이 반영됐습니다.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "업로드 실패";
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!snapshot) {
      return;
    }
    setDownloading(true);
    try {
      const selectedFeedKey = feedKey || Object.keys(snapshot.feeds)[0] || "example";
      const { blob, filename } = await dashboardService.downloadSnapshotFile({
        dashboardKey: snapshot.dashboardKey,
        date: snapshot.snapshotDate,
        feedKey: selectedFeedKey,
        format: "parquet"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "다운로드 실패";
      setMessage(msg);
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>Loading...</div>
      </main>
    );
  }

  // Admin check removed - allow all authenticated users
  if (false && !isAdmin) {
    return (
      <main style={styles.page}>
        <div style={styles.error}>Access denied. Admins only.</div>
        <Link href="/dashboards" style={styles.link}>
          ← Dashboards
        </Link>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>대시보드 스냅샷 업로드</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/dashboards" style={styles.link}>
            대시보드 목록
          </Link>
          <Link href="/" style={styles.link}>
            홈
          </Link>
        </div>
      </div>

      {isLoading && <div style={styles.card}>대시보드 목록을 불러오는 중…</div>}
      {error && <div style={styles.error}>목록을 불러오지 못했습니다.</div>}

      {!isLoading && dashboards.length === 0 && (
        <div style={styles.card}>등록된 대시보드가 없습니다.</div>
      )}

      {dashboards.length > 0 && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            대시보드
            <select
              value={dashboardKey}
              onChange={(e) => setDashboardKey(e.target.value)}
              style={styles.input}
              required
            >
              <option value="">-- 대시보드 선택 --</option>
              {dashboards.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Feed Key (기본: example)
            <input
              style={styles.input}
              value={feedKey}
              onChange={(e) => setFeedKey(e.target.value)}
              placeholder="example"
            />
          </label>

          <label style={styles.label}>
            스냅샷 날짜 (빈칸이면 오늘)
            <input
              type="date"
              style={styles.input}
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
            />
          </label>

          <label style={styles.label}>
            사용할 컬럼 (쉼표로 구분, 비우면 전체)
            <input
              style={styles.input}
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              placeholder="col1,col2"
            />
          </label>

          <label style={styles.label}>
            파일 (CSV/Excel/Parquet)
            <input
              type="file"
              accept=".csv,.xls,.xlsx,.xlsb,.parquet"
              style={styles.input}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>

          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "업로드 중..." : "업로드"}
          </button>
        </form>
      )}

      {message && <div style={message.startsWith("업로드 성공") ? styles.success : styles.error}>{message}</div>}

      {snapshot && (
        <div style={styles.card}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>스냅샷 적용 결과</div>
          <div style={{ marginBottom: 4 }}>dashboardKey: {snapshot.dashboardKey}</div>
          <div style={{ marginBottom: 4 }}>snapshotDate: {snapshot.snapshotDate}</div>
          <div style={{ marginBottom: 4 }}>feeds: {Object.keys(snapshot.feeds).join(", ")}</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>대시보드 상세 페이지에서 차트로 확인하세요.</div>
          <button type="button" style={styles.secondaryButton} onClick={handleDownload} disabled={downloading}>
            {downloading ? "Parquet 준비 중..." : "Parquet 다운로드"}
          </button>
        </div>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    background: "#0b1220",
    minHeight: "100vh",
    color: "#e8eefc",
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  link: {
    color: "#8ab4ff",
    textDecoration: "none",
    fontWeight: 600
  },
  form: {
    background: "#111a2e",
    borderRadius: 12,
    padding: 16,
    display: "grid",
    gap: 12,
    maxWidth: 520
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontWeight: 600
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #1e2740",
    background: "#0e1629",
    color: "#e8eefc",
    fontSize: 14
  },
  button: {
    marginTop: 4,
    padding: "12px 14px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    color: "#f8fbff",
    fontWeight: 700,
    cursor: "pointer"
  },
  secondaryButton: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #2c3757",
    background: "#0e1629",
    color: "#c7d6ff",
    fontWeight: 600,
    cursor: "pointer"
  },
  card: {
    background: "#111a2e",
    borderRadius: 12,
    padding: 16,
    maxWidth: 640
  },
  error: {
    background: "#2e1a1a",
    color: "#ffb3b3",
    borderRadius: 10,
    padding: 12,
    maxWidth: 640
  },
  success: {
    background: "#1b2d1f",
    color: "#c4f2c7",
    borderRadius: 10,
    padding: 12,
    maxWidth: 640
  }
};
