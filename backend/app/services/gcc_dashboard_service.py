from __future__ import annotations

from datetime import date as date_type
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    GccAdoptionMonthlyPoint,
    GccAdoptionRate,
    GccAggregatedDataRequest,
    GccAggregatedDataResponse,
    GccCategorySeriesItem,
    GccCompanyGrowth,
    GccFilterOptions,
    GccKpis,
    GccMonthlyCountData,
    GccMonthlyCountPoint,
    GccMonthlyValuePoint,
    GccSalesGrowth,
    GccSalesTrend,
    GccSalesTrendPoint,
    GccScMuCounts,
    GccScMuTotals,
    GccSeriesItem,
    GccStrategicSalesItem,
    GccYoyComparisonData,
    GccYoyComparisonPoint,
    SnapshotFeed,
)
from app.services.snapshot_service import SnapshotService
from app.utils.stats_utils import normalize_label
from app.utils.stats_utils import safe_number
from app.utils.errors import DashboardNotFoundError

# Global cache for GCC snapshots (in-memory)
_gcc_snapshot_cache: dict[str, Any] = {}


class GccDashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.dashboard_repo = DashboardRepository(db=db)
        self.snapshot_service = SnapshotService(db=db)

    async def get_gcc_aggregated_data(self, req: GccAggregatedDataRequest) -> GccAggregatedDataResponse:
        """Get aggregated data for GCC dashboard (optimized for performance)"""
        import asyncio
        import time
        start = time.time()

        section_map: dict[str, set[str]] = {
            "summary2": {"sales", "confirm", "first_in", "request"},
            "research": {"confirm", "request"},
            "sales": {"sales"},
            "request": {"request"},
            "confirm": {"confirm"},
            "first_in": {"first_in"},
            "lab": {"confirm", "request"},
        }
        requested_sections = set(req.sections or [])
        known_sections = set(section_map.keys())
        if not requested_sections:
            requested_sections = known_sections
        else:
            requested_sections = requested_sections & known_sections
            if not requested_sections:
                requested_sections = known_sections
        required_feeds: set[str] = set()
        for section in requested_sections:
            required_feeds |= section_map.get(section, set())
        if not required_feeds:
            required_feeds = {"sales", "confirm", "first_in", "request"}

        dashboard = await self.dashboard_repo.get_by_key("gcc")
        if dashboard is None:
            raise DashboardNotFoundError("Unknown dashboard: gcc")

        cache_key = "gcc_feeds_v1"
        cache = _gcc_snapshot_cache.setdefault(cache_key, {})

        async def load_feed(feed_key: str, snapshot_date: str | None) -> tuple[SnapshotFeed, str]:
            cached = cache.get(feed_key)
            if cached:
                if snapshot_date is None or cached.get("snapshot_date") == snapshot_date:
                    return cached["feed"], cached["snapshot_date"]
            resolved_date, feed = await self.snapshot_service.fetch_snapshot_feed(
                dashboard_id=dashboard.id,
                snapshot_date=date_type.fromisoformat(snapshot_date) if snapshot_date else None,
                feed_key=feed_key,
                row_limit=settings.gcc_snapshot_row_limit,
            )
            snapshot_label = resolved_date.isoformat()
            cache[feed_key] = {"snapshot_date": snapshot_label, "feed": feed}
            return feed, snapshot_label

        sales_feed = None
        confirm_feed = None
        first_in_feed = None
        request_feed = None
        sales_snapshot_date = ""
        confirm_snapshot_date = ""
        first_in_snapshot_date = ""
        request_snapshot_date = ""

        feed_tasks: dict[str, asyncio.Future] = {}
        if "sales" in required_feeds:
            feed_tasks["sales"] = load_feed("sales", None)
        if "confirm" in required_feeds:
            feed_tasks["confirm"] = load_feed("confirm", None)
        if "first_in" in required_feeds:
            feed_tasks["first_in"] = load_feed("first_in", None)
        if "request" in required_feeds:
            feed_tasks["request"] = load_feed("request", None)

        if feed_tasks:
            results = await asyncio.gather(*feed_tasks.values())
            for feed_key, (feed, snapshot_date) in zip(feed_tasks.keys(), results):
                if feed_key == "sales":
                    sales_feed, sales_snapshot_date = feed, snapshot_date
                elif feed_key == "confirm":
                    confirm_feed, confirm_snapshot_date = feed, snapshot_date
                elif feed_key == "first_in":
                    first_in_feed, first_in_snapshot_date = feed, snapshot_date
                elif feed_key == "request":
                    request_feed, request_snapshot_date = feed, snapshot_date

        # Convert feeds to row objects
        def feed_to_rows(feed: SnapshotFeed | None) -> list[dict[str, object]]:
            if not feed:
                return []
            return [
                {col: row[idx] if idx < len(row) else None for idx, col in enumerate(feed.columns)}
                for row in feed.rows
            ]

        sales_rows = feed_to_rows(sales_feed)
        confirm_rows = feed_to_rows(confirm_feed)
        first_in_rows = feed_to_rows(first_in_feed)
        request_rows = feed_to_rows(request_feed)
        other_snapshot_date = confirm_snapshot_date or request_snapshot_date or first_in_snapshot_date

        # SC/MU category definitions
        CATEGORY_ORDER = [
            ("스킨류", "스킨류"),
            ("크림류", "크림류"),
            ("클렌징", "클렌징"),
            ("팩/마스크", "팩/마스크"),
            ("선", "선"),
            ("헤어", "헤어"),
            ("베이스 메이크업", "베이스 MU"),
            ("립 메이크업", "립 MU"),
            ("아이 메이크업", "아이 MU"),
            ("기타", "기타"),
        ]
        SC_CATEGORIES = {"스킨류", "크림류", "클렌징", "팩/마스크", "선", "헤어"}
        MU_CATEGORIES = {"베이스 메이크업", "립 메이크업", "아이 메이크업"}
        CATEGORY_KEYS = {c[0] for c in CATEGORY_ORDER}
        SUMMARY2_TARGET = (2025, 8)

        def to_year_month(row: dict[str, object]) -> tuple[int, int] | None:
            year = int(safe_number(row.get("년")))
            month = int(safe_number(row.get("월")))
            # Filter out invalid years (9999 is used as dummy value for missing dates)
            if year <= 0 or year >= 9999 or month <= 0 or month > 12:
                return None
            return year, month

        def to_month_key(row: dict[str, object]) -> str | None:
            ym = to_year_month(row)
            if not ym:
                return None
            return f"{ym[0]}-{str(ym[1]).zfill(2)}"

        def build_month_range(latest: tuple[int, int], count: int) -> list[str]:
            year, month = latest
            months: list[str] = []
            for _ in range(count):
                months.insert(0, f"{year}-{str(month).zfill(2)}")
                month -= 1
                if month < 1:
                    month = 12
                    year -= 1
            return months

        # Build filter options from ALL snapshots (unique values, unfiltered)
        all_rows = sales_rows + confirm_rows + first_in_rows + request_rows
        years = sorted({normalize_label(r.get("년")) for r in all_rows if r.get("년")}, reverse=True)
        months_set = sorted({normalize_label(r.get("월")).zfill(2) for r in all_rows if r.get("월")})
        months = months_set  # ["01", "02", ..., "12"]
        periods = sorted({to_month_key(r) for r in all_rows if to_month_key(r)})
        compids_set = sorted({
            int(float(r.get('compid')))
            for r in all_rows
            if r.get('compid') and safe_number(r.get('compid')) > 0
        })

        compid_labels = {
            1200: '한국',
            5100: '상해',
            5200: '광저우',
            6400: '미국법인',
            7100: '인도네시아',
            7200: '태국',
            9200: '잇센',
        }
        compids = [
            {"value": str(c), "label": f"{compid_labels.get(c, str(c))} ({c})"}
            for c in compids_set
        ]
        categories = [
            {"value": "SC", "label": "SC (스킨케어)"},
            {"value": "MU", "label": "MU (메이크업)"}
        ]

        # Apply filters
        def apply_filter(rows: list[dict[str, object]]) -> list[dict[str, object]]:
            filtered = []
            # If year is selected, include that year and previous year for YoY comparison
            target_years = None
            if req.year:
                prev_year = str(int(req.year) - 1)
                target_years = {req.year, prev_year}
            start_month = req.start_month
            end_month = req.end_month

            for r in rows:
                # Year filter (include selected year + previous year)
                if target_years and normalize_label(r.get('년')) not in target_years:
                    continue

                # Month filter (multi-select support)
                if req.months:
                    month_val = normalize_label(r.get('월')).zfill(2)
                    if month_val not in req.months:
                        continue

                # Compid filter
                if req.compid and safe_number(r.get('compid')) != float(req.compid):
                    continue

                # Category filter
                category = r.get('카테고리(2308)')
                if req.category == 'SC' and category not in SC_CATEGORIES:
                    continue
                if req.category == 'MU' and category not in MU_CATEGORIES:
                    continue

                # Period range filter (YYYY-MM)
                if start_month or end_month:
                    ym_key = to_month_key(r)
                    if not ym_key:
                        continue
                    if start_month and ym_key < start_month:
                        continue
                    if end_month and ym_key > end_month:
                        continue

                filtered.append(r)
            return filtered

        def apply_filter_summary2(rows: list[dict[str, object]]) -> list[dict[str, object]]:
            """Filter data for summary2 and research tabs - does NOT filter by year/month"""
            filtered = []
            for r in rows:
                if req.compid and safe_number(r.get('compid')) != float(req.compid):
                    continue
                category = r.get('카테고리(2308)')
                if req.category == 'SC' and category not in SC_CATEGORIES:
                    continue
                if req.category == 'MU' and category not in MU_CATEGORIES:
                    continue
                if req.start_month or req.end_month:
                    ym_key = to_month_key(r)
                    if not ym_key:
                        continue
                    if req.start_month and ym_key < req.start_month:
                        continue
                    if req.end_month and ym_key > req.end_month:
                        continue
                filtered.append(r)
            return filtered

        filtered_sales = apply_filter(sales_rows)
        filtered_confirm = apply_filter(confirm_rows)
        filtered_first_in = apply_filter(first_in_rows)
        filtered_request = apply_filter(request_rows)
        has_data = bool(filtered_sales or filtered_confirm or filtered_first_in or filtered_request)

        summary2_sales_rows = apply_filter_summary2(sales_rows)
        summary2_confirm_rows = apply_filter_summary2(confirm_rows)
        summary2_first_in_rows = apply_filter_summary2(first_in_rows)
        summary2_request_rows = apply_filter_summary2(request_rows)

        def find_latest_month(rows_list: list[list[dict[str, object]]]) -> tuple[int, int] | None:
            latest: tuple[int, int] | None = None
            for rows in rows_list:
                for r in rows:
                    ym = to_year_month(r)
                    if not ym:
                        continue
                    if not latest or ym > latest:
                        latest = ym
            return latest

        latest = find_latest_month([filtered_sales, filtered_confirm, filtered_first_in, filtered_request])
        latest_month_label = f"{latest[0]}-{str(latest[1]).zfill(2)}" if latest else ""
        include_summary = "summary" in requested_sections
        include_summary2 = "summary2" in requested_sections
        include_research = "research" in requested_sections
        include_sales = "sales" in requested_sections
        include_request = "request" in requested_sections
        include_confirm = "confirm" in requested_sections
        include_first_in = "first_in" in requested_sections
        include_lab = "lab" in requested_sections
        needs_adoption = include_summary or include_lab

        def build_category_series(
            rows: list[dict[str, object]],
            year: int,
            month: int,
            value_key: str | None = None,
        ) -> list[GccCategorySeriesItem]:
            prev_year = year - 1
            prev_month: dict[str, float] = {}
            curr_month: dict[str, float] = {}
            prev_ytd: dict[str, float] = {}
            curr_ytd: dict[str, float] = {}

            for r in rows:
                ym = to_year_month(r)
                if not ym:
                    continue
                cat = normalize_label(r.get("카테고리(2308)"))
                if cat not in CATEGORY_KEYS:
                    continue
                value = safe_number(r.get(value_key)) if value_key else 1.0
                if ym[0] == prev_year and ym[1] == month:
                    prev_month[cat] = prev_month.get(cat, 0.0) + value
                if ym[0] == year and ym[1] == month:
                    curr_month[cat] = curr_month.get(cat, 0.0) + value
                if ym[0] == prev_year and ym[1] <= month:
                    prev_ytd[cat] = prev_ytd.get(cat, 0.0) + value
                if ym[0] == year and ym[1] <= month:
                    curr_ytd[cat] = curr_ytd.get(cat, 0.0) + value

            items: list[GccCategorySeriesItem] = []
            for key, label in CATEGORY_ORDER:
                pv = prev_month.get(key, 0.0)
                cv = curr_month.get(key, 0.0)
                py = prev_ytd.get(key, 0.0)
                cy = curr_ytd.get(key, 0.0)
                month_growth = ((cv - pv) / pv * 100) if pv > 0 else 0.0
                ytd_growth = ((cy - py) / py * 100) if py > 0 else 0.0
                items.append(GccCategorySeriesItem(
                    key=key,
                    label=label,
                    prevMonth=pv,
                    currMonth=cv,
                    prevYtd=py,
                    currYtd=cy,
                    monthGrowth=month_growth,
                    ytdGrowth=ytd_growth,
                ))
            return items

        def build_sc_mu_totals(rows: list[dict[str, object]], year: int, month: int) -> GccScMuTotals:
            prev_sc = 0
            prev_mu = 0
            curr_sc = 0
            curr_mu = 0
            prev_year = year - 1
            for r in rows:
                ym = to_year_month(r)
                if not ym or ym[1] > month:
                    continue
                cat = normalize_label(r.get("카테고리(2308)"))
                if ym[0] == prev_year:
                    if cat in SC_CATEGORIES:
                        prev_sc += 1
                    if cat in MU_CATEGORIES:
                        prev_mu += 1
                if ym[0] == year:
                    if cat in SC_CATEGORIES:
                        curr_sc += 1
                    if cat in MU_CATEGORIES:
                        curr_mu += 1
            return GccScMuTotals(
                prev=GccScMuCounts(sc=prev_sc, mu=prev_mu),
                curr=GccScMuCounts(sc=curr_sc, mu=curr_mu),
            )

        def classify_sc_mu_by_subcategory(row: dict[str, object]) -> str | None:
            code = normalize_label(row.get("소분류코드"))
            if not code or len(code) < 3:
                return None
            if code[0] not in {"1", "3"}:
                return None
            third = code[2].upper()
            if third == "S":
                return "SC"
            if third == "M":
                return "MU"
            return None

        def build_sc_mu_totals_by_subcategory(rows: list[dict[str, object]], year: int, month: int) -> GccScMuTotals:
            prev_sc = 0
            prev_mu = 0
            curr_sc = 0
            curr_mu = 0
            prev_year = year - 1
            for r in rows:
                ym = to_year_month(r)
                if not ym or ym[1] > month:
                    continue
                bucket = classify_sc_mu_by_subcategory(r)
                if not bucket:
                    continue
                if ym[0] == prev_year:
                    if bucket == "SC":
                        prev_sc += 1
                    else:
                        prev_mu += 1
                if ym[0] == year:
                    if bucket == "SC":
                        curr_sc += 1
                    else:
                        curr_mu += 1
            return GccScMuTotals(
                prev=GccScMuCounts(sc=prev_sc, mu=prev_mu),
                curr=GccScMuCounts(sc=curr_sc, mu=curr_mu),
            )

        def build_strategic_sales(rows: list[dict[str, object]], year: int, month: int) -> list[GccStrategicSalesItem]:
            # Strategic products (based on GCC categories)
            # 크림류 -> 크림, 선 -> 선, 립 메이크업 -> 립, 베이스 메이크업 -> 베이스메이크업
            items = [
                ("크림", "크림류"),
                ("선", "선"),
                ("립", "립 메이크업"),
                ("베이스메이크업", "베이스 메이크업"),
            ]
            prev_year = year - 1
            result: list[GccStrategicSalesItem] = []
            for label, category in items:
                prev = 0.0
                curr = 0.0
                for r in rows:
                    ym = to_year_month(r)
                    if not ym or ym[1] != month:
                        continue
                    cat = normalize_label(r.get("카테고리(2308)"))
                    if cat != category:
                        continue
                    value = safe_number(r.get("총매출"))
                    if ym[0] == prev_year:
                        prev += value
                    if ym[0] == year:
                        curr += value
                result.append(GccStrategicSalesItem(label=label, prev=prev, curr=curr))
            return result

        def build_monthly_totals(
            rows: list[dict[str, object]],
            months: list[str],
            value_key: str | None = None,
        ) -> list[GccMonthlyValuePoint]:
            acc = {m: 0.0 for m in months}
            for r in rows:
                ym_key = to_month_key(r)
                if not ym_key or ym_key not in acc:
                    continue
                value = safe_number(r.get(value_key)) if value_key else 1.0
                acc[ym_key] += value
            return [GccMonthlyValuePoint(month=m, value=acc[m]) for m in months]

        def build_category_totals(
            rows: list[dict[str, object]],
            value_key: str | None = None,
        ) -> list[GccSeriesItem]:
            totals: list[GccSeriesItem] = []
            for key, label in CATEGORY_ORDER:
                total = 0.0
                for r in rows:
                    cat = normalize_label(r.get("카테고리(2308)"))
                    if cat != key:
                        continue
                    value = safe_number(r.get(value_key)) if value_key else 1.0
                    total += value
                if total > 0:
                    totals.append(GccSeriesItem(label=label, value=total))
            return totals

        def build_top_series(
            rows: list[dict[str, object]],
            group_key: str,
            value_key: str | None = None,
            limit: int = 8,
        ) -> list[GccSeriesItem]:
            acc: dict[str, float] = {}
            for r in rows:
                label = normalize_label(r.get(group_key))
                if not label:
                    continue
                value = safe_number(r.get(value_key)) if value_key else 1.0
                acc[label] = acc.get(label, 0.0) + value
            sorted_items = sorted(acc.items(), key=lambda x: x[1], reverse=True)
            top_items = sorted_items[:limit]
            rest_value = sum(v for _, v in sorted_items[limit:])
            if rest_value > 0:
                top_items.append(("기타", rest_value))
            return [GccSeriesItem(label=k, value=v) for k, v in top_items]

        def build_adoption_rates(
            request_rows: list[dict[str, object]],
            confirm_rows: list[dict[str, object]],
            months: list[str],
        ) -> list[GccAdoptionRate]:
            month_set = set(months)
            rates: list[GccAdoptionRate] = []
            for key, label in CATEGORY_ORDER:
                req_count = 0
                conf_count = 0
                for r in request_rows:
                    if to_month_key(r) not in month_set:
                        continue
                    if normalize_label(r.get("카테고리(2308)")) == key:
                        req_count += 1
                for r in confirm_rows:
                    if to_month_key(r) not in month_set:
                        continue
                    if normalize_label(r.get("카테고리(2308)")) == key:
                        conf_count += 1
                rate = (conf_count / req_count * 100) if req_count > 0 else 0.0
                rates.append(GccAdoptionRate(label=label, rate=rate))
            return rates

        def build_summary2_adoption_rates(
            request_rows: list[dict[str, object]],
            confirm_rows: list[dict[str, object]],
            year: int,
            month: int,
        ) -> list[GccAdoptionRate]:
            rates: list[GccAdoptionRate] = []
            for key, label in CATEGORY_ORDER:
                req_count = 0
                conf_count = 0
                for r in request_rows:
                    ym = to_year_month(r)
                    if not ym or ym != (year, month):
                        continue
                    if normalize_label(r.get("카테고리(2308)")) == key:
                        req_count += 1
                for r in confirm_rows:
                    ym = to_year_month(r)
                    if not ym or ym != (year, month):
                        continue
                    if normalize_label(r.get("카테고리(2308)")) == key:
                        conf_count += 1
                rate = (conf_count / req_count * 100) if req_count > 0 else 0.0
                rates.append(GccAdoptionRate(label=label, rate=rate))
            return rates

        # Calculate KPIs (align with product sales totals used in charts)
        총매출 = sum(safe_number(r.get('총매출')) for r in filtered_sales)
        초도건수 = len(filtered_first_in)
        확정건수 = len(filtered_confirm)
        의뢰건수 = len(filtered_request)

        empty_sc_mu = GccScMuTotals(
            prev=GccScMuCounts(sc=0, mu=0),
            curr=GccScMuCounts(sc=0, mu=0),
        )

        if latest:
            latest_year, latest_month = latest
            last6_months = build_month_range(latest, 6)
            last12_months = build_month_range(latest, 12)
            summary_sales = build_category_series(filtered_sales, latest_year, latest_month, "총매출") if include_summary else []
            summary_first_in = build_category_series(filtered_first_in, latest_year, latest_month) if include_summary else []
            summary_request = build_category_series(filtered_request, latest_year, latest_month) if include_summary else []
            strategic_sales = build_strategic_sales(filtered_sales, latest_year, latest_month) if include_summary else []
            summary_sc_mu_first_in = build_sc_mu_totals(filtered_first_in, latest_year, latest_month) if include_summary else empty_sc_mu
            summary_sc_mu_request = build_sc_mu_totals(filtered_request, latest_year, latest_month) if include_summary else empty_sc_mu
            adoption_rates = build_adoption_rates(filtered_request, filtered_confirm, last6_months) if needs_adoption else []
            adoption_monthly = []
            if include_lab and last12_months:
                request_monthly_tmp = build_monthly_totals(filtered_request, last12_months)
                confirm_monthly_tmp = build_monthly_totals(filtered_confirm, last12_months)
                for idx, item in enumerate(request_monthly_tmp):
                    conf_value = confirm_monthly_tmp[idx].value if idx < len(confirm_monthly_tmp) else 0.0
                    rate = (conf_value / item.value * 100) if item.value > 0 else 0.0
                    adoption_monthly.append(GccAdoptionMonthlyPoint(month=item.month, rate=rate))
            sales_monthly = build_monthly_totals(filtered_sales, last12_months, "총매출") if include_sales else []
            request_monthly = build_monthly_totals(filtered_request, last12_months) if include_request else []
            confirm_monthly = build_monthly_totals(filtered_confirm, last12_months) if include_confirm else []
            first_in_monthly = build_monthly_totals(filtered_first_in, last12_months) if include_first_in else []
        else:
            summary_sales = []
            summary_first_in = []
            summary_request = []
            strategic_sales = []
            summary_sc_mu_first_in = empty_sc_mu
            summary_sc_mu_request = empty_sc_mu
            adoption_rates = []
            adoption_monthly = []
            sales_monthly = []
            request_monthly = []
            confirm_monthly = []
            first_in_monthly = []

        if include_summary2:
            summary2_year, summary2_month = SUMMARY2_TARGET
            if req.summary2_month:
                try:
                    year_str, month_str = req.summary2_month.split("-")
                    summary2_year = int(year_str)
                    summary2_month = int(month_str)
                except ValueError:
                    pass
            summary2_month_label = f"{summary2_year}-{str(summary2_month).zfill(2)}"
            summary2_sales = build_category_series(summary2_sales_rows, summary2_year, summary2_month, "총매출")
            summary2_first_in = build_category_series(summary2_first_in_rows, summary2_year, summary2_month)
            summary2_request = build_category_series(summary2_request_rows, summary2_year, summary2_month)
            summary2_strategic_sales = build_strategic_sales(summary2_sales_rows, summary2_year, summary2_month)
            summary2_sc_mu_first_in = build_sc_mu_totals_by_subcategory(
                summary2_first_in_rows,
                summary2_year,
                summary2_month,
            )
            summary2_sc_mu_request = build_sc_mu_totals_by_subcategory(
                summary2_request_rows,
                summary2_year,
                summary2_month,
            )
            summary2_adoption_rates = build_summary2_adoption_rates(
                summary2_request_rows,
                summary2_confirm_rows,
                summary2_year,
                summary2_month,
            )
            summary2_request_total = sum(
                1 for r in summary2_request_rows if to_year_month(r) == (summary2_year, summary2_month)
            )
            summary2_confirm_total = sum(
                1 for r in summary2_confirm_rows if to_year_month(r) == (summary2_year, summary2_month)
            )
        else:
            summary2_month_label = None
            summary2_sales = []
            summary2_first_in = []
            summary2_request = []
            summary2_strategic_sales = []
            summary2_sc_mu_first_in = empty_sc_mu
            summary2_sc_mu_request = empty_sc_mu
            summary2_adoption_rates = []
            summary2_request_total = None
            summary2_confirm_total = None

        sales_category_totals = build_category_totals(filtered_sales, "총매출") if include_sales else []
        request_category_totals = build_category_totals(filtered_request) if include_request else []
        confirm_category_totals = build_category_totals(filtered_confirm) if include_confirm else []
        first_in_category_totals = build_category_totals(filtered_first_in) if include_first_in else []

        sales_customer_top = build_top_series(filtered_sales, "고객사명", "총매출", limit=8) if include_sales else []
        sales_product_top = build_top_series(filtered_sales, "품목명", "총매출", limit=10) if include_sales else []

        request_customer_top = build_top_series(filtered_request, "고객사명", limit=8) if include_request else []
        request_status_top = build_top_series(filtered_request, "개발상태", limit=8) if include_request else []
        request_company_top = build_top_series(filtered_request, "의뢰법인", limit=6) if include_request else []

        confirm_team_top = build_top_series(filtered_confirm, "담당자팀", limit=8) if include_confirm else []
        confirm_company_top = build_top_series(filtered_confirm, "법인", limit=4) if include_confirm else []

        first_in_manager_top = build_top_series(filtered_first_in, "담당자", limit=8) if include_first_in else []
        first_in_hicc_top = build_top_series(filtered_first_in, "HICC여부", limit=3) if include_first_in else []

        # Calculate sales trend (월별 매출 추이)
        sales_trend_data = None
        if include_sales and not req.category:  # Only calculate when no category filter (to show all compids)
            from collections import defaultdict

            # Group by compid and month
            compid_month_revenue: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))

            for r in filtered_sales:
                compid_val = int(safe_number(r.get('compid')))
                year = normalize_label(r.get('년'))
                month = normalize_label(r.get('월'))

                if not year or not month or compid_val == 0:
                    continue

                # Create month key: "2024-01", "2024-02", etc.
                month_key = f"{year}-{month.zfill(2)}"
                revenue = safe_number(r.get('총매출'))

                compid_month_revenue[compid_val][month_key] += revenue

            # Convert to response format
            compid_labels = {
                1200: '한국',
                5100: '상해',
                5200: '광저우',
                6400: '미국법인',
                7100: '인도네시아',
                7200: '태국',
                9200: '잇센',
            }

            sales_trend_dict = {}
            for compid_val, compid_label in compid_labels.items():
                if compid_val in compid_month_revenue:
                    months_data = compid_month_revenue[compid_val]
                    # Sort by month and convert to list of points
                    sorted_months = sorted(months_data.items())
                    sales_trend_dict[compid_label] = [
                        GccSalesTrendPoint(month=month, revenue=revenue)
                        for month, revenue in sorted_months
                    ]
                else:
                    sales_trend_dict[compid_label] = []

            sales_trend_data = GccSalesTrend(**sales_trend_dict)

        # Calculate sales growth (성장률)
        sales_growth_data = None
        if include_sales and not req.category:  # Only calculate when no category filter
            from collections import defaultdict

            # Find latest year/month dynamically from sales data
            available_years = sorted({
                int(normalize_label(r.get('년')))
                for r in filtered_sales
                if normalize_label(r.get('년'))
            })
            latest_year = available_years[-1] if available_years else None
            prev_year = (latest_year - 1) if latest_year else None
            months_latest_year = [
                int(normalize_label(r.get('월')))
                for r in filtered_sales
                if latest_year and normalize_label(r.get('년')) == str(latest_year) and r.get('월')
            ]
            latest_month = max(months_latest_year) if months_latest_year else None

            compid_labels = {
                1200: '한국',
                5100: '상해',
                5200: '광저우',
                6400: '미국법인',
                7100: '인도네시아',
                7200: '태국',
                9200: '잇센',
            }
            company_growths = []

            if latest_year and latest_month:
                for compid_val, company_name in compid_labels.items():
                    month_prev = sum(
                        safe_number(r.get('총매출'))
                        for r in filtered_sales
                        if (int(safe_number(r.get('compid'))) == compid_val
                            and prev_year is not None
                            and normalize_label(r.get('년')) == str(prev_year)
                            and int(safe_number(r.get('월'))) == latest_month)
                    )

                    month_curr = sum(
                        safe_number(r.get('총매출'))
                        for r in filtered_sales
                        if (int(safe_number(r.get('compid'))) == compid_val
                            and normalize_label(r.get('년')) == str(latest_year)
                            and int(safe_number(r.get('월'))) == latest_month)
                    )

                    # Calculate cumulative revenue (1월 ~ latest_month)
                    cumulative_prev = sum(
                        safe_number(r.get('총매출'))
                        for r in filtered_sales
                        if (int(safe_number(r.get('compid'))) == compid_val
                            and prev_year is not None
                            and normalize_label(r.get('년')) == str(prev_year)
                            and int(safe_number(r.get('월'))) <= latest_month)
                    )

                    cumulative_curr = sum(
                        safe_number(r.get('총매출'))
                        for r in filtered_sales
                        if (int(safe_number(r.get('compid'))) == compid_val
                            and normalize_label(r.get('년')) == str(latest_year)
                            and int(safe_number(r.get('월'))) <= latest_month)
                    )

                    # Calculate growth rates
                    month_growth = ((month_curr - month_prev) / month_prev * 100) if month_prev > 0 else 0
                    cumulative_growth = ((cumulative_curr - cumulative_prev) / cumulative_prev * 100) if cumulative_prev > 0 else 0

                    company_growths.append(GccCompanyGrowth(
                        company=company_name,
                        month_2024=month_prev,
                        month_2025=month_curr,
                        month_growth=month_growth,
                        cumulative_2024=cumulative_prev,
                        cumulative_2025=cumulative_curr,
                        cumulative_growth=cumulative_growth
                    ))

            sales_growth_data = (
                GccSalesGrowth(
                    latest_month=f"{latest_year}-{str(latest_month).zfill(2)}",
                    companies=company_growths
                )
                if latest_year and latest_month
                else None
            )

        # Calculate monthly count data (Phase 5, 6, 7)
        def calculate_monthly_count(rows: list[dict[str, object]]) -> GccMonthlyCountData:
            from collections import defaultdict

            # Group by year-month
            month_counts: dict[str, int] = defaultdict(int)

            for r in rows:
                year = normalize_label(r.get('년'))
                month = normalize_label(r.get('월'))

                if not year or not month:
                    continue

                month_key = f"{year}-{month.zfill(2)}"
                month_counts[month_key] += 1

            # Sort by month and calculate cumulative
            sorted_months = sorted(month_counts.items())
            cumulative = 0
            points = []

            for month, count in sorted_months:
                cumulative += count
                points.append(GccMonthlyCountPoint(
                    month=month,
                    count=count,
                    cumulative=cumulative
                ))

            return GccMonthlyCountData(points=points)

        first_in_count_data = calculate_monthly_count(filtered_first_in) if include_first_in and not req.category else None
        confirm_count_data = calculate_monthly_count(filtered_confirm) if include_confirm and not req.category else None
        request_count_data = calculate_monthly_count(filtered_request) if include_request and not req.category else None

        # Calculate YoY comparison data
        def calculate_yoy_comparison(
            rows: list[dict[str, object]],
            value_key: str | None = None  # None for count, string for sum
        ) -> GccYoyComparisonData | None:
            from collections import defaultdict

            # Group by year and month
            year_month_values: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

            for r in rows:
                year = normalize_label(r.get('년'))
                month = normalize_label(r.get('월'))

                if not year or not month:
                    continue

                month_num = month.zfill(2)

                if value_key:
                    # Sum values
                    year_month_values[year][month_num] += safe_number(r.get(value_key))
                else:
                    # Count rows
                    year_month_values[year][month_num] += 1

            # Find the two most recent years
            available_years = sorted(year_month_values.keys(), reverse=True)
            if len(available_years) < 2:
                return None

            curr_year = available_years[0]
            prev_year = available_years[1]

            # Build comparison points
            points = []
            curr_year_data = year_month_values[curr_year]
            prev_year_data = year_month_values[prev_year]

            # Get all months that exist in either year
            all_months = sorted(set(curr_year_data.keys()) | set(prev_year_data.keys()))

            for month in all_months:
                prev_val = prev_year_data.get(month, 0)
                curr_val = curr_year_data.get(month, 0)
                growth_rate = ((curr_val - prev_val) / prev_val * 100) if prev_val > 0 else 0

                points.append(GccYoyComparisonPoint(
                    month=month,
                    prev_year=prev_val,
                    curr_year=curr_val,
                    growth_rate=growth_rate
                ))

            return GccYoyComparisonData(
                prev_year_label=prev_year,
                curr_year_label=curr_year,
                points=points
            )

        sales_yoy_data = calculate_yoy_comparison(filtered_sales, '총매출') if include_sales and not req.category else None
        first_in_yoy_data = calculate_yoy_comparison(filtered_first_in) if include_first_in and not req.category else None
        confirm_yoy_data = calculate_yoy_comparison(filtered_confirm) if include_confirm and not req.category else None
        request_yoy_data = calculate_yoy_comparison(filtered_request) if include_request and not req.category else None

        # Research Performance (연구경영) data
        research_kpis = None
        research_monthly = []
        research_category_comparison = []

        if include_research and latest:
            from app.schemas.dashboard_schema import GccResearchKpis, GccResearchMonthlyPoint, GccResearchCategoryItem

            # Use summary2_month if provided, otherwise use latest
            research_year, research_month = latest
            if req.summary2_month:
                try:
                    year_str, month_str = req.summary2_month.split("-")
                    research_year = int(year_str)
                    research_month = int(month_str)
                except ValueError:
                    pass

            latest_year, latest_month = research_year, research_month
            prev_year = latest_year - 1
            prev_month_year = latest_year if latest_month > 1 else latest_year - 1
            prev_month_num = latest_month - 1 if latest_month > 1 else 12

            # Use summary2 filtered data for research (respects compid filter)
            research_request = summary2_request_rows
            research_confirm = summary2_confirm_rows

            # Calculate KPIs (current month, prev year same month, prev month)
            curr_request = sum(1 for r in research_request if to_year_month(r) == (latest_year, latest_month))
            curr_confirm = sum(1 for r in research_confirm if to_year_month(r) == (latest_year, latest_month))
            print(f"[DEBUG] curr_request (year={latest_year}, month={latest_month}): {curr_request}")
            print(f"[DEBUG] curr_confirm (year={latest_year}, month={latest_month}): {curr_confirm}")

            # Sample first 5 rows to check data structure
            if len(research_request) > 0:
                sample = list(research_request)[:3]
                for i, r in enumerate(sample):
                    ym = to_year_month(r)
                    print(f"[DEBUG] Sample request {i}: 년={r.get('년')}, 월={r.get('월')}, to_year_month={ym}")

            curr_adoption = (curr_confirm / curr_request * 100) if curr_request > 0 else 0.0

            prev_year_request = sum(1 for r in research_request if to_year_month(r) == (prev_year, latest_month))
            prev_year_confirm = sum(1 for r in research_confirm if to_year_month(r) == (prev_year, latest_month))
            prev_year_adoption = (prev_year_confirm / prev_year_request * 100) if prev_year_request > 0 else 0.0

            prev_month_request = sum(1 for r in research_request if to_year_month(r) == (prev_month_year, prev_month_num))
            prev_month_confirm = sum(1 for r in research_confirm if to_year_month(r) == (prev_month_year, prev_month_num))
            prev_month_adoption = (prev_month_confirm / prev_month_request * 100) if prev_month_request > 0 else 0.0

            # Calculate 12-month average adoption rate
            last12_months = build_month_range(latest, 12)
            adoption_rates_12m = []
            for month_str in last12_months:
                y, m = int(month_str[:4]), int(month_str[5:7])
                req = sum(1 for r in research_request if to_year_month(r) == (y, m))
                conf = sum(1 for r in research_confirm if to_year_month(r) == (y, m))
                adoption_rates_12m.append((conf / req * 100) if req > 0 else 0.0)
            avg_adoption = sum(adoption_rates_12m) / len(adoption_rates_12m) if adoption_rates_12m else 0.0

            research_kpis = GccResearchKpis(
                request_count=curr_request,
                request_yoy=curr_request - prev_year_request,
                request_mom=curr_request - prev_month_request,
                confirm_count=curr_confirm,
                confirm_yoy=curr_confirm - prev_year_confirm,
                confirm_mom=curr_confirm - prev_month_confirm,
                adoption_rate=curr_adoption,
                adoption_yoy=curr_adoption - prev_year_adoption,
                adoption_mom=curr_adoption - prev_month_adoption,
                avg_adoption_rate=avg_adoption
            )

            # Monthly trend (12 months)
            for month_str in last12_months:
                y, m = int(month_str[:4]), int(month_str[5:7])
                req = sum(1 for r in research_request if to_year_month(r) == (y, m))
                conf = sum(1 for r in research_confirm if to_year_month(r) == (y, m))
                adoption = (conf / req * 100) if req > 0 else 0.0
                research_monthly.append(GccResearchMonthlyPoint(
                    month=month_str,
                    request_count=req,
                    confirm_count=conf,
                    adoption_rate=adoption
                ))

            # Category comparison (current month vs prev year same month, cumulative)
            for key, label in CATEGORY_ORDER:
                # Current month
                curr_cat_req = sum(
                    1 for r in research_request
                    if to_year_month(r) == (latest_year, latest_month) and normalize_label(r.get("카테고리(2308)")) == key
                )
                # Prev year same month
                prev_cat_req = sum(
                    1 for r in research_request
                    if to_year_month(r) == (prev_year, latest_month) and normalize_label(r.get("카테고리(2308)")) == key
                )
                # Current year cumulative
                curr_cumulative = sum(
                    1 for r in research_request
                    if to_year_month(r) and to_year_month(r)[0] == latest_year
                    and to_year_month(r)[1] <= latest_month
                    and normalize_label(r.get("카테고리(2308)")) == key
                )
                # Prev year cumulative
                prev_cumulative = sum(
                    1 for r in research_request
                    if to_year_month(r) and to_year_month(r)[0] == prev_year
                    and to_year_month(r)[1] <= latest_month
                    and normalize_label(r.get("카테고리(2308)")) == key
                )
                research_category_comparison.append(GccResearchCategoryItem(
                    category=label,
                    prev_month=prev_cat_req,
                    curr_month=curr_cat_req,
                    prev_cumulative=prev_cumulative,
                    curr_cumulative=curr_cumulative
                ))

        result = GccAggregatedDataResponse(
            dashboardKey="gcc",
            salesSnapshotDate=sales_snapshot_date,
            otherSnapshotDate=other_snapshot_date,
            latestMonth=latest_month_label,
            hasData=has_data,
            filterOptions=GccFilterOptions(
                years=years,
                months=months,
                periods=periods,
                compids=compids,
                categories=categories
            ),
            kpis=GccKpis(
                총매출=총매출,
                초도건수=초도건수,
                확정건수=확정건수,
                의뢰건수=의뢰건수
            ),
            summarySales=summary_sales,
            summaryFirstIn=summary_first_in,
            summaryRequest=summary_request,
            strategicSales=strategic_sales,
            summaryScMuFirstIn=summary_sc_mu_first_in,
            summaryScMuRequest=summary_sc_mu_request,
            adoptionRates=adoption_rates,
            adoptionMonthly=adoption_monthly,
            salesMonthly=sales_monthly,
            salesCategoryTotals=sales_category_totals,
            salesCustomerTop=sales_customer_top,
            salesProductTop=sales_product_top,
            requestMonthly=request_monthly,
            requestCategoryTotals=request_category_totals,
            requestCustomerTop=request_customer_top,
            requestStatusTop=request_status_top,
            requestCompanyTop=request_company_top,
            confirmMonthly=confirm_monthly,
            confirmCategoryTotals=confirm_category_totals,
            confirmTeamTop=confirm_team_top,
            confirmCompanyTop=confirm_company_top,
            firstInMonthly=first_in_monthly,
            firstInCategoryTotals=first_in_category_totals,
            firstInManagerTop=first_in_manager_top,
            firstInHiccTop=first_in_hicc_top,
            salesTrend=sales_trend_data,
            salesGrowth=sales_growth_data,
            salesYoy=sales_yoy_data,
            firstInCount=first_in_count_data,
            firstInYoy=first_in_yoy_data,
            confirmCount=confirm_count_data,
            confirmYoy=confirm_yoy_data,
            requestCount=request_count_data,
            requestYoy=request_yoy_data,
            summary2Month=summary2_month_label,
            summary2Sales=summary2_sales,
            summary2FirstIn=summary2_first_in,
            summary2Request=summary2_request,
            summary2StrategicSales=summary2_strategic_sales,
            summary2ScMuFirstIn=summary2_sc_mu_first_in,
            summary2ScMuRequest=summary2_sc_mu_request,
            summary2AdoptionRates=summary2_adoption_rates,
            summary2RequestTotal=summary2_request_total,
            summary2ConfirmTotal=summary2_confirm_total,
            researchKpis=research_kpis,
            researchMonthly=research_monthly,
            researchCategoryComparison=research_category_comparison,
        )
        print(f"[GCC] Total time: {time.time() - start:.2f}s")
        return result
