"""Add company code to dashboard targets

Revision ID: 0008_add_company_code_to_dashboard_targets
Revises: 0007_add_scheduling_tables
Create Date: 2026-02-04
"""

from alembic import op
import sqlalchemy as sa

revision = "0008_add_company_code_to_dashboard_targets"
down_revision = "0007_add_scheduling_tables"
branch_labels = None
depends_on = None

SCHEMA = "bi"


def upgrade() -> None:
    op.add_column(
        "dashboard_targets",
        sa.Column("company_code", sa.String(length=50), nullable=False, server_default="ALL"),
        schema=SCHEMA,
    )
    op.execute(f"UPDATE {SCHEMA}.dashboard_targets SET company_code = 'ALL' WHERE company_code IS NULL")
    op.drop_constraint(
        "uq_dashboard_targets_key_year_month",
        "dashboard_targets",
        schema=SCHEMA,
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_dashboard_targets_key_year_month_company",
        "dashboard_targets",
        ["dashboard_key", "company_code", "year", "month"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_dashboard_targets_company_code",
        "dashboard_targets",
        ["company_code"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_dashboard_targets_company_code", table_name="dashboard_targets", schema=SCHEMA)
    op.drop_constraint(
        "uq_dashboard_targets_key_year_month_company",
        "dashboard_targets",
        schema=SCHEMA,
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_dashboard_targets_key_year_month",
        "dashboard_targets",
        ["dashboard_key", "year", "month"],
        schema=SCHEMA,
    )
    op.drop_column("dashboard_targets", "company_code", schema=SCHEMA)
