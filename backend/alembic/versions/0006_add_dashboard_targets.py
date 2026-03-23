"""Add dashboard targets for KPI tracking

Revision ID: 0006_add_dashboard_targets
Revises: 0005_add_project_access
Create Date: 2026-01-28
"""

from alembic import op
import sqlalchemy as sa

revision = "0006_add_dashboard_targets"
down_revision = "0005_add_project_access"
branch_labels = None
depends_on = None

SCHEMA = "bi"


def upgrade() -> None:
    # dashboard_targets 테이블 생성 (월별 목표)
    op.create_table(
        "dashboard_targets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dashboard_key", sa.String(length=100), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("sales_target", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("op_target", sa.Numeric(20, 2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey(f"{SCHEMA}.users.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("dashboard_key", "year", "month", name="uq_dashboard_targets_key_year_month"),
        sa.CheckConstraint("month >= 1 AND month <= 12", name="ck_dashboard_targets_month_range"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_dashboard_targets_dashboard_key",
        "dashboard_targets",
        ["dashboard_key"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_dashboard_targets_year",
        "dashboard_targets",
        ["year"],
        schema=SCHEMA,
    )

    # dashboard_threshold_config 테이블 생성 (신호등 임계값)
    op.create_table(
        "dashboard_threshold_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dashboard_key", sa.String(length=100), nullable=False, unique=True),
        sa.Column("green_min", sa.Numeric(5, 2), nullable=False, server_default="100.0"),
        sa.Column("yellow_min", sa.Numeric(5, 2), nullable=False, server_default="90.0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_dashboard_threshold_config_dashboard_key",
        "dashboard_threshold_config",
        ["dashboard_key"],
        unique=True,
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_dashboard_threshold_config_dashboard_key", table_name="dashboard_threshold_config", schema=SCHEMA)
    op.drop_table("dashboard_threshold_config", schema=SCHEMA)
    op.drop_index("ix_dashboard_targets_year", table_name="dashboard_targets", schema=SCHEMA)
    op.drop_index("ix_dashboard_targets_dashboard_key", table_name="dashboard_targets", schema=SCHEMA)
    op.drop_table("dashboard_targets", schema=SCHEMA)
