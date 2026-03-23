# Dashboard Performance Playbook

Purpose
- Define a repeatable, dashboard-agnostic approach to speed up dashboard navigation and render.
- Focus on payload size, heavy JS bundles, and expensive client-side transforms.

Quick Signals (what to measure first)
- Network: `/v1/dashboards/{key}/snapshots` Size and Time, plus TTFB.
- JS: plotly or other heavy chunks download/parse time.
- CPU: client-side data transforms (grouping/filtering) during initial load.

Checklist (do in order)
1) Baseline
   - Capture Network Size/Time for snapshot request.
   - Capture JS chunk Size/Time for chart libs.
2) Quick Wins (front-end first)
   - Lazy-load heavy chart libraries via `dynamic()` or equivalent.
   - Avoid loading charts on SSR if not needed.
3) Data Minimization (server + client)
   - Fetch only needed columns for the dashboard.
   - If possible, fetch only aggregated data instead of raw rows.
4) Transport Efficiency
   - Enable gzip for API responses (app or proxy).
   - Add caching headers for snapshot responses.
5) Validate
   - Compare before/after Size/Time in Network tab.
   - Ensure charts and filters still render correctly.

Policy: No DB Aggregation
- Do not compute dashboard stats in the database.
- Use DB only for metadata (dashboard + snapshot index).
- Load snapshot files (JSON/Parquet) and compute stats in FastAPI.

Common Patterns (apply to any dashboard)
1) Column-sliced snapshots
   - Server accepts `columns` query param to return only needed columns.
   - Client passes the minimal column list per dashboard.
   - Example: `/v1/dashboards/{key}/snapshots?columns=...`

2) Lazy-load heavy chart libs
   - Use `next/dynamic` (or similar) for `react-plotly.js`.
   - This removes the plotly bundle from initial route load.

3) Compression
   - Enable gzip at the API layer when no proxy exists.
   - If a proxy (Nginx/Ingress) is present, prefer gzip there and disable at app.

Implementation Reference (current code)
- API compression: `backend/app/main.py` uses `GZipMiddleware`.
- Column-sliced snapshots: `backend/app/routers/dashboards_router.py` supports `columns=`.
- Client query support: `frontend/src/services/dashboardService.ts` supports `columns`.
- Hook support: `frontend/src/hooks/useDashboardSnapshot.ts` supports `columns`.
- Lazy-load chart: `frontend/src/app/dashboards/health-function/page.tsx` uses `dynamic()` for plotly.

Template for New Dashboards
1) Define minimal columns
   - List only the columns used for filters, KPIs, and charts.
2) Use column-sliced snapshot API
   - Pass `columns` to `useDashboardSnapshot`.
3) Keep heavy chart libs lazy
   - Use `dynamic(() => import("react-plotly.js"), { ssr: false })`.
4) Prefer aggregated endpoints when possible
   - Add a dedicated API route that returns pre-aggregated data for charts.
5) Keep stats logic in a dedicated service
   - `backend/app/services/{dashboard}_service.py` for dashboard-specific stats.
6) Validate with Network and Performance panels
   - Ensure snapshot Size drops and first chart render time improves.

Notes on gzip vs proxy
- If traffic passes through a proxy that already compresses, keep gzip there only.
- Avoid double compression (wasted CPU, no extra savings).
