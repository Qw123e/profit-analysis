"use client";

export const dynamic = 'force-dynamic';

// ============================================
// 1. IMPORTS
// All external dependencies and internal modules
// - React hooks and Next.js utilities
// - UI components (molecules/atoms)
// - Services, utilities, types
// ============================================
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";

import { dashboardService } from "@/services/dashboardService";
import { DataTable } from "@/components/molecules/DataTable";
import { ErrorBoundary } from "@/components/molecules/ErrorBoundary";
import { DashboardHeader } from "@/components/molecules/DashboardHeader";
import { DAKpiSection } from "@/components/molecules/DAKpiSection";
import { DAKpiCard } from "@/components/molecules/DAKpiCard";
import { DATabNavigation } from "@/components/molecules/DATabNavigation";
import { DACompanySelector } from "@/components/molecules/DACompanySelector";
import { DAActiveFilters } from "@/components/molecules/DAActiveFilters";
import { TabButton } from "@/components/molecules/TabButton";
import { LoadingSpinner } from "@/components/atoms/LoadingSpinner";
import { LoadingOverlay } from "@/components/atoms/LoadingOverlay";
import { TargetSettingModal } from "@/components/molecules/TargetSettingModal";
import { AIInsightModal } from "@/components/molecules/AIInsightModal";
import { useTargetData } from "@/hooks/useTargetData";
import { getKPIStatus, calculateAchievementRate } from "@/types/target";
import { numberFormat } from "@/utils/snapshotTransformers";
import { mainContainerStyle } from "@/utils/dashboardStyles";
import type { FilterValue } from "@/types/common";
import type { AIInsightResponse } from "@/types/ai";
import type { HealthFunctionStatsResponse, HealthFunctionFilterOptions, SnapshotPreviewResponse } from "@/types/snapshot";
import { HealthFunctionSidebar } from "@/app/dashboards/health-function/components/HealthFunctionSidebar";
import { HealthFunctionDetailModal } from "@/app/dashboards/health-function/components/HealthFunctionDetailModal";
import { CustomerDrillDownModal } from "@/app/dashboards/health-function/components/CustomerDrillDownModal";
import { CountryDetailModal } from "@/app/dashboards/health-function/components/CountryDetailModal";
import { OverviewTab } from "@/app/dashboards/health-function/tabs/OverviewTab";
import { ChannelTab } from "@/app/dashboards/health-function/tabs/ChannelTab";
import { FormulationTab } from "@/app/dashboards/health-function/tabs/FormulationTab";
import { ScatterTab } from "@/app/dashboards/health-function/tabs/ScatterTab";
import {
  buildMatrixData,
  buildTreemapData,
  buildTrendData,
  sortGroupValues,
  sortPerformanceByOperatingProfit,
  sortPerformanceBySales
} from "@/app/dashboards/health-function/utils/healthFunctionTransforms";

// ============================================
// 3. UTILS (Dashboard-specific)
// Helper functions and constants for data formatting
// - theme: Color palette for charts (blue, purple, green, orange)
// ============================================
const theme = {
  blue: "#3b82f6",
  purple: "#8b5cf6",
  green: "#10b981",
  orange: "#f97316"
};

// ============================================
// 4. MAIN COMPONENT
// Primary dashboard component with full lifecycle management
// Structure:
//   4.1. State Management - React state, filters, and pagination
//   4.2. Data Fetching - SWR hooks for stats and preview data
//   4.3. Event Handlers - Filter reset handler
//   4.4. Loading/Error States - Conditional rendering
//   4.5. Render - JSX layout with sidebar filters, KPIs, and charts
// ============================================
export default function HealthFunctionDashboard() {
  // --- 4.1. State Management ---
  const [mounted, setMounted] = useState(false);
  const [mainTab, setMainTab] = useState<"raw" | "charts">("charts");
  const [chartTab, setChartTab] = useState<"overview" | "channel" | "function" | "formulation" | "scatter">("overview");
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState<AIInsightResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Tab-specific filters
  const [overviewFilters, setOverviewFilters] = useState({
    companyCode: undefined as FilterValue,
    year: undefined as FilterValue,
    quarter: undefined as FilterValue,
    month: undefined as FilterValue,
    evaluationClass: undefined as FilterValue,
    businessArea: undefined as FilterValue,
    salesCountry: undefined as FilterValue,
    procurementType: undefined as FilterValue,
    distributionChannel: undefined as FilterValue,
    distributionChannelDetail: undefined as FilterValue,
    customer: undefined as FilterValue,
    bizUnit: undefined as FilterValue,
  });
  const [channelFilters, setChannelFilters] = useState({
    selectedChannels: [] as string[],
    formType: undefined as FilterValue,
  });
  const [formulationFilters, setFormulationFilters] = useState({
    formType: undefined as FilterValue,
    functionCategory: undefined as FilterValue,
    foodType: undefined as FilterValue,
  });
  const [scatterQuadrant, setScatterQuadrant] = useState<"ALL" | "HH" | "HL" | "LH" | "LL">("ALL");
  const [scatterAnalysisType, setScatterAnalysisType] = useState<"customer" | "product">("customer");
  const [detailContext, setDetailContext] = useState<{
    title: string;
    titleSuffix: string;
    defaultTab: "customer" | "product";
    filters: Partial<ActiveFilters>;
  } | null>(null);
  const [entityDetailContext, setEntityDetailContext] = useState<{
    name: string;
    type: "customer" | "product";
  } | null>(null);
  const [countryModalOpen, setCountryModalOpen] = useState(false);

  // Auth and Target Data
  const targetCompanyCode = overviewFilters.companyCode ? String(overviewFilters.companyCode) : "ALL";
  const {
    targets,
    threshold,
    saveTargets,
    saveThreshold,
  } = useTargetData({ dashboardKey: "health-function", companyCode: targetCompanyCode });
  const [periodStart, setPeriodStart] = useState<number | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<number | undefined>(undefined);
  const [rawPage, setRawPage] = useState(0);
  const rawPageSize = 30;

  // Store all filter options (unfiltered) from a dedicated request
  const [allFilterOptions, setAllFilterOptions] = useState<HealthFunctionFilterOptions | null>(null);

  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");
  const date = dateParam && dateParam !== "YYYY-MM-DD" ? dateParam : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset formulation filters when company changes
  useEffect(() => {
    setFormulationFilters({
      formType: undefined,
      functionCategory: undefined,
      foodType: undefined,
    });
  }, [overviewFilters.companyCode]);

  useEffect(() => {
    if (chartTab !== "formulation") return;
    const formTypes = (allFilterOptions?.formTypes ?? []).filter(Boolean);
    if (formulationFilters.formType && formTypes.length > 0 && !formTypes.includes(String(formulationFilters.formType))) {
      setFormulationFilters((prev) => ({ ...prev, formType: undefined }));
    }
    if (formulationFilters.functionCategory) {
      setFormulationFilters((prev) => ({ ...prev, functionCategory: undefined }));
    }
  }, [
    chartTab,
    allFilterOptions?.formTypes,
    formulationFilters.formType,
    formulationFilters.functionCategory
  ]);

  const normalizeFilterValue = (value: FilterValue): string | undefined => {
    if (value === null || value === undefined) return undefined;
    return String(value);
  };

  const normalizeNumberValue = (value: FilterValue): number | undefined => {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  };

  const buildInsightPayload = () => ({
    snapshot_date: date,
    year: normalizeFilterValue(activeFilters.year),
    quarter: normalizeFilterValue(activeFilters.quarter),
    month: normalizeNumberValue(activeFilters.month),
    customer: normalizeFilterValue(activeFilters.customer),
    product: normalizeFilterValue((activeFilters as { product?: FilterValue }).product),
    biz_unit: normalizeFilterValue(activeFilters.bizUnit),
    company_code: normalizeFilterValue(activeFilters.companyCode),
    evaluation_class: normalizeFilterValue(activeFilters.evaluationClass),
    business_area: normalizeFilterValue(activeFilters.businessArea),
    sales_country: normalizeFilterValue(activeFilters.salesCountry),
    procurement_type: normalizeFilterValue(activeFilters.procurementType),
    distribution_channel: normalizeFilterValue(activeFilters.distributionChannel),
    distribution_channel_detail: normalizeFilterValue(activeFilters.distributionChannelDetail),
    period_start: normalizeNumberValue(activeFilters.periodStart),
    period_end: normalizeNumberValue(activeFilters.periodEnd),
  });

  const runAIInsight = async (customFilters?: Record<string, FilterValue>) => {
    setAiLoading(true);
    setAiError(null);

    // Build payload with custom filters if provided
    // Merge activeFilters with customFilters (customFilters takes precedence)
    const filters = {
      year: activeFilters.year,
      quarter: activeFilters.quarter,
      month: activeFilters.month,
      customer: activeFilters.customer,
      product: (activeFilters as { product?: FilterValue }).product,
      bizUnit: activeFilters.bizUnit,
      companyCode: activeFilters.companyCode,
      evaluationClass: activeFilters.evaluationClass,
      businessArea: activeFilters.businessArea,
      salesCountry: activeFilters.salesCountry,
      procurementType: activeFilters.procurementType,
      distributionChannel: activeFilters.distributionChannel,
      distributionChannelDetail: activeFilters.distributionChannelDetail,
      periodStart: activeFilters.periodStart,
      periodEnd: activeFilters.periodEnd,
      ...customFilters, // Override with custom filters from AI modal
    };

    const payload = {
      snapshot_date: date,
      year: normalizeFilterValue(filters.year),
      quarter: normalizeFilterValue(filters.quarter),
      month: normalizeNumberValue(filters.month),
      customer: normalizeFilterValue(filters.customer),
      product: normalizeFilterValue(filters.product),
      biz_unit: normalizeFilterValue(filters.bizUnit),
      company_code: normalizeFilterValue(filters.companyCode),
      evaluation_class: normalizeFilterValue(filters.evaluationClass),
      business_area: normalizeFilterValue(filters.businessArea),
      sales_country: normalizeFilterValue(filters.salesCountry),
      procurement_type: normalizeFilterValue(filters.procurementType),
      distribution_channel: normalizeFilterValue(filters.distributionChannel),
      distribution_channel_detail: normalizeFilterValue(filters.distributionChannelDetail),
      period_start: normalizeNumberValue(filters.periodStart),
      period_end: normalizeNumberValue(filters.periodEnd),
    };

    try {
      const result = await dashboardService.getHealthFunctionAIInsight({
        dashboardKey: "health-function",
        payload,
      });
      setAiContent(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI 분석에 실패했습니다.");
    } finally {
      setAiLoading(false);
    }
  };

  interface ActiveFilters {
    companyCode?: FilterValue;
    year?: FilterValue;
    quarter?: FilterValue;
    month?: FilterValue;
    evaluationClass?: FilterValue;
    businessArea?: FilterValue;
    salesCountry?: FilterValue;
    procurementType?: FilterValue;
    distributionChannel?: FilterValue;
    distributionChannelDetail?: FilterValue;
    customer?: FilterValue;
    product?: FilterValue;
    bizUnit?: FilterValue;
    formType?: FilterValue;
    function?: FilterValue;
    foodType?: FilterValue;
    periodStart?: number;
    periodEnd?: number;
  }

  // --- 4.2. Data Fetching ---
  // Apply tab-specific filters
  const activeFilters = useMemo<ActiveFilters>(() => {
    const base: ActiveFilters = {
      companyCode: overviewFilters.companyCode,
      year: overviewFilters.year,
      quarter: overviewFilters.quarter,
      month: overviewFilters.month,
      evaluationClass: overviewFilters.evaluationClass,
      businessArea: overviewFilters.businessArea,
      salesCountry: overviewFilters.salesCountry,
      procurementType: overviewFilters.procurementType,
      distributionChannel: overviewFilters.distributionChannel,
      distributionChannelDetail: overviewFilters.distributionChannelDetail,
      customer: overviewFilters.customer,
      product: undefined,
      bizUnit: overviewFilters.bizUnit,
      formType: formulationFilters.formType,
      function: formulationFilters.functionCategory,
      foodType: formulationFilters.foodType,
    };
    switch (chartTab) {
      case "overview":
        return base;
      case "channel":
        return {
          ...base,
          formType: channelFilters.formType,
          distributionChannelDetail: channelFilters.selectedChannels.length > 0
            ? channelFilters.selectedChannels.join(',')
            : undefined,
        };
      case "formulation":
        return {
          ...base,
          formType: formulationFilters.formType,
          function: formulationFilters.functionCategory,
          foodType: formulationFilters.foodType,
        };
      case "scatter":
        return {
          ...base,
          periodStart,
          periodEnd,
        };
      default:
        return base;
    }
  }, [chartTab, overviewFilters, formulationFilters, channelFilters, periodStart, periodEnd]);

  const statsKey = useMemo(
    () => [
      "healthFunctionStats",
      date ?? "latest",
      chartTab,
      activeFilters.companyCode ?? "",
      activeFilters.year ?? "",
      activeFilters.quarter ?? "",
      activeFilters.evaluationClass ?? "",
      activeFilters.businessArea ?? "",
      activeFilters.salesCountry ?? "",
      activeFilters.procurementType ?? "",
      activeFilters.distributionChannel ?? "",
      activeFilters.distributionChannelDetail ?? "",
      activeFilters.customer ?? "",
      activeFilters.bizUnit ?? "",
      activeFilters.formType ?? "",
      activeFilters.function ?? "",
      activeFilters.foodType ?? "",
      activeFilters.periodStart ?? "",
      activeFilters.periodEnd ?? ""
    ],
    [date, chartTab, activeFilters]
  );

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
    isValidating: statsValidating
  } = useSWR<HealthFunctionStatsResponse>(
    statsKey,
    () =>
      dashboardService.getHealthFunctionStats({
        dashboardKey: "health-function",
        date,
        year: normalizeFilterValue(activeFilters.year),
        quarter: normalizeFilterValue(activeFilters.quarter),
        customer: activeFilters.customer ? normalizeFilterValue(activeFilters.customer) : undefined,
        formType: normalizeFilterValue(activeFilters.formType),
        functionName: normalizeFilterValue(activeFilters.function),
        bizUnit: normalizeFilterValue(activeFilters.bizUnit),
        companyCode: normalizeFilterValue(activeFilters.companyCode),
        evaluationClass: normalizeFilterValue(activeFilters.evaluationClass),
        businessArea: normalizeFilterValue(activeFilters.businessArea),
        salesCountry: normalizeFilterValue(activeFilters.salesCountry),
        procurementType: normalizeFilterValue(activeFilters.procurementType),
        distributionChannel: normalizeFilterValue(activeFilters.distributionChannel),
        distributionChannelDetail: normalizeFilterValue(activeFilters.distributionChannelDetail),
        foodType: normalizeFilterValue(activeFilters.foodType),
        periodStart: activeFilters.periodStart,
        periodEnd: activeFilters.periodEnd
      }),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  // Extract healthFilterOptions early so it can be used in useEffects below
  const healthFilterOptions = statsData?.filterOptions ?? null;

  const optionsKey = useMemo(() => ["healthFunctionOptions", date ?? "latest", overviewFilters.companyCode ?? ""], [date, overviewFilters.companyCode]);
  const { data: optionsData } = useSWR<HealthFunctionStatsResponse>(
    optionsKey,
    () =>
      dashboardService.getHealthFunctionStats({
        dashboardKey: "health-function",
        date,
        companyCode: normalizeFilterValue(overviewFilters.companyCode),
      }),
    { revalidateOnFocus: false }
  );

  // Common KPI data (only affected by company + year filters)
  const commonKPIKey = useMemo(
    () => ["healthFunctionCommonKPI", date ?? "latest", overviewFilters.companyCode ?? "", overviewFilters.year ?? ""],
    [date, overviewFilters.companyCode, overviewFilters.year]
  );
  const { data: commonKPIData } = useSWR<HealthFunctionStatsResponse>(
    commonKPIKey,
    () =>
      dashboardService.getHealthFunctionStats({
        dashboardKey: "health-function",
        date,
        companyCode: normalizeFilterValue(overviewFilters.companyCode),
        year: normalizeFilterValue(overviewFilters.year),
        includeAllEvalClass: true,  // KPI cards include ALL evaluation classes
      }),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  // Treemap data (all filters EXCEPT formType, so treemap shows all formulations)
  const treemapKey = useMemo(
    () => [
      "healthFunctionTreemap",
      date ?? "latest",
      activeFilters.companyCode ?? "",
      activeFilters.year ?? "",
      activeFilters.quarter ?? "",
      activeFilters.function ?? "",
      activeFilters.foodType ?? "",
      activeFilters.periodStart ?? "",
      activeFilters.periodEnd ?? ""
    ],
    [date, activeFilters.companyCode, activeFilters.year, activeFilters.quarter, activeFilters.function, activeFilters.foodType, activeFilters.periodStart, activeFilters.periodEnd]
  );
  const { data: treemapStatsData } = useSWR<HealthFunctionStatsResponse>(
    treemapKey,
    () =>
      dashboardService.getHealthFunctionStats({
        dashboardKey: "health-function",
        date,
        year: normalizeFilterValue(activeFilters.year),
        quarter: normalizeFilterValue(activeFilters.quarter),
        functionName: normalizeFilterValue(activeFilters.function),
        companyCode: normalizeFilterValue(activeFilters.companyCode),
        foodType: normalizeFilterValue(activeFilters.foodType),
        periodStart: activeFilters.periodStart,
        periodEnd: activeFilters.periodEnd
      }),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  const detailFilters = useMemo(() => {
    if (!detailContext) return null;
    return { ...activeFilters, ...detailContext.filters };
  }, [detailContext, activeFilters]);

  const detailKey = useMemo(() => {
    if (!detailContext || !detailFilters) return null;
    return [
      "healthFunctionDetail",
      date ?? "latest",
      detailContext.title,
      detailFilters.companyCode ?? "",
      detailFilters.year ?? "",
      detailFilters.quarter ?? "",
      detailFilters.evaluationClass ?? "",
      detailFilters.businessArea ?? "",
      detailFilters.salesCountry ?? "",
      detailFilters.procurementType ?? "",
      detailFilters.distributionChannel ?? "",
      detailFilters.distributionChannelDetail ?? "",
      detailFilters.customer ?? "",
      detailFilters.product ?? "",
      detailFilters.bizUnit ?? "",
      detailFilters.formType ?? "",
      detailFilters.function ?? "",
      detailFilters.foodType ?? "",
      detailFilters.periodStart ?? "",
      detailFilters.periodEnd ?? ""
    ];
  }, [detailContext, detailFilters, date]);

  const {
    data: detailStats,
    isLoading: detailLoading
  } = useSWR<HealthFunctionStatsResponse>(
    detailKey,
    () =>
      dashboardService.getHealthFunctionStats({
        dashboardKey: "health-function",
        date,
        year: normalizeFilterValue(detailFilters?.year),
        quarter: normalizeFilterValue(detailFilters?.quarter),
        customer: detailFilters?.customer ? normalizeFilterValue(detailFilters.customer) : undefined,
        productName: detailFilters?.product ? normalizeFilterValue(detailFilters.product) : undefined,
        formType: normalizeFilterValue(detailFilters?.formType),
        functionName: normalizeFilterValue(detailFilters?.function),
        bizUnit: normalizeFilterValue(detailFilters?.bizUnit),
        companyCode: normalizeFilterValue(detailFilters?.companyCode),
        evaluationClass: normalizeFilterValue(detailFilters?.evaluationClass),
        businessArea: normalizeFilterValue(detailFilters?.businessArea),
        salesCountry: normalizeFilterValue(detailFilters?.salesCountry),
        procurementType: normalizeFilterValue(detailFilters?.procurementType),
        distributionChannel: normalizeFilterValue(detailFilters?.distributionChannel),
        distributionChannelDetail: normalizeFilterValue(detailFilters?.distributionChannelDetail),
        foodType: normalizeFilterValue(detailFilters?.foodType),
        periodStart: detailFilters?.periodStart,
        periodEnd: detailFilters?.periodEnd
      }),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setEntityDetailContext(null);
  }, [detailContext]);

  const entityDetailFilters = useMemo(() => {
    if (!entityDetailContext) return null;
    const base = { ...activeFilters, ...(detailContext?.filters ?? {}) };
    if (entityDetailContext.type === "customer") {
      return { ...base, customer: entityDetailContext.name, product: undefined };
    }
    return { ...base, product: entityDetailContext.name, customer: undefined };
  }, [entityDetailContext, activeFilters, detailContext]);

  const entityDetailKey = useMemo(() => {
    if (!entityDetailContext || !entityDetailFilters) return null;
    return [
      "healthFunctionEntityDetail",
      date ?? "latest",
      entityDetailContext.type,
      entityDetailContext.name,
      entityDetailFilters.companyCode ?? "",
      entityDetailFilters.year ?? "",
      entityDetailFilters.quarter ?? "",
      entityDetailFilters.evaluationClass ?? "",
      entityDetailFilters.businessArea ?? "",
      entityDetailFilters.salesCountry ?? "",
      entityDetailFilters.procurementType ?? "",
      entityDetailFilters.distributionChannel ?? "",
      entityDetailFilters.distributionChannelDetail ?? "",
      entityDetailFilters.customer ?? "",
      entityDetailFilters.product ?? "",
      entityDetailFilters.bizUnit ?? "",
      entityDetailFilters.formType ?? "",
      entityDetailFilters.function ?? "",
      entityDetailFilters.foodType ?? "",
      entityDetailFilters.periodStart ?? "",
      entityDetailFilters.periodEnd ?? ""
    ];
  }, [entityDetailContext, entityDetailFilters, date]);

  const { data: entityDetailStats } = useSWR<HealthFunctionStatsResponse>(
    entityDetailKey,
    () =>
      dashboardService.getHealthFunctionStats({
        dashboardKey: "health-function",
        date,
        year: normalizeFilterValue(entityDetailFilters?.year),
        quarter: normalizeFilterValue(entityDetailFilters?.quarter),
        customer: entityDetailFilters?.customer ? normalizeFilterValue(entityDetailFilters.customer) : undefined,
        productName: entityDetailFilters?.product ? normalizeFilterValue(entityDetailFilters.product) : undefined,
        formType: normalizeFilterValue(entityDetailFilters?.formType),
        functionName: normalizeFilterValue(entityDetailFilters?.function),
        bizUnit: normalizeFilterValue(entityDetailFilters?.bizUnit),
        companyCode: normalizeFilterValue(entityDetailFilters?.companyCode),
        evaluationClass: normalizeFilterValue(entityDetailFilters?.evaluationClass),
        businessArea: normalizeFilterValue(entityDetailFilters?.businessArea),
        salesCountry: normalizeFilterValue(entityDetailFilters?.salesCountry),
        procurementType: normalizeFilterValue(entityDetailFilters?.procurementType),
        distributionChannel: normalizeFilterValue(entityDetailFilters?.distributionChannel),
        distributionChannelDetail: normalizeFilterValue(entityDetailFilters?.distributionChannelDetail),
        foodType: normalizeFilterValue(entityDetailFilters?.foodType),
        periodStart: entityDetailFilters?.periodStart,
        periodEnd: entityDetailFilters?.periodEnd
      }),
    { revalidateOnFocus: false }
  );

  // Previous year data for YoY calculation and channel comparison
  const prevYear = overviewFilters.year ? String(Number(overviewFilters.year) - 1) : null;
  const prevYearKey = useMemo(() => {
    if (!prevYear) return null;
    return [
      "healthFunctionPrevYear",
      date ?? "latest",
      overviewFilters.companyCode ?? "",
      prevYear,
      activeFilters.quarter ?? "",
      activeFilters.evaluationClass ?? "",
      activeFilters.businessArea ?? "",
      activeFilters.salesCountry ?? "",
      activeFilters.procurementType ?? "",
      activeFilters.distributionChannel ?? "",
      activeFilters.distributionChannelDetail ?? "",
      activeFilters.customer ?? "",
      activeFilters.bizUnit ?? "",
      activeFilters.formType ?? "",
      activeFilters.function ?? "",
      activeFilters.foodType ?? "",
      activeFilters.periodStart ?? "",
      activeFilters.periodEnd ?? "",
    ];
  }, [date, overviewFilters.companyCode, prevYear, activeFilters]);

  const { data: prevYearData } = useSWR<HealthFunctionStatsResponse>(
    prevYearKey,
    () =>
      dashboardService.getHealthFunctionStats({
        dashboardKey: "health-function",
        date,
        year: prevYear!,
        companyCode: normalizeFilterValue(overviewFilters.companyCode),
        quarter: normalizeFilterValue(activeFilters.quarter),
        customer: activeFilters.customer ? normalizeFilterValue(activeFilters.customer) : undefined,
        formType: normalizeFilterValue(activeFilters.formType),
        functionName: normalizeFilterValue(activeFilters.function),
        bizUnit: normalizeFilterValue(activeFilters.bizUnit),
        evaluationClass: normalizeFilterValue(activeFilters.evaluationClass),
        businessArea: normalizeFilterValue(activeFilters.businessArea),
        salesCountry: normalizeFilterValue(activeFilters.salesCountry),
        procurementType: normalizeFilterValue(activeFilters.procurementType),
        distributionChannel: normalizeFilterValue(activeFilters.distributionChannel),
        distributionChannelDetail: normalizeFilterValue(activeFilters.distributionChannelDetail),
        foodType: normalizeFilterValue(activeFilters.foodType),
        periodStart: activeFilters.periodStart,
        periodEnd: activeFilters.periodEnd,
      }),
    { revalidateOnFocus: false, keepPreviousData: true }
  );

  // Calculate total sales target based on filter period
  const totalSalesTarget = useMemo(() => {
    const currentYear = overviewFilters.year ? parseInt(String(overviewFilters.year), 10) : new Date().getFullYear();

    if (overviewFilters.quarter) {
      // Quarterly filter: sum 3 months
      const quarterNum = parseInt(String(overviewFilters.quarter).replace(/[^0-9]/g, ""), 10);
      const startMonth = (quarterNum - 1) * 3 + 1;
      const endMonth = quarterNum * 3;

      return targets
        .filter(
          (t) =>
            t.year === currentYear &&
            t.month >= startMonth &&
            t.month <= endMonth &&
            (t.company_code ?? "ALL") === targetCompanyCode
        )
        .reduce((sum, t) => sum + t.sales_target * 100_000_000, 0);
    } else {
      // No quarter filter: sum all 12 months for the year
      return targets
        .filter(
          (t) =>
            t.year === currentYear &&
            (t.company_code ?? "ALL") === targetCompanyCode
        )
        .reduce((sum, t) => sum + t.sales_target * 100_000_000, 0);
    }
  }, [targets, overviewFilters.year, overviewFilters.quarter, targetCompanyCode]);

  const feedKey = statsData?.feedKey ?? "example";

  useEffect(() => {
    setRawPage(0);
  }, [date, feedKey]);

  const previewOffset = rawPage * rawPageSize;
  const previewKey =
    mainTab === "raw" && feedKey
      ? ["snapshotPreview", "health-function", date ?? "latest", feedKey, previewOffset, rawPageSize]
      : null;

  const { data: previewData } = useSWR<SnapshotPreviewResponse>(
    previewKey,
    () =>
      dashboardService.getSnapshotPreview({
        dashboardKey: "health-function",
        date,
        feedKey,
        offset: previewOffset,
        limit: rawPageSize
      }),
    { revalidateOnFocus: false }
  );

  const healthMetrics = statsData?.metrics ?? null;
  const commonKPIMetrics = commonKPIData?.metrics ?? null;
  const hasPeriodRange =
    healthFilterOptions?.minPeriod !== null &&
    healthFilterOptions?.minPeriod !== undefined &&
    healthFilterOptions?.maxPeriod !== null &&
    healthFilterOptions?.maxPeriod !== undefined;

  const customerPerformance = useMemo(
    () => healthMetrics?.customerPerformance ?? [],
    [healthMetrics]
  );
  const customerPerformanceBySales = useMemo(
    () => sortPerformanceBySales(customerPerformance),
    [customerPerformance]
  );
  const customerPerformanceByOp = useMemo(
    () => sortPerformanceByOperatingProfit(customerPerformance),
    [customerPerformance]
  );
  const productPerformance = useMemo(
    () => healthMetrics?.productPerformance ?? [],
    [healthMetrics]
  );
  const productPerformanceBySales = useMemo(
    () => sortPerformanceBySales(productPerformance),
    [productPerformance]
  );
  const channelPerformance = useMemo(
    () => healthMetrics?.channelPerformance ?? [],
    [healthMetrics]
  );
  // Extract available channels from actual data
  const availableChannels = useMemo(() => {
    const channels = channelPerformance.map((item) => item.name);
    return Array.from(new Set(channels)).sort();
  }, [channelPerformance]);
  const salesByCountry = useMemo(
    () => healthMetrics?.salesByCountry ?? [],
    [healthMetrics]
  );
  const salesByCountryWithDetails = useMemo(() => {
    // salesByCountry now includes performance data (sales, operatingProfit, opm)
    // Just need to add country codes for the map display
    const COUNTRY_CODE_MAP: Record<string, string> = {
      'KR': 'KR', 'HK': 'HK', 'CN': 'CN', 'CH': 'CH', 'SG': 'SG',
      'US': 'US', 'RU': 'RU', 'TW': 'TW', 'LU': 'LU', 'AU': 'AU',
      'TH': 'TH', 'KZ': 'KZ', 'PH': 'PH', 'VN': 'VN', 'JP': 'JP',
      'DE': 'DE', 'FR': 'FR', 'IN': 'IN', 'ID': 'ID', 'MY': 'MY',
      'CA': 'CA', 'BR': 'BR', 'GB': 'GB'
    };

    return salesByCountry.map(country => {
      // country.name is now the country code (e.g., 'KR')
      const code = COUNTRY_CODE_MAP[country.name] || country.name;

      return {
        countryCode: code,
        totalSales: country.sales / 100_000_000, // Convert to 억
        operatingProfit: country.operatingProfit / 100_000_000,
        opm: country.opm
      };
    });
  }, [salesByCountry]);
  const channelPerformanceBySales = useMemo(
    () => sortPerformanceBySales(channelPerformance),
    [channelPerformance]
  );
  const channelPerformanceFiltered = useMemo(() => {
    if (channelFilters.selectedChannels.length === 0) {
      return channelPerformanceBySales;
    }
    const selected = new Set(channelFilters.selectedChannels);
    return channelPerformanceBySales.filter((item) => selected.has(item.name));
  }, [channelFilters.selectedChannels, channelPerformanceBySales]);

  const prevYearChannelPerformance = useMemo(() => {
    const prevYearMetrics = prevYearData?.metrics;
    if (!prevYearMetrics) return [];
    return sortPerformanceBySales(prevYearMetrics.channelPerformance ?? []);
  }, [prevYearData]);

  const prevYearFunctionCategoryBySales = useMemo(() => {
    const prevYearMetrics = prevYearData?.metrics;
    if (!prevYearMetrics) return [];
    return prevYearMetrics.byFunctionCategory ?? [];
  }, [prevYearData]);

  const prevYearFormulationCategoryBySales = useMemo(() => {
    const prevYearMetrics = prevYearData?.metrics;
    if (!prevYearMetrics) return [];
    const rows = prevYearMetrics.formulationDetail ?? [];
    if (rows.length === 0) return [];
    const map = new Map<string, { sales: number; operatingProfit: number; count: number }>();
    rows.forEach((row) => {
      if (!row.formulation) return;
      const current = map.get(row.formulation) ?? { sales: 0, operatingProfit: 0, count: 0 };
      current.sales += row.sales;
      current.operatingProfit += row.operatingProfit;
      current.count += 1;
      map.set(row.formulation, current);
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      value: data.sales,
      sales: data.sales,
      contributionProfit: 0,
      operatingProfit: data.operatingProfit,
      opm: data.sales > 0 ? (data.operatingProfit / data.sales) * 100 : 0,
      evaluationClass: "",
      salesRatio: 0, // Will be calculated if needed
    }));
  }, [prevYearData]);

  useEffect(() => {
    if (optionsData?.filterOptions) {
      setAllFilterOptions(optionsData.filterOptions);
    }
  }, [optionsData]);

  useEffect(() => {
    if (overviewFilters.companyCode) return;
    const companyCodes = (allFilterOptions?.companyCodes ?? healthFilterOptions?.companyCodes ?? []).filter(Boolean);
    if (companyCodes.length > 0) {
      setOverviewFilters((prev) => ({ ...prev, companyCode: companyCodes[0] }));
    }
  }, [overviewFilters.companyCode, allFilterOptions?.companyCodes, healthFilterOptions?.companyCodes]);

  // Removed auto-year-selection logic - tabs now preserve previous filter values

  const trendData = useMemo(
    () => buildTrendData((healthMetrics?.byPeriod ?? []).map((item) => ({ name: item.name, sales: item.sales, op: item.op }))),
    [healthMetrics]
  );

  const prevYearTrendData = useMemo(() => {
    const prevYearMetrics = prevYearData?.metrics;
    if (!prevYearMetrics?.byPeriod) return null;
    return buildTrendData(prevYearMetrics.byPeriod.map((item: any) => ({ name: item.name, sales: item.sales, op: item.op })));
  }, [prevYearData]);

  const insightText = useMemo(() => {
    if (!healthMetrics) return "";
    const salesEok = numberFormat(Math.round(healthMetrics.totalSales / 100_000_000));
    const opEok = numberFormat(Math.round(healthMetrics.totalOP / 100_000_000));
    return `총매출 ${salesEok}억, 영업이익 ${opEok}억, 이익률 ${healthMetrics.opMargin.toFixed(1)}%`;
  }, [healthMetrics]);


  const matrixData = useMemo(
    () => buildMatrixData(scatterAnalysisType === "customer" ? customerPerformanceBySales : productPerformanceBySales),
    [scatterAnalysisType, customerPerformanceBySales, productPerformanceBySales]
  );


  const formulationBySales = useMemo(
    () => sortGroupValues(healthMetrics?.byFormType ?? []),
    [healthMetrics]
  );
  const foodTypeBySales = useMemo(
    () => sortGroupValues(healthMetrics?.byFoodType ?? []),
    [healthMetrics]
  );
  const functionCategoryBySales = useMemo(
    () => healthMetrics?.byFunctionCategory ?? [],
    [healthMetrics]
  );

  const formulationCategoryBySales = useMemo(() => {
    const rows = healthMetrics?.formulationDetail ?? [];
    if (rows.length === 0) return [];
    const map = new Map<string, { sales: number; operatingProfit: number }>();
    rows.forEach((row) => {
      if (!row.formulation) return;
      const current = map.get(row.formulation) ?? { sales: 0, operatingProfit: 0 };
      current.sales += row.sales;
      current.operatingProfit += row.operatingProfit;
      map.set(row.formulation, current);
    });
    const totalSales = Array.from(map.values()).reduce((sum, v) => sum + v.sales, 0);
    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        sales: value.sales,
        contributionProfit: 0,
        operatingProfit: value.operatingProfit,
        opm: value.sales > 0 ? (value.operatingProfit / value.sales) * 100 : 0,
        evaluationClass: "Mid",
        salesRatio: totalSales > 0 ? (value.sales / totalSales) * 100 : 0
      }))
      .sort((a, b) => b.sales - a.sales);
  }, [healthMetrics?.formulationDetail]);

  const treemapData = useMemo(
    () => buildTreemapData(sortGroupValues(treemapStatsData?.metrics?.byFormType ?? [])),
    [treemapStatsData]
  );

  const scatterPoints = useMemo(() => {
    if (!matrixData) return [];
    if (scatterQuadrant === "ALL") return matrixData.points;
    return matrixData.quadrants[scatterQuadrant] ?? [];
  }, [matrixData, scatterQuadrant]);

  const detailCustomerRows = detailStats?.metrics?.customerPerformance ?? [];
  const detailProductRows = detailStats?.metrics?.productPerformance ?? [];
  const entityMetricsRaw = entityDetailStats?.metrics ?? null;
  const entityDetailMetrics = useMemo(() => {
    if (!entityMetricsRaw || !entityDetailContext) return null;
    const topItems =
      entityDetailContext.type === "product"
        ? entityMetricsRaw.topCustomers
        : entityMetricsRaw.topProducts;
    return {
      totalSales: entityMetricsRaw.totalSales,
      totalOP: entityMetricsRaw.totalOP,
      opMargin: entityMetricsRaw.opMargin,
      byPeriod: entityMetricsRaw.byPeriod,
      channelPerformance: entityMetricsRaw.channelPerformance,
      topItems
    };
  }, [entityMetricsRaw, entityDetailContext]);
  const entityDetailTrend = useMemo(() => {
    if (!entityDetailMetrics) return null;
    return buildTrendData(
      entityDetailMetrics.byPeriod.map((item) => ({ name: item.name, sales: item.sales, op: item.op }))
    );
  }, [entityDetailMetrics]);

  const openCustomerDetail = (name: string) => {
    setDetailContext({
      title: name,
      titleSuffix: "고객사 상세",
      defaultTab: "product",
      filters: { customer: name }
    });
  };

  const openChannelDetail = (name: string) => {
    console.log('[Debug] Channel clicked:', name, 'Length:', name.length, 'Chars:', Array.from(name).map(c => c.charCodeAt(0)));
    setDetailContext({
      title: name,
      titleSuffix: "채널 상세",
      defaultTab: "customer",
      filters: { distributionChannelDetail: name }
    });
  };

  const openFormulationDetail = (row: { foodType: string; functionCategory: string; formulation: string }) => {
    setDetailContext({
      title: `${row.functionCategory} · ${row.formulation}`,
      titleSuffix: "제형 상세",
      defaultTab: "customer",
      filters: {
        foodType: row.foodType,
        function: row.functionCategory,
        formType: row.formulation,
      }
    });
  };

  const openEntityDetail = (type: "customer" | "product", name: string) => {
    setEntityDetailContext({ type, name });
  };

  const pageContainerStyle = { ...mainContainerStyle, padding: 16 };

  // --- 4.4. Loading/Error States ---
  if (!mounted) {
    return (
      <main style={pageContainerStyle}>
        <LoadingSpinner message="초기화 중..." />
      </main>
    );
  }

  if (!statsData && statsLoading) {
    return (
      <main style={pageContainerStyle}>
        <LoadingSpinner message="Health Function 대시보드 데이터 로딩 중..." />
      </main>
    );
  }

  if (statsError && !statsData) {
    const isForbidden = statsError.message.includes("403");
    return (
      <main style={{ padding: 24 }}>
        {isForbidden ? "Access denied. You do not have permission." : "Failed to load snapshot"}
      </main>
    );
  }

  if (!statsData) {
    return <main style={{ padding: 24 }}>데이터가 없습니다. 스냅샷을 먼저 업로드해 주세요.</main>;
  }

  // --- 4.5. Render ---
  return (
    <main style={{ ...pageContainerStyle, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
      <LoadingOverlay isLoading={statsLoading || statsValidating} message="데이터 로딩 중..." />
      <ErrorBoundary>
        {/* Section 1: Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <DashboardHeader
            title="health-function"
            subtitle={`snapshotDate: ${statsData?.snapshotDate ?? "N/A"}`}
            actions={
              <>
                <TabButton active={mainTab === "charts"} onClick={() => setMainTab("charts")} label="Charts" />
                <TabButton active={mainTab === "raw"} onClick={() => setMainTab("raw")} label="Raw Data" />
              </>
            }
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setAiModalOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "#4338ca",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7h6M4 12h10M4 17h14"
                  stroke="#4338ca"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 4l2 2-6 6-3 1 1-3 6-6z"
                  stroke="#4338ca"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              AI 분석
            </button>
            <button
                type="button"
                onClick={() => setTargetModalOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#475569",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                목표 설정
              </button>
          </div>
        </div>

        {/* Target Setting Modal */}
        <TargetSettingModal
          isOpen={targetModalOpen}
          onClose={() => setTargetModalOpen(false)}
          targets={targets}
          threshold={threshold}
          companyCodes={allFilterOptions?.companyCodes ?? healthFilterOptions?.companyCodes ?? []}
          selectedCompany={overviewFilters.companyCode ? String(overviewFilters.companyCode) : undefined}
          onCompanyChange={(companyCode) => setOverviewFilters((prev) => ({ ...prev, companyCode }))}
          onSaveTargets={async (newTargets) => {
            setIsSavingTargets(true);
            try {
              await saveTargets(newTargets);
            } finally {
              setIsSavingTargets(false);
            }
          }}
          onSaveThreshold={saveThreshold}
          availableYears={healthFilterOptions?.years?.map(y => parseInt(y, 10)).filter(y => !isNaN(y)) ?? [new Date().getFullYear()]}
          isSaving={isSavingTargets}
        />

        <AIInsightModal
          isOpen={aiModalOpen}
          onClose={() => {
            setAiModalOpen(false);
            setAiContent(null);
            setAiError(null);
          }}
          onRefresh={() => runAIInsight()}
          onAnalyze={(filters) => runAIInsight(filters)}
          isLoading={aiLoading}
          data={aiContent}
          error={aiError}
          filterConditions={[
            ...(overviewFilters.companyCode ? [{ label: "법인", value: String(overviewFilters.companyCode) }] : []),
            ...(overviewFilters.year ? [{ label: "회계연도", value: `${overviewFilters.year}년` }] : []),
            ...(overviewFilters.quarter ? [{ label: "분기", value: String(overviewFilters.quarter) }] : []),
            ...(overviewFilters.month ? [{ label: "월", value: `${overviewFilters.month}월` }] : []),
            ...(overviewFilters.salesCountry ? [{ label: "국가", value: (() => {
              const COUNTRY_NAMES_KO: Record<string, string> = {
                'AU': '호주', 'CH': '스위스', 'CN': '중국', 'GB': '영국', 'HK': '홍콩',
                'KR': '한국', 'KZ': '카자흐스탄', 'LU': '룩셈부르크', 'PH': '필리핀',
                'RU': '러시아', 'SG': '싱가포르', 'TH': '태국', 'TW': '대만', 'US': '미국',
                'VN': '베트남', 'JP': '일본', 'DE': '독일', 'FR': '프랑스',
                'IN': '인도', 'ID': '인도네시아', 'MY': '말레이시아', 'CA': '캐나다', 'BR': '브라질',
              };
              return COUNTRY_NAMES_KO[String(overviewFilters.salesCountry)] || String(overviewFilters.salesCountry);
            })() }] : []),
            ...(overviewFilters.distributionChannelDetail ? [{ label: "채널", value: String(overviewFilters.distributionChannelDetail) }] : []),
            ...(overviewFilters.customer ? [{ label: "고객", value: String(overviewFilters.customer) }] : []),
          ]}
          filterOptions={[
            {
              key: "companyCode",
              label: "법인",
              options: [
                { label: "전체", value: "" },
                ...(allFilterOptions?.companyCodes ?? healthFilterOptions?.companyCodes ?? []).map((code) => ({
                  label: String(code),
                  value: String(code),
                })),
              ],
              value: overviewFilters.companyCode,
            },
            {
              key: "year",
              label: "회계연도",
              options: [
                { label: "전체", value: "" },
                ...(allFilterOptions?.years ?? healthFilterOptions?.years ?? []).map((year) => ({
                  label: `${year}년`,
                  value: String(year),
                })),
              ],
              value: overviewFilters.year,
            },
            {
              key: "quarter",
              label: "분기",
              options: [
                { label: "전체", value: "" },
                { label: "1Q", value: "1Q" },
                { label: "2Q", value: "2Q" },
                { label: "3Q", value: "3Q" },
                { label: "4Q", value: "4Q" },
              ],
              value: overviewFilters.quarter,
            },
            {
              key: "month",
              label: "월",
              options: [
                { label: "전체", value: "" },
                { label: "1월", value: "1" },
                { label: "2월", value: "2" },
                { label: "3월", value: "3" },
                { label: "4월", value: "4" },
                { label: "5월", value: "5" },
                { label: "6월", value: "6" },
                { label: "7월", value: "7" },
                { label: "8월", value: "8" },
                { label: "9월", value: "9" },
                { label: "10월", value: "10" },
                { label: "11월", value: "11" },
                { label: "12월", value: "12" },
              ],
              value: overviewFilters.month,
            },
          ]}
          currentFilters={{
            companyCode: overviewFilters.companyCode,
            year: overviewFilters.year,
            quarter: overviewFilters.quarter,
            month: overviewFilters.month,
          }}
        />

        {/* Raw Data Tab */}
        {mainTab === "raw" && (
          <div>
            {!previewData && (
              <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                <LoadingSpinner message="Raw Data 로딩 중..." />
              </div>
            )}
            {previewData && (
              <>
                <DataTable
                  columns={previewData.columns}
                  rows={previewData.rows}
                  title="Raw Data"
                  subtitle={`Snapshot: ${statsData?.snapshotDate ?? "latest"}`}
                  meta={`${previewData.totalRows.toLocaleString()} rows total`}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setRawPage((p) => Math.max(0, p - 1))}
                    disabled={rawPage === 0}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      cursor: rawPage === 0 ? "not-allowed" : "pointer",
                      opacity: rawPage === 0 ? 0.5 : 1
                    }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {previewData.offset + 1} - {previewData.offset + previewData.rows.length} / {previewData.totalRows.toLocaleString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRawPage((p) => p + 1)}
                    disabled={previewData.offset + previewData.rows.length >= previewData.totalRows}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#0f172a",
                      cursor: previewData.offset + previewData.rows.length >= previewData.totalRows ? "not-allowed" : "pointer",
                      opacity: previewData.offset + previewData.rows.length >= previewData.totalRows ? 0.5 : 1
                    }}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Charts Tab */}
        {mainTab === "charts" && healthMetrics && (
          <div style={{ display: "grid", gap: 8 }}>
              {/* Company Selector + Active Filters */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <DACompanySelector
                  companyCodes={allFilterOptions?.companyCodes ?? healthFilterOptions?.companyCodes ?? []}
                  selectedCompany={normalizeFilterValue(overviewFilters.companyCode)}
                  onChange={(companyCode) => setOverviewFilters((prev) => ({ ...prev, companyCode }))}
                />
                <DAActiveFilters
                  filters={[
                    ...(overviewFilters.year && overviewFilters.year !== "" ? [{
                      label: "회계연도",
                      value: String(overviewFilters.year),
                      onRemove: () => {
                        console.log('[DEBUG] Removing year filter');
                        setOverviewFilters((prev) => ({ ...prev, year: undefined }));
                      }
                    }] : []),
                    ...(overviewFilters.quarter && overviewFilters.quarter !== "" ? [{
                      label: "분기",
                      value: String(overviewFilters.quarter),
                      onRemove: () => setOverviewFilters((prev) => ({ ...prev, quarter: undefined }))
                    }] : []),
                    ...(overviewFilters.salesCountry && overviewFilters.salesCountry !== "" ? [{
                      label: "국가",
                      value: (() => {
                        const COUNTRY_NAMES_KO: Record<string, string> = {
                          'AU': '호주', 'CH': '스위스', 'CN': '중국', 'GB': '영국', 'HK': '홍콩',
                          'KR': '한국', 'KZ': '카자흐스탄', 'LU': '룩셈부르크', 'PH': '필리핀',
                          'RU': '러시아', 'SG': '싱가포르', 'TH': '태국', 'TW': '대만', 'US': '미국',
                          'VN': '베트남', 'AS': '아메리칸사모아', 'JP': '일본', 'DE': '독일', 'FR': '프랑스',
                          'IN': '인도', 'ID': '인도네시아', 'MY': '말레이시아', 'CA': '캐나다', 'BR': '브라질',
                        };
                        const code = String(overviewFilters.salesCountry);
                        return COUNTRY_NAMES_KO[code] || code;
                      })(),
                      onRemove: () => setOverviewFilters((prev) => ({ ...prev, salesCountry: undefined }))
                    }] : []),
                    ...(overviewFilters.distributionChannelDetail && overviewFilters.distributionChannelDetail !== "" ? [{
                      label: "채널",
                      value: String(overviewFilters.distributionChannelDetail),
                      onRemove: () => setOverviewFilters((prev) => ({ ...prev, distributionChannelDetail: undefined }))
                    }] : []),
                    ...(formulationFilters.formType && formulationFilters.formType !== "" ? [{
                      label: "제형",
                      value: String(formulationFilters.formType),
                      onRemove: () => setFormulationFilters((prev) => ({ ...prev, formType: undefined }))
                    }] : []),
                    ...(formulationFilters.foodType && formulationFilters.foodType !== "" ? [{
                      label: "식품분류",
                      value: String(formulationFilters.foodType),
                      onRemove: () => setFormulationFilters((prev) => ({ ...prev, foodType: undefined }))
                    }] : []),
                    ...(formulationFilters.functionCategory && formulationFilters.functionCategory !== "" ? [{
                      label: "기능",
                      value: String(formulationFilters.functionCategory),
                      onRemove: () => setFormulationFilters((prev) => ({ ...prev, functionCategory: undefined }))
                    }] : []),
                  ]}
                  onClearAll={() => {
                    setOverviewFilters((prev) => ({
                      ...prev,
                      year: undefined,
                      quarter: undefined,
                      salesCountry: undefined,
                      distributionChannelDetail: undefined,
                    }));
                    setFormulationFilters((prev) => ({
                      ...prev,
                      formType: undefined,
                      foodType: undefined,
                      functionCategory: undefined,
                    }));
                  }}
                />
              </div>

              {/* Section 3: KPIs (only affected by company + year filters) */}
              <DAKpiSection>
                {(() => {
                  // Use commonKPIMetrics for top-level KPIs (company + year only)
                  const kpiMetrics = commonKPIMetrics ?? healthMetrics;
                  if (!kpiMetrics) return null;

                  // Show target achievement only in overview tab
                  if (chartTab === "overview") {
                    const currentYear = overviewFilters.year ? parseInt(String(overviewFilters.year), 10) : new Date().getFullYear();

                    // Calculate target sum based on filter period
                    let salesTarget = 0;
                    let opTarget = 0;

                    if (overviewFilters.quarter) {
                      // Quarterly filter: sum 3 months
                      const quarterNum = parseInt(String(overviewFilters.quarter).replace(/[^0-9]/g, ""), 10);
                      const startMonth = (quarterNum - 1) * 3 + 1;
                      const endMonth = quarterNum * 3;

                      targets
                        .filter(
                          (t) =>
                            t.year === currentYear &&
                            t.month >= startMonth &&
                            t.month <= endMonth &&
                            (t.company_code ?? "ALL") === targetCompanyCode
                        )
                        .forEach((t) => {
                          salesTarget += t.sales_target;
                          opTarget += t.op_target;
                        });
                    } else {
                      // No quarter filter: sum all 12 months
                      targets
                        .filter(
                          (t) =>
                            t.year === currentYear &&
                            (t.company_code ?? "ALL") === targetCompanyCode
                        )
                        .forEach((t) => {
                          salesTarget += t.sales_target;
                          opTarget += t.op_target;
                        });
                    }
                    const salesAchievement = calculateAchievementRate(kpiMetrics.totalSales / 100_000_000, salesTarget);
                    const opAchievement = calculateAchievementRate(kpiMetrics.totalOP / 100_000_000, opTarget);
                    const salesStatus = getKPIStatus(salesAchievement, threshold);
                    const opStatus = getKPIStatus(opAchievement, threshold);
                    const salesBadge = salesAchievement !== null ? `${salesAchievement.toFixed(1)}%` : undefined;
                    const opBadge = opAchievement !== null ? `${opAchievement.toFixed(1)}%` : undefined;

                    // Calculate YoY (only when specific year is selected)
                    const hasYoY = !!prevYear && prevYearData?.metrics?.totalSales;
                    const prevYearTotalSales = prevYearData?.metrics?.totalSales ?? 0;
                    const currentSales = kpiMetrics.totalSales;
                    const salesYoY = hasYoY && prevYearTotalSales > 0 ? ((currentSales - prevYearTotalSales) / prevYearTotalSales) * 100 : 0;
                    const salesYoyStatus = !hasYoY ? "gray" : salesYoY >= 0 ? "green" : "red";
                    const salesYoyBadge = !hasYoY ? undefined : salesYoY >= 0 ? "증가" : "감소";

                    return (
                      <>
                        <DAKpiCard
                          title="매출 YoY"
                          value={hasYoY ? `${salesYoY >= 0 ? '+' : ''}${salesYoY.toFixed(1)}%` : "-"}
                          badgeText={salesYoyBadge}
                          status={salesYoyStatus}
                        />
                        <DAKpiCard
                          title="총매출"
                          value={`${numberFormat(Math.round(kpiMetrics.totalSales / 100_000_000))}억`}
                          badgeText={salesBadge}
                          status={salesStatus}
                        />
                        <DAKpiCard
                          title="영업이익"
                          value={`${numberFormat(Math.round(kpiMetrics.totalOP / 100_000_000))}억`}
                          badgeText={opBadge}
                          status={opStatus}
                        />
                        <DAKpiCard
                          title="영업이익률"
                          value={`${kpiMetrics.opMargin.toFixed(1)}%`}
                          badgeText="지표"
                          status="gray"
                        />
                      </>
                    );
                  }

                  // Other tabs: show KPIs with target achievement (same as overview)
                  const currentYear = overviewFilters.year ? parseInt(String(overviewFilters.year), 10) : new Date().getFullYear();

                  // Calculate target sum based on filter period
                  let salesTarget = 0;
                  let opTarget = 0;

                  if (overviewFilters.quarter) {
                    // Quarterly filter: sum 3 months
                    const quarterNum = parseInt(String(overviewFilters.quarter).replace(/[^0-9]/g, ""), 10);
                    const startMonth = (quarterNum - 1) * 3 + 1;
                    const endMonth = quarterNum * 3;

                    targets
                      .filter(
                        (t) =>
                          t.year === currentYear &&
                          t.month >= startMonth &&
                          t.month <= endMonth &&
                          (t.company_code ?? "ALL") === targetCompanyCode
                      )
                      .forEach((t) => {
                        salesTarget += t.sales_target;
                        opTarget += t.op_target;
                      });
                  } else {
                    // No quarter filter: sum all 12 months
                    targets
                      .filter(
                        (t) =>
                          t.year === currentYear &&
                          (t.company_code ?? "ALL") === targetCompanyCode
                      )
                      .forEach((t) => {
                        salesTarget += t.sales_target;
                        opTarget += t.op_target;
                      });
                  }
                  const salesAchievement = calculateAchievementRate(kpiMetrics.totalSales / 100_000_000, salesTarget);
                  const opAchievement = calculateAchievementRate(kpiMetrics.totalOP / 100_000_000, opTarget);
                  const salesStatus = getKPIStatus(salesAchievement, threshold);
                  const opStatus = getKPIStatus(opAchievement, threshold);
                  const salesBadge = salesAchievement !== null ? `${salesAchievement.toFixed(1)}%` : undefined;
                  const opBadge = opAchievement !== null ? `${opAchievement.toFixed(1)}%` : undefined;

                  // Calculate YoY (only when specific year is selected)
                  const hasYoY = !!prevYear && prevYearData?.metrics?.totalSales;
                  const prevYearTotalSales = prevYearData?.metrics?.totalSales ?? 0;
                  const currentSales = kpiMetrics.totalSales;
                  const salesYoY = hasYoY && prevYearTotalSales > 0 ? ((currentSales - prevYearTotalSales) / prevYearTotalSales) * 100 : 0;
                  const salesYoyStatus = !hasYoY ? "gray" : salesYoY >= 0 ? "green" : "red";
                  const salesYoyBadge = !hasYoY ? undefined : salesYoY >= 0 ? "증가" : "감소";

                  return (
                    <>
                      <DAKpiCard
                        title="매출 YoY"
                        value={hasYoY ? `${salesYoY >= 0 ? '+' : ''}${salesYoY.toFixed(1)}%` : "-"}
                        badgeText={salesYoyBadge}
                        status={salesYoyStatus}
                      />
                      <DAKpiCard
                        title="총매출"
                        value={`${numberFormat(Math.round(kpiMetrics.totalSales / 100_000_000))}억`}
                        badgeText={salesBadge}
                        status={salesStatus}
                      />
                      <DAKpiCard
                        title="영업이익"
                        value={`${numberFormat(Math.round(kpiMetrics.totalOP / 100_000_000))}억`}
                        badgeText={opBadge}
                        status={opStatus}
                      />
                      <DAKpiCard
                        title="영업이익률"
                        value={`${kpiMetrics.opMargin.toFixed(1)}%`}
                        badgeText="지표"
                        status="gray"
                      />
                    </>
                  );
                })()}
              </DAKpiSection>

              {/* Chart Sub-Tabs */}
              <DATabNavigation
                activeTab={chartTab}
                onChange={setChartTab}
                tabs={[
                  { id: "overview", label: "종합" },
                  { id: "channel", label: "채널분석" },
                  { id: "function", label: "기능별 분석" },
                  { id: "formulation", label: "제형별 분석" },
                  { id: "scatter", label: "산포도 분석" }
                ]}
              />

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns:
                    chartTab === "function" || chartTab === "formulation" || chartTab === "scatter" ? "1fr"
                    : chartTab === "channel" ? "229px 1fr"
                    : "208px 1fr",
                  alignItems: "start",
                  minHeight: 0
                }}
              >
                {chartTab !== "function" && chartTab !== "formulation" && chartTab !== "scatter" && (
                  <HealthFunctionSidebar
                    chartTab={chartTab}
                    overviewFilters={overviewFilters}
                    setOverviewFilters={setOverviewFilters}
                    channelFilters={channelFilters}
                    setChannelFilters={setChannelFilters}
                    formulationFilters={formulationFilters}
                    setFormulationFilters={setFormulationFilters}
                    scatterQuadrant={scatterQuadrant}
                    setScatterQuadrant={setScatterQuadrant}
                    allFilterOptions={allFilterOptions}
                    healthFilterOptions={healthFilterOptions}
                    availableChannels={availableChannels}
                    hasPeriodRange={hasPeriodRange}
                    periodStart={periodStart}
                    periodEnd={periodEnd}
                    setPeriodStart={setPeriodStart}
                    setPeriodEnd={setPeriodEnd}
                    currentSales={(commonKPIMetrics ?? healthMetrics).totalSales}
                    totalSalesTarget={totalSalesTarget}
                    insightText={insightText}
                />
                )}

                {/* Right Content Area */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                  {/* Section 4-2: Charts - Overview Tab (신규) */}
      {chartTab === "overview" && (
        <OverviewTab
          trendData={trendData}
          prevYearTrendData={prevYearTrendData}
          currentYear={overviewFilters.year ? String(overviewFilters.year) : undefined}
          prevYear={prevYear ?? undefined}
          customerPerformanceBySales={customerPerformanceBySales}
          customerPerformanceByOp={customerPerformanceByOp}
          theme={{ blue: theme.blue, green: theme.green }}
          onCustomerSelect={openCustomerDetail}
        />
      )}

                  {/* Section 5: Charts - Channel Tab */}
                  {chartTab === "channel" && (
                    <ChannelTab
                      channelPerformance={channelPerformanceBySales}
                      prevYearChannelPerformance={prevYearChannelPerformance}
                      currentYear={overviewFilters.year ? String(overviewFilters.year) : undefined}
                      prevYear={prevYear ?? undefined}
                      salesByCountry={salesByCountry.map((r) => ({ name: r.name, value: r.value ?? r.sales }))}
                      onChannelSelect={openChannelDetail}
                      onCountrySelect={(country) => setOverviewFilters((prev) => ({ ...prev, salesCountry: country }))}
                      onCountryExpand={() => setCountryModalOpen(true)}
                    />
                  )}

                  {/* Section 6: Charts - Function/Formulation Tab */}
                  {(chartTab === "function" || chartTab === "formulation") && (
                    <FormulationTab
                      formulationBySales={formulationBySales}
                      foodTypeBySales={foodTypeBySales}
                      functionCategoryBySales={chartTab === "formulation" ? formulationCategoryBySales : functionCategoryBySales}
                      prevYearFunctionCategoryBySales={chartTab === "formulation" ? prevYearFormulationCategoryBySales : prevYearFunctionCategoryBySales}
                      currentYear={overviewFilters.year ? String(overviewFilters.year) : undefined}
                      prevYear={prevYear ?? undefined}
                      totalSales={healthMetrics.totalSales}
                      treemapData={treemapData}
                      availableYears={allFilterOptions?.years ?? healthFilterOptions?.years ?? []}
                      selectedYear={overviewFilters.year}
                      onYearChange={(year) => setOverviewFilters((prev) => ({ ...prev, year }))}
                      detailRows={healthMetrics.formulationDetail}
                      onSelectFormType={(name) => {
                        console.log("🔍 [DEBUG] FormType clicked:", { name, typeof: typeof name, charCodes: name?.split('').map((c: string) => c.charCodeAt(0)) });
                        setFormulationFilters((prev) => ({ ...prev, formType: name || undefined }));
                      }}
                      onSelectFoodType={(name) => setFormulationFilters((prev) => ({ ...prev, foodType: name || undefined }))}
                      onSelectFunctionCategory={(name) =>
                        setFormulationFilters((prev) => ({
                          ...prev,
                          [chartTab === "formulation" ? "formType" : "functionCategory"]: name || undefined
                        }))
                      }
                      onDetailSelect={openFormulationDetail}
                      activeFilters={{
                        formType: formulationFilters.formType,
                        functionCategory: formulationFilters.functionCategory,
                        foodType: formulationFilters.foodType
                      }}
                      onClearFilter={(key) => {
                        const targetKey = chartTab === "formulation" && key === "functionCategory" ? "formType" : key;
                        setFormulationFilters((prev) => ({
                          ...prev,
                          [targetKey]: undefined
                        }));
                      }}
                      onClearAllFilters={() =>
                        setFormulationFilters((prev) => ({
                          ...prev,
                          formType: undefined,
                          functionCategory: undefined,
                          foodType: undefined
                        }))
                      }
                      allFoodTypes={allFilterOptions?.foodTypes ?? []}
                      allFunctionCategories={
                        chartTab === "formulation"
                          ? allFilterOptions?.formTypes ?? []
                          : allFilterOptions?.functionCategories ?? []
                      }
                      countryBySales={salesByCountry.map((r) => ({ name: r.name, value: r.value ?? r.sales }))}
                      onCountrySelect={(country) => setOverviewFilters((prev) => ({ ...prev, salesCountry: country }))}
                      onCountryExpand={() => setCountryModalOpen(true)}
                      theme={{ blue: theme.blue }}
                      categoryMode={chartTab === "formulation" ? "formulation" : "function"}
                    />
                  )}

                  {/* Section 8: Charts - Scatter Tab */}
                  {chartTab === "scatter" && matrixData && (
                    <ScatterTab
                      matrixData={matrixData}
                      scatterQuadrant={scatterQuadrant}
                      onQuadrantChange={setScatterQuadrant}
                      scatterPoints={scatterPoints}
                      analysisType={scatterAnalysisType}
                      onAnalysisTypeChange={setScatterAnalysisType}
                      onSelectCustomer={openCustomerDetail}
                      selectedCustomer={null}
                      customerDetailMetrics={null}
                      customerDetailTrend={null}
                      theme={{ blue: theme.blue, green: theme.green, purple: theme.purple }}
                      onCloseDetail={() => {}}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          <HealthFunctionDetailModal
            isOpen={!!detailContext}
            onClose={() => setDetailContext(null)}
            title={detailContext?.title ?? ""}
            titleSuffix={detailContext?.titleSuffix}
            defaultTab={detailContext?.defaultTab}
            customerRows={detailCustomerRows}
            productRows={detailProductRows}
            isLoading={detailLoading}
            onSelectCustomer={(name) => openEntityDetail("customer", name)}
            onSelectProduct={(name) => openEntityDetail("product", name)}
          />
          <CustomerDrillDownModal
            isOpen={!!entityDetailContext}
            entityName={entityDetailContext?.name ?? ""}
            entityType={entityDetailContext?.type ?? "customer"}
            title="네트워크 채널 상세"
            subtitle={
              entityDetailContext
                ? `${entityDetailContext.name} ${entityDetailContext.type === "product" ? "제품별 상세" : "고객사 상세"}`
                : ""
            }
            metrics={entityDetailMetrics}
            trendData={entityDetailTrend}
            onClose={() => setEntityDetailContext(null)}
            theme={{ blue: theme.blue, green: theme.green, purple: theme.purple }}
          />
          <CountryDetailModal
            isOpen={countryModalOpen}
            onClose={() => {
              setCountryModalOpen(false);
              // Clear salesCountry filter when closing modal
              setOverviewFilters((prev) => ({ ...prev, salesCountry: undefined }));
            }}
            countries={salesByCountryWithDetails}
            onCountrySelect={(countryCode) => {
              // Use country code directly (data stores codes like 'KR', not names like '한국')
              setOverviewFilters((prev) => ({ ...prev, salesCountry: countryCode }));
            }}
            onBackToAll={() => {
              // Clear salesCountry filter to show all countries
              setOverviewFilters((prev) => ({ ...prev, salesCountry: undefined }));
            }}
            countryDetailData={overviewFilters.salesCountry && healthMetrics ? {
              topCustomers: healthMetrics.customerPerformance?.slice(0, 10).map(c => ({
                name: c.name,
                sales: c.sales,
                operatingProfit: c.operatingProfit,
                opm: c.opm
              })) || [],
              topProducts: healthMetrics.productPerformance?.slice(0, 10).map(p => ({
                name: p.name,
                sales: p.sales,
                operatingProfit: p.operatingProfit,
                opm: p.opm
              })) || [],
              topChannels: healthMetrics.channelPerformance?.slice(0, 10).map(ch => ({
                name: ch.name,
                sales: ch.sales,
                operatingProfit: ch.operatingProfit,
                opm: ch.opm
              })) || []
            } : undefined}
            onCustomerClick={(customerName) => {
              setEntityDetailContext({
                name: customerName,
                type: "customer"
              });
            }}
            onProductClick={(productName) => {
              setEntityDetailContext({
                name: productName,
                type: "product"
              });
            }}
          />
      </ErrorBoundary>
    </main>
  );
}
