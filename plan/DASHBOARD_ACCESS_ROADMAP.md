# User-Scoped Dashboard Access Roadmap

## Goal
- Users can access only dashboards explicitly permitted to them.
- Admins retain full access to all dashboards.
- Users can still filter/aggregate data within permitted dashboards.

## Key Decisions (Confirmed)
- Default access when no permissions exist: deny all.
- Public dashboards: add `is_public` flag for everyone.
- Permission model: direct user ↔ dashboard mapping only (no groups).

## Phase 1: Data Model + Backend Enforcement
1. Add mapping table `user_dashboard_access`.
   - Columns: `id`, `user_id`, `dashboard_id`, `created_at`
   - Unique constraint on `(user_id, dashboard_id)`
   - Index on `user_id`, `dashboard_id`
2. Create SQLAlchemy model + Alembic migration.
3. Add `is_public` column to `dashboards` table (default false).
3. Add repository and service helpers:
   - `list_dashboards_for_user(user_id)`
   - `has_access(user_id, dashboard_id)`
4. Update dashboard listing:
   - `/api/v1/dashboards` returns only permitted dashboards for non-admin.
   - Include dashboards where `is_public = true`.
5. Add access dependency:
   - `require_dashboard_access(dashboard_key)` loads dashboard, checks mapping.
   - Admin bypass.
   - Allow if `is_public = true`.
6. Apply access dependency to read-only endpoints:
   - `GET /dashboards/{key}/snapshots`
   - `GET /dashboards/{key}/snapshots/list`
   - `GET /dashboards/{key}/snapshots/preview`
   - `GET /dashboards/{key}/filters`
   - `POST /dashboards/{key}/aggregate`

## Phase 2: Admin API for Permission Management
1. Add endpoints:
   - `GET /api/v1/admin/users/{id}/dashboards` (list permitted dashboard keys)
   - `PUT /api/v1/admin/users/{id}/dashboards` (replace full list)
   - Optional: `POST/DELETE` for single grant/revoke
2. Add request/response schemas.
3. Update `manage_users.py` to support:
   - `grant-dashboard --username --dashboard-key`
   - `revoke-dashboard --username --dashboard-key`
   - `set-dashboards --username --dashboard-keys a,b,c`

## Phase 3: Admin UI
1. Add user-permission editor modal on `/admin/users`:
   - Fetch all dashboards + current user permissions
   - Checkbox list with search
   - Save via `PUT /admin/users/{id}/dashboards`
2. Show permission summary in user list (e.g., count or “All”).
3. Hide permission controls for non-admin.

## Phase 4: User UX & Error Handling
1. When API returns 403, show “접근 권한 없음” on dashboard pages.
2. Ensure dashboard list only shows permitted items (already backend-filtered).
3. Add guard for direct URL access (read-only pages).

## Phase 5: Testing & Docs
1. Create admin + user accounts.
2. Grant specific dashboard permissions.
3. Verify:
   - User sees only permitted dashboards.
   - User cannot access non-permitted dashboards via URL (403).
   - Admin sees all dashboards and can access all.
4. Document permission management in README or admin guide.
