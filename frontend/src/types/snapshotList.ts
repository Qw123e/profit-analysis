export interface SnapshotIndexEntry {
  feedKey: string;
  uri: string;
}

export interface SnapshotIndexItem {
  snapshotDate: string;
  feeds: SnapshotIndexEntry[];
}

export interface DashboardSnapshotListResponse {
  dashboardKey: string;
  snapshots: SnapshotIndexItem[];
}

