from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.models.base import Base


class UserDashboardAccess(Base):
    __tablename__ = "user_dashboard_access"
    __table_args__ = {"schema": settings.bi_schema}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.bi_schema}.users.id", ondelete="CASCADE"), index=True
    )
    dashboard_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.bi_schema}.dashboards.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=datetime.utcnow)
