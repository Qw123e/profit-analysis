import type { DashboardItem } from "@/types/dashboard";

export interface BootstrapUser {
  user_id: string;
  username: string;
  role: string;
  is_active?: boolean;
  projects?: string[];
}

export interface BootstrapResponse {
  user: BootstrapUser;
  dashboards: DashboardItem[];
}
