import { useMemo } from "react";
import type { SnapshotFeed } from "@/types/snapshot";
import { feedToObjects, normalizeLabel, safeNumber } from "@/utils/snapshotTransformers";

export interface ProductMetrics {
  categories: string[];
  counts2022: number[];
  counts2023: number[];
  accum2022: number[];
  accum2023: number[];
}

/**
 * Custom hook for product performance metrics calculation
 * Aggregates product development counts by category and year
 */
export function useProductMetrics(feed: SnapshotFeed | undefined): ProductMetrics | null {
  return useMemo(() => {
    if (!feed) return null;

    const rows = feedToObjects(feed);

    try {
      // Category counts for November only
      const categoryCounts2022 = new Map<string, number>();
      const categoryCounts2023 = new Map<string, number>();
      const categoryAccum2022 = new Map<string, number>();
      const categoryAccum2023 = new Map<string, number>();

      rows.forEach((r) => {
        const year = safeNumber(r["년"]);
        const month = safeNumber(r["월"]);
        const category = normalizeLabel(r["중분류명"] as string | number | null);

        if (month === 11) {
          if (year === 2022) {
            categoryCounts2022.set(category, (categoryCounts2022.get(category) || 0) + 1);
          } else if (year === 2023) {
            categoryCounts2023.set(category, (categoryCounts2023.get(category) || 0) + 1);
          }
        }
      });

      // Cumulative counts (January to November)
      rows.forEach((r) => {
        const year = safeNumber(r["년"]);
        const month = safeNumber(r["월"]);
        const category = normalizeLabel(r["중분류명"] as string | number | null);

        if (month <= 11) {
          if (year === 2022) {
            categoryAccum2022.set(category, (categoryAccum2022.get(category) || 0) + 1);
          } else if (year === 2023) {
            categoryAccum2023.set(category, (categoryAccum2023.get(category) || 0) + 1);
          }
        }
      });

      // Collect all categories
      const allCategories = new Set<string>();
      categoryCounts2022.forEach((_, k) => allCategories.add(k));
      categoryCounts2023.forEach((_, k) => allCategories.add(k));

      const categories = Array.from(allCategories).sort();

      return {
        categories,
        counts2022: categories.map((c) => categoryCounts2022.get(c) || 0),
        counts2023: categories.map((c) => categoryCounts2023.get(c) || 0),
        accum2022: categories.map((c) => categoryAccum2022.get(c) || 0),
        accum2023: categories.map((c) => categoryAccum2023.get(c) || 0)
      };
    } catch (e) {
      console.error("Failed to build product metrics", e);
      return null;
    }
  }, [feed]);
}
