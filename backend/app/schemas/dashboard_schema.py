from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class DashboardCreateRequest(BaseModel):
    key: str = Field(..., pattern=r"^[a-z0-9-]+$", min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    is_public: bool = False


class DashboardUpdateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    is_public: bool | None = None


class DashboardItem(BaseModel):
    key: str
    name: str
    description: str | None = None
    is_public: bool = False


class DashboardListResponse(BaseModel):
    items: list[DashboardItem]


class SnapshotFeed(BaseModel):
    columns: list[str]
    rows: list[list[Any]]


class DashboardSnapshotResponse(BaseModel):
    dashboardKey: str
    snapshotDate: date
    generatedAt: datetime | None = None
    feeds: dict[str, SnapshotFeed]


class SnapshotPreviewResponse(BaseModel):
    dashboardKey: str
    snapshotDate: date
    feedKey: str
    offset: int
    limit: int
    totalRows: int
    columns: list[str]
    rows: list[list[Any]]


class SnapshotIndexEntry(BaseModel):
    feedKey: str
    uri: str


class SnapshotIndexItem(BaseModel):
    snapshotDate: str
    feeds: list[SnapshotIndexEntry]


class DashboardSnapshotListResponse(BaseModel):
    dashboardKey: str
    snapshots: list[SnapshotIndexItem]


class DirectSnapshotUploadRequest(BaseModel):
    """Direct JSON data upload for test queries"""
    feed_key: str = Field(..., min_length=1, max_length=100)
    snapshot_date: str | None = None
    columns: list[str]
    rows: list[list[Any]]


class FilterOptions(BaseModel):
    years: list[str]
    quarters: list[str]
    countries: list[str]
    customers: list[str]
    groups: list[str]
    eval_classes: list[str]
    products: list[str]


class HealthFunctionGroupValue(BaseModel):
    name: str
    value: float


class HealthFunctionPeriodValue(BaseModel):
    name: str
    sales: float
    op: float
    salesTarget: float | None = None
    opTarget: float | None = None


class HealthFunctionPeriodCostValue(BaseModel):
    name: str
    directCost: float
    rawMaterial: float
    subMaterial: float
    labor: float

class HealthFunctionPeriodProfitValue(BaseModel):
    name: str
    grossProfit: float
    contribution: float
    op: float
    salesCost: float

class HealthFunctionPerformanceValue(BaseModel):
    name: str
    value: float       # alias for sales (backward compat with HealthFunctionGroupValue)
    sales: float
    contributionProfit: float
    operatingProfit: float
    opm: float
    evaluationClass: str
    salesRatio: float


class HealthFunctionFormulationDetailValue(BaseModel):
    foodType: str
    functionCategory: str
    formulation: str
    sales: float
    operatingProfit: float
    opm: float

class HealthFunctionMetrics(BaseModel):
    totalSales: float
    totalOP: float
    opMargin: float
    uniqueCustomers: int
    byPeriod: list[HealthFunctionPeriodValue]
    topProducts: list[HealthFunctionGroupValue]
    topCustomers: list[HealthFunctionGroupValue]
    byFormType: list[HealthFunctionGroupValue]
    byFunction: list[HealthFunctionGroupValue]
    # Cost analysis metrics
    totalDirectCost: float
    totalSalesCost: float
    costByPeriod: list[HealthFunctionPeriodCostValue]
    topProductsByCost: list[HealthFunctionGroupValue]
    topCustomersByCost: list[HealthFunctionGroupValue]
    costByFormType: list[HealthFunctionGroupValue]
    costByFunction: list[HealthFunctionGroupValue]
    # Profit analysis metrics
    totalGrossProfit: float
    totalContribution: float
    totalSGA: float
    grossMargin: float
    contributionMargin: float
    profitByPeriod: list[HealthFunctionPeriodProfitValue]
    topProductsByProfit: list[HealthFunctionGroupValue]
    topCustomersByProfit: list[HealthFunctionGroupValue]
    profitByFormType: list[HealthFunctionGroupValue]
    profitByFunction: list[HealthFunctionGroupValue]
    # Channel & category analysis
    channelPerformance: list[HealthFunctionPerformanceValue]
    customerPerformance: list[HealthFunctionPerformanceValue]
    productPerformance: list[HealthFunctionPerformanceValue]
    salesByCountry: list[HealthFunctionPerformanceValue]
    byFoodType: list[HealthFunctionGroupValue]
    byFunctionCategory: list[HealthFunctionPerformanceValue]  # Changed to include OPM data
    formulationDetail: list[HealthFunctionFormulationDetailValue]


class HealthFunctionFilterOptions(BaseModel):
    years: list[str]
    quarters: list[str]
    customers: list[str]
    formTypes: list[str]
    functions: list[str]
    bizUnits: list[str]
    companyCodes: list[str]
    evaluationClasses: list[str]
    businessAreas: list[str]
    salesCountries: list[str]
    procurementTypes: list[str]
    distributionChannels: list[str]
    distributionChannelDetails: list[str]
    foodTypes: list[str]
    functionCategories: list[str]
    periods: list[int]
    minPeriod: int | None = None
    maxPeriod: int | None = None


class HealthFunctionStatsResponse(BaseModel):
    dashboardKey: str
    feedKey: str
    snapshotDate: date
    filterOptions: HealthFunctionFilterOptions
    metrics: HealthFunctionMetrics


class GroupValue(BaseModel):
    name: str
    value: float


class AggregateRequest(BaseModel):
    feed_key: str = "example"
    snapshot_date: str | None = None
    years: list[str] | None = None
    quarters: list[str] | None = None
    countries: list[str] | None = None
    customers: list[str] | None = None
    groups: list[str] | None = None
    eval_classes: list[str] | None = None
    products: list[str] | None = None


class AggregateResponse(BaseModel):
    dashboardKey: str
    feedKey: str
    snapshotDate: str
    totalSales: float
    totalCM: float
    totalOP: float
    totalSGA: float
    opMargin: float
    sgaRatio: float
    byPeriod: list[GroupValue]
    topCustomers: list[GroupValue]
    topProducts: list[GroupValue]
    byCountry: list[GroupValue]
    periodScaleLabel: str


# GCC Dashboard specific schemas
class GccFilterOptions(BaseModel):
    years: list[str]
    months: list[str]  # ["01", "02", ..., "12"]
    periods: list[str]  # ["2024-01", "2024-02", ...]
    compids: list[dict[str, str]]  # [{value: "1200", label: "한국 (1200)"}, ...]
    categories: list[dict[str, str]]  # [{value: "SC", label: "SC (스킨케어)"}, ...]


class GccKpis(BaseModel):
    총매출: float
    초도건수: int
    확정건수: int
    의뢰건수: int


class GccAggregatedDataRequest(BaseModel):
    year: str | None = None  # Single year selection (e.g., "2025")
    months: list[str] | None = None  # ["01", "02", ...]
    compid: str | None = None
    category: str | None = None  # "SC" or "MU"
    start_month: str | None = None  # "YYYY-MM"
    end_month: str | None = None  # "YYYY-MM"
    summary2_month: str | None = None  # "YYYY-MM"
    sections: list[str] | None = None  # ["summary", "sales", "request", "confirm", "first_in", "lab"]


class GccSalesTrendPoint(BaseModel):
    month: str  # "2024-01", "2024-02", etc.
    revenue: float


class GccSalesTrend(BaseModel):
    한국: list[GccSalesTrendPoint]
    상해: list[GccSalesTrendPoint]
    광저우: list[GccSalesTrendPoint]


class GccCompanyGrowth(BaseModel):
    company: str  # "한국", "상해", "광저우"
    month_2024: float  # 2024년 당월 매출
    month_2025: float  # 2025년 당월 매출
    month_growth: float  # 당월 성장률 (%)
    cumulative_2024: float  # 2024년 누적 매출
    cumulative_2025: float  # 2025년 누적 매출
    cumulative_growth: float  # 누적 성장률 (%)


class GccSalesGrowth(BaseModel):
    latest_month: str  # "2025-12" (가장 최근 월)
    companies: list[GccCompanyGrowth]


class GccMonthlyCountPoint(BaseModel):
    month: str  # "2024-01", "2024-02", etc.
    count: int
    cumulative: int


class GccMonthlyCountData(BaseModel):
    points: list[GccMonthlyCountPoint]


class GccYoyComparisonPoint(BaseModel):
    month: str  # "01", "02", etc. (월만)
    prev_year: float  # 전년도 값
    curr_year: float  # 올해 값
    growth_rate: float  # 성장률 (%)


class GccYoyComparisonData(BaseModel):
    prev_year_label: str  # "2024"
    curr_year_label: str  # "2025"
    points: list[GccYoyComparisonPoint]


class GccCategorySeriesItem(BaseModel):
    key: str
    label: str
    prevMonth: float
    currMonth: float
    prevYtd: float
    currYtd: float
    monthGrowth: float
    ytdGrowth: float


class GccStrategicSalesItem(BaseModel):
    label: str
    prev: float
    curr: float


class GccScMuCounts(BaseModel):
    sc: int
    mu: int


class GccScMuTotals(BaseModel):
    prev: GccScMuCounts
    curr: GccScMuCounts


class GccSeriesItem(BaseModel):
    label: str
    value: float


class GccMonthlyValuePoint(BaseModel):
    month: str  # "YYYY-MM"
    value: float


class GccAdoptionRate(BaseModel):
    label: str
    rate: float


class GccAdoptionMonthlyPoint(BaseModel):
    month: str  # "YYYY-MM"
    rate: float


class GccAggregatedDataResponse(BaseModel):
    dashboardKey: str
    salesSnapshotDate: str
    otherSnapshotDate: str
    latestMonth: str
    hasData: bool
    filterOptions: GccFilterOptions
    kpis: GccKpis
    summarySales: list[GccCategorySeriesItem]
    summaryFirstIn: list[GccCategorySeriesItem]
    summaryRequest: list[GccCategorySeriesItem]
    strategicSales: list[GccStrategicSalesItem]
    summaryScMuFirstIn: GccScMuTotals
    summaryScMuRequest: GccScMuTotals
    adoptionRates: list[GccAdoptionRate]
    adoptionMonthly: list[GccAdoptionMonthlyPoint]
    salesMonthly: list[GccMonthlyValuePoint]
    salesCategoryTotals: list[GccSeriesItem]
    salesCustomerTop: list[GccSeriesItem]
    salesProductTop: list[GccSeriesItem]
    requestMonthly: list[GccMonthlyValuePoint]
    requestCategoryTotals: list[GccSeriesItem]
    requestCustomerTop: list[GccSeriesItem]
    requestStatusTop: list[GccSeriesItem]
    requestCompanyTop: list[GccSeriesItem]
    confirmMonthly: list[GccMonthlyValuePoint]
    confirmCategoryTotals: list[GccSeriesItem]
    confirmTeamTop: list[GccSeriesItem]
    confirmCompanyTop: list[GccSeriesItem]
    firstInMonthly: list[GccMonthlyValuePoint]
    firstInCategoryTotals: list[GccSeriesItem]
    firstInManagerTop: list[GccSeriesItem]
    firstInHiccTop: list[GccSeriesItem]
    salesTrend: GccSalesTrend | None = None
    salesGrowth: GccSalesGrowth | None = None
    salesYoy: GccYoyComparisonData | None = None  # 매출 YoY
    firstInCount: GccMonthlyCountData | None = None  # 초도건수
    firstInYoy: GccYoyComparisonData | None = None  # 초도건수 YoY
    confirmCount: GccMonthlyCountData | None = None  # 확정건수
    confirmYoy: GccYoyComparisonData | None = None  # 확정건수 YoY
    requestCount: GccMonthlyCountData | None = None  # 신규의뢰건수
    requestYoy: GccYoyComparisonData | None = None  # 신규의뢰건수 YoY
    summary2Month: str | None = None
    summary2Sales: list[GccCategorySeriesItem] = []
    summary2FirstIn: list[GccCategorySeriesItem] = []
    summary2Request: list[GccCategorySeriesItem] = []
    summary2StrategicSales: list[GccStrategicSalesItem] = []
    summary2ScMuFirstIn: GccScMuTotals | None = None
    summary2ScMuRequest: GccScMuTotals | None = None
    summary2AdoptionRates: list[GccAdoptionRate] = []
    summary2RequestTotal: int | None = None
    summary2ConfirmTotal: int | None = None
    # Research Performance (연구경영) data
    researchKpis: "GccResearchKpis | None" = None
    researchMonthly: "list[GccResearchMonthlyPoint]" = []
    researchCategoryComparison: "list[GccResearchCategoryItem]" = []


class GccResearchKpis(BaseModel):
    """연구경영 KPI (신제품 의뢰, 처방확정, 채택률)"""
    request_count: int  # 신제품 의뢰 건수
    request_yoy: int  # 전년동기 대비
    request_mom: int  # 전월 대비
    confirm_count: int  # 처방확정 건수
    confirm_yoy: int  # 전년동기 대비
    confirm_mom: int  # 전월 대비
    adoption_rate: float  # 채택률 (%)
    adoption_yoy: float  # 전년동기 대비 (pp)
    adoption_mom: float  # 전월 대비 (pp)
    avg_adoption_rate: float  # 평균 채택률 (12개월)


class GccResearchMonthlyPoint(BaseModel):
    """월별 신제품 의뢰/확정/채택률 데이터"""
    month: str  # YYYY-MM
    request_count: int  # 신제품 의뢰 건수
    confirm_count: int  # 처방확정 건수
    adoption_rate: float  # 채택률 (%)


class GccResearchCategoryItem(BaseModel):
    """카테고리별 신제품 의뢰 비교"""
    category: str  # 카테고리명
    prev_month: int  # 전년동월 건수
    curr_month: int  # 당월 건수
    prev_cumulative: int  # 전년 누적
    curr_cumulative: int  # 당해 누적
