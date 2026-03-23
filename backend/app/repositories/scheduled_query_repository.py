"""ScheduledQuery Repository"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.scheduled_query import QueryExecutionLog, ScheduledQuery


class ScheduledQueryRepository:
    """스케줄 쿼리 저장소"""

    async def create(self, db: AsyncSession, **kwargs) -> ScheduledQuery:
        """스케줄 생성"""
        schedule = ScheduledQuery(**kwargs)
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        return schedule

    async def get_by_id(self, db: AsyncSession, schedule_id: int) -> ScheduledQuery | None:
        """ID로 조회"""
        result = await db.execute(select(ScheduledQuery).where(ScheduledQuery.id == schedule_id))
        return result.scalars().first()

    async def get_all(
        self, db: AsyncSession, active_only: bool = False
    ) -> list[ScheduledQuery]:
        """전체 스케줄 조회"""
        stmt = select(ScheduledQuery)

        if active_only:
            stmt = stmt.where(ScheduledQuery.is_active == True)

        stmt = stmt.order_by(ScheduledQuery.created_at.desc())

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update(
        self, db: AsyncSession, schedule: ScheduledQuery, **kwargs
    ) -> ScheduledQuery:
        """스케줄 수정"""
        for key, value in kwargs.items():
            if value is not None:
                setattr(schedule, key, value)

        await db.commit()
        await db.refresh(schedule)
        return schedule

    async def update_last_run(
        self, db: AsyncSession, schedule: ScheduledQuery
    ) -> ScheduledQuery:
        """마지막 실행 시간 업데이트"""
        schedule.last_run_at = datetime.utcnow()
        await db.commit()
        await db.refresh(schedule)
        return schedule

    async def delete(self, db: AsyncSession, schedule: ScheduledQuery) -> None:
        """스케줄 삭제"""
        await db.delete(schedule)
        await db.commit()


class QueryExecutionLogRepository:
    """쿼리 실행 로그 저장소"""

    async def create(self, db: AsyncSession, **kwargs) -> QueryExecutionLog:
        """로그 생성"""
        log = QueryExecutionLog(**kwargs)
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return log

    async def get_by_id(self, db: AsyncSession, log_id: int) -> QueryExecutionLog | None:
        """ID로 조회"""
        result = await db.execute(select(QueryExecutionLog).where(QueryExecutionLog.id == log_id))
        return result.scalars().first()

    async def get_all(
        self,
        db: AsyncSession,
        scheduled_query_id: int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[QueryExecutionLog], int]:
        """전체 로그 조회"""
        stmt = select(QueryExecutionLog)

        if scheduled_query_id is not None:
            stmt = stmt.where(QueryExecutionLog.scheduled_query_id == scheduled_query_id)

        # Count total
        from sqlalchemy import func

        count_stmt = select(func.count()).select_from(QueryExecutionLog)
        if scheduled_query_id is not None:
            count_stmt = count_stmt.where(
                QueryExecutionLog.scheduled_query_id == scheduled_query_id
            )
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Get paginated results
        stmt = stmt.order_by(QueryExecutionLog.started_at.desc()).limit(limit).offset(offset)
        result = await db.execute(stmt)

        return list(result.scalars().all()), total

    async def update(self, db: AsyncSession, log: QueryExecutionLog, **kwargs) -> QueryExecutionLog:
        """로그 업데이트"""
        for key, value in kwargs.items():
            if value is not None:
                setattr(log, key, value)

        await db.commit()
        await db.refresh(log)
        return log


scheduled_query_repository = ScheduledQueryRepository()
query_execution_log_repository = QueryExecutionLogRepository()
