"""Create dashboards table

Revision ID: 0001_create_dashboards
Revises:
Create Date: 2025-12-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_create_dashboards"
down_revision = None
branch_labels = None
depends_on = None

import os
SCHEMA = os.environ.get("BI_SCHEMA", "bi")


def upgrade() -> None:
    op.create_table(
        "dashboards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        schema=SCHEMA,
    )
    op.create_index("ix_dashboards_key", "dashboards", ["key"], unique=True, schema=SCHEMA)


def downgrade() -> None:
    op.drop_index("ix_dashboards_key", table_name="dashboards", schema=SCHEMA)
    op.drop_table("dashboards", schema=SCHEMA)
