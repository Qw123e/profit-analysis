"use client";

interface ActiveFilter {
  label: string;
  value: string;
  onRemove: () => void;
}

interface DAActiveFiltersProps {
  filters: ActiveFilter[];
  onClearAll?: () => void;
}

export function DAActiveFilters({ filters, onClearAll }: DAActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap"
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>🏷️ 활성 필터</span>

      {filters.map((filter, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            fontSize: 12
          }}
        >
          <span style={{ color: "#1e40af", fontWeight: 600 }}>
            {filter.label}: <span style={{ color: "#2563eb" }}>{filter.value}</span>
          </span>
          <button
            onClick={filter.onRemove}
            style={{
              background: "none",
              border: "none",
              color: "#60a5fa",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              fontSize: 14,
              lineHeight: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#60a5fa";
            }}
          >
            ×
          </button>
        </div>
      ))}

      {filters.length > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#dc2626",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fee2e2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fef2f2";
          }}
        >
          전체 초기화
        </button>
      )}
    </div>
  );
}
