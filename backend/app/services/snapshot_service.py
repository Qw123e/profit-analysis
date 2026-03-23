from __future__ import annotations

import asyncio
import json
import os
import math
from datetime import date as date_type, datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import boto3
import pandas as pd
import numpy as np
from botocore.exceptions import BotoCoreError, ClientError
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.snapshot_repository import SnapshotRepository
from app.schemas.dashboard_schema import SnapshotFeed
from app.schemas.snapshot_schema import SnapshotMappingItem, SnapshotMappingResponse
from app.utils.errors import SnapshotFetchError, SnapshotNotFoundError

OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
PREVIEW_ROW_LIMIT = 200


def _parse_s3_uri(s3_uri: str) -> tuple[str, str]:
    parsed = urlparse(s3_uri)
    if parsed.scheme != "s3" or not parsed.netloc or not parsed.path:
        raise SnapshotFetchError(f"Invalid S3 URI: {s3_uri}")
    key = parsed.path.lstrip("/")
    return parsed.netloc, key


def _load_json_from_s3(s3_uri: str) -> dict[str, Any]:
    bucket, key = _parse_s3_uri(s3_uri)
    client = boto3.client("s3", region_name=settings.aws_region)
    try:
        resp = client.get_object(Bucket=bucket, Key=key)
        body = resp["Body"].read()
        return json.loads(body)
    except (BotoCoreError, ClientError) as e:
        raise SnapshotFetchError(f"Failed to fetch snapshot from S3: {s3_uri}") from e
    except json.JSONDecodeError as e:
        raise SnapshotFetchError(f"Snapshot JSON decode error: {s3_uri}") from e


def _load_json_from_file(file_uri: str) -> dict[str, Any]:
    parsed = urlparse(file_uri)
    path = parsed.path if parsed.scheme == "file" else file_uri
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except OSError as e:
        raise SnapshotFetchError(f"Failed to read snapshot file: {file_uri}") from e
    except json.JSONDecodeError as e:
        raise SnapshotFetchError(f"Snapshot JSON decode error: {file_uri}") from e


def _apply_row_limit(raw: dict[str, Any], row_limit: int | None) -> dict[str, Any]:
    if not row_limit or row_limit <= 0:
        return raw
    if isinstance(raw, dict) and "rows" in raw:
        limited_rows = list(raw["rows"])[:row_limit]
        return {**raw, "rows": limited_rows}
    return raw


def _load_json_uncached(uri: str, row_limit: int | None = None) -> dict[str, Any]:
    if uri.startswith("s3://"):
        return _apply_row_limit(_load_json_from_s3(uri), row_limit)
    # allow local file for dev
    # Try parquet first (much faster)
    parsed = urlparse(uri)
    path = parsed.path if parsed.scheme == "file" else uri
    parquet_path = path.replace(".json", ".parquet")

    if os.path.exists(parquet_path):
        import time
        start = time.time()
        if row_limit and row_limit > 0:
            import pyarrow as pa
            import pyarrow.parquet as pq

            parquet_file = pq.ParquetFile(parquet_path)
            remaining = row_limit
            tables = []
            for idx in range(parquet_file.num_row_groups):
                if remaining <= 0:
                    break
                table = parquet_file.read_row_group(idx)
                if remaining < table.num_rows:
                    table = table.slice(0, remaining)
                tables.append(table)
                remaining -= table.num_rows
            if not tables:
                table = parquet_file.read_row_group(0).slice(0, 0)
            elif len(tables) == 1:
                table = tables[0]
            else:
                table = pa.concat_tables(tables)
            df = table.to_pandas()
        else:
            df = pd.read_parquet(parquet_path, engine="pyarrow")
        elapsed = time.time() - start
        print(f"⚡ Loaded parquet in {elapsed:.3f}s: {parquet_path}")
        rows = [[_coerce_json_value(v) for v in row] for row in df.values.tolist()]
        return {
            "columns": list(df.columns),
            "rows": rows,
        }

    return _apply_row_limit(_load_json_from_file(uri), row_limit)


@lru_cache(maxsize=32)
def _load_json_cached(uri: str, row_limit: int | None = None) -> dict[str, Any]:
    return _load_json_uncached(uri, row_limit)


def _load_json_any(uri: str, row_limit: int | None = None) -> dict[str, Any]:
    if uri.startswith("s3://"):
        return _load_json_cached(uri, row_limit)
    return _load_json_uncached(uri, row_limit)


def _coerce_json_value(value: object) -> object:
    # Handle pandas NA and missing values
    if value is None:
        return None
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        try:
            if not math.isfinite(value):
                return None
        except TypeError:
            pass
    if isinstance(value, (datetime, date_type)):
        return value.isoformat()
    if isinstance(value, pd.Timedelta):
        return str(value)
    return value


def _is_ole_excel(file_bytes: bytes) -> bool:
    return file_bytes.startswith(OLE_SIGNATURE)


def _load_parquet_from_bytes(file_bytes: bytes) -> pd.DataFrame:
    import pyarrow.parquet as pq

    table = pq.read_table(BytesIO(file_bytes))
    return table.to_pandas()


def _build_schema_payload(df: pd.DataFrame) -> dict[str, Any]:
    return {
        "columns": list(df.columns),
        "row_count": int(len(df)),
    }


def _build_preview_payload(df: pd.DataFrame, limit: int) -> dict[str, Any]:
    preview_df = df.head(limit)
    rows = [[_coerce_json_value(v) for v in row] for row in preview_df.values.tolist()]
    return {
        "columns": list(df.columns),
        "rows": rows,
        "total_rows": int(len(df)),
    }


def _build_validation_payload(df: pd.DataFrame, preview_rows: int, preview_limit: int) -> dict[str, Any]:
    row_count = int(len(df))
    column_count = int(len(df.columns))
    duplicate_columns = df.columns[df.columns.duplicated()].tolist()
    if row_count == 0:
        empty_columns = list(df.columns)
    else:
        empty_columns = [col for col in df.columns if df[col].isna().all()]

    non_finite_numeric_columns: list[str] = []
    for col in df.columns:
        series = df[col]
        numeric = pd.to_numeric(series, errors="coerce")
        if numeric.notna().any():
            values = numeric.dropna().to_numpy()
            if values.size and not np.isfinite(values).all():
                non_finite_numeric_columns.append(col)

    errors: list[str] = []
    warnings: list[str] = []
    if row_count == 0:
        errors.append("no_rows")
    if column_count == 0:
        errors.append("no_columns")
    if duplicate_columns:
        warnings.append("duplicate_columns")
    if empty_columns:
        warnings.append("empty_columns")
    if non_finite_numeric_columns:
        warnings.append("non_finite_numeric_columns")

    status = "error" if errors else ("warning" if warnings else "ok")
    return {
        "status": status,
        "errors": errors,
        "warnings": warnings,
        "row_count": row_count,
        "column_count": column_count,
        "preview_rows": preview_rows,
        "preview_limit": preview_limit,
        "duplicate_columns": duplicate_columns,
        "empty_columns": empty_columns,
        "non_finite_numeric_columns": non_finite_numeric_columns,
    }


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _resolve_local_snapshot_path(uri: str) -> Path:
    parsed = urlparse(uri)
    if parsed.scheme == "file":
        return Path(parsed.path)
    if not parsed.scheme:
        return Path(uri)
    raise SnapshotFetchError(f"Only local snapshot files are supported: {uri}")


class SnapshotService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.snapshot_repo = SnapshotRepository(db=db)

    async def fetch_snapshot_feeds(
        self, dashboard_id: int, snapshot_date: date_type | None, row_limit: int | None = None
    ) -> tuple[date_type, dict[str, SnapshotFeed]]:
        target_date = snapshot_date
        if target_date is None:
            latest = await self.snapshot_repo.latest_snapshot_date(dashboard_id)
            if latest is None:
                raise SnapshotNotFoundError("No snapshot available for this dashboard")
            target_date = latest

        items = await self.snapshot_repo.snapshot_items(dashboard_id=dashboard_id, snapshot_date=target_date)
        if not items:
            raise SnapshotNotFoundError("No snapshot items found for the given date")

        feeds: dict[str, SnapshotFeed] = {}
        load_tasks = [asyncio.to_thread(_load_json_any, item.s3_uri, row_limit) for item in items]
        results = await asyncio.gather(*load_tasks)
        for item, raw in zip(items, results):
            # Expecting {"columns": [...], "rows": [...]}
            if not isinstance(raw, dict) or "columns" not in raw or "rows" not in raw:
                raise SnapshotFetchError(f"Snapshot format invalid for feed {item.feed_key}")
            feeds[item.feed_key] = SnapshotFeed(columns=list(raw["columns"]), rows=list(raw["rows"]))

        return target_date, feeds

    async def fetch_snapshot_feed(
        self,
        dashboard_id: int,
        snapshot_date: date_type | None,
        feed_key: str,
        row_limit: int | None = None,
    ) -> tuple[date_type, SnapshotFeed]:
        target_date = snapshot_date
        if target_date is None:
            latest = await self.snapshot_repo.latest_snapshot_date(dashboard_id)
            if latest is None:
                raise SnapshotNotFoundError("No snapshot available for this dashboard")
            target_date = latest

        item = await self.snapshot_repo.snapshot_item(
            dashboard_id=dashboard_id, snapshot_date=target_date, feed_key=feed_key
        )
        if item is None:
            raise SnapshotNotFoundError(f"Feed not found: {feed_key}")

        raw = await asyncio.to_thread(_load_json_any, item.s3_uri, row_limit)
        if not isinstance(raw, dict) or "columns" not in raw or "rows" not in raw:
            raise SnapshotFetchError(f"Snapshot format invalid for feed {feed_key}")

        return target_date, SnapshotFeed(columns=list(raw["columns"]), rows=list(raw["rows"]))

    async def resolve_snapshot_file_path(
        self,
        dashboard_id: int,
        snapshot_date: date_type | None,
        feed_key: str,
        file_format: str,
    ) -> tuple[date_type, Path]:
        target_date = snapshot_date
        if target_date is None:
            latest = await self.snapshot_repo.latest_snapshot_date(dashboard_id)
            if latest is None:
                raise SnapshotNotFoundError("No snapshot available for this dashboard")
            target_date = latest

        item = await self.snapshot_repo.snapshot_item(
            dashboard_id=dashboard_id, snapshot_date=target_date, feed_key=feed_key
        )
        if item is None:
            raise SnapshotNotFoundError(f"Feed not found: {feed_key}")

        base_path = _resolve_local_snapshot_path(item.s3_uri)
        if file_format == "parquet":
            file_path = base_path if base_path.suffix == ".parquet" else base_path.with_suffix(".parquet")
        elif file_format == "schema":
            file_path = base_path.with_suffix("").with_suffix(".schema.json")
        elif file_format == "preview":
            file_path = base_path.with_suffix("").with_suffix(".preview.json")
        elif file_format == "validation":
            file_path = base_path.with_suffix("").with_suffix(".validation.json")
        else:
            raise SnapshotFetchError(f"Unsupported file format: {file_format}")

        if not file_path.exists():
            raise SnapshotFetchError(f"Snapshot file not found: {file_path}")

        return target_date, file_path

    async def ingest_snapshot_from_file(
        self,
        dashboard_id: int,
        dashboard_key: str,
        feed_key: str,
        snapshot_date: date_type | None,
        file_bytes: bytes,
        filename: str,
        columns: list[str] | None = None,
    ) -> tuple[date_type, SnapshotFeed]:
        target_date = snapshot_date or date_type.today()

        # Determine file type by extension
        file_lower = filename.lower()
        if file_lower.endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes))
        elif file_lower.endswith(".parquet"):
            df = _load_parquet_from_bytes(file_bytes)
        elif file_lower.endswith((".xlsx", ".xls", ".xlsb")):
            if file_lower.endswith(".xlsb"):
                df = pd.read_excel(BytesIO(file_bytes), engine="pyxlsb")
            elif _is_ole_excel(file_bytes):
                try:
                    df = pd.read_excel(BytesIO(file_bytes), engine="xlrd")
                except Exception as e:
                    try:
                        df = pd.read_excel(BytesIO(file_bytes), engine="pyxlsb")
                    except Exception as exc:
                        raise SnapshotFetchError(
                            "Failed to read Excel file. Re-save as .xlsx or CSV and retry."
                        ) from exc
            else:
                df = pd.read_excel(BytesIO(file_bytes), engine="openpyxl")
        else:
            raise SnapshotFetchError(
                f"Unsupported file type: {filename}. Only CSV, Excel, and Parquet files are supported."
            )

        if columns:
            missing = [c for c in columns if c not in df.columns]
            if missing:
                raise SnapshotFetchError(f"Columns not found in file: {missing}")
            df = df[columns]

        # Convert float columns with integer values to int (e.g., 7920.0 -> 7920)
        for col in df.select_dtypes(include=['float', 'Float64']).columns:
            if df[col].notna().any():
                non_null_values = df[col].dropna()
                if len(non_null_values) > 0 and (non_null_values % 1 == 0).all():
                    df[col] = df[col].fillna(0).astype(int)

        df = df.where(pd.notnull(df), None)
        preview_rows = min(PREVIEW_ROW_LIMIT, len(df))
        validation = _build_validation_payload(df, preview_rows, PREVIEW_ROW_LIMIT)
        if validation["status"] == "error":
            raise SnapshotFetchError(f"Snapshot validation failed: {validation['errors']}")
        rows = [[_coerce_json_value(v) for v in row] for row in df.values.tolist()]
        feed = SnapshotFeed(columns=list(df.columns), rows=rows)

        base_dir = Path(settings.snapshot_local_dir)
        output_dir = base_dir / dashboard_key / target_date.isoformat()
        output_dir.mkdir(parents=True, exist_ok=True)

        schema_path = output_dir / f"{feed_key}.schema.json"
        preview_path = output_dir / f"{feed_key}.preview.json"
        validation_path = output_dir / f"{feed_key}.validation.json"
        _write_json(schema_path, _build_schema_payload(df))
        _write_json(preview_path, _build_preview_payload(df, PREVIEW_ROW_LIMIT))
        _write_json(validation_path, validation)
        if validation["status"] == "warning":
            print(f"⚠️ Snapshot validation warnings: {', '.join(validation['warnings'])}")

        parquet_path = output_dir / f"{feed_key}.parquet"
        # Convert object columns to string and clean up float-like strings (e.g., '7920.0' -> '7920')
        for col in df.select_dtypes(include=['object']).columns:
            df[col] = df[col].astype(str)
            # Remove '.0' suffix from integer-like strings
            df[col] = df[col].str.replace(r'\.0$', '', regex=True)
        df.to_parquet(parquet_path, engine="pyarrow", compression="snappy", index=False)
        print(f"📦 Saved parquet: {parquet_path} (size: {parquet_path.stat().st_size / 1024 / 1024:.2f}MB)")

        file_uri = f"file://{parquet_path}"
        await self.snapshot_repo.upsert_snapshot_item(
            dashboard_id=dashboard_id,
            snapshot_date=target_date,
            feed_key=feed_key,
            s3_uri=file_uri,
        )
        return target_date, feed

    async def ingest_snapshot_from_excel(
        self,
        dashboard_id: int,
        dashboard_key: str,
        feed_key: str,
        snapshot_date: date_type | None,
        excel_bytes: bytes,
        columns: list[str] | None = None,
    ) -> tuple[date_type, SnapshotFeed]:
        """Deprecated: Use ingest_snapshot_from_file instead"""
        return await self.ingest_snapshot_from_file(
            dashboard_id=dashboard_id,
            dashboard_key=dashboard_key,
            feed_key=feed_key,
            snapshot_date=snapshot_date,
            file_bytes=excel_bytes,
            filename="file.xlsx",
            columns=columns,
        )

    async def ingest_snapshot_from_json(
        self,
        dashboard_id: int,
        dashboard_key: str,
        feed_key: str,
        snapshot_date: date_type | None,
        columns: list[str],
        rows: list[list[Any]],
    ) -> tuple[date_type, SnapshotFeed]:
        """Ingest snapshot directly from JSON data (for test queries)"""
        target_date = snapshot_date or date_type.today()

        # Convert to DataFrame
        df = pd.DataFrame(rows, columns=columns)
        df = df.where(pd.notnull(df), None)

        # Validation
        preview_rows = min(PREVIEW_ROW_LIMIT, len(df))
        validation = _build_validation_payload(df, preview_rows, PREVIEW_ROW_LIMIT)
        if validation["status"] == "error":
            raise SnapshotFetchError(f"Snapshot validation failed: {validation['errors']}")

        # Convert to SnapshotFeed
        coerced_rows = [[_coerce_json_value(v) for v in row] for row in df.values.tolist()]
        feed = SnapshotFeed(columns=list(df.columns), rows=coerced_rows)

        # Save to local files
        base_dir = Path(settings.snapshot_local_dir)
        output_dir = base_dir / dashboard_key / target_date.isoformat()
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save metadata files
        schema_path = output_dir / f"{feed_key}.schema.json"
        preview_path = output_dir / f"{feed_key}.preview.json"
        validation_path = output_dir / f"{feed_key}.validation.json"
        _write_json(schema_path, _build_schema_payload(df))
        _write_json(preview_path, _build_preview_payload(df, PREVIEW_ROW_LIMIT))
        _write_json(validation_path, validation)

        if validation["status"] == "warning":
            print(f"⚠️ Snapshot validation warnings: {', '.join(validation['warnings'])}")

        # Save parquet file
        parquet_path = output_dir / f"{feed_key}.parquet"
        # Convert object columns to string and clean up float-like strings (e.g., '7920.0' -> '7920')
        for col in df.select_dtypes(include=['object']).columns:
            df[col] = df[col].astype(str)
            # Remove '.0' suffix from integer-like strings
            df[col] = df[col].str.replace(r'\.0$', '', regex=True)
        df.to_parquet(parquet_path, engine="pyarrow", compression="snappy", index=False)
        print(f"📦 Saved parquet: {parquet_path} (size: {parquet_path.stat().st_size / 1024 / 1024:.2f}MB)")

        # Update database
        file_uri = f"file://{parquet_path}"
        await self.snapshot_repo.upsert_snapshot_item(
            dashboard_id=dashboard_id,
            snapshot_date=target_date,
            feed_key=feed_key,
            s3_uri=file_uri,
        )

        return target_date, feed

    async def delete_snapshot(
        self, dashboard_id: int, snapshot_date: date_type, feed_key: str
    ) -> None:
        """Delete snapshot and cleanup file"""
        deleted, s3_uri = await self.snapshot_repo.delete_snapshot_item(
            dashboard_id=dashboard_id, snapshot_date=snapshot_date, feed_key=feed_key
        )

        if not deleted:
            raise SnapshotNotFoundError(
                f"Snapshot not found: dashboard_id={dashboard_id}, date={snapshot_date}, feed={feed_key}"
            )

        # Cleanup file if it's a local file
        if s3_uri and s3_uri.startswith("file://"):
            file_path = s3_uri.replace("file://", "")
            try:
                path = Path(file_path)
                paths_to_remove = [path]
                if path.suffix in {".json", ".parquet"}:
                    base = path.with_suffix("")
                    paths_to_remove.extend(
                        [
                            base.with_suffix(".json"),
                            base.with_suffix(".parquet"),
                            base.with_suffix(".schema.json"),
                            base.with_suffix(".preview.json"),
                            base.with_suffix(".validation.json"),
                        ]
                    )
                for target in paths_to_remove:
                    if target.exists():
                        target.unlink()
            except OSError as e:
                # Log but don't fail
                print(f"Warning: Failed to delete file {file_path}: {e}")

        await self.db.commit()

    async def list_all_snapshots_with_dashboards(self) -> SnapshotMappingResponse:
        """Get all snapshots with dashboard information"""
        results = await self.snapshot_repo.list_all_with_dashboard_info()

        snapshots = [
            SnapshotMappingItem(
                dashboard_key=dashboard.key,
                dashboard_name=dashboard.name,
                snapshot_date=snapshot.snapshot_date,
                feed_key=snapshot.feed_key,
                generated_at=snapshot.generated_at,
                s3_uri=snapshot.s3_uri,
            )
            for snapshot, dashboard in results
        ]

        return SnapshotMappingResponse(snapshots=snapshots)
