"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";

import { dashboardService } from "@/services/dashboardService";
import { snapshotService } from "@/services/snapshotService";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import { ToastContainer } from "@/components/molecules/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

export default function DashboardSnapshotsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const params = useParams<{ dashboardId: string }>();
  const dashboardId = params.dashboardId;
  const { toasts, showToast, removeToast } = useToast();

  const { data, error, isLoading, mutate } = useSWR(
    ["snapshots", dashboardId],
    () => dashboardService.listSnapshots(dashboardId)
  );

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    date: string | null;
    feedKey: string | null;
  }>({
    open: false,
    date: null,
    feedKey: null
  });
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (date: string, feedKey: string) => {
    setDeleteDialog({ open: true, date, feedKey });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.date || !deleteDialog.feedKey) return;

    setDeleting(true);
    try {
      await snapshotService.deleteSnapshot(dashboardId, deleteDialog.date, deleteDialog.feedKey);
      showToast(`Snapshot deleted: ${deleteDialog.date} / ${deleteDialog.feedKey}`, "success");
      setDeleteDialog({ open: false, date: null, feedKey: null });
      mutate(); // Refresh list
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete snapshot", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!deleting) {
      setDeleteDialog({ open: false, date: null, feedKey: null });
    }
  };

  if (authLoading) {
    return (
      <main style={styles.page}>
        <div style={styles.card}>Loading...</div>
      </main>
    );
  }

  // Admin check removed - allow all authenticated users to view snapshots
  // Delete functionality still restricted to admins (see delete button below)

  return (
    <main style={styles.page}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div style={styles.header}>
        <div>
          <div style={{ opacity: 0.7, fontSize: 13 }}>Dashboard</div>
          <h1 style={{ margin: 0 }}>{dashboardId}</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/dashboards" style={styles.link}>
            ← Dashboards
          </Link>
          <Link href={`/dashboards/${dashboardId}`} style={styles.link}>
            View Dashboard →
          </Link>
          <Link href="/snapshots/mapping" style={styles.link}>
            All Snapshots →
          </Link>
        </div>
      </div>

      {isLoading && <div style={styles.card}>Loading snapshots...</div>}
      {error && <div style={styles.error}>Failed to load snapshots.</div>}

      {data && data.snapshots.length === 0 && <div style={styles.card}>No snapshots yet.</div>}

      {data && data.snapshots.length > 0 && (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Feed Key</th>
                <th style={styles.th}>URI</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.snapshots.flatMap((snap) =>
                snap.feeds.map((feed) => (
                  <tr key={`${snap.snapshotDate}-${feed.feedKey}`} style={styles.tr}>
                    <td style={styles.td}>{snap.snapshotDate}</td>
                    <td style={styles.td}>{feed.feedKey}</td>
                    <td style={{ ...styles.td, fontSize: 12, opacity: 0.7, wordBreak: "break-all" }}>
                      {feed.uri}
                    </td>
                    <td style={styles.td}>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(snap.snapshotDate, feed.feedKey)}
                          style={styles.deleteBtn}
                        >
                          Delete
                        </button>
                      )}
                      {!isAdmin && <span style={{ opacity: 0.5, fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Snapshot"
        message={`Are you sure you want to delete snapshot "${deleteDialog.date}" (feed: ${deleteDialog.feedKey})? This will also delete the associated file.`}
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
