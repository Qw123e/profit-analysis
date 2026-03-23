from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.target_repository import TargetRepository
from app.schemas.target_schema import (
    TargetItem,
    TargetListResponse,
    TargetResponse,
    ThresholdConfig,
    ThresholdResponse,
)


class TargetService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TargetRepository(db=db)

    async def get_targets(
        self,
        dashboard_key: str,
        year: int | None = None,
        company_code: str | None = None,
    ) -> TargetListResponse:
        """대시보드 목표 목록 조회"""
        targets = await self.repo.get_targets(
            dashboard_key=dashboard_key,
            year=year,
            company_code=company_code,
        )
        return TargetListResponse(
            dashboard_key=dashboard_key,
            targets=[
                TargetResponse(
                    year=t.year,
                    month=t.month,
                    sales_target=float(t.sales_target),
                    op_target=float(t.op_target),
                    company_code=t.company_code,
                )
                for t in targets
            ],
        )

    async def save_targets(
        self,
        dashboard_key: str,
        targets: list[TargetItem],
        user_id: int | None = None,
    ) -> TargetListResponse:
        """목표 저장 (upsert)"""
        saved_targets = []
        for item in targets:
            company_code = item.company_code or "ALL"
            # 0인 목표는 삭제하지 않고 그대로 저장 (추후 삭제 로직 필요시 추가)
            target = await self.repo.upsert_target(
                dashboard_key=dashboard_key,
                company_code=company_code,
                year=item.year,
                month=item.month,
                sales_target=item.sales_target,
                op_target=item.op_target,
                user_id=user_id,
            )
            saved_targets.append(target)

        await self.db.commit()

        return TargetListResponse(
            dashboard_key=dashboard_key,
            targets=[
                TargetResponse(
                    year=t.year,
                    month=t.month,
                    sales_target=float(t.sales_target),
                    op_target=float(t.op_target),
                    company_code=t.company_code,
                )
                for t in saved_targets
            ],
        )

    async def delete_targets(
        self,
        dashboard_key: str,
        year: int | None = None,
        company_code: str | None = None,
    ) -> int:
        """목표 삭제"""
        count = await self.repo.delete_targets(
            dashboard_key=dashboard_key,
            year=year,
            company_code=company_code,
        )
        await self.db.commit()
        return count

    async def get_threshold(self, dashboard_key: str) -> ThresholdResponse:
        """임계값 조회 (없으면 기본값 반환)"""
        config = await self.repo.get_threshold(dashboard_key)
        if config:
            return ThresholdResponse(
                dashboard_key=dashboard_key,
                green_min=float(config.green_min),
                yellow_min=float(config.yellow_min),
            )
        # 기본값 반환
        return ThresholdResponse(
            dashboard_key=dashboard_key,
            green_min=100.0,
            yellow_min=90.0,
        )

    async def save_threshold(
        self,
        dashboard_key: str,
        config: ThresholdConfig,
    ) -> ThresholdResponse:
        """임계값 저장"""
        saved = await self.repo.upsert_threshold(
            dashboard_key=dashboard_key,
            green_min=config.green_min,
            yellow_min=config.yellow_min,
        )
        await self.db.commit()
        return ThresholdResponse(
            dashboard_key=dashboard_key,
            green_min=float(saved.green_min),
            yellow_min=float(saved.yellow_min),
        )
