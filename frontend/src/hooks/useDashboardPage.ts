import { useEffect, useMemo, useState } from "react";
import { useDashboardSnapshot } from "./useDashboardSnapshot";

export function useDashboardPage(dashboardKey: string, date?: string) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, error, isLoading, mutate } = useDashboardSnapshot({ dashboardKey, date });

  const feedKey = useMemo(() => {
    const keys = Object.keys(data?.feeds ?? {});
    if (keys.length === 0) return undefined;
    if (keys.includes("example")) return "example";
    return keys[0];
  }, [data]);

  const feed = feedKey ? data?.feeds?.[feedKey] : undefined;

  return {
    mounted,
    data,
    error,
    isLoading,
    feedKey,
    feed,
    mutate
  };
}
