export interface SnapshotFeed {
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

export interface DashboardSnapshotResponse {
  dashboardKey: string;
  snapshotDate: string;
  generatedAt?: string | null;
  feeds: Record<string, SnapshotFeed>;
}

export interface SnapshotPreviewResponse {
  dashboardKey: string;
  snapshotDate: string;
  feedKey: string;
  offset: number;
  limit: number;
  totalRows: number;
  columns: string[];
  rows: Array<Array<string | number | null>>;
}

export interface HealthFunctionGroupValue {
  name: string;
  value: number;
}

export interface HealthFunctionPerformanceValue {
  name: string;
  value?: number;  // alias for sales (backward compat with GroupValue, set by backend)
  sales: number;
  contributionProfit: number;
  operatingProfit: number;
  opm: number;
  evaluationClass: string;
  salesRatio: number;
}

export interface HealthFunctionPeriodValue {
  name: string;
  sales: number;
  op: number;
}

export interface HealthFunctionPeriodCostValue {
  name: string;
  directCost: number;
  rawMaterial: number;
  subMaterial: number;
  labor: number;
}

export interface HealthFunctionPeriodProfitValue {
  name: string;
  grossProfit: number;
  contribution: number;
  op: number;
  salesCost: number;
}

export interface HealthFunctionMetrics {
  totalSales: number;
  totalOP: number;
  opMargin: number;
  uniqueCustomers: number;
  byPeriod: HealthFunctionPeriodValue[];
  topProducts: HealthFunctionGroupValue[];
  topCustomers: HealthFunctionGroupValue[];
  byFormType: HealthFunctionGroupValue[];
  byFunction: HealthFunctionGroupValue[];
  // Cost analysis metrics
  totalDirectCost: number;
  totalSalesCost: number;
  costByPeriod: HealthFunctionPeriodCostValue[];
  topProductsByCost: HealthFunctionGroupValue[];
  topCustomersByCost: HealthFunctionGroupValue[];
  costByFormType: HealthFunctionGroupValue[];
  costByFunction: HealthFunctionGroupValue[];
  // Profit analysis metrics
  totalGrossProfit: number;
  totalContribution: number;
  totalSGA: number;
  grossMargin: number;
  contributionMargin: number;
  profitByPeriod: HealthFunctionPeriodProfitValue[];
  topProductsByProfit: HealthFunctionGroupValue[];
  topCustomersByProfit: HealthFunctionGroupValue[];
  profitByFormType: HealthFunctionGroupValue[];
  profitByFunction: HealthFunctionGroupValue[];
  channelPerformance: HealthFunctionPerformanceValue[];
  customerPerformance: HealthFunctionPerformanceValue[];
  productPerformance: HealthFunctionPerformanceValue[];
  salesByCountry: HealthFunctionPerformanceValue[];
  byFoodType: HealthFunctionGroupValue[];
  byFunctionCategory: HealthFunctionPerformanceValue[];  // Changed to include OPM data
  formulationDetail: Array<{
    foodType: string;
    functionCategory: string;
    formulation: string;
    sales: number;
    operatingProfit: number;
    opm: number;
  }>;
}

export interface HealthFunctionFilterOptions {
  years: string[];
  quarters: string[];
  customers: string[];
  formTypes: string[];
  functions: string[];
  bizUnits: string[];
  companyCodes: string[];
  evaluationClasses: string[];
  businessAreas: string[];
  salesCountries: string[];
  procurementTypes: string[];
  distributionChannels: string[];
  distributionChannelDetails: string[];
  foodTypes: string[];
  functionCategories: string[];
  periods: number[];
  minPeriod?: number | null;
  maxPeriod?: number | null;
}

export interface HealthFunctionStatsResponse {
  dashboardKey: string;
  feedKey: string;
  snapshotDate: string;
  filterOptions: HealthFunctionFilterOptions;
  metrics: HealthFunctionMetrics;
}

// GCC Dashboard types
export interface GccFilterOptions {
  years: string[];
  months: string[];
  periods: string[];
  compids: Array<{ value: string; label: string }>;
  categories: Array<{ value: string; label: string }>;
}

export interface GccKpis {
  총매출: number;
  초도건수: number;
  확정건수: number;
  의뢰건수: number;
}

export interface GccAggregatedDataRequest {
  year?: string;  // Single year selection
  months?: string[];
  compid?: string;
  category?: string;
  start_month?: string;
  end_month?: string;
  summary2_month?: string;
  sections?: string[];
}

export interface GccSalesTrendPoint {
  month: string;  // "2024-01", "2024-02", etc.
  revenue: number;
}

export interface GccSalesTrend {
  한국: GccSalesTrendPoint[];
  상해: GccSalesTrendPoint[];
  광저우: GccSalesTrendPoint[];
}

export interface GccCompanyGrowth {
  company: string;  // "한국", "상해", "광저우"
  month_2024: number;  // 2024년 당월 매출
  month_2025: number;  // 2025년 당월 매출
  month_growth: number;  // 당월 성장률 (%)
  cumulative_2024: number;  // 2024년 누적 매출
  cumulative_2025: number;  // 2025년 누적 매출
  cumulative_growth: number;  // 누적 성장률 (%)
}

export interface GccSalesGrowth {
  latest_month: string;  // "2025-12" (가장 최근 월)
  companies: GccCompanyGrowth[];
}

export interface GccMonthlyCountPoint {
  month: string;  // "2024-01", "2024-02", etc.
  count: number;
  cumulative: number;
}

export interface GccMonthlyCountData {
  points: GccMonthlyCountPoint[];
}

export interface GccYoyComparisonPoint {
  month: string;  // "01", "02", etc.
  prev_year: number;
  curr_year: number;
  growth_rate: number;
}

export interface GccYoyComparisonData {
  prev_year_label: string;  // "2024"
  curr_year_label: string;  // "2025"
  points: GccYoyComparisonPoint[];
}

export interface GccCategorySeriesItem {
  key: string;
  label: string;
  prevMonth: number;
  currMonth: number;
  prevYtd: number;
  currYtd: number;
  monthGrowth: number;
  ytdGrowth: number;
}

export interface GccStrategicSalesItem {
  label: string;
  prev: number;
  curr: number;
}

export interface GccScMuCounts {
  sc: number;
  mu: number;
}

export interface GccScMuTotals {
  prev: GccScMuCounts;
  curr: GccScMuCounts;
}

export interface GccSeriesItem {
  label: string;
  value: number;
}

export interface GccMonthlyValuePoint {
  month: string;
  value: number;
}

export interface GccAdoptionRate {
  label: string;
  rate: number;
}

export interface GccAdoptionMonthlyPoint {
  month: string;
  rate: number;
}

export interface GccAggregatedDataResponse {
  dashboardKey: string;
  salesSnapshotDate: string;
  otherSnapshotDate: string;
  latestMonth: string;
  hasData: boolean;
  filterOptions: GccFilterOptions;
  kpis: GccKpis;
  summarySales: GccCategorySeriesItem[];
  summaryFirstIn: GccCategorySeriesItem[];
  summaryRequest: GccCategorySeriesItem[];
  strategicSales: GccStrategicSalesItem[];
  summaryScMuFirstIn: GccScMuTotals;
  summaryScMuRequest: GccScMuTotals;
  adoptionRates: GccAdoptionRate[];
  adoptionMonthly: GccAdoptionMonthlyPoint[];
  salesMonthly: GccMonthlyValuePoint[];
  salesCategoryTotals: GccSeriesItem[];
  salesCustomerTop: GccSeriesItem[];
  salesProductTop: GccSeriesItem[];
  requestMonthly: GccMonthlyValuePoint[];
  requestCategoryTotals: GccSeriesItem[];
  requestCustomerTop: GccSeriesItem[];
  requestStatusTop: GccSeriesItem[];
  requestCompanyTop: GccSeriesItem[];
  confirmMonthly: GccMonthlyValuePoint[];
  confirmCategoryTotals: GccSeriesItem[];
  confirmTeamTop: GccSeriesItem[];
  confirmCompanyTop: GccSeriesItem[];
  firstInMonthly: GccMonthlyValuePoint[];
  firstInCategoryTotals: GccSeriesItem[];
  firstInManagerTop: GccSeriesItem[];
  firstInHiccTop: GccSeriesItem[];
  salesTrend: GccSalesTrend | null;
  salesGrowth: GccSalesGrowth | null;
  salesYoy: GccYoyComparisonData | null;
  firstInCount: GccMonthlyCountData | null;  // 초도건수
  firstInYoy: GccYoyComparisonData | null;
  confirmCount: GccMonthlyCountData | null;  // 확정건수
  confirmYoy: GccYoyComparisonData | null;
  requestCount: GccMonthlyCountData | null;  // 신규의뢰건수
  requestYoy: GccYoyComparisonData | null;
  summary2Month: string | null;
  summary2Sales: GccCategorySeriesItem[];
  summary2FirstIn: GccCategorySeriesItem[];
  summary2Request: GccCategorySeriesItem[];
  summary2StrategicSales: GccStrategicSalesItem[];
  summary2ScMuFirstIn: GccScMuTotals | null;
  summary2ScMuRequest: GccScMuTotals | null;
  summary2AdoptionRates: GccAdoptionRate[];
  summary2RequestTotal: number | null;
  summary2ConfirmTotal: number | null;
  researchKpis: GccResearchKpis | null;
  researchMonthly: GccResearchMonthlyPoint[];
  researchCategoryComparison: GccResearchCategoryItem[];
}

export interface GccResearchKpis {
  request_count: number;
  request_yoy: number;
  request_mom: number;
  confirm_count: number;
  confirm_yoy: number;
  confirm_mom: number;
  adoption_rate: number;
  adoption_yoy: number;
  adoption_mom: number;
  avg_adoption_rate: number;
}

export interface GccResearchMonthlyPoint {
  month: string;
  request_count: number;
  confirm_count: number;
  adoption_rate: number;
}

export interface GccResearchCategoryItem {
  category: string;
  prev_month: number;
  curr_month: number;
  prev_cumulative: number;
  curr_cumulative: number;
}
