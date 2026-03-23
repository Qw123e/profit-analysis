from __future__ import annotations

from pydantic import BaseModel


class AIInsightRequest(BaseModel):
    snapshot_date: str | None = None
    year: str | None = None
    quarter: str | None = None
    month: int | None = None
    customer: str | None = None
    product: str | None = None
    form_type: str | None = None
    function: str | None = None
    biz_unit: str | None = None
    company_code: str | None = None
    evaluation_class: str | None = None
    business_area: str | None = None
    sales_country: str | None = None
    procurement_type: str | None = None
    distribution_channel: str | None = None
    distribution_channel_detail: str | None = None
    food_type: str | None = None
    period_start: int | None = None
    period_end: int | None = None


class KeyInsight(BaseModel):
    title: str
    detail: str
    impact: str  # "positive" | "negative" | "neutral"
    urgency: str  # "high" | "medium" | "low"


class Risk(BaseModel):
    risk: str
    severity: str  # "high" | "medium" | "low"
    mitigation: str


class Opportunity(BaseModel):
    opportunity: str
    potential_impact: str


class ActionItem(BaseModel):
    action: str
    owner: str
    timeline: str
    priority: str  # "즉시" | "이번주" | "이번달"


class AIInsightResponse(BaseModel):
    model: str
    executive_summary: str
    key_insights: list[KeyInsight]
    risks: list[Risk]
    opportunities: list[Opportunity]
    action_items: list[ActionItem]
    outlook: str
    raw: str | None = None
