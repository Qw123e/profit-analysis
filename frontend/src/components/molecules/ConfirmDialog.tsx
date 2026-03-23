"use client";

import React from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = "warning",
  loading = false
}: ConfirmDialogProps) {
  if (!open) return null;

  const variantColors = {
    danger: { bg: "#dc2626", hover: "#b91c1c" },
    warning: { bg: "#f59e0b", hover: "#d97706" },
    info: { bg: "#3b82f6", hover: "#2563eb" }
  };

  const colors = variantColors[variant];

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
      onClick={onCancel}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.2)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#0f172a" }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "#475569", marginBottom: 24, lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
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
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 999,
              border: "none",
              background: loading ? "#6b7280" : colors.bg,
              color: "#ffffff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = colors.hover)}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = colors.bg)}
          >
            {loading && (
              <span style={{ display: "inline-block", width: 14, height: 14 }}>
                <svg
                  style={{ animation: "spin 1s linear infinite" }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    style={{ opacity: 0.25 }}
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    style={{ opacity: 0.75 }}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </span>
            )}
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
