#!/usr/bin/env sh
set -eu

echo "[backend] running migrations"
alembic upgrade head

echo "[backend] syncing dashboards and snapshots from filesystem"
python scripts/sync_dashboards_and_snapshots.py || echo "[backend] sync skipped (no local data)"

echo "[backend] starting api server"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
