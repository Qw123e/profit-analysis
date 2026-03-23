from __future__ import annotations

from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dashboard_target import DashboardTarget, DashboardThresholdConfig


class TargetRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_targets(
        self,
        dashboard_key: str,
        year: int | None = None,
        company_code: str | None = None,
    ) -> list[DashboardTarget]:
        """대시보드의 목표 목록 조회"""
        stmt = select(DashboardTarget).where(DashboardTarget.dashboard_key == dashboard_key)
        if company_code is not None:
            stmt = stmt.where(DashboardTarget.company_code == company_code)
        if year is not None:
            stmt = stmt.where(DashboardTarget.year == year)
        stmt = stmt.order_by(DashboardTarget.year, DashboardTarget.month)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def upsert_target(
        self,
        dashboard_key: str,
        company_code: str,
        year: int,
        month: int,
        sales_target: float,
        op_target: float,
        user_id: int | None = None,
    ) -> DashboardTarget:
        """목표 저장 또는 업데이트"""
        stmt = select(DashboardTarget).where(
            DashboardTarget.dashboard_key == dashboard_key,
            DashboardTarget.company_code == company_code,
            DashboardTarget.year == year,
            DashboardTarget.month == month,
        )
        result = await self.db.execute(stmt)
        existing = result.scalars().first()

        if existing:
            existing.sales_target = Decimal(str(sales_target))
            existing.op_target = Decimal(str(op_target))
            if user_id:
                existing.created_by = user_id
            await self.db.flush()
            return existing
        else:
            target = DashboardTarget(
                dashboard_key=dashboard_key,
                company_code=company_code,
                year=year,
                month=month,
                sales_target=Decimal(str(sales_target)),
                op_target=Decimal(str(op_target)),
                created_by=user_id,
            )
            self.db.add(target)
            await self.db.flush()
            return target

    async def delete_targets(
        self,
        dashboard_key: str,
        year: int | None = None,
        company_code: str | None = None,
    ) -> int:
        """목표 삭제"""
        stmt = delete(DashboardTarget).where(DashboardTarget.dashboard_key == dashboard_key)
        if company_code is not None:
            stmt = stmt.where(DashboardTarget.company_code == company_code)
        if year is not None:
            stmt = stmt.where(DashboardTarget.year == year)
        result = await self.db.execute(stmt)
        return result.rowcount

    async def get_threshold(self, dashboard_key: str) -> DashboardThresholdConfig | None:
        """임계값 조회"""
        stmt = select(DashboardThresholdConfig).where(
            DashboardThresholdConfig.dashboard_key == dashboard_key
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def upsert_threshold(
        self,
        dashboard_key: str,
        green_min: float,
        yellow_min: float,
    ) -> DashboardThresholdConfig:
        """임계값 저장 또는 업데이트"""
        existing = await self.get_threshold(dashboard_key)
        if existing:
            existing.green_min = Decimal(str(green_min))
            existing.yellow_min = Decimal(str(yellow_min))
            await self.db.flush()
            return existing
        else:
            config = DashboardThresholdConfig(
                dashboard_key=dashboard_key,
                green_min=Decimal(str(green_min)),
                yellow_min=Decimal(str(yellow_min)),
            )
            self.db.add(config)
            await self.db.flush()
            return config
