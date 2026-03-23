from datetime import date as date_type

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, get_current_user_optional, require_admin
from app.core.permissions import require_dashboard_access
from app.core.database import get_db
from app.models.dashboard import Dashboard
from app.models.user import User
from app.schemas.dashboard_schema import (
    DashboardCreateRequest,
    DashboardUpdateRequest,
    DashboardItem,
    DashboardListResponse,
    DashboardSnapshotListResponse,
    DashboardSnapshotResponse,
    DirectSnapshotUploadRequest,
    SnapshotFeed,
    SnapshotPreviewResponse,
    AggregateRequest,
    AggregateResponse,
    FilterOptions,
    HealthFunctionStatsResponse,
    GccAggregatedDataRequest,
    GccAggregatedDataResponse,
)
from app.services.dashboard_service import DashboardService
from app.services.gcc_dashboard_service import GccDashboardService
from app.services.health_function_service import HealthFunctionService
from app.services.snapshot_service import SnapshotService
from app.utils.errors import (
    DashboardNotFoundError,
    InvalidSnapshotDateError,
    SnapshotFetchError,
    SnapshotNotFoundError,
)

router = APIRouter(tags=["dashboards"])


@router.get("/dashboards", response_model=DashboardListResponse)
async def list_dashboards(
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> DashboardListResponse:
    service = DashboardService(db=db)
    return await service.list_dashboards(current_user)


@router.post(
    "/dashboards",
    response_model=DashboardItem,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
async def create_dashboard(
    request: DashboardCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> DashboardItem:
    service = DashboardService(db=db)
    try:
        return await service.create_dashboard(request)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put(
    "/dashboards/{dashboard_key}",
    response_model=DashboardItem,
    dependencies=[Depends(require_admin)],
)
async def update_dashboard(
    dashboard_key: str,
    request: DashboardUpdateRequest,
    db: AsyncSession = Depends(get_db),
) -> DashboardItem:
    service = DashboardService(db=db)
    try:
        return await service.update_dashboard(dashboard_key, request)
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete(
    "/dashboards/{dashboard_key}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
async def delete_dashboard(
    dashboard_key: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    service = DashboardService(db=db)
    try:
        await service.delete_dashboard(dashboard_key)
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/dashboards/{dashboard_key}/snapshots",
    response_model=DashboardSnapshotResponse,
)
async def get_dashboard_snapshot(
    dashboard_key: str,
    response: Response,
    date: str | None = None,
    columns: str | None = None,
    dashboard: Dashboard = Depends(require_dashboard_access),
    db: AsyncSession = Depends(get_db),
) -> DashboardSnapshotResponse:
    service = DashboardService(db=db)
    try:
        snapshot = await service.get_snapshot(dashboard_key=dashboard.key, snapshot_date=date)
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except InvalidSnapshotDateError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    response.headers["Cache-Control"] = "private, max-age=300"

    if not columns:
        return snapshot

    selected_columns = [c.strip() for c in columns.split(",") if c.strip()]
    if not selected_columns:
        return snapshot

    filtered_feeds: dict[str, SnapshotFeed] = {}
    for feed_key, feed in snapshot.feeds.items():
        index_map = {col: idx for idx, col in enumerate(feed.columns)}
        available_cols = [c for c in selected_columns if c in index_map]
        if not available_cols:
            filtered_feeds[feed_key] = SnapshotFeed(columns=[], rows=[])
            continue
        indices = [index_map[c] for c in available_cols]
        filtered_rows = [
            [row[idx] if idx < len(row) else None for idx in indices]
            for row in feed.rows
        ]
        filtered_feeds[feed_key] = SnapshotFeed(columns=available_cols, rows=filtered_rows)

    return DashboardSnapshotResponse(
        dashboardKey=snapshot.dashboardKey,
        snapshotDate=snapshot.snapshotDate,
        generatedAt=snapshot.generatedAt,
        feeds=filtered_feeds,
    )


@router.get(
    "/dashboards/{dashboard_key}/snapshots/list",
    response_model=DashboardSnapshotListResponse,
)
async def list_dashboard_snapshots(
    dashboard_key: str,
    dashboard: Dashboard = Depends(require_dashboard_access),
    db: AsyncSession = Depends(get_db),
) -> DashboardSnapshotListResponse:
    service = DashboardService(db=db)
    try:
        return await service.list_snapshot_index(dashboard_key=dashboard.key)
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/dashboards/{dashboard_key}/snapshots/preview",
    response_model=SnapshotPreviewResponse,
)
async def preview_dashboard_snapshot(
    dashboard_key: str,
    date: str | None = None,
    feed_key: str = "example",
    offset: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=500),
    compid: str | None = None,
    start_month: str | None = None,
    end_month: str | None = None,
    dashboard: Dashboard = Depends(require_dashboard_access),
    db: AsyncSession = Depends(get_db),
) -> SnapshotPreviewResponse:
    snapshot_service = SnapshotService(db=db)

    try:
        selected_date = None
        if date:
            selected_date = date_type.fromisoformat(date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date}") from e

    try:
        snapshot_date_resolved, feed = await snapshot_service.fetch_snapshot_feed(
            dashboard_id=dashboard.id,
            snapshot_date=selected_date,
            feed_key=feed_key,
        )
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    rows = feed.rows
    if compid or start_month or end_month:
        filtered_rows: list[list[object]] = []
        compid_idx = feed.columns.index("compid") if "compid" in feed.columns else None
        year_idx = feed.columns.index("년") if "년" in feed.columns else None
        month_idx = feed.columns.index("월") if "월" in feed.columns else None

        for row in rows:
            if compid and compid_idx is not None:
                raw_compid = row[compid_idx]
                try:
                    compid_value = str(int(float(raw_compid))) if raw_compid is not None else ""
                except (TypeError, ValueError):
                    compid_value = str(raw_compid)
                if compid_value != compid:
                    continue

            if (start_month or end_month) and year_idx is not None and month_idx is not None:
                try:
                    year_val = int(float(row[year_idx]))
                    month_val = int(float(row[month_idx]))
                except (TypeError, ValueError):
                    continue
                ym_key = f"{year_val}-{str(month_val).zfill(2)}"
                if start_month and ym_key < start_month:
                    continue
                if end_month and ym_key > end_month:
                    continue

            filtered_rows.append(row)

        rows = filtered_rows

    total_rows = len(rows)
    rows = rows[offset : offset + limit]

    return SnapshotPreviewResponse(
        dashboardKey=dashboard.key,
        snapshotDate=snapshot_date_resolved,
        feedKey=feed_key,
        offset=offset,
        limit=limit,
        totalRows=total_rows,
        columns=feed.columns,
        rows=rows,
    )


@router.get("/dashboards/{dashboard_key}/snapshots/file")
async def download_dashboard_snapshot_file(
    dashboard_key: str,
    date: str | None = None,
    feed_key: str = "example",
    file_format: str = Query("parquet", pattern="^(parquet|schema|preview|validation)$"),
    dashboard: Dashboard = Depends(require_dashboard_access),
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    snapshot_service = SnapshotService(db=db)

    try:
        selected_date = None
        if date:
            selected_date = date_type.fromisoformat(date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date}") from e

    try:
        _snapshot_date_resolved, file_path = await snapshot_service.resolve_snapshot_file_path(
            dashboard_id=dashboard.id,
            snapshot_date=selected_date,
            feed_key=feed_key,
            file_format=file_format,
        )
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    media_type = "application/json" if file_format in {"schema", "preview"} else "application/octet-stream"
    return FileResponse(file_path, media_type=media_type, filename=file_path.name)


@router.post(
    "/dashboards/{dashboard_key}/snapshots/upload",
    response_model=DashboardSnapshotResponse,
)
async def upload_snapshot_excel(
    dashboard_key: str,
    file: UploadFile = File(...),
    feed_key: str = "example",
    date: str | None = None,
    columns: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> DashboardSnapshotResponse:
    dashboard_service = DashboardService(db=db)
    try:
        dashboard = await dashboard_service.dashboard_repo.get_by_key(dashboard_key)
        if dashboard is None:
            raise DashboardNotFoundError(f"Unknown dashboard: {dashboard_key}")
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    try:
        selected_date = None
        if date:
            selected_date = date_type.fromisoformat(date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date}") from e

    col_list = [c for c in columns.split(",")] if columns else None

    payload = await file.read()
    snapshot_service = SnapshotService(db=db)
    try:
        snapshot_date_resolved, _feed = await snapshot_service.ingest_snapshot_from_file(
            dashboard_id=dashboard.id,
            dashboard_key=dashboard.key,
            feed_key=feed_key,
            snapshot_date=selected_date,
            file_bytes=payload,
            filename=file.filename or "file.xlsx",
            columns=col_list,
        )
    except SnapshotFetchError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Return the latest snapshot payload for that date (will read back from file)
    try:
        return await dashboard_service.get_snapshot(
            dashboard_key=dashboard_key,
            snapshot_date=snapshot_date_resolved.isoformat(),
        )
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post(
    "/dashboards/{dashboard_key}/snapshots/direct",
    response_model=DashboardSnapshotResponse,
    dependencies=[Depends(require_admin)],
)
async def upload_snapshot_direct(
    dashboard_key: str,
    payload: DirectSnapshotUploadRequest,
    db: AsyncSession = Depends(get_db),
) -> DashboardSnapshotResponse:
    """Upload snapshot directly from JSON data (for test queries)"""
    dashboard_service = DashboardService(db=db)
    try:
        dashboard = await dashboard_service.dashboard_repo.get_by_key(dashboard_key)
        if dashboard is None:
            raise DashboardNotFoundError(f"Unknown dashboard: {dashboard_key}")
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    try:
        selected_date = None
        if payload.snapshot_date:
            selected_date = date_type.fromisoformat(payload.snapshot_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {payload.snapshot_date}") from e

    snapshot_service = SnapshotService(db=db)
    try:
        snapshot_date_resolved, _feed = await snapshot_service.ingest_snapshot_from_json(
            dashboard_id=dashboard.id,
            dashboard_key=dashboard.key,
            feed_key=payload.feed_key,
            snapshot_date=selected_date,
            columns=payload.columns,
            rows=payload.rows,
        )
    except SnapshotFetchError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Return the latest snapshot payload for that date (will read back from file)
    try:
        return await dashboard_service.get_snapshot(
            dashboard_key=dashboard_key,
            snapshot_date=snapshot_date_resolved.isoformat(),
        )
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get(
    "/dashboards/{dashboard_key}/filters",
    response_model=FilterOptions,
)
async def get_filter_options(
    dashboard_key: str,
    feed_key: str = "example",
    dashboard: Dashboard = Depends(require_dashboard_access),
    db: AsyncSession = Depends(get_db),
) -> FilterOptions:
    service = DashboardService(db=db)
    try:
        return await service.get_filter_options(dashboard_key=dashboard.key, feed_key=feed_key)
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.post(
    "/dashboards/{dashboard_key}/aggregate",
    response_model=AggregateResponse,
)
async def aggregate_dashboard(
    dashboard_key: str,
    payload: AggregateRequest,
    dashboard: Dashboard = Depends(require_dashboard_access),
    db: AsyncSession = Depends(get_db),
) -> AggregateResponse:
    service = DashboardService(db=db)
    try:
        return await service.aggregate_dashboard(dashboard_key=dashboard.key, payload=payload)
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e


@router.get(
    "/dashboards/{dashboard_key}/stats/health-function",
    response_model=HealthFunctionStatsResponse,
)
async def get_health_function_stats(
    dashboard_key: str,
    response: Response,
    date: str | None = None,
    feed_key: str = "example",
    year: str | None = None,
    quarter: str | None = None,
    month: int | None = None,
    customer: str | None = None,
    product: str | None = None,
    form_type: str | None = None,
    function: str | None = None,
    biz_unit: str | None = None,
    company_code: str | None = None,
    evaluation_class: str | None = None,
    business_area: str | None = None,
    sales_country: str | None = None,
    procurement_type: str | None = None,
    distribution_channel: str | None = None,
    distribution_channel_detail: str | None = None,
    food_type: str | None = None,
    period_start: int | None = Query(None, ge=0),
    period_end: int | None = Query(None, ge=0),
    include_all_eval_class: bool = Query(False, description="Include all evaluation classes (skip 7920 filter)"),
    dashboard: Dashboard = Depends(require_dashboard_access),
    db: AsyncSession = Depends(get_db),
) -> HealthFunctionStatsResponse:
    service = HealthFunctionService(db=db)
    try:
        stats = await service.get_health_function_stats(
            dashboard_key=dashboard.key,
            snapshot_date=date,
            feed_key=feed_key,
            year=year,
            quarter=quarter,
            month=month,
            customer=customer,
            product=product,
            form_type=form_type,
            function=function,
            biz_unit=biz_unit,
            company_code=company_code,
            evaluation_class=evaluation_class,
            business_area=business_area,
            sales_country=sales_country,
            procurement_type=procurement_type,
            distribution_channel=distribution_channel,
            distribution_channel_detail=distribution_channel_detail,
            food_type=food_type,
            period_start=period_start,
            period_end=period_end,
            include_all_eval_class=include_all_eval_class,
        )
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except InvalidSnapshotDateError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    response.headers["Cache-Control"] = "private, max-age=300"
    return stats


@router.delete(
    "/dashboards/{dashboard_key}/snapshots/{snapshot_date}",
    status_code=204,
    dependencies=[Depends(require_admin)],
)
async def delete_snapshot(
    dashboard_key: str,
    snapshot_date: str,
    feed_key: str = "example",
    db: AsyncSession = Depends(get_db),
) -> None:
    dashboard_service = DashboardService(db=db)
    snapshot_service = SnapshotService(db=db)

    # Get dashboard
    try:
        dashboard = await dashboard_service.dashboard_repo.get_by_key(dashboard_key)
        if dashboard is None:
            raise DashboardNotFoundError(f"Unknown dashboard: {dashboard_key}")
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    # Parse date
    try:
        parsed_date = date_type.fromisoformat(snapshot_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {snapshot_date}") from e

    # Delete snapshot
    try:
        await snapshot_service.delete_snapshot(
            dashboard_id=dashboard.id, snapshot_date=parsed_date, feed_key=feed_key
        )
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post(
    "/dashboards/gcc/aggregated-data",
    response_model=GccAggregatedDataResponse,
)
async def get_gcc_aggregated_data(
    payload: GccAggregatedDataRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GccAggregatedDataResponse:
    """Get aggregated data for GCC dashboard (performance optimized)"""
    service = GccDashboardService(db=db)
    try:
        return await service.get_gcc_aggregated_data(payload)
    except DashboardNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except SnapshotFetchError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
