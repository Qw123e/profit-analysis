"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";

import { snapshotService } from "@/services/snapshotService";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { ToastContainer } from "@/components/molecules/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { logEvent } from "@/utils/logger";

export default function SnapshotMappingPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const { data, error, isLoading, mutate } = useSWR("snapshotMapping", snapshotService.getSnapshotMappings);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    dashboardKey: string | null;
    snapshotDate: string | null;
    feedKey: string | null;
  }>({
    open: false,
    dashboardKey: null,
    snapshotDate: null,
    feedKey: null
  });
  const [deleting, setDeleting] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<string>("all");

  const uniqueDashboards = useMemo(() => {
    if (!data?.snapshots) return [];
    const keys = new Set(data.snapshots.map((s) => s.dashboard_key));
    return Array.from(keys).sort();
  }, [data]);

  const filteredSnapshots = useMemo(() => {
    if (!data?.snapshots) return [];
    if (dashboardFilter === "all") return data.snapshots;
    return data.snapshots.filter((s) => s.dashboard_key === dashboardFilter);
  }, [data, dashboardFilter]);

  const handleDeleteClick = (dashboardKey: string, snapshotDate: string, feedKey: string) => {
    setDeleteDialog({ open: true, dashboardKey, snapshotDate, feedKey });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.dashboardKey || !deleteDialog.snapshotDate || !deleteDialog.feedKey) return;

    setDeleting(true);
    try {
      await snapshotService.deleteSnapshot(
        deleteDialog.dashboardKey,
        deleteDialog.snapshotDate,
        deleteDialog.feedKey
      );
      logEvent({
        eventName: "snapshot_delete",
        user,
        eventProperties: {
          dashboard_key: deleteDialog.dashboardKey,
          snapshot_date: deleteDialog.snapshotDate,
          feed_key: deleteDialog.feedKey
        }
      });
      showToast(
        `Snapshot deleted: ${deleteDialog.dashboardKey} / ${deleteDialog.snapshotDate} / ${deleteDialog.feedKey}`,
        "success"
      );
      setDeleteDialog({ open: false, dashboardKey: null, snapshotDate: null, feedKey: null });
      mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete snapshot", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!deleting) {
      setDeleteDialog({ open: false, dashboardKey: null, snapshotDate: null, feedKey: null });
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Snapshot Mapping</h1>
          <div style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>
            All snapshots across dashboards
          </div>
        </div>
        <Link href="/dashboards" style={styles.link}>
          ← Dashboards
        </Link>
      </div>

      <div style={styles.filterBar}>
        <label style={{ fontSize: 14, fontWeight: 500 }}>
          Filter by Dashboard:
          <select
            value={dashboardFilter}
            onChange={(e) => setDashboardFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Dashboards</option>
            {uniqueDashboards.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <div style={styles.card}>Loading snapshots...</div>}
      {error && <div style={styles.error}>Failed to load snapshots.</div>}

      {data && filteredSnapshots.length === 0 && (
        <div style={styles.card}>
          {dashboardFilter === "all" ? "No snapshots yet." : `No snapshots for "${dashboardFilter}".`}
        </div>
      )}

      {data && filteredSnapshots.length > 0 && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Dashboard</th>
                <th style={styles.th}>Snapshot Date</th>
                <th style={styles.th}>Feed Key</th>
                <th style={styles.th}>Generated At</th>
                <th style={styles.th}>URI</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSnapshots.map((snap) => (
                <tr key={`${snap.dashboard_key}-${snap.snapshot_date}-${snap.feed_key}`} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 500 }}>{snap.dashboard_name}</div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>{snap.dashboard_key}</div>
                  </td>
                  <td style={styles.td}>{snap.snapshot_date}</td>
                  <td style={styles.td}>{snap.feed_key}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>
                    {new Date(snap.generated_at).toLocaleString()}
                  </td>
                  <td style={{ ...styles.td, fontSize: 11, opacity: 0.7, wordBreak: "break-all" }}>
                    {snap.s3_uri}
                  </td>
                  <td style={styles.td}>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteClick(snap.dashboard_key, snap.snapshot_date, snap.feed_key)
                        }
                        style={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    )}
                    {!isAdmin && <span style={{ opacity: 0.5, fontSize: 12 }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Snapshot"
        message={`Are you sure you want to delete snapshot "${deleteDialog.snapshotDate}" (dashboard: ${deleteDialog.dashboardKey}, feed: ${deleteDialog.feedKey})? This will also delete the associated file.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
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
    fontWeight: 600,
    textDecoration: "none"
  },
  filterBar: {
    background: "#111a2e",
    borderRadius: 10,
    padding: 16,
    border: "1px solid #1e2740"
  },
  select: {
    marginLeft: 12,
    padding: "8px 12px",
    background: "#0b1220",
    color: "#e8eefc",
    border: "1px solid #334155",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer"
  },
  card: {
    background: "#111a2e",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #1e2740"
  },
  error: {
    background: "#2e1a1a",
    color: "#ffb3b3",
    borderRadius: 10,
    padding: 12
  },
  tableCard: {
    background: "#111a2e",
    borderRadius: 12,
    padding: 0,
    border: "1px solid #1e2740",
    overflow: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14
  },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    borderBottom: "2px solid #334155",
    color: "#94a3b8",
    fontWeight: 600
  },
  tr: {
    borderBottom: "1px solid #1e293b"
  },
  td: {
    padding: "12px 16px",
    color: "#e2e8f0"
  },
  deleteBtn: {
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
    opacity: 0.9
  }
};
