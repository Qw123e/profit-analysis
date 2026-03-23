interface MiniCardProps {
  title: string;
  value: string;
  suffix?: string;
  variant?: "dark" | "light";
}

export function MiniCard({ title, value, suffix, variant = "light" }: MiniCardProps) {
  const cardStyle = variant === "dark"
    ? {
        background: "#111a2e",
        border: "1px solid #1e2740",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.2)",
        color: "#e8eefc"
      }
    : {
        background: "#ffffff",
        border: "1px solid #f1f5f9",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        color: "#0f172a"
      };

  return (
    <div style={{ ...cardStyle, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: variant === "dark" ? "#94a3b8" : "#64748b" }}>
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
        {value}
        {suffix && ` ${suffix}`}
      </div>
    </div>
  );
}
