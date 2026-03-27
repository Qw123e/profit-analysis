"""add data_json column to snapshot_items

Revision ID: 0009_add_data_json
Revises: af32cd9ddc25
Create Date: 2026-03-27

"""

import os

import sqlalchemy as sa
from alembic import op

revision = '0009_add_data_json'
down_revision = 'af32cd9ddc25'
branch_labels = None
depends_on = None

SCHEMA = os.environ.get("BI_SCHEMA", "bi")


def upgrade() -> None:
    op.add_column(
        'snapshot_items',
        sa.Column('data_json', sa.Text(), nullable=True),
        schema=SCHEMA,
    )
    op.alter_column(
        'snapshot_items',
        's3_uri',
        existing_type=sa.String(500),
        nullable=True,
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.alter_column(
        'snapshot_items',
        's3_uri',
        existing_type=sa.String(500),
        nullable=False,
        schema=SCHEMA,
    )
    op.drop_column('snapshot_items', 'data_json', schema=SCHEMA)
