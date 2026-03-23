"use client";

import { ReactNode } from "react";

export function DAFilterCard({
  title = "분석 조건",
  children
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: 16,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid #e2e8f0"
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
            stroke="#2563eb"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#334155" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}
