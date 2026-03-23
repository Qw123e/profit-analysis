import { useMemo } from "react";
import type { SnapshotFeed } from "@/types/snapshot";
import { feedToObjects, normalizeLabel, type RowObject } from "@/utils/snapshotTransformers";

export interface FilterOptions {
  years: string[];
  periods: string[];
  quarters: string[];
  countries: string[];
  bizUnits: string[];
}

/**
 * Custom hook to extract unique filter options from snapshot data
 * Used for sales overview filter dropdowns
 */
export function useFilterOptions(feed: SnapshotFeed | undefined): FilterOptions | null {
  return useMemo(() => {
    if (!feed) return null;

    const rows = feedToObjects(feed);

    const collect = (key: string) => {
      const set = new Set<string>();
      rows.forEach((r: RowObject) => set.add(normalizeLabel(r[key] as string | number | null)));
      return Array.from(set.values()).sort();
    };

    return {
      years: collect("회계연도"),
      periods: collect("기간"),
      quarters: collect("분기"),
      countries: collect("매출국가"),
      bizUnits: collect("영업부문")
    };
  }, [feed]);
}
