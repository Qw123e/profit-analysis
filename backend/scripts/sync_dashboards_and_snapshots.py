"""
Sync dashboards and snapshots from filesystem to database.

This script scans:
1. frontend/src/app/dashboards/* directories -> dashboards table
2. data/snapshots/*/* directories -> snapshot_items table
"""

import asyncio
import json
from pathlib import Path
from datetime import datetime

from sqlalchemy import select

import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal
from app.models.dashboard import Dashboard
from app.models.snapshot_item import SnapshotItem


FRONTEND_DASHBOARDS_DIR = BASE_DIR / "frontend_dashboards"
SNAPSHOTS_DIR = BASE_DIR / "data" / "snapshots"


async def sync_dashboards(db) -> None:
    """Sync dashboard directories to database."""
    if not FRONTEND_DASHBOARDS_DIR.exists():
        print(f"[sync] Frontend dashboards directory not found: {FRONTEND_DASHBOARDS_DIR}")
        return

    # Get existing dashboard keys from DB
    result = await db.execute(select(Dashboard.key))
    existing_keys = set(result.scalars().all())

    # Scan dashboard directories
    added_count = 0
    for item in FRONTEND_DASHBOARDS_DIR.iterdir():
        if not item.is_dir():
            continue

        # Skip special directories
        if item.name.startswith("[") or item.name in ["upload"]:
            continue

        dashboard_key = item.name

        # Skip if already exists
        if dashboard_key in existing_keys:
            continue

        # Check if page.tsx exists
        page_tsx = item / "page.tsx"
        if not page_tsx.exists():
            print(f"[sync] Skipping {dashboard_key}: no page.tsx found")
            continue

        # Extract title from page.tsx (optional)
        title = dashboard_key.replace("-", " ").title()
        try:
            content = page_tsx.read_text()
            # Try to extract title from DashboardHeader
            for line in content.split("\n"):
                if "title=" in line and "DashboardHeader" in content:
                    # Simple extraction (not perfect but works for most cases)
                    if 'title="' in line:
                        start = line.index('title="') + 7
                        end = line.index('"', start)
                        title = line[start:end]
                        break
        except Exception as e:
            print(f"[sync] Warning: Could not extract title from {dashboard_key}: {e}")

        # Add to database
        dashboard = Dashboard(
            key=dashboard_key,
            name=title,
            description=f"{title} dashboard",
            is_active=True
        )
        db.add(dashboard)
        added_count += 1
        print(f"[sync] Added dashboard: {dashboard_key} ({title})")

    if added_count > 0:
        await db.commit()
        print(f"[sync] Total dashboards added: {added_count}")
    else:
        print("[sync] No new dashboards to add")


async def sync_snapshots(db) -> None:
    """Sync snapshot files to database."""
    if not SNAPSHOTS_DIR.exists():
        print(f"[sync] Snapshots directory not found: {SNAPSHOTS_DIR}")
        return

    # Get all dashboards from DB
    result = await db.execute(select(Dashboard))
    dashboards = {d.key: d.id for d in result.scalars().all()}

    # Get existing snapshots from DB
    result = await db.execute(select(SnapshotItem))
    existing_snapshots = set()
    for item in result.scalars().all():
        existing_snapshots.add((item.dashboard_id, item.snapshot_date, item.feed_key))

    # Scan snapshot directories
    added_count = 0
    for dashboard_dir in SNAPSHOTS_DIR.iterdir():
        if not dashboard_dir.is_dir():
            continue

        dashboard_key = dashboard_dir.name
        dashboard_id = dashboards.get(dashboard_key)

        if not dashboard_id:
            print(f"[sync] Skipping snapshots for unknown dashboard: {dashboard_key}")
            continue

        # Scan date directories
        for date_dir in dashboard_dir.iterdir():
            if not date_dir.is_dir():
                continue

            snapshot_date = date_dir.name

            # Validate date format (YYYY-MM-DD)
            try:
                parsed_date = datetime.strptime(snapshot_date, "%Y-%m-%d").date()
            except ValueError:
                print(f"[sync] Skipping invalid date directory: {date_dir}")
                continue

            # Scan data files (parquet preferred, then json)
            METADATA_SUFFIXES = [".schema.json", ".preview.json", ".validation.json"]
            data_files = list(date_dir.glob("*.parquet")) + list(date_dir.glob("*.json"))
            seen_feeds = set()

            for data_file in data_files:
                # Skip metadata files
                if any(data_file.name.endswith(suffix) for suffix in METADATA_SUFFIXES):
                    continue
                # Skip Zone.Identifier files (Windows/WSL artifacts)
                if data_file.name.endswith(":Zone.Identifier"):
                    continue

                feed_key = data_file.stem  # filename without extension

                # Deduplicate: if we already saw this feed (parquet takes priority)
                if feed_key in seen_feeds:
                    continue
                seen_feeds.add(feed_key)

                # Skip if already exists in DB
                if (dashboard_id, parsed_date, feed_key) in existing_snapshots:
                    continue

                # Validate file is readable
                try:
                    if data_file.suffix == ".json":
                        with open(data_file, "r") as f:
                            json.load(f)
                    # For parquet, just check it exists and has size > 0
                    elif data_file.stat().st_size == 0:
                        print(f"[sync] Skipping empty file {data_file}")
                        continue
                except Exception as e:
                    print(f"[sync] Skipping invalid file {data_file}: {e}")
                    continue

                # Add to database
                s3_uri = f"file:///app/data/snapshots/{dashboard_key}/{snapshot_date}/{data_file.name}"
                snapshot_item = SnapshotItem(
                    dashboard_id=dashboard_id,
                    snapshot_date=parsed_date,
                    feed_key=feed_key,
                    s3_uri=s3_uri,
                    generated_at=datetime.now()
                )
                db.add(snapshot_item)
                added_count += 1
                print(f"[sync] Added snapshot: {dashboard_key}/{snapshot_date}/{feed_key}")

    if added_count > 0:
        await db.commit()
        print(f"[sync] Total snapshots added: {added_count}")
    else:
        print("[sync] No new snapshots to add")


async def main() -> None:
    print("[sync] Starting dashboard and snapshot sync...")
    async with SessionLocal() as db:
        await sync_dashboards(db)
        await sync_snapshots(db)
    print("[sync] Sync completed")


if __name__ == "__main__":
    asyncio.run(main())
