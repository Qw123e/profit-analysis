from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Athena SQL 쿼리 실행 요청"""

    sql: str = Field(..., description="실행할 SQL 쿼리")
    database: str = Field(default="default", description="Athena 데이터베이스 이름")


class QueryStartResponse(BaseModel):
    """쿼리 실행 시작 응답"""

    execution_id: str = Field(..., description="쿼리 실행 ID")
    status: str = Field(default="QUEUED", description="초기 상태")


class QueryStatusResponse(BaseModel):
    """쿼리 상태 조회 응답"""

    execution_id: str
    status: str  # QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED
    state_change_reason: str | None = None
    submitted_at: datetime | None = None
    completed_at: datetime | None = None
    data_scanned_bytes: int | None = None
    execution_time_ms: int | None = None


class QueryResultResponse(BaseModel):
    """쿼리 결과 조회 응답"""

    execution_id: str
    columns: list[str]
    rows: list[list[Any]]
    total_rows: int
    offset: int
    limit: int
    has_more: bool


class SaveSnapshotRequest(BaseModel):
    """쿼리 결과를 스냅샷으로 저장 요청"""

    dashboard_key: str = Field(..., description="대시보드 키")
    feed_key: str = Field(..., description="피드 키")
    snapshot_date: str = Field(..., description="스냅샷 날짜 (YYYY-MM-DD)")


class SaveSnapshotResponse(BaseModel):
    """스냅샷 저장 응답"""

    success: bool
    message: str
    snapshot_uri: str | None = None
