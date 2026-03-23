"""
Seed dashboards into metadata DB.

This script is intentionally empty by default. Create dashboards via UI/API,
or populate DEFAULT_DASHBOARDS for manual seeding.
"""

import asyncio

from sqlalchemy import select

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal  # noqa: E402
from app.models.dashboard import Dashboard  # noqa: E402


DEFAULT_DASHBOARDS: list[tuple[str, str, str]] = []


async def seed() -> None:
    async with SessionLocal() as db:
        existing_keys = set((await db.execute(select(Dashboard.key))).scalars().all())
        to_add = [
            Dashboard(key=key, name=name, description=desc, is_active=True)
            for key, name, desc in DEFAULT_DASHBOARDS
            if key not in existing_keys
        ]

        db.add_all(to_add)
        await db.commit()


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
