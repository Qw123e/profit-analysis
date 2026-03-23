"use client";

interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface DATabNavigationProps<T extends string> {
  activeTab: T;
  tabs: Array<TabItem<T>>;
  onChange: (tab: T) => void;
}

export function DATabNavigation<T extends string>({ activeTab, tabs, onChange }: DATabNavigationProps<T>) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        padding: "4px 6px",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)"
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              position: "relative",
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              borderRadius: 10,
              background: isActive ? "rgba(37, 99, 235, 0.08)" : "transparent",
              color: isActive ? "#2563eb" : "#64748b",
              cursor: "pointer"
            }}
          >
            {tab.label}
            {isActive && (
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 2,
                  height: 2,
                  background: "#2563eb",
                  borderRadius: 999
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
