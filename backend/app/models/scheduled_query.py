"""ScheduledQuery 모델 - SQL 쿼리 스케줄"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.models.base import Base


class ScheduledQuery(Base):
    """스케줄된 SQL 쿼리"""

    __tablename__ = "scheduled_queries"
    __table_args__ = {"schema": settings.bi_schema}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    saved_query_id: Mapped[int] = mapped_column(
        Integer, ForeignKey(f"{settings.bi_schema}.saved_queries.id", ondelete="CASCADE"), nullable=False
    )
    dashboard_key: Mapped[str] = mapped_column(String(100), nullable=False)
    feed_key: Mapped[str] = mapped_column(String(100), nullable=False)
    schedule_cron: Mapped[str] = mapped_column(String(100), nullable=False)  # Cron expression
    snapshot_date_option: Mapped[str] = mapped_column(
        String(20), nullable=False, default="today"
    )  # today, yesterday, custom
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class QueryExecutionLog(Base):
    """쿼리 실행 로그"""

    __tablename__ = "query_execution_logs"
    __table_args__ = {"schema": settings.bi_schema}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scheduled_query_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey(f"{settings.bi_schema}.scheduled_queries.id", ondelete="SET NULL"), nullable=True
    )
    saved_query_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey(f"{settings.bi_schema}.saved_queries.id", ondelete="SET NULL"), nullable=True
    )
    execution_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # scheduled, manual
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # success, failed, running
    athena_execution_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    rows_affected: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snapshot_uri: Mapped[str | None] = mapped_column(String(500), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
