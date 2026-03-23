from __future__ import annotations

import re
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from app.clients.athena_client import AthenaClient, AthenaQueryResults, AthenaQueryStatus
from app.core.config import settings
from app.services.snapshot_service import (
    PREVIEW_ROW_LIMIT,
    _build_schema_payload,
    _build_preview_payload,
    _build_validation_payload,
    _write_json,
)


class MockAthenaService:
    """Mock Athena Service for local testing without AWS connection"""

    def __init__(self) -> None:
        self._results_cache: dict[str, AthenaQueryResults] = {}
        self._query_start_times: dict[str, float] = {}
        self._query_sql: dict[str, str] = {}

    def execute_query(self, sql: str, database: str) -> str:
        """Mock: 가짜 execution_id 반환"""
        execution_id = f"mock-{uuid.uuid4().hex[:12]}"
        self._query_start_times[execution_id] = time.time()
        self._query_sql[execution_id] = sql
        return execution_id

    def get_query_status(self, execution_id: str) -> AthenaQueryStatus:
        """Mock: 1초 후 SUCCEEDED 반환"""
        start_time = self._query_start_times.get(execution_id, time.time())
        elapsed = time.time() - start_time

        if elapsed < 0.5:
            status = "RUNNING"
        else:
            status = "SUCCEEDED"

        return AthenaQueryStatus(
            execution_id=execution_id,
            status=status,
            state_change_reason=None,
            submitted_at=datetime.fromtimestamp(start_time),
            completed_at=datetime.now() if status == "SUCCEEDED" else None,
            data_scanned_bytes=1024 * 1024 if status == "SUCCEEDED" else None,
            execution_time_ms=int(elapsed * 1000) if status == "SUCCEEDED" else None,
        )

    def get_query_results(
        self, execution_id: str, limit: int = 100, offset: int = 0
    ) -> dict[str, Any]:
        """Mock: SQL을 파싱해서 샘플 데이터 생성"""
        if execution_id not in self._results_cache:
            sql = self._query_sql.get(execution_id, "SELECT * FROM sample")
            mock_results = self._generate_mock_data(sql)
            self._results_cache[execution_id] = mock_results

        cached = self._results_cache[execution_id]
        total_rows = len(cached.rows)
        end_idx = min(offset + limit, total_rows)
        page_rows = cached.rows[offset:end_idx]

        return {
            "execution_id": execution_id,
            "columns": cached.columns,
            "rows": page_rows,
            "total_rows": total_rows,
            "offset": offset,
            "limit": limit,
            "has_more": end_idx < total_rows,
        }

    def _generate_mock_data(self, sql: str) -> AthenaQueryResults:
        """SQL을 분석해서 mock 데이터 생성"""
        # LIMIT 절 파싱
        limit_match = re.search(r'LIMIT\s+(\d+)', sql, re.IGNORECASE)
        row_count = int(limit_match.group(1)) if limit_match else 100
        row_count = min(row_count, 1000)  # 최대 1000행

        # SELECT 절에서 컬럼 추출 시도
        select_match = re.search(r'SELECT\s+(.+?)\s+FROM', sql, re.IGNORECASE | re.DOTALL)
        if select_match:
            select_part = select_match.group(1).strip()
            if select_part == '*':
                columns = ["id", "name", "value", "category", "created_at"]
            else:
                columns = [col.strip().split()[-1].replace(',', '') for col in select_part.split(',')]
        else:
            columns = ["col1", "col2", "col3"]

        # 샘플 데이터 생성
        rows = []
        for i in range(row_count):
            row = []
            for j, col in enumerate(columns):
                col_lower = col.lower()
                if 'id' in col_lower:
                    row.append(str(i + 1))
                elif 'name' in col_lower:
                    row.append(f"Item_{i + 1}")
                elif 'value' in col_lower or 'amount' in col_lower or 'price' in col_lower:
                    row.append(str(round((i + 1) * 1000.5, 2)))
                elif 'date' in col_lower or 'time' in col_lower:
                    row.append(f"2024-01-{(i % 28) + 1:02d}")
                elif 'category' in col_lower or 'type' in col_lower:
                    row.append(["A", "B", "C", "D"][i % 4])
                else:
                    row.append(f"data_{i}_{j}")
            rows.append(row)

        return AthenaQueryResults(columns=columns, rows=rows, next_token=None)

    def save_as_snapshot(
        self,
        execution_id: str,
        dashboard_key: str,
        feed_key: str,
        snapshot_date: str,
    ) -> dict[str, Any]:
        """Mock: 스냅샷 저장"""
        if execution_id not in self._results_cache:
            sql = self._query_sql.get(execution_id, "SELECT * FROM sample")
            self._results_cache[execution_id] = self._generate_mock_data(sql)

        cached = self._results_cache[execution_id]

        df = pd.DataFrame(cached.rows, columns=cached.columns)

        output_dir = Path(settings.snapshot_local_dir) / dashboard_key / snapshot_date
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save as parquet
        parquet_path = output_dir / f"{feed_key}.parquet"
        df.to_parquet(parquet_path, engine="pyarrow", compression="snappy", index=False)
        print(f"📦 Saved parquet: {parquet_path} (size: {parquet_path.stat().st_size / 1024 / 1024:.2f}MB)")

        # Save metadata files
        preview_rows = min(PREVIEW_ROW_LIMIT, len(df))
        validation = _build_validation_payload(df, preview_rows, PREVIEW_ROW_LIMIT)

        _write_json(output_dir / f"{feed_key}.schema.json", _build_schema_payload(df))
        _write_json(output_dir / f"{feed_key}.preview.json", _build_preview_payload(df, PREVIEW_ROW_LIMIT))
        _write_json(output_dir / f"{feed_key}.validation.json", validation)
        if validation["status"] == "warning":
            print(f"⚠️ Snapshot validation warnings: {', '.join(validation['warnings'])}")

        return {
            "success": True,
            "message": f"[MOCK] 스냅샷이 저장되었습니다: {parquet_path}",
            "snapshot_uri": f"file://{parquet_path}",
        }

    def clear_cache(self, execution_id: str | None = None) -> None:
        if execution_id:
            self._results_cache.pop(execution_id, None)
        else:
            self._results_cache.clear()


class AthenaService:
    def __init__(self) -> None:
        self.client = AthenaClient()
        self._results_cache: dict[str, AthenaQueryResults] = {}

    def execute_query(self, sql: str, database: str) -> str:
        """SQL 쿼리 실행 시작, execution_id 반환"""
        result = self.client.start_query(sql, database)
        return result.query_execution_id

    def get_query_status(self, execution_id: str) -> AthenaQueryStatus:
        """쿼리 실행 상태 조회"""
        return self.client.get_query_status(execution_id)

    def get_query_results(
        self, execution_id: str, limit: int = 100, offset: int = 0
    ) -> dict[str, Any]:
        """쿼리 결과 조회 (페이지네이션)"""
        # 캐시에서 먼저 확인
        if execution_id not in self._results_cache:
            # 전체 결과 가져오기
            full_results = self.client.get_all_query_results(execution_id)
            self._results_cache[execution_id] = full_results

        cached = self._results_cache[execution_id]
        total_rows = len(cached.rows)

        # 페이지네이션 적용
        end_idx = min(offset + limit, total_rows)
        page_rows = cached.rows[offset:end_idx]

        return {
            "execution_id": execution_id,
            "columns": cached.columns,
            "rows": page_rows,
            "total_rows": total_rows,
            "offset": offset,
            "limit": limit,
            "has_more": end_idx < total_rows,
        }

    def save_as_snapshot(
        self,
        execution_id: str,
        dashboard_key: str,
        feed_key: str,
        snapshot_date: str,
    ) -> dict[str, Any]:
        """쿼리 결과를 스냅샷 파일로 저장"""
        # 캐시에서 결과 가져오기
        if execution_id not in self._results_cache:
            full_results = self.client.get_all_query_results(execution_id)
            self._results_cache[execution_id] = full_results

        cached = self._results_cache[execution_id]
        df = pd.DataFrame(cached.rows, columns=cached.columns)

        output_dir = Path(settings.snapshot_local_dir) / dashboard_key / snapshot_date
        output_dir.mkdir(parents=True, exist_ok=True)

        # Save as parquet
        parquet_path = output_dir / f"{feed_key}.parquet"
        df.to_parquet(parquet_path, engine="pyarrow", compression="snappy", index=False)
        print(f"📦 Saved parquet: {parquet_path} (size: {parquet_path.stat().st_size / 1024 / 1024:.2f}MB)")

        # Save metadata files
        preview_rows = min(PREVIEW_ROW_LIMIT, len(df))
        validation = _build_validation_payload(df, preview_rows, PREVIEW_ROW_LIMIT)

        _write_json(output_dir / f"{feed_key}.schema.json", _build_schema_payload(df))
        _write_json(output_dir / f"{feed_key}.preview.json", _build_preview_payload(df, PREVIEW_ROW_LIMIT))
        _write_json(output_dir / f"{feed_key}.validation.json", validation)
        if validation["status"] == "warning":
            print(f"⚠️ Snapshot validation warnings: {', '.join(validation['warnings'])}")

        return {
            "success": True,
            "message": f"스냅샷이 저장되었습니다: {parquet_path}",
            "snapshot_uri": f"file://{parquet_path}",
        }

    def clear_cache(self, execution_id: str | None = None) -> None:
        """결과 캐시 삭제"""
        if execution_id:
            self._results_cache.pop(execution_id, None)
        else:
            self._results_cache.clear()


# 싱글톤 인스턴스 (Mock 모드 여부에 따라 선택)
if settings.athena_mock_mode:
    athena_service = MockAthenaService()
    print("[Athena] Mock 모드로 실행 중 - 실제 AWS 연결 없이 샘플 데이터 사용")
else:
    athena_service = AthenaService()
    print("[Athena] 실제 AWS Athena에 연결")
