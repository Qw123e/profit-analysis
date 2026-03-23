"use client";

import React, { useEffect, useState } from "react";

export interface DashboardEditModalProps {
  open: boolean;
  dashboard: { key: string; name: string; description?: string | null; is_public?: boolean } | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; is_public?: boolean }) => void;
  loading?: boolean;
}

export function DashboardEditModal({ open, dashboard, onClose, onSubmit, loading }: DashboardEditModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (dashboard) {
      setName(dashboard.name);
      setDescription(dashboard.description || "");
      setIsPublic(Boolean(dashboard.is_public));
    }
  }, [dashboard]);

  if (!open || !dashboard) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description: description || undefined, is_public: isPublic });
  };

  const handleClose = () => {
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#334155",
    outline: "none"
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#64748b",
    marginBottom: 6
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 24,
          maxWidth: 500,
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.2)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#0f172a" }}>
          Edit Dashboard
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Key (read-only)</label>
            <input
              type="text"
              value={dashboard.key}
              disabled
              style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Name <span style={{ color: "#f87171" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sales Overview"
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
              disabled={loading}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={loading}
            />
            Make this dashboard public
          </label>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 999,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#475569",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 999,
                border: "none",
                background: loading || !name.trim() ? "#94a3b8" : "#2563eb",
                color: "#ffffff",
                cursor: loading || !name.trim() ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
