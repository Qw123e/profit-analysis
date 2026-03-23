"use client";

import useSWR from "swr";

import { authService, type AuthUser } from "@/services/authService";

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR<AuthUser | null>("auth/me", authService.me, {
    revalidateOnFocus: false
  });

  return {
    user: data ?? null,
    isAdmin: data?.role === "admin",
    isAuthenticated: !!data,
    isLoading,
    error,
    refresh: mutate
  };
}
