"use client";

import React from "react";
import type { Toast as ToastType } from "@/hooks/useToast";

export interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const typeColors = {
    success: { accent: "#10b981", border: "#d1fae5" },
    error: { accent: "#ef4444", border: "#fee2e2" },
    info: { accent: "#3b82f6", border: "#dbeafe" }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 400
      }}
    >
      {toasts.map((toast) => {
        const colors = typeColors[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              background: "#ffffff",
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: "12px 14px",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              animation: "slideIn 0.2s ease-out",
              borderLeft: `4px solid ${colors.accent}`
            }}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: 16,
                cursor: "pointer",
                padding: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
