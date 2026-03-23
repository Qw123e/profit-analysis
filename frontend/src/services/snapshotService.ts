import { httpDelete, httpGet } from "@/services/httpClient";

export interface SnapshotMappingItem {
  dashboard_key: string;
  dashboard_name: string;
  snapshot_date: string;
  feed_key: string;
  generated_at: string;
  s3_uri: string;
}

export interface SnapshotMappingResponse {
  snapshots: SnapshotMappingItem[];
}

export const snapshotService = {
  getSnapshotMappings: async (): Promise<SnapshotMappingResponse> => {
    return httpGet<SnapshotMappingResponse>("/v1/snapshots/mapping");
  },

  deleteSnapshot: async (dashboardKey: string, snapshotDate: string, feedKey: string): Promise<void> => {
    await httpDelete(
      `/v1/dashboards/${dashboardKey}/snapshots/${snapshotDate}?feed_key=${encodeURIComponent(feedKey)}`
    );
  }
};
