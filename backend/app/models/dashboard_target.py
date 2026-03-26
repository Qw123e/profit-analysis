from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.config import settings
from app.models.base import Base


class DashboardTarget(Base):
    """월별 매출/영업이익 목표"""
    __tablename__ = "dashboard_targets"
    __table_args__ = (
        UniqueConstraint("dashboard_key", "company_code", "year", "month", name="uq_dashboard_targets_key_year_month_company"),
        CheckConstraint("month >= 1 AND month <= 12", name="ck_dashboard_targets_month_range"),
        Index("ix_dashboard_targets_composite", "dashboard_key", "company_code", "year"),
        {"schema": settings.bi_schema},
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    dashboard_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    company_code: Mapped[str] = mapped_column(String(50), nullable=False, default="ALL", server_default="ALL", index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    sales_target: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    op_target: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey(f"{settings.bi_schema}.users.id", ondelete="SET NULL"), nullable=True)


class DashboardThresholdConfig(Base):
    """KPI 신호등 임계값 설정"""
    __tablename__ = "dashboard_threshold_config"
    __table_args__ = {"schema": settings.bi_schema}

    id: Mapped[int] = mapped_column(primary_key=True)
    dashboard_key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    green_min: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("100.0"))
    yellow_min: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("90.0"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
