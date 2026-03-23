from __future__ import annotations

from datetime import date as date_type

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    HealthFunctionFilterOptions,
    HealthFunctionGroupValue,
    HealthFunctionMetrics,
    HealthFunctionPerformanceValue,
    HealthFunctionPeriodValue,
    HealthFunctionPeriodCostValue,
    HealthFunctionPeriodProfitValue,
    HealthFunctionFormulationDetailValue,
    HealthFunctionStatsResponse,
)
from app.services.snapshot_service import SnapshotService
from app.utils.stats_utils import normalize_label as normalize_base_label
from app.utils.stats_utils import safe_number
from app.utils.errors import DashboardNotFoundError, InvalidSnapshotDateError
import math


def json_safe_float(value: float) -> float:
    """Convert NaN, Infinity to JSON-safe values."""
    if math.isnan(value) or math.isinf(value):
        return 0.0
    return value


# Exclusion filters (matching design_example/with-DA)
EXCLUDED_FOOD_TYPES = {'원재료', '부재료', '사용금지(확인필요)', 'No Data', ''}
ALLOWED_EVALUATION_CLASS = '7920'  # Only include product data (제품만 포함)


def compute_health_function_stats(
    rows: list[dict[str, object]],
    *,
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
    period_start: int | None = None,
    period_end: int | None = None,
    include_all_eval_class: bool = False,
) -> tuple[HealthFunctionFilterOptions, HealthFunctionMetrics]:
    def is_missing_label(value: object) -> bool:
        if value is None:
            return True
        if isinstance(value, float) and value != value:
            return True
        if isinstance(value, str):
            trimmed = value.strip()
            return not trimmed or trimmed.lower() == "none"
        return False

    def normalize_label(value: object) -> str:
        if isinstance(value, str):
            return value.strip()
        return normalize_base_label(value)

    available_keys = {key for row in rows for key in row.keys()} if rows else set()

    def resolve_key(primary: str, fallbacks: list[str]) -> str:
        for key in [primary, *fallbacks]:
            if key in available_keys:
                return key
        return primary

    form_type_key = resolve_key("제형", ["제품계층구조 내역", "제품계층구조", "제형별"])
    function_key = resolve_key(
        "기능카테고리",
        ["기능 카테고리", "기능별", "기능", "자재그룹 내역", "자재그룹", "제품계층구조 내역", "제품계층구조"],
    )
    biz_unit_key = resolve_key("영업부문 내역", ["영업부문"])
    company_code_key = resolve_key("회사코드", ["회사 코드", "법인코드", "법인 코드", "법인", "회사"])
    evaluation_class_key = resolve_key("평가클래스", ["평가 클래스"])
    business_area_key = resolve_key("영업부문 마스터", ["사업영역", "사업 영역"])
    sales_country_key = resolve_key("매출국가", ["매출 국가"])
    procurement_type_key = resolve_key("조달유형 내역", ["조달유형", "조달유형내역"])
    distribution_channel_key = resolve_key("유통경로", ["유통채널 내역", "유통채널내역", "유통채널내역2"])
    distribution_channel_detail_key = resolve_key("유통채널내역2", ["유통채널 내역", "유통채널내역"])
    food_type_key = resolve_key("상품타입", ["식품분류", "일반/건강"])
    function_category_key = resolve_key("기능카테고리", ["기능 카테고리", "기능별", "기능"])
    product_name_key = resolve_key("제품명", ["제품", "자재명", "제품명(표준)"])

    # PRE-FILTER: Apply evaluation_class filter BEFORE any other filters
    # This ensures only valid product data is used for filter options and metrics
    pre_filtered_rows = []
    for row in rows:
        # Conditionally exclude non-product data (evaluation_class != '7920')
        # Skip this filter if include_all_eval_class is True (for overview tab)
        if not include_all_eval_class:
            eval_class_value = row.get(evaluation_class_key)
            if eval_class_value:
                eval_class_normalized = normalize_label(eval_class_value)
                if eval_class_normalized != ALLOWED_EVALUATION_CLASS:
                    continue

        pre_filtered_rows.append(row)

    def collect_labels(key: str) -> list[str]:
        labels = {normalize_label(r.get(key)) for r in pre_filtered_rows if not is_missing_label(r.get(key))}
        return sorted(labels)

    periods = sorted(
        {
            int(safe_number(r.get("기간")))
            for r in pre_filtered_rows
            if safe_number(r.get("기간")) > 0
        }
    )
    min_period = periods[0] if periods else None
    max_period = periods[-1] if periods else None

    # Precompute normalized customer names to disambiguate commas in names.
    all_customers = {
        normalize_label(r.get("고객명"))
        for r in pre_filtered_rows
        if not is_missing_label(r.get("고객명"))
    }
    all_products = {
        normalize_label(r.get(product_name_key))
        for r in pre_filtered_rows
        if not is_missing_label(r.get(product_name_key))
    }

    # Debug flag for first request
    debug_printed = False

    def matches_filters(row: dict[str, object]) -> bool:
        nonlocal debug_printed

        # Note: evaluation_class and food_type filters are already applied in pre_filtered_rows
        # This function only applies user-selected filters

        if year:
            if is_missing_label(row.get("회계연도")):
                return False
            if normalize_label(row.get("회계연도")) != normalize_label(year):
                return False
        if quarter:
            if is_missing_label(row.get("분기")):
                return False
            if normalize_label(row.get("분기")) != normalize_label(quarter):
                return False
        if month is not None:
            # Month filter: "기간" column contains month number (1-12)
            period_value = row.get("기간")
            if is_missing_label(period_value):
                return False

            # Convert to integer month (1-12)
            row_month = int(safe_number(period_value))

            if row_month != month:
                return False
        if customer:
            # Support multiple customers separated by comma (OR condition),
            # but treat as a single customer if the full string matches.
            if is_missing_label(row.get("고객명")):
                return False
            normalized_customer = normalize_label(customer)
            if normalized_customer in all_customers:
                customer_list = [normalized_customer]
            else:
                customer_list = [normalize_label(c.strip()) for c in customer.split(",")]
            row_customer = normalize_label(row.get("고객명"))

            # Debug: Print the first few comparisons
            if not debug_printed and len(customer_list) > 1:
                import sys
                print(f"[DEBUG] Multi-customer filter: {customer_list}", file=sys.stderr)
                print(f"[DEBUG] Checking row customer: '{row_customer}'", file=sys.stderr)
                print(f"[DEBUG] Is in list? {row_customer in customer_list}", file=sys.stderr)
                debug_printed = True

            if row_customer not in customer_list:
                return False
        if product:
            if is_missing_label(row.get(product_name_key)):
                return False
            normalized_product = normalize_label(product)
            if normalized_product in all_products:
                product_list = [normalized_product]
            else:
                product_list = [normalize_label(p.strip()) for p in product.split(",")]
            if normalize_label(row.get(product_name_key)) not in product_list:
                return False
        if form_type:
            # Support multiple form types separated by comma (OR condition)
            if is_missing_label(row.get(form_type_key)):
                return False
            form_type_list = [normalize_label(ft) for ft in form_type.split(",")]
            if normalize_label(row.get(form_type_key)) not in form_type_list:
                return False
        if function:
            # Support multiple functions separated by comma (OR condition)
            if is_missing_label(row.get(function_key)):
                return False
            function_list = [normalize_label(f) for f in function.split(",")]
            if normalize_label(row.get(function_key)) not in function_list:
                return False
        if biz_unit:
            if is_missing_label(row.get(biz_unit_key)):
                return False
            if normalize_label(row.get(biz_unit_key)) != normalize_label(biz_unit):
                return False
        if company_code:
            if is_missing_label(row.get(company_code_key)):
                return False
            if normalize_label(row.get(company_code_key)) != normalize_label(company_code):
                return False
        if evaluation_class:
            if is_missing_label(row.get(evaluation_class_key)):
                return False
            if normalize_label(row.get(evaluation_class_key)) != normalize_label(evaluation_class):
                return False
        if business_area:
            if is_missing_label(row.get(business_area_key)):
                return False
            if normalize_label(row.get(business_area_key)) != normalize_label(business_area):
                return False
        if sales_country:
            # Support multiple sales countries separated by comma (OR condition)
            if is_missing_label(row.get(sales_country_key)):
                return False
            sales_country_list = [normalize_label(sc) for sc in sales_country.split(",")]
            if normalize_label(row.get(sales_country_key)) not in sales_country_list:
                return False
        if procurement_type:
            if is_missing_label(row.get(procurement_type_key)):
                return False
            if normalize_label(row.get(procurement_type_key)) != normalize_label(procurement_type):
                return False
        if distribution_channel:
            if is_missing_label(row.get(distribution_channel_key)):
                return False
            if normalize_label(row.get(distribution_channel_key)) != normalize_label(distribution_channel):
                return False
        if distribution_channel_detail:
            # Support multiple distribution channels separated by comma (OR condition)
            if is_missing_label(row.get(distribution_channel_detail_key)):
                return False
            distribution_channel_detail_list = [normalize_label(dcd) for dcd in distribution_channel_detail.split(",")]
            if normalize_label(row.get(distribution_channel_detail_key)) not in distribution_channel_detail_list:
                return False
        if food_type:
            # Support multiple food types separated by comma (OR condition)
            if is_missing_label(row.get(food_type_key)):
                return False
            food_type_list = [normalize_label(ft) for ft in food_type.split(",")]
            if normalize_label(row.get(food_type_key)) not in food_type_list:
                return False
        if period_start is not None or period_end is not None:
            period_val = safe_number(row.get("기간"))
            if period_start is not None and period_val < period_start:
                return False
            if period_end is not None and period_val > period_end:
                return False
        return True

    filtered_rows = [row for row in pre_filtered_rows if matches_filters(row)]

    # Determine sales column: "제품매출" for product-only tabs, "총매출" for overview
    sales_key = "총매출" if include_all_eval_class else "제품매출"

    total_sales = json_safe_float(sum(safe_number(r.get("총매출")) for r in filtered_rows))
    total_op = json_safe_float(sum(safe_number(r.get("영업이익")) for r in filtered_rows))
    op_margin = json_safe_float((total_op / total_sales * 100) if total_sales > 0 else 0.0)
    unique_customers = len(
        {
            normalize_label(r.get("고객명"))
            for r in filtered_rows
            if not is_missing_label(r.get("고객명"))
        }
    )

    def group_sum(group_key: str, value_key: str) -> dict[str, float]:
        acc: dict[str, float] = {}
        for r in filtered_rows:
            if is_missing_label(r.get(group_key)):
                key = "기타"
            else:
                key = normalize_label(r.get(group_key))
            value = safe_number(r.get(value_key))
            acc[key] = acc.get(key, 0.0) + value
        return {k: json_safe_float(v) for k, v in acc.items()}

    # Determine if we should show quarterly or monthly view
    # If year filter is not applied (None or empty), show quarterly aggregation
    # If year filter is applied, show monthly aggregation
    is_quarterly_view = not year or year.strip() == ""

    if is_quarterly_view:
        # Quarterly aggregation: group by "회계연도-분기"
        period_map: dict[str, dict[str, float]] = {}
        for r in filtered_rows:
            yr = normalize_label(r.get("회계연도"))
            qtr = normalize_label(r.get("분기"))
            if is_missing_label(r.get("회계연도")) or is_missing_label(r.get("분기")):
                continue
            key = f"{yr}-{qtr}"
            if key not in period_map:
                period_map[key] = {"sales": 0.0, "op": 0.0}
            period_map[key]["sales"] += safe_number(r.get("총매출"))
            period_map[key]["op"] += safe_number(r.get("영업이익"))
        by_period = [
            HealthFunctionPeriodValue(name=k, sales=json_safe_float(v["sales"]), op=json_safe_float(v["op"]))
            for k, v in sorted(period_map.items())
        ]
    else:
        # Monthly aggregation: group by "기간"
        sales_by_period = group_sum("기간", "총매출")
        op_by_period = group_sum("기간", "영업이익")
        period_map_monthly: dict[str, dict[str, float]] = {}
        for key, value in sales_by_period.items():
            period_map_monthly.setdefault(key, {"sales": 0.0, "op": 0.0})
            period_map_monthly[key]["sales"] = value
        for key, value in op_by_period.items():
            period_map_monthly.setdefault(key, {"sales": 0.0, "op": 0.0})
            period_map_monthly[key]["op"] = value
        # Format period labels as "N월"
        by_period = [
            HealthFunctionPeriodValue(name=f"{k}월", sales=v["sales"], op=v["op"])
            for k, v in sorted(period_map_monthly.items(), key=lambda item: safe_number(item[0]))
        ]

    def top_values(group_key: str) -> list[HealthFunctionGroupValue]:
        values = group_sum(group_key, "총매출")
        return [
            HealthFunctionGroupValue(name=k, value=v)
            for k, v in sorted(values.items(), key=lambda item: item[1], reverse=True)[:10]
        ]

    by_form_type = [
        HealthFunctionGroupValue(name=k, value=v)
        for k, v in group_sum(form_type_key, "총매출").items()
    ]
    by_function = [
        HealthFunctionGroupValue(name=k, value=v)
        for k, v in group_sum(function_key, "총매출").items()
    ]

    # Cost analysis metrics
    total_direct_cost = json_safe_float(sum(safe_number(r.get("직접원가")) for r in filtered_rows))
    total_sales_cost = json_safe_float(sum(safe_number(r.get("총 매출원가")) for r in filtered_rows))

    def group_sum_multi(group_key: str, value_keys: list[str]) -> dict[str, dict[str, float]]:
        acc: dict[str, dict[str, float]] = {}
        for r in filtered_rows:
            if is_missing_label(r.get(group_key)):
                key = "기타"
            else:
                key = normalize_label(r.get(group_key))
            if key not in acc:
                acc[key] = {vk: 0.0 for vk in value_keys}
            for vk in value_keys:
                acc[key][vk] += safe_number(r.get(vk))
        return {k: {vk: json_safe_float(v[vk]) for vk in value_keys} for k, v in acc.items()}

    def performance_by(group_key: str) -> list[HealthFunctionPerformanceValue]:
        # sales_key is defined at outer scope
        grouped = group_sum_multi(group_key, [sales_key, "공헌이익", "영업이익"])

        # Collect evaluation class for each group (use first occurrence)
        evaluation_classes: dict[str, str] = {}
        for r in filtered_rows:
            if is_missing_label(r.get(group_key)):
                key = "기타"
            else:
                key = normalize_label(r.get(group_key))
            if key not in evaluation_classes:
                eval_class_value = r.get(evaluation_class_key, "")
                # Safely convert to string and validate
                if eval_class_value and not is_missing_label(eval_class_value):
                    eval_class_str = str(eval_class_value).strip()
                    # Only use if it looks like a valid class name (not a number)
                    if eval_class_str and not eval_class_str.replace('.', '').replace('-', '').isdigit():
                        evaluation_classes[key] = eval_class_str
                    else:
                        evaluation_classes[key] = "Unknown"
                else:
                    evaluation_classes[key] = "Unknown"

        results: list[HealthFunctionPerformanceValue] = []
        for name, values in grouped.items():
            sales = values[sales_key]
            contribution_profit = values["공헌이익"]
            operating_profit = values["영업이익"]
            opm = (operating_profit / sales * 100) if sales > 0 else 0.0
            sales_ratio = (sales / total_sales * 100) if total_sales > 0 else 0.0

            # Determine evaluation class from data or calculate based on profit margin
            eval_class = evaluation_classes.get(name, "")
            if eval_class == "Unknown" or not eval_class:
                # Calculate grade based on operating profit margin
                if operating_profit < 0:
                    eval_class = "Loss"
                elif opm >= 10:
                    eval_class = "Mid"
                else:
                    eval_class = "Low"

            results.append(
                HealthFunctionPerformanceValue(
                    name=name,
                    value=sales,      # alias for backward compat with GroupValue
                    sales=sales,
                    contributionProfit=contribution_profit,
                    operatingProfit=operating_profit,
                    opm=json_safe_float(opm),
                    evaluationClass=eval_class,
                    salesRatio=json_safe_float(sales_ratio),
                )
            )
        return sorted(results, key=lambda item: item.sales, reverse=True)

    def formulation_detail_rows() -> list[HealthFunctionFormulationDetailValue]:
        acc: dict[tuple[str, str, str], dict[str, float]] = {}
        for r in filtered_rows:
            food = "기타" if is_missing_label(r.get(food_type_key)) else normalize_label(r.get(food_type_key))
            func = "기타" if is_missing_label(r.get(function_category_key)) else normalize_label(r.get(function_category_key))
            form = "기타" if is_missing_label(r.get(form_type_key)) else normalize_label(r.get(form_type_key))
            key = (food, func, form)
            if key not in acc:
                acc[key] = {"sales": 0.0, "op": 0.0}
            acc[key]["sales"] += safe_number(r.get(sales_key))
            acc[key]["op"] += safe_number(r.get("영업이익"))

        rows: list[HealthFunctionFormulationDetailValue] = []
        for (food, func, form), values in acc.items():
            sales = json_safe_float(values["sales"])
            op = json_safe_float(values["op"])
            opm = json_safe_float((op / sales * 100) if sales > 0 else 0.0)
            rows.append(
                HealthFunctionFormulationDetailValue(
                    foodType=food,
                    functionCategory=func,
                    formulation=form,
                    sales=sales,
                    operatingProfit=op,
                    opm=opm,
                )
            )
        return sorted(rows, key=lambda item: item.sales, reverse=True)

    if is_quarterly_view:
        # Quarterly aggregation for cost
        cost_period_map: dict[str, dict[str, float]] = {}
        for r in filtered_rows:
            yr = normalize_label(r.get("회계연도"))
            qtr = normalize_label(r.get("분기"))
            if is_missing_label(r.get("회계연도")) or is_missing_label(r.get("분기")):
                continue
            key = f"{yr}-{qtr}"
            if key not in cost_period_map:
                cost_period_map[key] = {"직접원가": 0.0, "원재료비": 0.0, "부재료비": 0.0, "노무비(변)": 0.0}
            cost_period_map[key]["직접원가"] += safe_number(r.get("직접원가"))
            cost_period_map[key]["원재료비"] += safe_number(r.get("원재료비"))
            cost_period_map[key]["부재료비"] += safe_number(r.get("부재료비"))
            cost_period_map[key]["노무비(변)"] += safe_number(r.get("노무비(변)"))
        cost_by_period = [
            HealthFunctionPeriodCostValue(
                name=k,
                directCost=json_safe_float(v["직접원가"]),
                rawMaterial=json_safe_float(v["원재료비"]),
                subMaterial=json_safe_float(v["부재료비"]),
                labor=json_safe_float(v["노무비(변)"])
            )
            for k, v in sorted(cost_period_map.items())
        ]
    else:
        # Monthly aggregation for cost
        cost_by_period_map = group_sum_multi("기간", ["직접원가", "원재료비", "부재료비", "노무비(변)"])
        cost_by_period = [
            HealthFunctionPeriodCostValue(
                name=f"{k}월",
                directCost=v["직접원가"],
                rawMaterial=v["원재료비"],
                subMaterial=v["부재료비"],
                labor=v["노무비(변)"]
            )
            for k, v in sorted(cost_by_period_map.items(), key=lambda item: safe_number(item[0]))
        ]

    def top_values_by_key(group_key: str, value_key: str) -> list[HealthFunctionGroupValue]:
        values = group_sum(group_key, value_key)
        return [
            HealthFunctionGroupValue(name=k, value=v)
            for k, v in sorted(values.items(), key=lambda item: item[1], reverse=True)[:10]
        ]

    cost_by_form_type = [
        HealthFunctionGroupValue(name=k, value=v)
        for k, v in group_sum(form_type_key, "직접원가").items()
    ]
    cost_by_function = [
        HealthFunctionGroupValue(name=k, value=v)
        for k, v in group_sum(function_key, "직접원가").items()
    ]

    # Profit analysis metrics
    total_gross_profit = json_safe_float(sum(safe_number(r.get("매출이익")) for r in filtered_rows))
    total_contribution = json_safe_float(sum(safe_number(r.get("공헌이익")) for r in filtered_rows))
    total_sga = json_safe_float(sum(safe_number(r.get("판관비 計")) for r in filtered_rows))
    gross_margin = json_safe_float((total_gross_profit / total_sales * 100) if total_sales > 0 else 0.0)
    contribution_margin = json_safe_float((total_contribution / total_sales * 100) if total_sales > 0 else 0.0)

    if is_quarterly_view:
        # Quarterly aggregation for profit
        profit_period_map: dict[str, dict[str, float]] = {}
        for r in filtered_rows:
            yr = normalize_label(r.get("회계연도"))
            qtr = normalize_label(r.get("분기"))
            if is_missing_label(r.get("회계연도")) or is_missing_label(r.get("분기")):
                continue
            key = f"{yr}-{qtr}"
            if key not in profit_period_map:
                profit_period_map[key] = {"매출이익": 0.0, "공헌이익": 0.0, "영업이익": 0.0, "총 매출원가": 0.0}
            profit_period_map[key]["매출이익"] += safe_number(r.get("매출이익"))
            profit_period_map[key]["공헌이익"] += safe_number(r.get("공헌이익"))
            profit_period_map[key]["영업이익"] += safe_number(r.get("영업이익"))
            profit_period_map[key]["총 매출원가"] += safe_number(r.get("총 매출원가"))
        profit_by_period = [
            HealthFunctionPeriodProfitValue(
                name=k,
                grossProfit=json_safe_float(v["매출이익"]),
                contribution=json_safe_float(v["공헌이익"]),
                op=json_safe_float(v["영업이익"]),
                salesCost=json_safe_float(v["총 매출원가"])
            )
            for k, v in sorted(profit_period_map.items())
        ]
    else:
        # Monthly aggregation for profit
        profit_by_period_map = group_sum_multi("기간", ["매출이익", "공헌이익", "영업이익", "총 매출원가"])
        profit_by_period = [
            HealthFunctionPeriodProfitValue(
                name=f"{k}월",
                grossProfit=v["매출이익"],
                contribution=v["공헌이익"],
                op=v["영업이익"],
                salesCost=v["총 매출원가"]
            )
            for k, v in sorted(profit_by_period_map.items(), key=lambda item: safe_number(item[0]))
        ]

    profit_by_form_type = [
        HealthFunctionGroupValue(name=k, value=v)
        for k, v in group_sum(form_type_key, "공헌이익").items()
    ]
    profit_by_function = [
        HealthFunctionGroupValue(name=k, value=v)
        for k, v in group_sum(function_key, "공헌이익").items()
    ]

    filter_options = HealthFunctionFilterOptions(
        years=collect_labels("회계연도"),
        quarters=collect_labels("분기"),
        customers=collect_labels("고객명"),
        formTypes=collect_labels(form_type_key),
        functions=collect_labels(function_key),
        bizUnits=collect_labels(biz_unit_key),
        companyCodes=collect_labels(company_code_key),
        evaluationClasses=collect_labels(evaluation_class_key),
        businessAreas=collect_labels(business_area_key),
        salesCountries=collect_labels(sales_country_key),
        procurementTypes=collect_labels(procurement_type_key),
        distributionChannels=collect_labels(distribution_channel_key),
        distributionChannelDetails=collect_labels(distribution_channel_detail_key),
        foodTypes=collect_labels(food_type_key),
        functionCategories=collect_labels(function_category_key),
        periods=periods,
        minPeriod=min_period,
        maxPeriod=max_period,
    )
    metrics = HealthFunctionMetrics(
        totalSales=total_sales,
        totalOP=total_op,
        opMargin=op_margin,
        uniqueCustomers=unique_customers,
        byPeriod=by_period,
        topProducts=top_values("제품명"),
        topCustomers=top_values("고객명"),
        byFormType=by_form_type,
        byFunction=by_function,
        # Cost metrics
        totalDirectCost=total_direct_cost,
        totalSalesCost=total_sales_cost,
        costByPeriod=cost_by_period,
        topProductsByCost=top_values_by_key("제품명", "직접원가"),
        topCustomersByCost=top_values_by_key("고객명", "직접원가"),
        costByFormType=cost_by_form_type,
        costByFunction=cost_by_function,
        # Profit metrics
        totalGrossProfit=total_gross_profit,
        totalContribution=total_contribution,
        totalSGA=total_sga,
        grossMargin=gross_margin,
        contributionMargin=contribution_margin,
        profitByPeriod=profit_by_period,
        topProductsByProfit=top_values_by_key("제품명", "공헌이익"),
        topCustomersByProfit=top_values_by_key("고객명", "공헌이익"),
        profitByFormType=profit_by_form_type,
        profitByFunction=profit_by_function,
        channelPerformance=performance_by(distribution_channel_detail_key),
        customerPerformance=performance_by("고객명"),
        productPerformance=performance_by("제품명"),
        salesByCountry=sorted(
            performance_by(sales_country_key),
            key=lambda x: x.sales,
            reverse=True
        )[:12],
        byFoodType=[
            HealthFunctionGroupValue(name=k, value=v)
            for k, v in group_sum(food_type_key, "총매출").items()
        ],
        byFunctionCategory=performance_by(function_category_key),  # Now includes OPM calculation
        formulationDetail=formulation_detail_rows(),
    )
    return filter_options, metrics


class HealthFunctionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.dashboard_repo = DashboardRepository(db=db)
        self.snapshot_service = SnapshotService(db=db)

    async def get_health_function_stats(
        self,
        dashboard_key: str,
        snapshot_date: str | None,
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
        period_start: int | None = None,
        period_end: int | None = None,
        include_all_eval_class: bool = False,
    ) -> HealthFunctionStatsResponse:
        dashboard = await self.dashboard_repo.get_by_key(dashboard_key)
        if dashboard is None:
            raise DashboardNotFoundError(f"Unknown dashboard: {dashboard_key}")

        try:
            selected_date = date_type.fromisoformat(snapshot_date) if snapshot_date else None
        except ValueError as e:
            raise InvalidSnapshotDateError(f"Invalid date format: {snapshot_date}") from e

        snapshot_date_resolved, feed = await self.snapshot_service.fetch_snapshot_feed(
            dashboard_id=dashboard.id,
            snapshot_date=selected_date,
            feed_key=feed_key,
        )

        rows = [
            {col: row[idx] if idx < len(row) else None for idx, col in enumerate(feed.columns)}
            for row in feed.rows
        ]
        filter_options, metrics = compute_health_function_stats(
            rows,
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

        return HealthFunctionStatsResponse(
            dashboardKey=dashboard.key,
            feedKey=feed_key,
            snapshotDate=snapshot_date_resolved,
            filterOptions=filter_options,
            metrics=metrics,
        )
