import { httpGet, httpPost } from "@/services/httpClient";

export interface QueryStartResponse {
  execution_id: string;
  status: string;
}

export interface QueryStatusResponse {
  execution_id: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  state_change_reason: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  data_scanned_bytes: number | null;
  execution_time_ms: number | null;
}

export interface QueryResultResponse {
  execution_id: string;
  columns: string[];
  rows: (string | number | null)[][];
  total_rows: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface SaveSnapshotRequest {
  dashboard_key: string;
  feed_key: string;
  snapshot_date: string;
}

export interface SaveSnapshotResponse {
  success: boolean;
  message: string;
  snapshot_uri: string | null;
}

export const athenaService = {
  /**
   * SQL 쿼리 실행 시작
   */
  executeQuery: async (sql: string, database: string = "default"): Promise<QueryStartResponse> => {
    return httpPost<QueryStartResponse>("/v1/athena/query", { sql, database });
  },

  /**
   * 쿼리 실행 상태 조회
   */
  getQueryStatus: async (executionId: string): Promise<QueryStatusResponse> => {
    return httpGet<QueryStatusResponse>(`/v1/athena/query/${executionId}/status`);
  },

  /**
   * 쿼리 결과 조회 (페이지네이션)
   */
  getQueryResults: async (
    executionId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResultResponse> => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return httpGet<QueryResultResponse>(`/v1/athena/query/${executionId}/results?${params}`);
  },

  /**
   * 쿼리 결과를 스냅샷으로 저장
   */
  saveAsSnapshot: async (
    executionId: string,
    request: SaveSnapshotRequest
  ): Promise<SaveSnapshotResponse> => {
    return httpPost<SaveSnapshotResponse>(
      `/v1/athena/query/${executionId}/save-snapshot`,
      request
    );
  },

  /**
   * 쿼리 상태 폴링 (완료될 때까지)
   */
  pollUntilComplete: async (
    executionId: string,
    onStatusChange?: (status: QueryStatusResponse) => void,
    pollInterval: number = 1500,
    timeout: number = 180000
  ): Promise<QueryStatusResponse> => {
    const startTime = Date.now();

    while (true) {
      const status = await athenaService.getQueryStatus(executionId);

      if (onStatusChange) {
        onStatusChange(status);
      }

      if (status.status === "SUCCEEDED" || status.status === "FAILED" || status.status === "CANCELLED") {
        return status;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("쿼리 실행 타임아웃");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  },
};
