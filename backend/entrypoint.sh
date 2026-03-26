#!/usr/bin/env sh
set -eu

# Secrets Manager 개별 필드에서 DATABASE_URL 자동 조합
if [ -z "${DATABASE_URL:-}" ] && [ -n "${DB_HOST:-}" ]; then
  export DATABASE_URL=$(python3 -c "
from urllib.parse import quote_plus
import os
user = os.environ['DB_USERNAME']
pwd = quote_plus(os.environ['DB_PASSWORD'])
host = os.environ['DB_HOST']
port = os.environ.get('DB_PORT', '5432')
name = os.environ.get('DB_NAME', 'postgres')
print(f'postgresql+asyncpg://{user}:{pwd}@{host}:{port}/{name}')
")
  echo "[backend] DATABASE_URL constructed from individual fields"
fi

echo "[backend] running migrations"
alembic upgrade head

echo "[backend] syncing dashboards and snapshots from filesystem"
python3 scripts/sync_dashboards_and_snapshots.py || echo "[backend] sync skipped (no local data)"

echo "[backend] starting api server"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
