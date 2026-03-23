from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.bootstrap_schema import BootstrapResponse, BootstrapUser
from app.services.dashboard_service import DashboardService

router = APIRouter(tags=["bootstrap"])


@router.get("/bootstrap", response_model=BootstrapResponse)
async def bootstrap(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BootstrapResponse:
    service = DashboardService(db=db)
    dashboards = await service.list_dashboards(current_user)
    user = BootstrapUser(
        user_id=str(current_user.id),
        username=current_user.username,
        role=current_user.role,
        is_active=current_user.is_active,
    )
    return BootstrapResponse(user=user, dashboards=dashboards.items)
