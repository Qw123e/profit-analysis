# Login and RBAC Roadmap

## Goal
- Add login with two roles: admin and user.
- No self-signup. Accounts, passwords, and roles are managed manually.
- User: read-only access plus filter controls.
- Admin: full access (dashboard CRUD, snapshot upload/delete, mapping view).

## Current State (Summary)
- Backend: all `/api/v1` endpoints are open; no auth middleware or user model.
- Frontend: dashboard list includes create/edit/delete; snapshot upload and delete actions are exposed.
- Data: snapshots stored as local JSON or S3 URIs.

## Role Access Matrix (Target)
- Public: `GET /api/health`, `POST /api/v1/auth/login`
- User: `GET /api/v1/dashboards`, `GET /api/v1/dashboards/{key}/snapshots`,
  `GET /api/v1/dashboards/{key}/snapshots/list`, `GET /api/v1/dashboards/{key}/snapshots/preview`,
  `GET /api/v1/dashboards/{key}/filters`, `POST /api/v1/dashboards/{key}/aggregate`,
  `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`
- Admin: all user endpoints plus
  `POST /api/v1/dashboards`, `PUT /api/v1/dashboards/{key}`, `DELETE /api/v1/dashboards/{key}`,
  `POST /api/v1/dashboards/{key}/snapshots/upload`,
  `DELETE /api/v1/dashboards/{key}/snapshots/{date}`,
  `GET /api/v1/snapshots/mapping`,
  user-management script or endpoints (optional).

## Phase 1: Backend Auth Foundation (JWT Cookie)
1. Add `User` model and migration.
   - Fields: `id`, `username` (unique), `password_hash`, `role` (admin|user),
     `is_active`, `created_at`, `updated_at`, optional `last_login_at`.
2. Add auth config to `backend/app/core/config.py`.
   - `auth_secret`, `auth_token_ttl_minutes`, `auth_cookie_name`.
3. Add password hashing utility (passlib + bcrypt).
4. Add `AuthService` and `UserRepository`.
   - `verify_password`, `hash_password`, `authenticate`, `get_user`.
5. Add auth router:
   - `POST /api/v1/auth/login` -> set httpOnly cookie (JWT)
   - `POST /api/v1/auth/logout` -> clear cookie
   - `GET /api/v1/auth/me` -> return current user profile
6. Add auth dependencies:
   - `get_current_user` (401 if missing/invalid)
   - `require_admin` (403 if not admin)
7. Apply dependencies to routers per Role Access Matrix.
8. Add a user management script (manual control path).
   - `backend/scripts/manage_users.py` with create/update/reset-password/disable.
   - Use this script to create the initial admin account.
9. (Optional) Add admin user-management endpoints for UI.
   - `GET /api/v1/admin/users`
   - `POST /api/v1/admin/users`
   - `PUT /api/v1/admin/users/{id}`
   - `PATCH /api/v1/admin/users/{id}/password`
   - `PATCH /api/v1/admin/users/{id}/status`

## Phase 2: Frontend Auth Integration + Admin UI
1. Add `frontend/src/app/login/page.tsx` with username/password form.
2. Add `authService` and `useAuth` hook to call `/auth/login`, `/auth/me`, `/auth/logout`.
3. Update `httpClient` and direct `fetch` calls to include `credentials: "include"`.
4. Add route protection:
   - `middleware.ts` to redirect to `/login` when no session cookie.
   - Allow `/login` and static assets.
5. Gate admin UI features:
   - Hide create/edit/delete buttons.
   - Hide upload and snapshot delete pages/links.
   - Hide snapshot mapping page for non-admin.
6. Display current user + logout in dashboard layout/header.
7. Add admin UI pages:
   - `frontend/src/app/admin/users/page.tsx` (list/create/edit/disable/reset password)
   - Reusable user form modal + confirmation dialog
   - Expose navigation only to admin

## Phase 3: Ops, Docs, and Smoke Tests
1. Update `.env.example` with auth settings.
2. Document user management script and seed admin flow in `README.md`.
3. Smoke tests:
   - Login, access dashboards (user vs admin).
   - Verify admin-only actions reject user (403).
   - Verify unauthenticated access redirects to `/login`.

## Notes / Decisions Needed
- `/snapshots/mapping` admin-only is recommended.
