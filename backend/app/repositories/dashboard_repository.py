from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dashboard import Dashboard
from app.models.user_dashboard_access import UserDashboardAccess


class DashboardRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_active(self) -> list[Dashboard]:
        result = await self.db.execute(select(Dashboard).where(Dashboard.is_active.is_(True)))
        return list(result.scalars().all())

    async def get_by_key(self, key: str) -> Dashboard | None:
        result = await self.db.execute(select(Dashboard).where(Dashboard.key == key))
        return result.scalars().first()

    async def get_active_by_key(self, key: str) -> Dashboard | None:
        result = await self.db.execute(
            select(Dashboard).where(Dashboard.key == key, Dashboard.is_active.is_(True))
        )
        return result.scalars().first()

    async def list_by_keys(self, keys: list[str]) -> list[Dashboard]:
        if not keys:
            return []
        result = await self.db.execute(
            select(Dashboard).where(Dashboard.key.in_(keys), Dashboard.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def create(
        self,
        key: str,
        name: str,
        description: str | None = None,
        is_public: bool = False,
    ) -> Dashboard:
        """Create a new dashboard"""
        dashboard = Dashboard(
            key=key,
            name=name,
            description=description,
            is_active=True,
            is_public=is_public,
        )
        self.db.add(dashboard)
        await self.db.flush()
        await self.db.refresh(dashboard)
        return dashboard

    async def update(
        self,
        key: str,
        name: str,
        description: str | None = None,
        is_public: bool | None = None,
    ) -> Dashboard | None:
        """Update dashboard name and description. Returns updated dashboard or None if not found."""
        dashboard = await self.get_by_key(key)
        if not dashboard:
            return None
        dashboard.name = name
        dashboard.description = description
        if is_public is not None:
            dashboard.is_public = is_public
        await self.db.flush()
        await self.db.refresh(dashboard)
        return dashboard

    async def delete_by_key(self, key: str) -> bool:
        """Delete dashboard by key. Returns True if deleted, False if not found."""
        result = await self.db.execute(delete(Dashboard).where(Dashboard.key == key))
        return result.rowcount > 0

    async def list_accessible_for_user(self, user_id: int) -> list[Dashboard]:
        stmt = (
            select(Dashboard)
            .outerjoin(
                UserDashboardAccess,
                (UserDashboardAccess.dashboard_id == Dashboard.id)
                & (UserDashboardAccess.user_id == user_id),
            )
            .where(Dashboard.is_active.is_(True))
            .where(or_(Dashboard.is_public.is_(True), UserDashboardAccess.user_id.is_not(None)))
            .distinct()
            .order_by(Dashboard.name.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
