"""Add users table

Revision ID: 0003_add_users
Revises: 0002_add_snapshot_items
Create Date: 2025-12-18
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_add_users"
down_revision = "0002_add_snapshot_items"
branch_labels = None
depends_on = None

SCHEMA = "bi"


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="user"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        schema=SCHEMA,
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True, schema=SCHEMA)


def downgrade() -> None:
    op.drop_index("ix_users_username", table_name="users", schema=SCHEMA)
    op.drop_table("users", schema=SCHEMA)
