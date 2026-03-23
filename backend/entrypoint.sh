#!/usr/bin/env sh
set -eu

export PYTHONPATH="/app"

echo "[backend] running migrations"
alembic upgrade head

echo "[backend] syncing dashboards and snapshots from filesystem"
python scripts/sync_dashboards_and_snapshots.py

echo "[backend] starting api server"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
