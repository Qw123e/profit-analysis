"use client";

import React, { useState } from "react";

export interface DashboardCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { key: string; name: string; description?: string; is_public?: boolean }) => void;
  loading?: boolean;
}

export function DashboardCreateModal({ open, onClose, onSubmit, loading }: DashboardCreateModalProps) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ key, name, description: description || undefined, is_public: isPublic });
  };

  const handleClose = () => {
    setKey("");
    setName("");
    setDescription("");
    setIsPublic(false);
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
          Create New Dashboard
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Key <span style={{ color: "#f87171" }}>*</span>
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. my-dashboard"
              pattern="^[a-z0-9-]+$"
              required
              style={inputStyle}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Only lowercase letters, numbers, and hyphens
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Name <span style={{ color: "#f87171" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Dashboard"
              required
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
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Make this dashboard public
          </label>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              style={{
                padding: "8px 16px",
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
              disabled={loading}
              style={{
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 999,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
