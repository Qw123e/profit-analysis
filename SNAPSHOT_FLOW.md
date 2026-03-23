# Snapshot Upload Flow (Local vs Docker)

## Overview
This document summarizes how snapshot data is uploaded, stored, and consumed by the dashboard UI.
The core idea is: Excel → JSON snapshot file → snapshot_items metadata → dashboard charts.

## End-to-End Flow
1) Upload Excel via API
- UI: `frontend/src/app/dashboards/upload/page.tsx`
- API: `POST /api/v1/dashboards/{dashboard_key}/snapshots/upload`
  - Query params: `feed_key`, `date`, `columns`

2) Backend converts Excel to JSON
- Service: `backend/app/services/snapshot_service.py`
- `pandas.read_excel()` → `SnapshotFeed { columns, rows }`
- JSON is written to: `{SNAPSHOT_LOCAL_DIR}/{dashboard_key}/{YYYY-MM-DD}/{feed_key}.json`

3) Metadata is upserted
- Table: `snapshot_items`
- Stores `s3_uri` as `file://...` (local file) or `s3://...` (S3)
- Repo: `backend/app/repositories/snapshot_repository.py`

4) UI reads snapshots for charts
- Fetch: `GET /api/v1/dashboards/{dashboard_key}/snapshots?date=...`
- Service: `backend/app/services/dashboard_service.py`
- Returns `feeds` to frontend (`columns/rows`), which are rendered with Plotly

## Local (No Docker)
To persist snapshots on your local filesystem, set `SNAPSHOT_LOCAL_DIR` before running the backend:

```bash
export SNAPSHOT_LOCAL_DIR="${HOME}/bi_snapshots"
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:55432/bi_meta"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

After upload, verify files here:
```
${SNAPSHOT_LOCAL_DIR}/{dashboard_key}/{YYYY-MM-DD}/{feed_key}.json
```

## Docker Compose
When running with Docker Compose:
- The backend bind-mounts local `./data` to `/app/data`.
- Snapshots are stored at `./data/snapshots` on the host.

## Notes
- If `SNAPSHOT_S3_PREFIX` is set, snapshots can be stored/retrieved from S3.
- The UI prefers feed key `example` when multiple feeds exist.
- Errors in snapshot format are raised if `columns`/`rows` are missing in JSON.
