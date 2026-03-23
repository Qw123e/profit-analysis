"use client";

import React from "react";
import Link from "next/link";

export interface DashboardCardProps {
  dashboardKey: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePublic?: () => void;
}

export function DashboardCard({
  dashboardKey,
  name,
  description,
  isPublic,
  onEdit,
  onDelete,
  onTogglePublic
}: DashboardCardProps) {
  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #f1f5f9",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
    transition: "all 0.2s",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 12
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: 4
  };

  const descStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 1.5,
    flex: 1
  };

  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 6,
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    opacity: 0.8,
    transition: "opacity 0.2s"
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#cbd5f5";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(15, 23, 42, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#f1f5f9";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.06)";
      }}
    >
      {(onEdit || onDelete || onTogglePublic) && (
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8 }}>
          {onTogglePublic && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onTogglePublic();
              }}
              style={{ ...buttonStyle, background: isPublic ? "#16a34a" : "#94a3b8" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
            >
              {isPublic ? "Public" : "Private"}
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onEdit();
              }}
              style={{ ...buttonStyle, background: "#2563eb" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              style={{ ...buttonStyle, background: "#ef4444" }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
            >
              Delete
            </button>
          )}
        </div>
      )}

      <Link
        href={`/dashboards/${dashboardKey}`}
        style={{ textDecoration: "none", flex: 1, display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={titleStyle}>{name}</h3>
          {isPublic && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 999,
                background: "#1d4ed8",
                color: "#ffffff"
              }}
            >
              PUBLIC
            </span>
          )}
        </div>
        {description && <p style={descStyle}>{description}</p>}
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: "auto" }}>
          Key: {dashboardKey}
        </div>
      </Link>
    </div>
  );
}
