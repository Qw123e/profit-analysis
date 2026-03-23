"""Add dashboard access mapping and public flag

Revision ID: 0004_add_dashboard_access
Revises: 0003_add_users
Create Date: 2025-12-18
"""

from alembic import op
import sqlalchemy as sa

revision = "0004_add_dashboard_access"
down_revision = "0003_add_users"
branch_labels = None
depends_on = None

SCHEMA = "bi"


def upgrade() -> None:
    op.add_column(
        "dashboards",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        schema=SCHEMA,
    )

    op.create_table(
        "user_dashboard_access",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey(f"{SCHEMA}.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dashboard_id", sa.Integer(), sa.ForeignKey(f"{SCHEMA}.dashboards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "dashboard_id", name="uq_user_dashboard_access_user_dashboard"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_user_dashboard_access_user_id",
        "user_dashboard_access",
        ["user_id"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_user_dashboard_access_dashboard_id",
        "user_dashboard_access",
        ["dashboard_id"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_user_dashboard_access_dashboard_id", table_name="user_dashboard_access", schema=SCHEMA)
    op.drop_index("ix_user_dashboard_access_user_id", table_name="user_dashboard_access", schema=SCHEMA)
    op.drop_table("user_dashboard_access", schema=SCHEMA)
    op.drop_column("dashboards", "is_public", schema=SCHEMA)
