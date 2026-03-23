from __future__ import annotations

from pydantic import BaseModel, Field


class TargetItem(BaseModel):
    """단일 월별 목표"""
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    sales_target: float = Field(default=0, ge=0)
    op_target: float = Field(default=0)
    company_code: str | None = None


class TargetUpdateRequest(BaseModel):
    """목표 저장 요청"""
    targets: list[TargetItem]


class TargetResponse(BaseModel):
    """단일 목표 응답"""
    year: int
    month: int
    sales_target: float
    op_target: float
    company_code: str | None = None

    class Config:
        from_attributes = True


class TargetListResponse(BaseModel):
    """목표 목록 응답"""
    dashboard_key: str
    targets: list[TargetResponse]


class ThresholdConfig(BaseModel):
    """KPI 신호등 임계값"""
    green_min: float = Field(default=100.0, ge=0, le=200)
    yellow_min: float = Field(default=90.0, ge=0, le=200)


class ThresholdResponse(BaseModel):
    """임계값 응답"""
    dashboard_key: str
    green_min: float
    yellow_min: float

    class Config:
        from_attributes = True
