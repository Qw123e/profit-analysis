"use client";

import { ReactNode } from "react";

export function DAKpiSection({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, width: "100%" }}>
      {children}
    </div>
  );
}
