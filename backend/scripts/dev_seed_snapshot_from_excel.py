"""
Dev helper: create snapshot JSON from an Excel file and register it in snapshot_items.

Usage example (inside backend container):
  docker compose cp ./path/to/sample.xlsx backend:/tmp/sample.xlsx
  docker compose exec backend python scripts/dev_seed_snapshot_from_excel.py \
    --excel-path /tmp/sample.xlsx \
    --dashboard-key sales-overview \
    --feed-key example \
    --snapshot-date 2024-12-18 \
    --output-dir /tmp/dev_snapshots

Notes:
- Saves JSON to output-dir/{dashboard_key}/{snapshot_date}/{feed_key}.json
- Inserts a snapshot_items row with s3_uri set to file://<path>
- Requires the dashboard to already exist (seed_dashboards.py covers the fixed 10 dashboards)
"""

import argparse
import asyncio
import json
import sys
from datetime import date as date_type
from pathlib import Path

import pandas as pd
from sqlalchemy import select

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.models.dashboard import Dashboard  # noqa: E402
from app.models.snapshot_item import SnapshotItem  # noqa: E402


def build_snapshot_json(excel_path: Path, columns: list[str] | None = None) -> dict:
    df = pd.read_excel(excel_path)
    if columns:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            raise ValueError(f"Columns not found in Excel: {missing}")
        df = df[columns]
    # Replace NaN with None for JSON
    df = df.where(pd.notnull(df), None)
    return {"columns": list(df.columns), "rows": df.values.tolist()}


async def insert_snapshot_item(
    dashboard_key: str,
    snapshot_date: date_type,
    feed_key: str,
    file_uri: str,
) -> None:
    async with SessionLocal() as db:
        result = await db.execute(select(Dashboard).where(Dashboard.key == dashboard_key))
        dashboard = result.scalars().first()
        if dashboard is None:
            raise ValueError(f"Dashboard not found: {dashboard_key}")
        item = SnapshotItem(
            dashboard_id=dashboard.id,
            snapshot_date=snapshot_date,
            feed_key=feed_key,
            s3_uri=file_uri,
        )
        db.add(item)
        await db.commit()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed snapshot_items from Excel (dev-only).")
    parser.add_argument("--excel-path", required=True, help="Path to the Excel file (inside container).")
    parser.add_argument("--dashboard-key", required=True, help="Existing dashboard key (seeded).")
    parser.add_argument("--feed-key", required=True, help="Feed key to register.")
    parser.add_argument("--snapshot-date", default=None, help="YYYY-MM-DD (default: today).")
    parser.add_argument("--output-dir", default="/tmp/dev_snapshots", help="Where to store JSON.")
    parser.add_argument("--columns", nargs="*", help="Optional subset of columns to include.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    excel_path = Path(args.excel_path)
    if not excel_path.exists():
        raise SystemExit(f"Excel file not found: {excel_path}")

    snapshot_date = (
        date_type.fromisoformat(args.snapshot_date)
        if args.snapshot_date
        else date_type.today()
    )
    output_dir = Path(args.output_dir) / args.dashboard_key / snapshot_date.isoformat()
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / f"{args.feed_key}.json"

    payload = build_snapshot_json(excel_path=excel_path, columns=args.columns)
    json_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    file_uri = f"file://{json_path}"
    print(f"[dev] wrote snapshot JSON to {json_path}")
    asyncio.run(
        insert_snapshot_item(
            dashboard_key=args.dashboard_key,
            snapshot_date=snapshot_date,
            feed_key=args.feed_key,
            file_uri=file_uri,
        )
    )
    print(f"[dev] inserted snapshot_items row for dashboard={args.dashboard_key}, date={snapshot_date}, feed={args.feed_key}")


if __name__ == "__main__":
    main()

