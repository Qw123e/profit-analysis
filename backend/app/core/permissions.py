from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.dashboard import Dashboard
from app.models.user import User
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.user_dashboard_access_repository import UserDashboardAccessRepository


async def require_dashboard_access(
    dashboard_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dashboard:
    dashboard_repo = DashboardRepository(db=db)
    dashboard = await dashboard_repo.get_active_by_key(dashboard_key)
    if not dashboard:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard not found")

    if current_user.role == "admin" or dashboard.is_public:
        return dashboard

    access_repo = UserDashboardAccessRepository(db=db)
    if not await access_repo.has_access(current_user.id, dashboard.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return dashboard
