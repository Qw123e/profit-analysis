from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.target_schema import (
    TargetListResponse,
    TargetUpdateRequest,
    ThresholdConfig,
    ThresholdResponse,
)
from app.services.target_service import TargetService

router = APIRouter(prefix="/dashboards", tags=["targets"])


@router.get(
    "/{dashboard_key}/targets",
    response_model=TargetListResponse,
    summary="목표 조회",
    description="대시보드의 월별 목표를 조회합니다. 인증된 사용자만 접근 가능합니다.",
)
async def get_targets(
    dashboard_key: str,
    year: int | None = Query(None, description="특정 연도로 필터링"),
    company_code: str | None = Query(None, description="법인(회사) 코드로 필터링"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> TargetListResponse:
    service = TargetService(db=db)
    return await service.get_targets(dashboard_key=dashboard_key, year=year, company_code=company_code)


@router.put(
    "/{dashboard_key}/targets",
    response_model=TargetListResponse,
    summary="목표 저장",
    description="대시보드의 월별 목표를 저장합니다. 인증된 사용자만 접근 가능합니다.",
)
async def save_targets(
    dashboard_key: str,
    payload: TargetUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TargetListResponse:
    service = TargetService(db=db)
    return await service.save_targets(
        dashboard_key=dashboard_key,
        targets=payload.targets,
        user_id=current_user.id,
    )


@router.delete(
    "/{dashboard_key}/targets",
    summary="목표 삭제",
    description="대시보드의 목표를 삭제합니다. 인증된 사용자만 접근 가능합니다.",
)
async def delete_targets(
    dashboard_key: str,
    year: int | None = Query(None, description="특정 연도만 삭제"),
    company_code: str | None = Query(None, description="법인(회사) 코드로 필터링"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    service = TargetService(db=db)
    count = await service.delete_targets(dashboard_key=dashboard_key, year=year, company_code=company_code)
    return {"deleted": count}


@router.get(
    "/{dashboard_key}/threshold",
    response_model=ThresholdResponse,
    summary="임계값 조회",
    description="KPI 신호등 임계값을 조회합니다.",
)
async def get_threshold(
    dashboard_key: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ThresholdResponse:
    service = TargetService(db=db)
    return await service.get_threshold(dashboard_key=dashboard_key)


@router.put(
    "/{dashboard_key}/threshold",
    response_model=ThresholdResponse,
    summary="임계값 저장 (관리자 전용)",
    description="KPI 신호등 임계값을 저장합니다. 관리자만 접근 가능합니다.",
    dependencies=[Depends(require_admin)],
)
async def save_threshold(
    dashboard_key: str,
    payload: ThresholdConfig,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ThresholdResponse:
    service = TargetService(db=db)
    return await service.save_threshold(dashboard_key=dashboard_key, config=payload)
