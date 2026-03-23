from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.database import get_db
from app.schemas.user_schema import UserDashboardAccessRequest, UserDashboardAccessResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/admin/users", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/{user_id}/dashboards", response_model=UserDashboardAccessResponse)
async def list_user_dashboards(
    user_id: int,
    db: AsyncSession = Depends(get_db),
) -> UserDashboardAccessResponse:
    service = UserService(db=db)
    return await service.list_user_dashboards(user_id)


@router.put("/{user_id}/dashboards", response_model=UserDashboardAccessResponse)
async def set_user_dashboards(
    user_id: int,
    payload: UserDashboardAccessRequest,
    db: AsyncSession = Depends(get_db),
) -> UserDashboardAccessResponse:
    service = UserService(db=db)
    try:
        return await service.set_user_dashboards(user_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
