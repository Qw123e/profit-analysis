"""Add project access control

Revision ID: 0005_add_project_access
Revises: 0004_add_dashboard_access
Create Date: 2026-01-06
"""

from alembic import op
import sqlalchemy as sa

revision = "0005_add_project_access"
down_revision = "0004_add_dashboard_access"
branch_labels = None
depends_on = None

SCHEMA = "bi"


def upgrade() -> None:
    # projects 테이블 생성
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_key", sa.String(length=50), nullable=False),
        sa.Column("project_name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("requires_auth", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_index("ix_projects_project_key", "projects", ["project_key"], unique=True, schema=SCHEMA)

    # user_project_access 테이블 생성
    op.create_table(
        "user_project_access",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey(f"{SCHEMA}.users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey(f"{SCHEMA}.projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("granted_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "project_id", name="uq_user_project_access_user_project"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_user_project_access_user_id",
        "user_project_access",
        ["user_id"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_user_project_access_project_id",
        "user_project_access",
        ["project_id"],
        schema=SCHEMA,
    )

    # 기본 프로젝트 데이터 삽입
    op.execute(f"""
        INSERT INTO {SCHEMA}.projects (project_key, project_name, description, requires_auth, is_active)
        VALUES
            ('bi_poc', 'BI Service', 'Business Intelligence Dashboard Service', true, true),
            ('ai_editor', 'AI Editor', 'AI-powered Document Editor', false, true),
            ('rms_export', 'RMS Export', 'RMS Export Matching Service', false, true)
    """)


def downgrade() -> None:
    op.drop_index("ix_user_project_access_project_id", table_name="user_project_access", schema=SCHEMA)
    op.drop_index("ix_user_project_access_user_id", table_name="user_project_access", schema=SCHEMA)
    op.drop_table("user_project_access", schema=SCHEMA)
    op.drop_index("ix_projects_project_key", table_name="projects", schema=SCHEMA)
    op.drop_table("projects", schema=SCHEMA)
