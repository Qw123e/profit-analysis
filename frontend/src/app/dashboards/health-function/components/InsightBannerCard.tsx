import React from "react";

export function InsightBannerCard({ insight }: { insight: string }) {
  return (
    <div
      style={{
        background: "#ecfdf5",
        border: "1px solid #d1fae5",
        borderRadius: 12,
        padding: 12,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)"
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 18h6M10 21h4M12 3a7 7 0 0 0-4 12c.6.6 1 1.4 1.2 2.3h5.6c.2-.9.6-1.7 1.2-2.3A7 7 0 0 0 12 3z"
              stroke="#059669"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#065f46" }}>AI Insight</span>
      </div>
      <div style={{ fontSize: 12, color: "#064e3b", lineHeight: 1.4 }}>
        {insight || "데이터 기반 요약이 준비 중입니다."}
      </div>
    </div>
  );
}
