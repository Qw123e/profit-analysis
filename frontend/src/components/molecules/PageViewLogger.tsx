"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { logPageView } from "@/utils/logger";

export function PageViewLogger() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    logPageView(user, { path: pathname, title: document.title });
  }, [pathname, user]);

  return null;
}
