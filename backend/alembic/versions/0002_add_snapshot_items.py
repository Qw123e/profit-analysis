"""Add snapshot_items table

Revision ID: 0002_add_snapshot_items
Revises: 0001_create_dashboards
Create Date: 2025-12-18
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_snapshot_items"
down_revision = "0001_create_dashboards"
branch_labels = None
depends_on = None

SCHEMA = "bi"


def upgrade() -> None:
    op.create_table(
        "snapshot_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "dashboard_id",
            sa.Integer(),
            sa.ForeignKey(f"{SCHEMA}.dashboards.id", ondelete="CASCADE"),
            index=True,
        ),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("feed_key", sa.String(length=100), nullable=False),
        sa.Column("s3_uri", sa.String(length=500), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_snapshot_items_dashboard_snapshot",
        "snapshot_items",
        ["dashboard_id", "snapshot_date"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_snapshot_items_dashboard_snapshot", table_name="snapshot_items", schema=SCHEMA)
    op.drop_table("snapshot_items", schema=SCHEMA)
