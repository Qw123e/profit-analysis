import useSWR, { type Fetcher } from "swr";

import { dashboardService } from "@/services/dashboardService";
import type { DashboardSnapshotResponse } from "@/types/snapshot";

export function useDashboardSnapshot({
  dashboardKey,
  date,
  columns
}: {
  dashboardKey: string;
  date?: string;
  columns?: string[];
}) {
  const key = ["dashboardSnapshot", dashboardKey, date ?? "latest", columns?.join(",") ?? ""] as const;
  const fetcher: Fetcher<DashboardSnapshotResponse, typeof key> = () =>
    dashboardService.getDashboardSnapshot({ dashboardKey, date, columns });
  return useSWR<DashboardSnapshotResponse, Error, typeof key>(key, fetcher);
}
