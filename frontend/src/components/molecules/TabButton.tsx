interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  variant?: "dark" | "light";
}

export function TabButton({ active, onClick, label, variant = "light" }: TabButtonProps) {
  const styles = variant === "dark"
    ? {
        border: active ? "1px solid #4f6ddf" : "1px solid #31405f",
        background: active ? "#20305a" : "#111a2e",
        color: "#e8eefc"
      }
    : {
        border: active ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
        background: active ? "#dbeafe" : "#f8fafc",
        color: active ? "#1d4ed8" : "#475569"
      };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        transition: "all 0.2s ease",
        ...styles
      }}
    >
      {label}
    </button>
  );
}
