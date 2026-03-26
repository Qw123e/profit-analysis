"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR, { useSWRConfig } from "swr";

import { authService } from "@/services/authService";
import { bootstrapService } from "@/services/bootstrapService";
import { dashboardService } from "@/services/dashboardService";
import dynamic from "next/dynamic";
import { DashboardCard } from "@/components/molecules/DashboardCard";

const DashboardCreateModal = dynamic(
  () => import("@/components/molecules/DashboardCreateModal").then((mod) => mod.DashboardCreateModal),
  { ssr: false }
);
const DashboardEditModal = dynamic(
  () => import("@/components/molecules/DashboardEditModal").then((mod) => mod.DashboardEditModal),
  { ssr: false }
);
const ConfirmDialog = dynamic(
  () => import("@/components/molecules/ConfirmDialog").then((mod) => mod.ConfirmDialog),
  { ssr: false }
);
import { ToastContainer } from "@/components/molecules/Toast";
import { useToast } from "@/hooks/useToast";
import { LOGIN_ROUTE } from "@/utils/routes";
import { mainContainerStyle } from "@/utils/dashboardStyles";
import { logEvent } from "@/utils/logger";
import type { DashboardItem } from "@/types/dashboard";

export default function DashboardListPage() {
  const router = useRouter();
  const { mutate: mutateCache } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR("bootstrap", bootstrapService.getBootstrap);
  const { toasts, showToast, removeToast } = useToast();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; dashboard: DashboardItem | null }>({
    open: false,
    dashboard: null
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; dashboard: DashboardItem | null }>({
    open: false,
    dashboard: null
  });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const user = data?.user ?? null;
  const canManage = user?.role === "admin";
  const canViewSnapshots = !!user; // All authenticated users can view/upload snapshots
  const items: DashboardItem[] = data?.dashboards ?? [];

  const handleCreate = async (formData: {
    key: string;
    name: string;
    description?: string;
    is_public?: boolean;
  }) => {
    setCreating(true);
    try {
      await dashboardService.createDashboard(formData);
      logEvent({
        eventName: "dashboard_create",
        user,
        eventProperties: {
          dashboard_key: formData.key,
          dashboard_name: formData.name,
          is_public: formData.is_public ?? false
        }
      });
      showToast(`Dashboard "${formData.name}" created successfully!`, "success");
      setCreateModalOpen(false);
      mutate(); // Refresh list
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create dashboard", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (dashboard: DashboardItem) => {
    setEditDialog({ open: true, dashboard });
  };

  const handleEditSubmit = async (formData: { name: string; description?: string; is_public?: boolean }) => {
    if (!editDialog.dashboard) return;

    setEditing(true);
    try {
      await dashboardService.updateDashboard(editDialog.dashboard.key, formData);
      logEvent({
        eventName: "dashboard_update",
        user,
        eventProperties: {
          dashboard_key: editDialog.dashboard.key,
          dashboard_name: formData.name,
          is_public: formData.is_public ?? editDialog.dashboard.is_public ?? false
        }
      });
      showToast(`Dashboard "${formData.name}" updated successfully!`, "success");
      setEditDialog({ open: false, dashboard: null });
      mutate(); // Refresh list
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update dashboard", "error");
    } finally {
      setEditing(false);
    }
  };

  const handleTogglePublic = async (dashboard: DashboardItem) => {
    setEditing(true);
    try {
      const newIsPublic = !dashboard.is_public;
      await dashboardService.updateDashboard(dashboard.key, {
        name: dashboard.name,
        description: dashboard.description ?? undefined,
        is_public: newIsPublic
      });
      logEvent({
        eventName: "dashboard_visibility_update",
        user,
        eventProperties: {
          dashboard_key: dashboard.key,
          dashboard_name: dashboard.name,
          is_public: newIsPublic
        }
      });
      showToast(
        `Dashboard "${dashboard.name}" is now ${newIsPublic ? "public" : "private"}.`,
        "success"
      );
      mutate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update visibility", "error");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteClick = (dashboard: DashboardItem) => {
    setDeleteDialog({ open: true, dashboard });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.dashboard) return;

    setDeleting(true);
    try {
      await dashboardService.deleteDashboard(deleteDialog.dashboard.key);
      logEvent({
        eventName: "dashboard_delete",
        user,
        eventProperties: {
          dashboard_key: deleteDialog.dashboard.key,
          dashboard_name: deleteDialog.dashboard.name
        }
      });
      showToast(`Dashboard "${deleteDialog.dashboard.name}" deleted successfully!`, "success");
      setDeleteDialog({ open: false, dashboard: null });
      mutate(); // Refresh list
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete dashboard", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!deleting) {
      setDeleteDialog({ open: false, dashboard: null });
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      mutateCache("auth/me", null, { revalidate: false });
      mutateCache("dashboards", undefined, { revalidate: false });
      mutateCache("bootstrap", null, { revalidate: false });
      router.replace(LOGIN_ROUTE);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to logout", "error");
    }
  };

  if (isLoading) {
    return (
      <main style={mainContainerStyle}>
        <div style={{ fontSize: 16, color: "#64748b" }}>Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={mainContainerStyle}>
        <div style={{ fontSize: 16, color: "#ef4444" }}>Failed to load dashboards</div>
      </main>
    );
  }

  return (
    <main style={{ ...mainContainerStyle, maxWidth: 1200, margin: "0 auto" }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24
        }}
      >
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#0f172a" }}>Dashboards</h1>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Link
            href="/sql-lab"
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              background: "#7c3aed",
              color: "#ffffff",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            SQL Lab
          </Link>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {user.username} ({user.role})
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 999,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#475569",
                  cursor: "pointer"
                }}
              >
                Logout
              </button>
            </div>
          )}
          {canViewSnapshots && (
            <>
              <Link
                href="/snapshots/mapping"
                style={{
                  color: "#2563eb",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: 14
                }}
              >
                View All Snapshots →
              </Link>
              <Link
                href="/dashboards/upload"
                style={{
                  color: "#2563eb",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: 14
                }}
              >
                Upload Snapshot →
              </Link>
            </>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              style={{
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                cursor: "pointer"
              }}
            >
              + Create Dashboard
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16
        }}
      >
        {items.map((dashboard) => (
          <DashboardCard
            key={dashboard.key}
            dashboardKey={dashboard.key}
            name={dashboard.name}
            description={dashboard.description ?? undefined}
            isPublic={dashboard.is_public}
            onEdit={canManage ? () => handleEditClick(dashboard) : undefined}
            onDelete={canManage ? () => handleDeleteClick(dashboard) : undefined}
            onTogglePublic={canManage ? () => handleTogglePublic(dashboard) : undefined}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#64748b",
            fontSize: 14
          }}
        >
          No dashboards yet. Create one to get started!
        </div>
      )}

      {canManage && (
        <DashboardCreateModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreate}
          loading={creating}
        />
      )}

      {canManage && (
        <DashboardEditModal
          open={editDialog.open}
          dashboard={editDialog.dashboard}
          onClose={() => setEditDialog({ open: false, dashboard: null })}
          onSubmit={handleEditSubmit}
          loading={editing}
        />
      )}

      {canManage && (
        <ConfirmDialog
          open={deleteDialog.open}
          title="Delete Dashboard"
          message={`Are you sure you want to delete "${deleteDialog.dashboard?.name}"? All associated snapshots will also be deleted. This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </main>
  );
}
