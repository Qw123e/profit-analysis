from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dashboard import Dashboard
from app.models.user_dashboard_access import UserDashboardAccess


class UserDashboardAccessRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_dashboard_keys(self, user_id: int) -> list[str]:
        stmt = (
            select(Dashboard.key)
            .join(UserDashboardAccess, UserDashboardAccess.dashboard_id == Dashboard.id)
            .where(UserDashboardAccess.user_id == user_id, Dashboard.is_active.is_(True))
            .order_by(Dashboard.key.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def has_access(self, user_id: int, dashboard_id: int) -> bool:
        stmt = select(UserDashboardAccess).where(
            UserDashboardAccess.user_id == user_id,
            UserDashboardAccess.dashboard_id == dashboard_id,
        )
        result = await self.db.execute(stmt)
        return result.scalars().first() is not None

    async def add_access(self, user_id: int, dashboard_id: int) -> None:
        if await self.has_access(user_id, dashboard_id):
            return
        self.db.add(UserDashboardAccess(user_id=user_id, dashboard_id=dashboard_id))
        await self.db.flush()

    async def remove_access(self, user_id: int, dashboard_id: int) -> None:
        stmt = delete(UserDashboardAccess).where(
            UserDashboardAccess.user_id == user_id,
            UserDashboardAccess.dashboard_id == dashboard_id,
        )
        await self.db.execute(stmt)

    async def replace_access(self, user_id: int, dashboard_ids: list[int]) -> None:
        await self.db.execute(delete(UserDashboardAccess).where(UserDashboardAccess.user_id == user_id))
        for dashboard_id in dashboard_ids:
            self.db.add(UserDashboardAccess(user_id=user_id, dashboard_id=dashboard_id))
        await self.db.flush()
