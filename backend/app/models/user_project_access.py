from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.models.base import Base


class UserProjectAccess(Base):
    __tablename__ = "user_project_access"
    __table_args__ = (
        UniqueConstraint("user_id", "project_id", name="uq_user_project_access_user_project"),
        {"schema": settings.bi_schema},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(f"{settings.bi_schema}.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey(f"{settings.bi_schema}.projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    granted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="project_accesses")
    project: Mapped["Project"] = relationship("Project", back_populates="user_accesses")
