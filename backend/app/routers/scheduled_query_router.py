"""ScheduledQuery Router"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.saved_query import SavedQuery
from app.schemas.scheduled_query_schema import (
    QueryExecutionLogListResponse,
    QueryExecutionLogResponse,
    ScheduledQueryCreate,
    ScheduledQueryListResponse,
    ScheduledQueryResponse,
    ScheduledQueryUpdate,
)
from app.services.scheduled_query_service import (
    query_execution_log_service,
    scheduled_query_service,
)

router = APIRouter(prefix="/scheduled-queries", tags=["scheduled-queries"])


@router.post("", response_model=ScheduledQueryResponse)
async def create_scheduled_query(
    data: ScheduledQueryCreate, db: AsyncSession = Depends(get_db)
) -> ScheduledQueryResponse:
    """스케줄 쿼리 생성"""
    schedule = await scheduled_query_service.create_schedule(db, data)
    return ScheduledQueryResponse.model_validate(schedule)


@router.get("", response_model=ScheduledQueryListResponse)
async def list_scheduled_queries(
    active_only: bool = False, db: AsyncSession = Depends(get_db)
) -> ScheduledQueryListResponse:
    """스케줄 쿼리 목록 조회"""
    schedules = await scheduled_query_service.list_schedules(db, active_only=active_only)
    return ScheduledQueryListResponse(
        items=[ScheduledQueryResponse.model_validate(s) for s in schedules]
    )


@router.get("/{schedule_id}", response_model=ScheduledQueryResponse)
async def get_scheduled_query(
    schedule_id: int, db: AsyncSession = Depends(get_db)
) -> ScheduledQueryResponse:
    """스케줄 쿼리 상세 조회"""
    schedule = await scheduled_query_service.get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다.")
    return ScheduledQueryResponse.model_validate(schedule)


@router.put("/{schedule_id}", response_model=ScheduledQueryResponse)
async def update_scheduled_query(
    schedule_id: int, data: ScheduledQueryUpdate, db: AsyncSession = Depends(get_db)
) -> ScheduledQueryResponse:
    """스케줄 쿼리 수정"""
    schedule = await scheduled_query_service.update_schedule(db, schedule_id, data)
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다.")
    return ScheduledQueryResponse.model_validate(schedule)


@router.delete("/{schedule_id}")
async def delete_scheduled_query(schedule_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """스케줄 쿼리 삭제"""
    success = await scheduled_query_service.delete_schedule(db, schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다.")
    return {"success": True}


@router.post("/{schedule_id}/run", response_model=QueryExecutionLogResponse)
async def run_scheduled_query_now(
    schedule_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> QueryExecutionLogResponse:
    """스케줄 쿼리 수동 즉시 실행"""
    from datetime import datetime

    schedule = await scheduled_query_service.get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다.")

    # SavedQuery 조회
    stmt = select(SavedQuery).where(SavedQuery.id == schedule.saved_query_id)
    result = await db.execute(stmt)
    saved_query = result.scalar_one_or_none()
    if not saved_query:
        raise HTTPException(status_code=404, detail="저장된 쿼리를 찾을 수 없습니다.")

    # 실행 로그 생성 (status: running)
    log = await query_execution_log_service.create_log(
        db,
        scheduled_query_id=schedule.id,
        saved_query_id=saved_query.id,
        execution_type="manual",
    )
    await db.commit()
    await db.refresh(log)

    # 백그라운드에서 실제 실행 (즉시 응답 반환)
    async def _run_in_background(log_id: int, schedule_id: int):
        from app.core.database import SessionLocal
        from app.services.athena_service import athena_service

        async with SessionLocal() as bg_db:
            start_time = datetime.utcnow()
            try:
                execution_id = await athena_service.execute_query(saved_query.query_text)
                rows_affected = await athena_service.wait_for_query(execution_id)
                execution_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

                await query_execution_log_service.update_log_success(
                    bg_db, log_id,
                    athena_execution_id=execution_id,
                    rows_affected=rows_affected,
                    execution_time_ms=execution_time_ms,
                )
                await scheduled_query_service.update_last_run(bg_db, schedule_id)
                await bg_db.commit()
            except Exception as e:
                await query_execution_log_service.update_log_failed(
                    bg_db, log_id, error_message=str(e)
                )
                await bg_db.commit()

    background_tasks.add_task(_run_in_background, log.id, schedule.id)

    return QueryExecutionLogResponse.model_validate(log)


@router.get("/logs/all", response_model=QueryExecutionLogListResponse)
async def list_execution_logs(
    scheduled_query_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> QueryExecutionLogListResponse:
    """실행 로그 목록 조회"""
    logs, total = await query_execution_log_service.list_logs(
        db, scheduled_query_id, limit, offset
    )
    return QueryExecutionLogListResponse(
        items=[QueryExecutionLogResponse.model_validate(log) for log in logs], total=total
    )
