"""ScheduledQuery Service"""

from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scheduled_query import QueryExecutionLog, ScheduledQuery
from app.repositories.scheduled_query_repository import (
    query_execution_log_repository,
    scheduled_query_repository,
)
from app.schemas.scheduled_query_schema import (
    ScheduledQueryCreate,
    ScheduledQueryUpdate,
)


class ScheduledQueryService:
    """스케줄 쿼리 서비스"""

    async def create_schedule(
        self, db: AsyncSession, data: ScheduledQueryCreate
    ) -> ScheduledQuery:
        """스케줄 생성"""
        return await scheduled_query_repository.create(
            db,
            saved_query_id=data.saved_query_id,
            dashboard_key=data.dashboard_key,
            feed_key=data.feed_key,
            schedule_cron=data.schedule_cron,
            snapshot_date_option=data.snapshot_date_option,
            description=data.description,
            is_active=data.is_active,
        )

    async def get_schedule(self, db: AsyncSession, schedule_id: int) -> ScheduledQuery | None:
        """스케줄 조회"""
        return await scheduled_query_repository.get_by_id(db, schedule_id)

    async def list_schedules(
        self, db: AsyncSession, active_only: bool = False
    ) -> list[ScheduledQuery]:
        """스케줄 목록 조회"""
        return await scheduled_query_repository.get_all(db, active_only)

    async def update_schedule(
        self, db: AsyncSession, schedule_id: int, data: ScheduledQueryUpdate
    ) -> ScheduledQuery | None:
        """스케줄 수정"""
        schedule = await scheduled_query_repository.get_by_id(db, schedule_id)
        if not schedule:
            return None

        return await scheduled_query_repository.update(
            db,
            schedule,
            schedule_cron=data.schedule_cron,
            snapshot_date_option=data.snapshot_date_option,
            description=data.description,
            is_active=data.is_active,
        )

    async def delete_schedule(self, db: AsyncSession, schedule_id: int) -> bool:
        """스케줄 삭제"""
        schedule = await scheduled_query_repository.get_by_id(db, schedule_id)
        if not schedule:
            return False

        await scheduled_query_repository.delete(db, schedule)
        return True

    async def update_last_run(self, db: AsyncSession, schedule_id: int) -> ScheduledQuery | None:
        """마지막 실행 시간 업데이트"""
        schedule = await scheduled_query_repository.get_by_id(db, schedule_id)
        if not schedule:
            return None

        return await scheduled_query_repository.update_last_run(db, schedule)

    def get_snapshot_date(self, option: str) -> str:
        """스냅샷 날짜 계산"""
        if option == "today":
            return datetime.now().strftime("%Y-%m-%d")
        elif option == "yesterday":
            return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            return datetime.now().strftime("%Y-%m-%d")


class QueryExecutionLogService:
    """쿼리 실행 로그 서비스"""

    async def create_log(
        self,
        db: AsyncSession,
        scheduled_query_id: int | None = None,
        saved_query_id: int | None = None,
        execution_type: str = "manual",
    ) -> QueryExecutionLog:
        """로그 생성"""
        return await query_execution_log_repository.create(
            db,
            scheduled_query_id=scheduled_query_id,
            saved_query_id=saved_query_id,
            execution_type=execution_type,
            status="running",
        )

    async def update_log_success(
        self,
        db: AsyncSession,
        log_id: int,
        athena_execution_id: str,
        rows_affected: int,
        execution_time_ms: int,
        snapshot_uri: str | None = None,
    ) -> QueryExecutionLog | None:
        """로그 성공 업데이트"""
        log = await query_execution_log_repository.get_by_id(db, log_id)
        if not log:
            return None

        return await query_execution_log_repository.update(
            db,
            log,
            status="success",
            athena_execution_id=athena_execution_id,
            rows_affected=rows_affected,
            execution_time_ms=execution_time_ms,
            snapshot_uri=snapshot_uri,
            completed_at=datetime.utcnow(),
        )

    async def update_log_failed(
        self,
        db: AsyncSession,
        log_id: int,
        error_message: str,
        athena_execution_id: str | None = None,
    ) -> QueryExecutionLog | None:
        """로그 실패 업데이트"""
        log = await query_execution_log_repository.get_by_id(db, log_id)
        if not log:
            return None

        return await query_execution_log_repository.update(
            db,
            log,
            status="failed",
            error_message=error_message,
            athena_execution_id=athena_execution_id,
            completed_at=datetime.utcnow(),
        )

    async def list_logs(
        self, db: AsyncSession, scheduled_query_id: int | None = None, limit: int = 100, offset: int = 0
    ) -> tuple[list[QueryExecutionLog], int]:
        """로그 목록 조회"""
        return await query_execution_log_repository.get_all(
            db, scheduled_query_id, limit, offset
        )


scheduled_query_service = ScheduledQueryService()
query_execution_log_service = QueryExecutionLogService()
