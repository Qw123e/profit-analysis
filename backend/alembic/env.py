from __future__ import annotations

import os
import sys
from pathlib import Path
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool, text

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.models.base import Base
from app.models.dashboard import Dashboard  # noqa: F401
from app.models.snapshot_item import SnapshotItem  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_dashboard_access import UserDashboardAccess  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required for alembic migrations")
    return url.replace("+asyncpg", "")


def run_migrations_offline() -> None:
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        version_table_schema=settings.bi_schema,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Create bi schema if it doesn't exist (skip if no permission)
        try:
            connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {settings.bi_schema}"))
            connection.commit()
        except Exception as e:
            print(f"[alembic] Schema creation skipped (using public): {e}")
            connection.rollback()

        # Fallback: use public schema if bi schema doesn't exist
        try:
            result = connection.execute(
                text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :s"),
                {"s": settings.bi_schema},
            )
            if not result.fetchone():
                print(f"[alembic] Schema '{settings.bi_schema}' not available, falling back to 'public'")
                settings.__dict__["bi_schema"] = "public"
        except Exception:
            pass

        # Ensure alembic_version can store long revision ids
        schema = settings.bi_schema
        try:
            connection.execute(
                text(
                    f"""
                    DO $$
                    BEGIN
                      IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = '{schema}'
                          AND table_name = 'alembic_version'
                      ) THEN
                        EXECUTE 'CREATE TABLE {schema}.alembic_version (version_num VARCHAR(64) PRIMARY KEY)';
                      ELSE
                        IF EXISTS (
                          SELECT 1
                          FROM information_schema.columns
                          WHERE table_schema = '{schema}'
                            AND table_name = 'alembic_version'
                            AND column_name = 'version_num'
                            AND (character_maximum_length IS NULL OR character_maximum_length < 64)
                        ) THEN
                          EXECUTE 'ALTER TABLE {schema}.alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)';
                        END IF;
                      END IF;
                    END $$;
                    """
                )
            )
            connection.commit()
        except Exception as e:
            print(f"[alembic] alembic_version setup skipped: {e}")
            connection.rollback()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table_schema=settings.bi_schema,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
