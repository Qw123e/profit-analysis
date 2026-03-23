#!/usr/bin/env python3
"""
스케줄된 쿼리를 실행하는 스크립트
Cron으로 매 분마다 실행하거나, 백그라운드 워커로 실행
"""

import asyncio
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SessionLocal
from app.models.saved_query import SavedQuery
from app.models.scheduled_query import QueryExecutionLog, ScheduledQuery
from app.services.athena_service import athena_service
from app.services.scheduled_query_service import (
    query_execution_log_service,
    scheduled_query_service,
)
from croniter import croniter


async def should_run_now(schedule: ScheduledQuery) -> bool:
    """스케줄이 지금 실행되어야 하는지 확인"""
    if not schedule.is_active:
        return False

    try:
        cron = croniter(schedule.schedule_cron, start_time=datetime.now())
        # 마지막 실행 이후 실행되어야 할 시간이 있는지 확인
        if schedule.last_run_at:
            next_run = croniter(schedule.schedule_cron, start_time=schedule.last_run_at).get_next(datetime)
            if next_run <= datetime.now():
                return True
        else:
            # 한 번도 실행되지 않았다면 실행
            return True
    except Exception as e:
        print(f"❌ Cron expression error for schedule {schedule.id}: {e}")
        return False

    return False


async def execute_scheduled_query(db: AsyncSession, schedule: ScheduledQuery):
    """스케줄된 쿼리 실행"""
    print(f"▶️  Executing schedule ID: {schedule.id} (SavedQuery ID: {schedule.saved_query_id})")

    # SavedQuery 가져오기
    stmt = select(SavedQuery).where(SavedQuery.id == schedule.saved_query_id)
    result = await db.execute(stmt)
    saved_query = result.scalar_one_or_none()

    if not saved_query:
        print(f"❌ SavedQuery {schedule.saved_query_id} not found")
        return

    # 실행 로그 생성
    log = await query_execution_log_service.create_log(
        db,
        scheduled_query_id=schedule.id,
        saved_query_id=saved_query.id,
        execution_type="scheduled",
    )
    await db.commit()
    await db.refresh(log)

    start_time = datetime.now()

    try:
        # Athena 쿼리 실행 (동기 메서드)
        print(f"🔄 Running query: {saved_query.name}")

        execution_id = athena_service.execute_query(saved_query.sql, saved_query.database)

        # 쿼리 완료 대기 (폴링)
        rows_affected = 0
        while True:
            status = athena_service.get_query_status(execution_id)
            if status.status == "SUCCEEDED":
                try:
                    result = athena_service.get_query_results(execution_id, limit=1)
                    rows_affected = result.get("total_rows", 0)
                except Exception:
                    rows_affected = 0
                break
            elif status.status in ("FAILED", "CANCELLED"):
                raise RuntimeError(f"Athena query {status.status}: {status.state_change_reason}")
            await asyncio.sleep(2)

        execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        # 스냅샷 생성 (선택사항)
        snapshot_uri = None
        if schedule.dashboard_key and schedule.feed_key:
            snapshot_date = scheduled_query_service.get_snapshot_date(
                schedule.snapshot_date_option or "today"
            )
            # TODO: 스냅샷 생성 로직 추가
            # snapshot_uri = await create_snapshot(...)

        # 로그 업데이트 (성공)
        await query_execution_log_service.update_log_success(
            db,
            log.id,
            athena_execution_id=execution_id,
            rows_affected=rows_affected,
            execution_time_ms=execution_time_ms,
            snapshot_uri=snapshot_uri,
        )

        # 스케줄 마지막 실행 시간 업데이트
        await scheduled_query_service.update_last_run(db, schedule.id)
        await db.commit()

        print(f"✅ Success: {rows_affected} rows, {execution_time_ms}ms")

    except Exception as e:
        # 로그 업데이트 (실패)
        error_message = str(e)
        print(f"❌ Failed: {error_message}")

        await query_execution_log_service.update_log_failed(
            db, log.id, error_message=error_message
        )
        await db.commit()


async def run_scheduler():
    """스케줄러 메인 로직"""
    print(f"\n{'='*60}")
    print(f"🕐 Scheduler run at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    async with SessionLocal() as db:
        # 활성 스케줄 조회
        schedules = await scheduled_query_service.list_schedules(db, active_only=True)

        if not schedules:
            print("ℹ️  No active schedules found")
            return

        print(f"📋 Found {len(schedules)} active schedule(s)")

        # 실행해야 할 스케줄 필터링
        for schedule in schedules:
            if await should_run_now(schedule):
                try:
                    await execute_scheduled_query(db, schedule)
                except Exception as e:
                    print(f"❌ Error executing schedule {schedule.id}: {e}")
                    continue
            else:
                print(f"⏭️  Skip schedule ID {schedule.id} (not due yet)")

    print(f"\n{'='*60}")
    print("✅ Scheduler run completed")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(run_scheduler())
