from pydantic import BaseModel

from app.schemas.dashboard_schema import DashboardItem


class BootstrapUser(BaseModel):
    user_id: str
    username: str
    role: str
    is_active: bool | None = None


class BootstrapResponse(BaseModel):
    user: BootstrapUser
    dashboards: list[DashboardItem]
