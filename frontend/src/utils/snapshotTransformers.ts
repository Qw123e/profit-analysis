import type { SnapshotFeed } from "@/types/snapshot";

export type RowObject = Record<string, string | number | null>;

/**
 * Convert SnapshotFeed (columns + rows array) to array of row objects
 */
export function feedToObjects(feed?: SnapshotFeed): RowObject[] {
  if (!feed) return [];
  const { columns, rows } = feed;
  return rows.map((row) => {
    const obj: RowObject = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx] ?? null;
    });
    return obj;
  });
}

/**
 * Safely convert value to number, return 0 if conversion fails
 */
export function safeNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize value to string label for grouping/filtering
 */
export function normalizeLabel(v: string | number | null): string {
  if (v === null || v === undefined) return "미분류";
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }
  const trimmed = v.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return "미분류";
  return trimmed;
}

/**
 * Group rows by key and sum numeric values
 */
export function groupSum(
  rows: RowObject[],
  groupKey: string,
  valueKey: string,
  filter?: (r: RowObject) => boolean
): Array<{ name: string; value: number }> {
  const acc = new Map<string, number>();
  for (const r of rows) {
    if (filter && !filter(r)) continue;
    const key = normalizeLabel(r[groupKey] as string | number | null);
    const val = safeNumber(r[valueKey]);
    acc.set(key, (acc.get(key) ?? 0) + val);
  }
  return Array.from(acc.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * Sum all values in a column with optional filter
 */
export function sumAll(
  rows: RowObject[],
  valueKey: string,
  filter?: (r: RowObject) => boolean
): number {
  return rows.reduce((sum, r) => (filter && !filter(r) ? sum : sum + safeNumber(r[valueKey])), 0);
}

/**
 * Format number with Korean locale
 */
export function numberFormat(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num);
}
