"""add_composite_index_dashboard_targets

Revision ID: af32cd9ddc25
Revises: 0008_add_company_code_to_dashboard_targets
Create Date: 2026-03-26 10:27:51.778876

"""

from alembic import op


revision = 'af32cd9ddc25'
down_revision = '0008_add_company_code_to_dashboard_targets'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        'ix_dashboard_targets_composite',
        'dashboard_targets',
        ['dashboard_key', 'company_code', 'year'],
        unique=False,
        schema='bi',
    )


def downgrade() -> None:
    op.drop_index(
        'ix_dashboard_targets_composite',
        table_name='dashboard_targets',
        schema='bi',
    )
