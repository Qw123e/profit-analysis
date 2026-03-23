import { httpDelete, httpGet, httpPost, httpPut } from "@/services/httpClient";

export interface ScheduledQuery {
  id: number;
  saved_query_id: number;
  dashboard_key: string;
  feed_key: string;
  schedule_cron: string;
  snapshot_date_option: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
}

export interface ScheduledQueryCreate {
  saved_query_id: number;
  dashboard_key: string;
  feed_key: string;
  schedule_cron: string;
  snapshot_date_option?: string;
  description?: string;
  is_active?: boolean;
}

export interface ScheduledQueryUpdate {
  schedule_cron?: string;
  snapshot_date_option?: string;
  description?: string;
  is_active?: boolean;
}

export interface ScheduledQueryListResponse {
  items: ScheduledQuery[];
}

export interface QueryExecutionLog {
  id: number;
  scheduled_query_id: number | null;
  saved_query_id: number | null;
  execution_type: string;
  status: string;
  athena_execution_id: string | null;
  rows_affected: number | null;
  error_message: string | null;
  execution_time_ms: number | null;
  snapshot_uri: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface QueryExecutionLogListResponse {
  items: QueryExecutionLog[];
  total: number;
}

export const scheduledQueryService = {
  create: async (data: ScheduledQueryCreate): Promise<ScheduledQuery> => {
    return httpPost<ScheduledQuery>("/v1/scheduled-queries", data);
  },

  list: async (activeOnly: boolean = false): Promise<ScheduledQueryListResponse> => {
    const qs = activeOnly ? "?active_only=true" : "";
    return httpGet<ScheduledQueryListResponse>(`/v1/scheduled-queries${qs}`);
  },

  get: async (scheduleId: number): Promise<ScheduledQuery> => {
    return httpGet<ScheduledQuery>(`/v1/scheduled-queries/${scheduleId}`);
  },

  update: async (scheduleId: number, data: ScheduledQueryUpdate): Promise<ScheduledQuery> => {
    return httpPut<ScheduledQuery>(`/v1/scheduled-queries/${scheduleId}`, data);
  },

  delete: async (scheduleId: number): Promise<void> => {
    await httpDelete(`/v1/scheduled-queries/${scheduleId}`);
  },

  runNow: async (scheduleId: number): Promise<QueryExecutionLog> => {
    return httpPost<QueryExecutionLog>(`/v1/scheduled-queries/${scheduleId}/run`, {});
  },

  listLogs: async (
    scheduledQueryId?: number,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryExecutionLogListResponse> => {
    const params = new URLSearchParams();
    if (scheduledQueryId) params.set("scheduled_query_id", String(scheduledQueryId));
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    return httpGet<QueryExecutionLogListResponse>(`/v1/scheduled-queries/logs/all?${params.toString()}`);
  }
};
