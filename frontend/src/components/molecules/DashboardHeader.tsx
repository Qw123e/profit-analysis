import Link from "next/link";
import { theme } from "@/utils/theme";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  backHref = "/dashboards",
  backLabel = "← Dashboards",
  actions,
}: DashboardHeaderProps) {
  const subtitleText = typeof subtitle === "string" ? subtitle : null;
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: "10px 14px",
        border: `1px solid ${theme.border}`,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: theme.link,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            boxShadow: "0 6px 12px rgba(37, 99, 235, 0.25)"
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 3h7v7H3V3zm11 0h7v11h-7V3zM3 14h7v7H3v-7zm11 7v-5h7v5h-7z"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{title}</h1>
          {subtitle && !subtitleText && (
            <div style={{ opacity: 0.8, fontSize: 12, color: "#475569" }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {subtitleText && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#64748b",
              background: "#f1f5f9",
              padding: "3px 8px",
              borderRadius: 999
            }}
          >
            {subtitleText}
          </span>
        )}
        <Link href={backHref} style={{ color: theme.link, fontWeight: 600, textDecoration: "none", fontSize: 12 }}>
          {backLabel}
        </Link>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
