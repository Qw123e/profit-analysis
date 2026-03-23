import React from "react";
import { theme } from "./theme";

export const cardStyle: React.CSSProperties = {
  background: "var(--chart-card-bg)",
  borderRadius: 12,
  padding: 16,
  border: "1px solid var(--chart-card-border)",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)"
};

export const titleStyle: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--chart-title)"
};

export const mainContainerStyle: React.CSSProperties = {
  padding: 24,
  background: "var(--page-bg)",
  minHeight: "100vh",
  color: "var(--page-text)"
};
