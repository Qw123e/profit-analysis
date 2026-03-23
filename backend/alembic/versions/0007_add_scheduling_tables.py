"""Add scheduling tables for SQL Lab

Revision ID: 0007_add_scheduling_tables
Revises: 0006_add_dashboard_targets
Create Date: 2026-01-30
"""

from alembic import op
import sqlalchemy as sa

revision = "0007_add_scheduling_tables"
down_revision = "0006_add_dashboard_targets"
branch_labels = None
depends_on = None

SCHEMA = "bi"


def upgrade() -> None:
    # saved_queries 테이블 생성
    op.create_table(
        "saved_queries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sql", sa.Text(), nullable=False),
        sa.Column("database", sa.String(length=100), nullable=False, server_default="default"),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_bi_saved_queries_id",
        "saved_queries",
        ["id"],
        schema=SCHEMA,
    )

    # scheduled_queries 테이블 생성
    op.create_table(
        "scheduled_queries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("saved_query_id", sa.Integer(), sa.ForeignKey(f"{SCHEMA}.saved_queries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dashboard_key", sa.String(length=100), nullable=False),
        sa.Column("feed_key", sa.String(length=100), nullable=False),
        sa.Column("schedule_cron", sa.String(length=100), nullable=False),
        sa.Column("snapshot_date_option", sa.String(length=20), nullable=False, server_default="today"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_run_at", sa.DateTime(), nullable=True),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_bi_scheduled_queries_id",
        "scheduled_queries",
        ["id"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_bi_scheduled_queries_saved_query_id",
        "scheduled_queries",
        ["saved_query_id"],
        schema=SCHEMA,
    )

    # query_execution_logs 테이블 생성
    op.create_table(
        "query_execution_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("scheduled_query_id", sa.Integer(), sa.ForeignKey(f"{SCHEMA}.scheduled_queries.id", ondelete="SET NULL"), nullable=True),
        sa.Column("saved_query_id", sa.Integer(), nullable=True),
        sa.Column("execution_type", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("athena_execution_id", sa.String(length=200), nullable=True),
        sa.Column("rows_affected", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.Column("snapshot_uri", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_bi_query_execution_logs_id",
        "query_execution_logs",
        ["id"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_bi_query_execution_logs_scheduled_query_id",
        "query_execution_logs",
        ["scheduled_query_id"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_bi_query_execution_logs_scheduled_query_id", table_name="query_execution_logs", schema=SCHEMA)
    op.drop_index("ix_bi_query_execution_logs_id", table_name="query_execution_logs", schema=SCHEMA)
    op.drop_table("query_execution_logs", schema=SCHEMA)

    op.drop_index("ix_bi_scheduled_queries_saved_query_id", table_name="scheduled_queries", schema=SCHEMA)
    op.drop_index("ix_bi_scheduled_queries_id", table_name="scheduled_queries", schema=SCHEMA)
    op.drop_table("scheduled_queries", schema=SCHEMA)

    op.drop_index("ix_bi_saved_queries_id", table_name="saved_queries", schema=SCHEMA)
    op.drop_table("saved_queries", schema=SCHEMA)
