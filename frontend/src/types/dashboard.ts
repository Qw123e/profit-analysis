export interface DashboardItem {
  key: string;
  name: string;
  description?: string | null;
  is_public?: boolean;
}

export interface DashboardListResponse {
  items: DashboardItem[];
}
