from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.models.base import Base


class SnapshotItem(Base):
    __tablename__ = "snapshot_items"
    __table_args__ = {"schema": settings.bi_schema}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dashboard_id: Mapped[int] = mapped_column(
        ForeignKey(f"{settings.bi_schema}.dashboards.id", ondelete="CASCADE"), index=True
    )
    snapshot_date: Mapped[date] = mapped_column(Date, index=True)
    feed_key: Mapped[str] = mapped_column(String(100))
    s3_uri: Mapped[str] = mapped_column(String(500), nullable=True, default=None)
    data_json: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    generated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
