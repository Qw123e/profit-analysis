"""
Delete default dashboards that were previously auto-seeded.

Usage (inside backend container or locally with env):
  DATABASE_URL=... python -m scripts.delete_seeded_dashboards
"""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import delete

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.models.dashboard import Dashboard  # noqa: E402


DEFAULT_DASHBOARD_KEYS = [
    "sales-overview",
    "customer-overview",
    "product-performance",
    "marketing-performance",
    "operations",
    "finance",
    "retention",
    "funnel",
    "quality",
    "executive",
]


async def delete_seeded() -> int:
    if not DEFAULT_DASHBOARD_KEYS:
        return 0
    async with SessionLocal() as db:
        result = await db.execute(
            delete(Dashboard).where(Dashboard.key.in_(DEFAULT_DASHBOARD_KEYS))
        )
        await db.commit()
        return result.rowcount or 0


def main() -> None:
    deleted = asyncio.run(delete_seeded())
    print(f"Deleted dashboards: {deleted}")


if __name__ == "__main__":
    main()
