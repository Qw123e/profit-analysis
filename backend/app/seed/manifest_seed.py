from __future__ import annotations

import json
from datetime import date as date_type
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.dashboard import Dashboard
from app.models.snapshot_item import SnapshotItem
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.snapshot_repository import SnapshotRepository


def _load_manifest(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _resolve_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return Path(settings.seed_base_dir) / path


async def _db_is_empty(db: AsyncSession) -> bool:
    dashboard_count = await db.scalar(select(func.count()).select_from(Dashboard))
    snapshot_count = await db.scalar(select(func.count()).select_from(SnapshotItem))
    return (dashboard_count or 0) == 0 and (snapshot_count or 0) == 0


async def seed_from_manifest_if_empty() -> None:
    manifest_path = Path(settings.seed_manifest_path)
    if not manifest_path.exists():
        print("[seed] manifest not found, skipping")
        return

    async with SessionLocal() as session:
        if not await _db_is_empty(session):
            print("[seed] db not empty, skipping")
            return

        manifest = _load_manifest(manifest_path)
        dashboards: list[dict[str, Any]] = manifest.get("dashboards", [])
        snapshots: list[dict[str, Any]] = manifest.get("snapshots", [])

        dashboard_repo = DashboardRepository(db=session)
        if dashboards:
            for item in dashboards:
                key = item.get("key")
                name = item.get("name")
                if not key or not name:
                    print("[seed] dashboard missing key or name, skipping")
                    continue
                await dashboard_repo.create(
                    key=key,
                    name=name,
                    description=item.get("description"),
                    is_public=bool(item.get("is_public", False)),
                )
            await session.commit()
            print(f"[seed] dashboards created: {len(dashboards)}")

        if snapshots:
            snapshot_repo = SnapshotRepository(db=session)
            for item in snapshots:
                dashboard_key = item.get("dashboard_key")
                feed_key = item.get("feed_key")
                snapshot_date = item.get("snapshot_date")
                file_path = item.get("file")
                if not dashboard_key or not feed_key or not snapshot_date or not file_path:
                    print("[seed] snapshot entry missing fields, skipping")
                    continue

                try:
                    snapshot_dt = date_type.fromisoformat(snapshot_date)
                except ValueError:
                    print(f"[seed] invalid snapshot date: {snapshot_date}")
                    continue

                dashboard = await dashboard_repo.get_by_key(dashboard_key)
                if not dashboard:
                    print(f"[seed] dashboard not found for snapshot: {dashboard_key}")
                    continue

                resolved_path = _resolve_path(file_path)
                if not resolved_path.exists():
                    print(f"[seed] snapshot file missing: {resolved_path}")
                    continue

                file_uri = f"file://{resolved_path}"
                await snapshot_repo.upsert_snapshot_item(
                    dashboard_id=dashboard.id,
                    snapshot_date=snapshot_dt,
                    feed_key=feed_key,
                    s3_uri=file_uri,
                )
            print(f"[seed] snapshots processed: {len(snapshots)}")
