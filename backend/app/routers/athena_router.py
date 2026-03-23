from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.athena_schema import (
    QueryRequest,
    QueryResultResponse,
    QueryStartResponse,
    QueryStatusResponse,
    SaveSnapshotRequest,
    SaveSnapshotResponse,
)
from app.services.athena_service import athena_service

router = APIRouter(prefix="/athena", tags=["athena"])


@router.post("/query", response_model=QueryStartResponse)
async def execute_query(request: QueryRequest) -> QueryStartResponse:
    """SQL 쿼리 실행 시작

    Athena에 SQL 쿼리를 제출하고 execution_id를 반환합니다.
    쿼리는 비동기로 실행되며, /status 엔드포인트로 상태를 확인해야 합니다.
    """
    try:
        execution_id = athena_service.execute_query(request.sql, request.database)
        return QueryStartResponse(execution_id=execution_id, status="QUEUED")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"쿼리 실행 실패: {str(e)}")


@router.get("/query/{execution_id}/status", response_model=QueryStatusResponse)
async def get_query_status(execution_id: str) -> QueryStatusResponse:
    """쿼리 실행 상태 조회

    execution_id로 쿼리 실행 상태를 확인합니다.
    상태: QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED
    """
    try:
        status = athena_service.get_query_status(execution_id)
        return QueryStatusResponse(
            execution_id=status.execution_id,
            status=status.status,
            state_change_reason=status.state_change_reason,
            submitted_at=status.submitted_at,
            completed_at=status.completed_at,
            data_scanned_bytes=status.data_scanned_bytes,
            execution_time_ms=status.execution_time_ms,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"상태 조회 실패: {str(e)}")


@router.get("/query/{execution_id}/results", response_model=QueryResultResponse)
async def get_query_results(
    execution_id: str,
    limit: int = Query(default=100, ge=1, le=10000, description="페이지당 행 수"),
    offset: int = Query(default=0, ge=0, description="시작 오프셋"),
) -> QueryResultResponse:
    """쿼리 결과 조회

    쿼리가 SUCCEEDED 상태일 때 결과를 조회합니다.
    페이지네이션을 지원합니다.
    """
    try:
        # 먼저 상태 확인
        status = athena_service.get_query_status(execution_id)
        if status.status != "SUCCEEDED":
            raise HTTPException(
                status_code=400,
                detail=f"쿼리가 아직 완료되지 않았습니다. 현재 상태: {status.status}",
            )

        result = athena_service.get_query_results(execution_id, limit, offset)
        return QueryResultResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"결과 조회 실패: {str(e)}")


@router.post("/query/{execution_id}/save-snapshot", response_model=SaveSnapshotResponse)
async def save_as_snapshot(
    execution_id: str, request: SaveSnapshotRequest
) -> SaveSnapshotResponse:
    """쿼리 결과를 스냅샷으로 저장

    쿼리 결과를 지정된 대시보드의 스냅샷으로 저장합니다.
    """
    try:
        # 먼저 상태 확인
        status = athena_service.get_query_status(execution_id)
        if status.status != "SUCCEEDED":
            raise HTTPException(
                status_code=400,
                detail=f"쿼리가 완료되지 않았습니다. 현재 상태: {status.status}",
            )

        result = athena_service.save_as_snapshot(
            execution_id=execution_id,
            dashboard_key=request.dashboard_key,
            feed_key=request.feed_key,
            snapshot_date=request.snapshot_date,
        )
        return SaveSnapshotResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스냅샷 저장 실패: {str(e)}")
