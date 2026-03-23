from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.ai_schema import (
    AIInsightRequest,
    AIInsightResponse,
    KeyInsight,
    Risk,
    Opportunity,
    ActionItem,
)
from app.services.ai_insight_service import generate_health_function_insight
from app.services.health_function_service import HealthFunctionService

router = APIRouter(prefix="/dashboards", tags=["ai"])


@router.post(
    "/{dashboard_key}/ai/insight",
    response_model=AIInsightResponse,
    summary="AI 인사이트",
    description="대시보드 데이터를 기반으로 AI 인사이트를 제공합니다.",
)
async def ai_insight(
    dashboard_key: str,
    payload: AIInsightRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AIInsightResponse:
    if dashboard_key != "health-function":
        raise HTTPException(status_code=400, detail="AI insight not supported for this dashboard")

    service = HealthFunctionService(db=db)
    stats = await service.get_health_function_stats(
        dashboard_key=dashboard_key,
        snapshot_date=payload.snapshot_date,
        year=payload.year,
        quarter=payload.quarter,
        month=payload.month,
        customer=payload.customer,
        product=payload.product,
        form_type=payload.form_type,
        function=payload.function,
        biz_unit=payload.biz_unit,
        company_code=payload.company_code,
        evaluation_class=payload.evaluation_class,
        business_area=payload.business_area,
        sales_country=payload.sales_country,
        procurement_type=payload.procurement_type,
        distribution_channel=payload.distribution_channel,
        distribution_channel_detail=payload.distribution_channel_detail,
        food_type=payload.food_type,
        period_start=payload.period_start,
        period_end=payload.period_end,
    )

    try:
        # TODO: Add YoY and target data when available
        payload, model, raw = generate_health_function_insight(
            metrics=stats.metrics,
            snapshot_date=stats.snapshotDate.isoformat(),
            yoy_sales=None,  # TODO: Implement YoY data fetching
            yoy_op=None,
            target_sales=None,  # TODO: Implement target data fetching
            target_op=None,
            year=payload.year,
            quarter=payload.quarter,
            month=payload.month,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI insight generation failed: {exc}") from exc

    # Parse structured response
    def safe_parse_insights(data: list) -> list[KeyInsight]:
        result = []
        for item in data:
            if isinstance(item, dict):
                result.append(
                    KeyInsight(
                        title=str(item.get("title", "")),
                        detail=str(item.get("detail", "")),
                        impact=str(item.get("impact", "neutral")),
                        urgency=str(item.get("urgency", "low")),
                    )
                )
        return result

    def safe_parse_risks(data: list) -> list[Risk]:
        result = []
        for item in data:
            if isinstance(item, dict):
                result.append(
                    Risk(
                        risk=str(item.get("risk", "")),
                        severity=str(item.get("severity", "low")),
                        mitigation=str(item.get("mitigation", "")),
                    )
                )
        return result

    def safe_parse_opportunities(data: list) -> list[Opportunity]:
        result = []
        for item in data:
            if isinstance(item, dict):
                result.append(
                    Opportunity(
                        opportunity=str(item.get("opportunity", "")),
                        potential_impact=str(item.get("potential_impact", "")),
                    )
                )
        return result

    def safe_parse_actions(data: list) -> list[ActionItem]:
        result = []
        for item in data:
            if isinstance(item, dict):
                result.append(
                    ActionItem(
                        action=str(item.get("action", "")),
                        owner=str(item.get("owner", "")),
                        timeline=str(item.get("timeline", "")),
                        priority=str(item.get("priority", "이번달")),
                    )
                )
        return result

    return AIInsightResponse(
        model=model,
        executive_summary=str(payload.get("executive_summary", "")),
        key_insights=safe_parse_insights(payload.get("key_insights", [])),
        risks=safe_parse_risks(payload.get("risks", [])),
        opportunities=safe_parse_opportunities(payload.get("opportunities", [])),
        action_items=safe_parse_actions(payload.get("action_items", [])),
        outlook=str(payload.get("outlook", "")),
        raw=raw,
    )
