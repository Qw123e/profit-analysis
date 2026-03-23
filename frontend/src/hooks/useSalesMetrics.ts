import { useMemo } from "react";
import type { SnapshotFeed } from "@/types/snapshot";
import {
  feedToObjects,
  groupSum,
  safeNumber,
  sumAll,
  type RowObject
} from "@/utils/snapshotTransformers";

export interface SalesFilterState {
  yearFilter?: string | number | null;
  periodFilter?: string | number | null;
  quarterFilter?: string | number | null;
  countryFilter?: string | number | null;
  bizUnitFilter?: string | number | null;
}

export interface SalesMetrics {
  total: number;
  byPeriod: Array<{ name: string; value: number }>;
  byQuarter: Array<{ name: string; value: number }>;
  byCountry: Array<{ name: string; value: number }>;
  byBizUnit: Array<{ name: string; value: number }>;
}

/**
 * Custom hook for sales overview metrics calculation
 * Handles filtering and aggregation logic for sales dashboard
 */
export function useSalesMetrics(
  feed: SnapshotFeed | undefined,
  filters: SalesFilterState
): { rows: RowObject[]; filteredRows: RowObject[]; metrics: SalesMetrics | null } {
  const rows = useMemo(() => feedToObjects(feed), [feed]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const { yearFilter, periodFilter, quarterFilter, countryFilter, bizUnitFilter } = filters;

      if (yearFilter !== undefined && yearFilter !== null && safeNumber(r["회계연도"]) !== safeNumber(yearFilter)) {
        return false;
      }
      if (periodFilter !== undefined && periodFilter !== null) {
        const rowPeriod = String(r["기간"] ?? "");
        const filterPeriod = String(periodFilter);
        if (rowPeriod !== filterPeriod) return false;
      }
      if (quarterFilter !== undefined && quarterFilter !== null) {
        const rowQuarter = String(r["분기"] ?? "");
        const filterQuarter = String(quarterFilter);
        if (rowQuarter !== filterQuarter) return false;
      }
      if (countryFilter !== undefined && countryFilter !== null) {
        const rowCountry = String(r["매출국가"] ?? "");
        const filterCountry = String(countryFilter);
        if (rowCountry !== filterCountry) return false;
      }
      if (bizUnitFilter !== undefined && bizUnitFilter !== null) {
        const rowBizUnit = String(r["영업부문"] ?? "");
        const filterBizUnit = String(bizUnitFilter);
        if (rowBizUnit !== filterBizUnit) return false;
      }
      return true;
    });
  }, [rows, filters]);

  const metrics = useMemo(() => {
    if (!feed) return null;
    try {
      const total = sumAll(filteredRows, "영업이익", (r) => safeNumber(r["회계연도"]) === 2024);
      const byPeriod = groupSum(
        filteredRows,
        "기간",
        "영업이익",
        (r) => safeNumber(r["회계연도"]) === 2024
      ).sort((a, b) => (Number(a.name) || 0) - (Number(b.name) || 0));
      const byQuarter = groupSum(
        filteredRows,
        "분기",
        "영업이익",
        (r) => safeNumber(r["회계연도"]) === 2024
      );
      const byCountry = groupSum(
        filteredRows,
        "매출국가",
        "영업이익",
        (r) => safeNumber(r["회계연도"]) === 2024
      );
      const byBizUnit = groupSum(
        filteredRows,
        "영업부문",
        "영업이익",
        (r) => safeNumber(r["회계연도"]) === 2024
      );
      return { total, byPeriod, byQuarter, byCountry, byBizUnit };
    } catch (e) {
      console.error("Failed to build sales metrics", e);
      return null;
    }
  }, [filteredRows, feed]);

  return { rows, filteredRows, metrics };
}
