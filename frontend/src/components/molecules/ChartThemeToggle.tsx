"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type ChartTheme = "light" | "dark";

const storageKey = "chart-theme";

export function ChartThemeToggle() {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith("/dashboards");
  const [theme, setTheme] = useState<ChartTheme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const isDark = theme === "dark";
    document.body.classList.toggle("chart-theme-dark", isDark);
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  if (!isDashboard) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        position: "fixed",
        left: 20,
        bottom: 20,
        zIndex: 50,
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid var(--chart-card-border)",
        background: "var(--chart-card-bg)",
        color: "var(--chart-title)",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.12)"
      }}
      aria-label="차트 테마 변경"
    >
      {isDark ? "차트 일반모드" : "차트 다크모드"}
    </button>
  );
}
