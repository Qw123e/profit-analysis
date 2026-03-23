"""ScheduledQuery 스키마"""

from datetime import datetime

from pydantic import BaseModel, Field


class ScheduledQueryCreate(BaseModel):
    """스케줄 쿼리 생성 요청"""

    saved_query_id: int = Field(..., description="저장된 쿼리 ID")
    dashboard_key: str = Field(..., min_length=1, max_length=100, description="대시보드 키")
    feed_key: str = Field(..., min_length=1, max_length=100, description="피드 키")
    schedule_cron: str = Field(..., description="Cron 표현식 (예: 0 9 * * *)")
    snapshot_date_option: str = Field(
        default="today", description="스냅샷 날짜 옵션 (today, yesterday, custom)"
    )
    description: str | None = Field(None, description="스케줄 설명")
    is_active: bool = Field(default=True, description="활성화 여부")


class ScheduledQueryUpdate(BaseModel):
    """스케줄 쿼리 수정 요청"""

    schedule_cron: str | None = None
    snapshot_date_option: str | None = None
    description: str | None = None
    is_active: bool | None = None


class ScheduledQueryResponse(BaseModel):
    """스케줄 쿼리 응답"""

    id: int
    saved_query_id: int
    dashboard_key: str
    feed_key: str
    schedule_cron: str
    snapshot_date_option: str
    is_active: bool
    description: str | None
    created_at: datetime
    updated_at: datetime
    last_run_at: datetime | None

    model_config = {"from_attributes": True}


class ScheduledQueryListResponse(BaseModel):
    """스케줄 쿼리 목록 응답"""

    items: list[ScheduledQueryResponse]


class QueryExecutionLogResponse(BaseModel):
    """쿼리 실행 로그 응답"""

    id: int
    scheduled_query_id: int | None
    saved_query_id: int | None
    execution_type: str
    status: str
    athena_execution_id: str | None
    rows_affected: int | None
    error_message: str | None
    execution_time_ms: int | None
    snapshot_uri: str | None
    started_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class QueryExecutionLogListResponse(BaseModel):
    """실행 로그 목록 응답"""

    items: list[QueryExecutionLogResponse]
    total: int
