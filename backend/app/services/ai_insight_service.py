from __future__ import annotations

import json
import os
from typing import Iterable

import boto3

from app.core.config import settings
from app.schemas.dashboard_schema import HealthFunctionMetrics


# Model configuration (using same model as ai_editor)
MODEL_ALIASES = {
    "claude_sonnet": "anthropic.claude-3-5-sonnet-20240620-v1:0",  # Claude 3.5 Sonnet v1 (same as ai_editor)
    "claude_haiku": "anthropic.claude-3-haiku-20240307-v1:0",
    "claude_opus": "anthropic.claude-3-opus-20240229-v1:0",
}
DEFAULT_MODEL_ALIAS = "claude_sonnet"


def _resolve_bedrock_model(model: str | None) -> str:
    if not model:
        return MODEL_ALIASES[DEFAULT_MODEL_ALIAS]
    key = model.strip()
    alias = MODEL_ALIASES.get(key.lower())
    return alias or key


BEDROCK_MODEL = _resolve_bedrock_model(os.getenv("BEDROCK_MODEL") or DEFAULT_MODEL_ALIAS)
BEDROCK_REGION = os.getenv("BEDROCK_REGION", settings.aws_region)


def _format_eok(value: float) -> str:
    rounded = int(round(value / 100_000_000))
    return f"{rounded:,}억"


def _list_pairs(items: Iterable[tuple[str, str]], limit: int = 5) -> str:
    pairs = list(items)[:limit]
    if not pairs:
        return "-"
    return "; ".join([f"{name}({val})" for name, val in pairs])


def build_health_function_prompt(
    metrics: HealthFunctionMetrics,
    snapshot_date: str | None,
    yoy_sales: float | None = None,
    yoy_op: float | None = None,
    target_sales: float | None = None,
    target_op: float | None = None,
    year: str | None = None,
    quarter: str | None = None,
    month: int | None = None,
) -> str:
    """개선된 AI 분석 프롬프트를 생성합니다 (B2B 제조업 경영 참모 버전)."""

    by_period = metrics.byPeriod[-6:] if metrics.byPeriod else []
    profit_by_period = metrics.profitByPeriod[-6:] if metrics.profitByPeriod else []

    # Combine period data with profit metrics
    period_lines = []
    for i, row in enumerate(by_period):
        base_line = f"{row.name}: 매출 {_format_eok(row.sales)}, 영업이익 {_format_eok(row.op)}"
        if i < len(profit_by_period) and profit_by_period[i].name == row.name:
            profit_row = profit_by_period[i]
            base_line += f", GP {_format_eok(profit_row.grossProfit)}, CM {_format_eok(profit_row.contribution)}"
        period_lines.append(base_line)

    top_customers = _list_pairs(
        [(row.name, _format_eok(row.sales)) for row in metrics.customerPerformance],
        limit=5,
    )
    top_products = _list_pairs(
        [(row.name, _format_eok(row.sales)) for row in metrics.productPerformance],
        limit=5,
    )
    top_channels = _list_pairs(
        [
            (row.name, f"{_format_eok(row.sales)}, OPM {row.opm:.1f}%")
            for row in metrics.channelPerformance
        ],
        limit=5,
    )

    # ── 증감률 계산 헬퍼 ──
    def _calc_rate(current: float, base: float | None) -> float | None:
        if base is None or base == 0:
            return None
        return ((current - base) / abs(base)) * 100

    # ── YoY / 목표 달성률 블록 생성 ──
    comparison_block = ""

    if yoy_sales is not None or yoy_op is not None:
        yoy_sales_rate = _calc_rate(metrics.totalSales, yoy_sales)
        yoy_op_rate = _calc_rate(metrics.totalOP, yoy_op)
        comparison_block += "\n[전년동기(YoY) 비교]\n"
        if yoy_sales is not None:
            comparison_block += f"전년동기 매출: {_format_eok(yoy_sales)}"
            if yoy_sales_rate is not None:
                comparison_block += f" (YoY: {yoy_sales_rate:+.1f}%)"
            comparison_block += "\n"
        if yoy_op is not None:
            comparison_block += f"전년동기 영업이익: {_format_eok(yoy_op)}"
            if yoy_op_rate is not None:
                comparison_block += f" (YoY: {yoy_op_rate:+.1f}%)"
            comparison_block += "\n"

    if target_sales is not None or target_op is not None:
        comparison_block += "\n[목표 대비 달성률]\n"
        if target_sales is not None:
            ach_s = (metrics.totalSales / target_sales) * 100 if target_sales > 0 else 0
            comparison_block += f"목표 매출: {_format_eok(target_sales)}, 달성률: {ach_s:.1f}%\n"
        if target_op is not None:
            ach_o = (metrics.totalOP / target_op) * 100 if target_op > 0 else 0
            comparison_block += f"목표 영업이익: {_format_eok(target_op)}, 달성률: {ach_o:.1f}%\n"

    # ── 기간 문구 생성 ──
    period_label = "당월 실적"
    if year and month:
        period_label = f"{year}년 {month}월 실적"
    elif year and quarter:
        period_label = f"{year}년 {quarter} 실적"
    elif year:
        period_label = f"{year}년 연간 실적"
    elif quarter:
        period_label = f"{quarter} 실적"
    elif month:
        period_label = f"{month}월 실적"

    # ── 메인 프롬프트 (개선된 버전) ──
    prompt = (
        # ===== 역할 정의 =====
        "당신은 B2B 제조업(건강기능식품) 전문 경영기획실 시니어 BI 애널리스트입니다.\n"
        "아래 데이터를 분석하여 경영진(임원) 브리핑용 인사이트를 JSON으로 반환하세요.\n\n"

        # ===== 분석 원칙 =====
        "[분석 원칙 - 반드시 준수]\n"
        "1. 숫자 단순 나열 금지. 모든 인사이트에는 반드시 '왜(원인)'와 '그래서(시사점)'를 포함할 것\n"
        "2. 전월 대비(MoM)·전년동기 대비(YoY)·목표 대비 중 가장 의미 있는 변동을 우선 분석할 것\n"
        "3. 고객사·제품·채널 축을 교차 분석하여 변동의 근본 원인을 추적할 것\n"
        "   예: 'A고객사 매출 하락 → B제품 수주 감소 → 해당 채널 OPM 동반 하락' 형태\n"
        "4. 손익 구조 분석 (매출 → GP → CM → OP)을 통해 수익성 개선 포인트를 구체적으로 제시할 것\n"
        "   - GPM 하락: 매출원가 상승 원인 분석 (원자재, 생산효율, 제품믹스 등)\n"
        "   - CM 악화: 판매가·운송비·판촉비 등 변동비 분석\n"
        "   - OPM 하락: 판관비 구조 및 고정비 부담 분석\n"
        "5. B2B 제조업 특성을 반영할 것: 고객 집중도 리스크, 원자재 가격, 계절성, 납기 등\n"
        "6. 경영진이 즉시 의사결정에 활용할 수 있도록 구체적이고 실행 가능한 제언을 할 것\n"
        "   나쁜 예: '매출 증대 방안을 모색해야 합니다'\n"
        "   좋은 예: 'A고객사 2분기 단가 재협상 시 OPM 2%p 회복 가능, 이번 주 내 미팅 제안 필요'\n\n"

        # ===== 출력 JSON 스키마 =====
        "출력 JSON 스키마:\n"
        "{\n"
        '  "executive_summary": string,\n'
        '  "key_insights": [\n'
        '    {\n'
        '      "title": string,\n'
        '      "detail": string,\n'
        '      "impact": "positive" | "negative" | "neutral",\n'
        '      "urgency": "high" | "medium" | "low"\n'
        '    }\n'
        '  ],\n'
        '  "risks": [\n'
        '    {\n'
        '      "risk": string,\n'
        '      "severity": "high" | "medium" | "low",\n'
        '      "mitigation": string\n'
        '    }\n'
        '  ],\n'
        '  "opportunities": [\n'
        '    {\n'
        '      "opportunity": string,\n'
        '      "potential_impact": string\n'
        '    }\n'
        '  ],\n'
        '  "action_items": [\n'
        '    {\n'
        '      "action": string,\n'
        '      "owner": string,\n'
        '      "timeline": string,\n'
        '      "priority": "즉시" | "이번주" | "이번달"\n'
        '    }\n'
        '  ],\n'
        '  "outlook": string\n'
        "}\n\n"

        # ===== 출력 규칙 =====
        "[출력 규칙]\n"
        "- executive_summary: 3~4문장. 핵심 성과 + 가장 주목할 변화 + 전체 판단\n"
        "- key_insights: 4~6개. urgency가 'high'인 것을 상위에 배치\n"
        "- risks: 2~3개. 각 리스크에 대응 방안(mitigation)을 반드시 포함\n"
        "- opportunities: 2~3개. 구체적 기대 효과(potential_impact)를 수치로 가능하면 추정\n"
        "- action_items: 2~4개. 담당 조직(owner)과 실행 시점(timeline)을 명시\n"
        "- outlook: 1~2문장. 현재 추세 지속 시 분기말/연말 예상 시사점\n"
        "- 매출/영업이익 숫자는 억 단위 반올림 후 천단위 콤마(예: 12,345억)\n"
        "- 증감률은 소수점 1자리까지 표시(예: +12.3%, -5.7%)\n"
        "- 한국어로 작성. JSON 외 텍스트 출력 금지\n\n"

        # ===== 데이터 섹션 =====
        "========== 데이터 ==========\n\n"
        f"스냅샷 날짜: {snapshot_date or 'latest'}\n"
        f"분석 기간: {period_label}\n\n"

        "[실적 - 상세 재무지표]\n"
        f"총매출: {_format_eok(metrics.totalSales)}\n"
        f"총 매출원가: {_format_eok(metrics.totalSalesCost)}\n"
        f"매출이익(GP): {_format_eok(metrics.totalGrossProfit)} (GPM: {metrics.grossMargin:.1f}%)\n"
        f"공헌이익(CM): {_format_eok(metrics.totalContribution)} (CM%: {metrics.contributionMargin:.1f}%)\n"
        f"판관비 計: {_format_eok(metrics.totalSGA)}\n"
        f"영업이익(OP): {_format_eok(metrics.totalOP)} (OPM: {metrics.opMargin:.1f}%)\n"
        f"제품매출원가: {_format_eok(metrics.totalDirectCost)}\n"
        f"{comparison_block}\n"

        "[고객사·제품·채널 분석]\n"
        f"Top 고객사(매출): {top_customers}\n"
        f"Top 제품(매출): {top_products}\n"
        f"Top 채널(매출/OPM): {top_channels}\n\n"

        "[추이 데이터 (최근 6개 기간)]\n"
        + "\n".join(period_lines)
        + "\n\n"
        "JSON만 출력하세요. 설명이나 추가 텍스트 없이."
    )
    return prompt


def call_bedrock(prompt: str) -> tuple[str, str]:
    """Use Bedrock Converse API (same as ai_editor)"""
    # Let boto3 automatically find credentials from environment variables or IAM role
    # Same behavior as ai_editor's BedrockRuntimeClient
    client = boto3.client(
        "bedrock-runtime",
        region_name=BEDROCK_REGION,
    )

    # Use Converse API instead of InvokeModel (same as ai_editor)
    response = client.converse(
        modelId=BEDROCK_MODEL,
        messages=[
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ],
        inferenceConfig={
            "maxTokens": 4096,
            "temperature": 0,
        }
    )

    # Extract text from Converse API response
    output = response.get("output", {})
    message = output.get("message", {})
    content_parts = message.get("content", [])

    text = "".join([
        part.get("text", "")
        for part in content_parts
        if isinstance(part.get("text"), str)
    ])

    if not text:
        raise RuntimeError("Empty response from Bedrock")

    return text, BEDROCK_MODEL


def _extract_json(text: str) -> dict:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found")
    return json.loads(text[start : end + 1])


def generate_health_function_insight(
    metrics: HealthFunctionMetrics,
    snapshot_date: str | None,
    yoy_sales: float | None = None,
    yoy_op: float | None = None,
    target_sales: float | None = None,
    target_op: float | None = None,
    year: str | None = None,
    quarter: str | None = None,
    month: int | None = None,
) -> tuple[dict, str, str | None]:
    """AI 인사이트 생성 (개선된 프롬프트 사용)."""
    prompt = build_health_function_prompt(
        metrics=metrics,
        snapshot_date=snapshot_date,
        yoy_sales=yoy_sales,
        yoy_op=yoy_op,
        target_sales=target_sales,
        target_op=target_op,
        year=year,
        quarter=quarter,
        month=month,
    )
    raw, model = call_bedrock(prompt)
    try:
        payload = _extract_json(raw)
    except Exception:
        # Fallback to old structure if parsing fails
        payload = {
            "executive_summary": raw.strip(),
            "key_insights": [],
            "risks": [],
            "opportunities": [],
            "action_items": [],
            "outlook": "",
        }
    return payload, model, raw
