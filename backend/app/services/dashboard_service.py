from __future__ import annotations

import os
from datetime import date as date_type, datetime
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.dashboard_repository import DashboardRepository
from app.services.snapshot_service import SnapshotService
from app.schemas.dashboard_schema import (
    AggregateRequest,
    AggregateResponse,
    DashboardCreateRequest,
    DashboardUpdateRequest,
    DashboardItem,
    DashboardListResponse,
    DashboardSnapshotListResponse,
    DashboardSnapshotResponse,
    FilterOptions,
    GroupValue,
)
from app.utils.errors import DashboardNotFoundError, InvalidSnapshotDateError, SnapshotFetchError, SnapshotNotFoundError
from app.utils.stats_utils import normalize_label
from app.utils.stats_utils import safe_number


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.dashboard_repo = DashboardRepository(db=db)
        self.snapshot_service = SnapshotService(db=db)

    async def list_dashboards(self, user: User | None) -> DashboardListResponse:
        if user is None:
            # If not authenticated, show all active dashboards
            dashboards = await self.dashboard_repo.list_active()
        elif user.role == "admin":
            dashboards = await self.dashboard_repo.list_active()
        else:
            dashboards = await self.dashboard_repo.list_accessible_for_user(user.id)
        return DashboardListResponse(
            items=[
                DashboardItem(
                    key=d.key,
                    name=d.name,
                    description=d.description,
                    is_public=d.is_public,
                )
                for d in dashboards
            ]
        )

    async def create_dashboard(self, request: DashboardCreateRequest) -> DashboardItem:
        """Create a new dashboard"""
        # Check if key already exists
        existing = await self.dashboard_repo.get_by_key(request.key)
        if existing:
            raise ValueError(f"Dashboard with key '{request.key}' already exists")

        dashboard = await self.dashboard_repo.create(
            key=request.key,
            name=request.name,
            description=request.description,
            is_public=request.is_public,
        )
        await self.db.commit()

        # Auto-create frontend dashboard directory and page
        try:
            self._create_frontend_dashboard_page(dashboard.key, dashboard.name)
        except Exception as e:
            print(f"Warning: Failed to create frontend dashboard page: {e}")

        return DashboardItem(
            key=dashboard.key,
            name=dashboard.name,
            description=dashboard.description,
            is_public=dashboard.is_public,
        )

    async def update_dashboard(self, dashboard_key: str, request: DashboardUpdateRequest) -> DashboardItem:
        """Update dashboard name and description"""
        dashboard = await self.dashboard_repo.update(
            key=dashboard_key,
            name=request.name,
            description=request.description,
            is_public=request.is_public,
        )
        if not dashboard:
            raise DashboardNotFoundError(f"Dashboard '{dashboard_key}' not found")

        await self.db.commit()

        return DashboardItem(
            key=dashboard.key,
            name=dashboard.name,
            description=dashboard.description,
            is_public=dashboard.is_public,
        )

    async def delete_dashboard(self, dashboard_key: str) -> None:
        """Delete dashboard by key. Snapshots will be cascade deleted."""
        deleted = await self.dashboard_repo.delete_by_key(dashboard_key)
        if not deleted:
            raise DashboardNotFoundError(f"Dashboard '{dashboard_key}' not found")

        await self.db.commit()

        # Auto-delete frontend dashboard directory and page
        try:
            self._delete_frontend_dashboard_page(dashboard_key)
        except Exception as e:
            print(f"Warning: Failed to delete frontend dashboard page: {e}")

    async def get_snapshot(
        self,
        dashboard_key: str,
        snapshot_date: str | None,
        row_limit: int | None = None,
    ) -> DashboardSnapshotResponse:
        dashboard = await self.dashboard_repo.get_by_key(dashboard_key)
        if dashboard is None:
            raise DashboardNotFoundError(f"Unknown dashboard: {dashboard_key}")

        try:
            selected_date = date_type.fromisoformat(snapshot_date) if snapshot_date else date_type.today()
        except ValueError as e:
            raise InvalidSnapshotDateError(f"Invalid date format: {snapshot_date}") from e

        try:
            snapshot_date_resolved, feeds = await self.snapshot_service.fetch_snapshot_feeds(
                dashboard_id=dashboard.id,
                snapshot_date=selected_date if snapshot_date else None,
                row_limit=row_limit,
            )
        except SnapshotNotFoundError:
            raise
        except SnapshotFetchError:
            raise

        return DashboardSnapshotResponse(
            dashboardKey=dashboard.key,
            snapshotDate=snapshot_date_resolved,
            generatedAt=datetime.utcnow(),
            feeds=feeds,
        )

    async def list_snapshot_index(self, dashboard_key: str) -> DashboardSnapshotListResponse:
        dashboard = await self.dashboard_repo.get_by_key(dashboard_key)
        if dashboard is None:
            raise DashboardNotFoundError(f"Unknown dashboard: {dashboard_key}")

        items = await self.snapshot_service.snapshot_repo.list_items_for_dashboard(dashboard.id)
        entries = {}
        for item in items:
            key = item.snapshot_date.isoformat()
            entries.setdefault(key, []).append({"feedKey": item.feed_key, "uri": item.s3_uri})
        snapshots = [
            {"snapshotDate": k, "feeds": v}
            for k, v in sorted(entries.items(), key=lambda x: x[0], reverse=True)
        ]
        return DashboardSnapshotListResponse(dashboardKey=dashboard.key, snapshots=snapshots)

    async def get_filter_options(self, dashboard_key: str, feed_key: str = "example") -> FilterOptions:
        """Get available filter options from snapshot data"""
        snapshot = await self.get_snapshot(dashboard_key=dashboard_key, snapshot_date=None)

        feed = snapshot.feeds.get(feed_key)
        if not feed:
            raise SnapshotNotFoundError(f"Feed not found: {feed_key}")

        rows = [
            {col: row[idx] if idx < len(row) else None for idx, col in enumerate(feed.columns)}
            for row in feed.rows
        ]

        def collect(key: str) -> list[str]:
            values = {normalize_label(r.get(key)) for r in rows}
            return sorted(values)

        return FilterOptions(
            years=collect("회계연도"),
            quarters=collect("분기"),
            countries=collect("매출국가"),
            customers=collect("고객명"),
            groups=collect("그룹명"),
            eval_classes=collect("평가클래스"),
            products=collect("제품명"),
        )

    async def aggregate_dashboard(self, dashboard_key: str, payload: AggregateRequest) -> AggregateResponse:
        """Aggregate dashboard data with filters"""
        snapshot = await self.get_snapshot(
            dashboard_key=dashboard_key, snapshot_date=payload.snapshot_date
        )

        feed = snapshot.feeds.get(payload.feed_key)
        if not feed:
            raise SnapshotNotFoundError(f"Feed not found: {payload.feed_key}")

        row_objs = [
            {col: row[idx] if idx < len(row) else None for idx, col in enumerate(feed.columns)}
            for row in feed.rows
        ]

        filtered_rows = self._apply_filters(row_objs, payload)

        def sum_key(key: str) -> float:
            return sum(safe_number(r.get(key)) for r in filtered_rows)

        total_sales = sum_key("총매출")
        total_cm = sum_key("공헌이익")
        total_op = sum_key("영업이익")
        total_sga = sum_key("판관비 計")
        op_margin = (total_op / total_sales * 100) if total_sales else 0.0
        sga_ratio = (total_sga / total_sales * 100) if total_sales else 0.0

        by_period_raw = self._group_sum(filtered_rows, "기간", "총매출")
        max_period_val = max((gv.value for gv in by_period_raw), default=0.0)
        if max_period_val >= 1_000_000_000:
            factor, label = 100_000_000, "(억 단위)"
        elif max_period_val >= 1_000_000:
            factor, label = 1_000_000, "(백만 단위)"
        elif max_period_val >= 1_000:
            factor, label = 1_000, "(천 단위)"
        else:
            factor, label = 1, "(원 단위)"
        by_period = [GroupValue(name=g.name, value=g.value / factor) for g in by_period_raw]

        top_customers = sorted(
            self._group_sum(filtered_rows, "고객명", "총매출"),
            key=lambda g: g.value,
            reverse=True
        )[:10]
        top_products = sorted(
            self._group_sum(filtered_rows, "제품명", "총매출"),
            key=lambda g: g.value,
            reverse=True
        )[:10]
        by_country = self._group_sum(filtered_rows, "매출국가", "총매출")

        return AggregateResponse(
            dashboardKey=dashboard_key,
            feedKey=payload.feed_key,
            snapshotDate=str(snapshot.snapshotDate),
            totalSales=total_sales,
            totalCM=total_cm,
            totalOP=total_op,
            totalSGA=total_sga,
            opMargin=op_margin,
            sgaRatio=sga_ratio,
            byPeriod=by_period,
            topCustomers=top_customers,
            topProducts=top_products,
            byCountry=by_country,
            periodScaleLabel=label,
        )

    # Private helper methods
    def _apply_filters(self, rows: list[dict[str, object]], req: AggregateRequest) -> list[dict[str, object]]:
        """Apply filter criteria to rows"""
        def match_list(key: str, selected: list[str] | None) -> bool:
            if not selected:
                return True
            return normalize_label(row.get(key)) in set(selected)

        filtered = []
        for row in rows:
            if not match_list("회계연도", req.years):
                continue
            if not match_list("분기", req.quarters):
                continue
            if not match_list("매출국가", req.countries):
                continue
            if not match_list("고객명", req.customers):
                continue
            if not match_list("그룹명", req.groups):
                continue
            if not match_list("평가클래스", req.eval_classes):
                continue
            if not match_list("제품명", req.products):
                continue
            filtered.append(row)
        return filtered

    def _group_sum(self, rows: list[dict[str, object]], key: str, value_key: str) -> list[GroupValue]:
        """Group rows by key and sum values"""
        acc: dict[str, float] = {}
        for r in rows:
            k = normalize_label(r.get(key))
            v = safe_number(r.get(value_key))
            acc[k] = acc.get(k, 0.0) + v
        return [GroupValue(name=k, value=v) for k, v in acc.items()]

    @staticmethod
    def _create_frontend_dashboard_page(dashboard_key: str, dashboard_name: str) -> None:
        """Create frontend dashboard directory and page.tsx from template"""
        # Path to template and target directory
        template_path = Path("/app/templates/dashboard_page_template.tsx")
        frontend_dir = Path("/app/frontend_dashboards")
        dashboard_dir = frontend_dir / dashboard_key
        page_path = dashboard_dir / "page.tsx"

        # Skip if already exists
        if page_path.exists():
            print(f"Frontend dashboard page already exists: {page_path}")
            return

        # Read template
        if not template_path.exists():
            raise FileNotFoundError(f"Template not found: {template_path}")

        template_content = template_path.read_text(encoding="utf-8")

        # Replace placeholders
        # Convert dashboard-key to DashboardKey for component name
        component_name = "".join(word.capitalize() for word in dashboard_key.split("-"))
        page_content = template_content.replace("{{DASHBOARD_KEY}}", dashboard_key)
        page_content = page_content.replace("{{DASHBOARD_NAME}}", component_name)

        # Create directory and write file
        dashboard_dir.mkdir(parents=True, exist_ok=True)
        page_path.write_text(page_content, encoding="utf-8")

        print(f"✅ Created frontend dashboard page: {page_path}")
        print(f"   Dashboard URL: http://localhost:8080/dashboards/{dashboard_key}")

    @staticmethod
    def _delete_frontend_dashboard_page(dashboard_key: str) -> None:
        """Delete frontend dashboard directory and all its contents"""
        import shutil

        frontend_dir = Path("/app/frontend_dashboards")
        dashboard_dir = frontend_dir / dashboard_key

        # Skip if doesn't exist
        if not dashboard_dir.exists():
            print(f"Frontend dashboard directory does not exist: {dashboard_dir}")
            return

        # Delete entire directory
        shutil.rmtree(dashboard_dir)
        print(f"🗑️  Deleted frontend dashboard directory: {dashboard_dir}")
        print(f"   Dashboard '{dashboard_key}' removed")
