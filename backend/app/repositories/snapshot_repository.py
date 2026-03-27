from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.dashboard import Dashboard
from app.models.snapshot_item import SnapshotItem


class SnapshotRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def latest_snapshot_date(self, dashboard_id: int) -> date | None:
        stmt = (
            select(SnapshotItem.snapshot_date)
            .where(SnapshotItem.dashboard_id == dashboard_id)
            .order_by(SnapshotItem.snapshot_date.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def snapshot_items(self, dashboard_id: int, snapshot_date: date) -> Sequence[SnapshotItem]:
        stmt = select(SnapshotItem).where(
            SnapshotItem.dashboard_id == dashboard_id,
            SnapshotItem.snapshot_date == snapshot_date,
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def snapshot_item(
        self, dashboard_id: int, snapshot_date: date, feed_key: str
    ) -> SnapshotItem | None:
        stmt = (
            select(SnapshotItem)
            .where(
                SnapshotItem.dashboard_id == dashboard_id,
                SnapshotItem.snapshot_date == snapshot_date,
                SnapshotItem.feed_key == feed_key,
            )
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def upsert_snapshot_item(
        self,
        dashboard_id: int,
        snapshot_date: date,
        feed_key: str,
        s3_uri: str | None = None,
        data_json: str | None = None,
    ) -> None:
        # delete existing feed snapshot for that date/key
        existing = await self.db.execute(
            select(SnapshotItem).where(
                SnapshotItem.dashboard_id == dashboard_id,
                SnapshotItem.snapshot_date == snapshot_date,
                SnapshotItem.feed_key == feed_key,
            )
        )
        for item in existing.scalars().all():
            await self.db.delete(item)

        item = SnapshotItem(
            dashboard_id=dashboard_id,
            snapshot_date=snapshot_date,
            feed_key=feed_key,
            s3_uri=s3_uri,
            data_json=data_json,
        )
        self.db.add(item)
        await self.db.commit()

    async def list_items_for_dashboard(self, dashboard_id: int) -> Sequence[SnapshotItem]:
        stmt = select(SnapshotItem).where(SnapshotItem.dashboard_id == dashboard_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete_snapshot_item(
        self, dashboard_id: int, snapshot_date: date, feed_key: str
    ) -> tuple[bool, str | None]:
        """
        Delete snapshot item. Returns (deleted: bool, s3_uri: str | None).
        s3_uri is returned for file cleanup.
        """
        # First, get the s3_uri for file cleanup
        stmt = select(SnapshotItem).where(
            SnapshotItem.dashboard_id == dashboard_id,
            SnapshotItem.snapshot_date == snapshot_date,
            SnapshotItem.feed_key == feed_key,
        )
        result = await self.db.execute(stmt)
        item = result.scalars().first()

        if not item:
            return False, None

        s3_uri = item.s3_uri

        # Delete the item
        delete_stmt = delete(SnapshotItem).where(
            SnapshotItem.dashboard_id == dashboard_id,
            SnapshotItem.snapshot_date == snapshot_date,
            SnapshotItem.feed_key == feed_key,
        )
        await self.db.execute(delete_stmt)

        return True, s3_uri

    async def list_all_with_dashboard_info(self) -> Sequence[tuple[SnapshotItem, Dashboard]]:
        """
        Get all snapshots with their dashboard information using JOIN.
        Returns list of (SnapshotItem, Dashboard) tuples.
        """
        stmt = (
            select(SnapshotItem, Dashboard)
            .join(Dashboard, SnapshotItem.dashboard_id == Dashboard.id)
            .order_by(SnapshotItem.snapshot_date.desc())
        )
        result = await self.db.execute(stmt)
        return result.all()
