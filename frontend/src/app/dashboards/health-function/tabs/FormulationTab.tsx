import React, { useState, useMemo, useCallback } from "react";

import type { FilterValue } from "@/types/common";
import type { HealthFunctionPerformanceValue } from "@/types/snapshot";
import { WorldSalesMap } from "@/components/charts/WorldSalesMap";
import { FunctionCategoryChart } from "../components/FunctionCategoryChart";
import { FormulationTreemap } from "../components/FormulationTreemap";
import { FormulationDetailTable } from "../components/FormulationDetailTable";

interface GroupValue {
  name: string;
  value: number;
}

interface TreemapItem {
  name: string;
  size: number;
  fill: string;
}

interface FormulationTabProps {
  categoryMode?: "function" | "formulation";
  formulationBySales?: GroupValue[];
  foodTypeBySales?: GroupValue[];
  functionCategoryBySales?: HealthFunctionPerformanceValue[];  // Now includes 영업이익 data
  prevYearFunctionCategoryBySales?: HealthFunctionPerformanceValue[];  // Previous year data
  currentYear?: string;
  prevYear?: string;
  countryBySales?: GroupValue[];
  totalSales?: number;
  treemapData?: TreemapItem[];
  availableYears?: string[];
  selectedYear?: FilterValue;
  onYearChange?: (year: FilterValue) => void;
  detailRows?: Array<{
    foodType: string;
    functionCategory: string;
    formulation: string;
    sales: number;
    operatingProfit: number;
    opm: number;
  }>;
  onSelectFormType?: (name: string) => void;
  onSelectFoodType?: (name: string) => void;
  onSelectFunctionCategory?: (name: string) => void;
  onDetailSelect?: (row: { foodType: string; functionCategory: string; formulation: string }) => void;
  activeFilters?: { formType?: FilterValue; functionCategory?: FilterValue; foodType?: FilterValue };
  onClearFilter?: (key: "formType" | "functionCategory" | "foodType") => void;
  onClearAllFilters?: () => void;
  allFoodTypes?: string[];
  allFunctionCategories?: string[];
  theme?: { blue: string };
  onCountrySelect?: (name: string) => void;
  onCountryExpand?: () => void;
}

const WON = 100_000_000;

export function FormulationTab({
  categoryMode = "function",
  formulationBySales,
  foodTypeBySales,
  functionCategoryBySales,
  prevYearFunctionCategoryBySales,
  currentYear,
  prevYear,
  countryBySales,
  totalSales,
  treemapData,
  availableYears,
  selectedYear,
  onYearChange,
  detailRows,
  onSelectFormType,
  onSelectFoodType,
  onSelectFunctionCategory,
  onDetailSelect,
  activeFilters,
  onClearFilter,
  onClearAllFilters,
  allFoodTypes,
  allFunctionCategories,
  theme,
  onCountrySelect,
  onCountryExpand,
}: FormulationTabProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [selectedFormulations, setSelectedFormulations] = useState<string[]>([]);
  const [selectedFoodType, setSelectedFoodType] = useState<string | "all">("all");
  const [selectedFunctionCategories, setSelectedFunctionCategories] = useState<string[]>([]);
  const sortedYears = useMemo(() => {
    const list = (availableYears ?? []).filter(Boolean);
    return [...list].sort((a, b) => Number(a) - Number(b));
  }, [availableYears]);
  const selectedYearValue = selectedYear === undefined || selectedYear === null ? "" : String(selectedYear);
  const resolvedCategoryMode = categoryMode;
  const categoryLabel = resolvedCategoryMode === "formulation" ? "제형 카테고리" : "기능 카테고리";
  const categoryFilterKey: "formType" | "functionCategory" =
    resolvedCategoryMode === "formulation" ? "formType" : "functionCategory";
  const categoryFilterValue =
    resolvedCategoryMode === "formulation" ? activeFilters?.formType : activeFilters?.functionCategory;
  const hasActiveFilters = Boolean(categoryFilterValue || activeFilters?.foodType);

  // Extract food types from data
  const availableFoodTypes = useMemo(() => {
    if (allFoodTypes && allFoodTypes.length > 0) return allFoodTypes;
    if (!foodTypeBySales || foodTypeBySales.length === 0) return [];
    return foodTypeBySales.map(ft => ft.name);
  }, [allFoodTypes, foodTypeBySales]);

  // Extract function categories from data
  const availableFunctionCategories = useMemo(() => {
    if (allFunctionCategories && allFunctionCategories.length > 0) return allFunctionCategories;
    if (!functionCategoryBySales || functionCategoryBySales.length === 0) return [];
    return functionCategoryBySales.map(fc => fc.name);
  }, [allFunctionCategories, functionCategoryBySales]);

  // Category data with 영업이익 (using actual backend data)
  const categoryData = useMemo(() => {
    if (!functionCategoryBySales || functionCategoryBySales.length === 0) return [];
    let filtered = functionCategoryBySales;

    // Apply function category filter
    if (selectedFunctionCategories.length > 0) {
      filtered = filtered.filter(item => selectedFunctionCategories.includes(item.name));
    }

    return filtered.slice(0, 10).map((item) => ({
      name: item.name,
      totalSales: parseFloat((item.sales / WON).toFixed(1)),
      operatingProfit: parseFloat((item.operatingProfit / WON).toFixed(1)),
      opm: parseFloat(item.opm.toFixed(1)),
      salesRatio: parseFloat(item.salesRatio.toFixed(1)),
    }));
  }, [functionCategoryBySales, selectedFunctionCategories]);

  // Previous year category data
  const prevYearCategoryData = useMemo(() => {
    if (!prevYearFunctionCategoryBySales || prevYearFunctionCategoryBySales.length === 0) return [];
    let filtered = prevYearFunctionCategoryBySales;

    // Apply function category filter
    if (selectedFunctionCategories.length > 0) {
      filtered = filtered.filter(item => selectedFunctionCategories.includes(item.name));
    }

    return filtered.slice(0, 10).map((item) => ({
      name: item.name,
      totalSales: parseFloat((item.sales / WON).toFixed(1)),
      operatingProfit: parseFloat((item.operatingProfit / WON).toFixed(1)),
      opm: parseFloat(item.opm.toFixed(1)),
      salesRatio: parseFloat(item.salesRatio.toFixed(1)),
    }));
  }, [prevYearFunctionCategoryBySales, selectedFunctionCategories]);

  // Enhanced treemap data with 영업이익
  const enhancedTreemapData = useMemo(() => {
    if (!treemapData || treemapData.length === 0) return [];
    return treemapData.map((item) => ({
      ...item,
      salesLabel: `${item.size}억`,
      opm: 10.0, // Placeholder
    }));
  }, [treemapData]);

  // KPI calculations (based on all data, not just top 10)
  const summaryKPIs = useMemo(() => {
    // Calculate from all function categories (not just top 10)
    let allCategories = functionCategoryBySales || [];

    // Apply function category filter
    if (selectedFunctionCategories.length > 0) {
      allCategories = allCategories.filter(item => selectedFunctionCategories.includes(item.name));
    }

    const totalSalesInEok = allCategories.reduce((s, r) => s + r.sales / WON, 0);
    const totalOP = allCategories.reduce((s, r) => s + r.operatingProfit / WON, 0);
    const avg영업이익 = totalSalesInEok > 0 ? (totalOP / totalSalesInEok) * 100 : 0;

    return {
      totalSales: Math.round(totalSalesInEok),
      totalOP: Math.round(totalOP),
      avg영업이익: parseFloat(avg영업이익.toFixed(1)),
      categoryCount: functionCategoryBySales?.length || 0,
      formulationCount: treemapData?.length || 0,
      topCategory: categoryData[0],
    };
  }, [functionCategoryBySales, selectedFunctionCategories, treemapData, categoryData]);

  const detailData = useMemo(() => {
    let rows = detailRows ?? [];
    if (selectedFoodType !== "all") {
      rows = rows.filter((row) => row.foodType === selectedFoodType);
    }
    if (selectedFunctionCategories.length > 0) {
      rows = rows.filter((row) =>
        selectedFunctionCategories.includes(
          resolvedCategoryMode === "formulation" ? row.formulation : row.functionCategory
        )
      );
    }
    if (selectedFormulations.length > 0) {
      rows = rows.filter((row) => selectedFormulations.includes(row.formulation));
    }
    return rows.map((row) => ({
      foodType: row.foodType,
      functionCategory: row.functionCategory,
      formulation: row.formulation,
      totalSales: parseFloat((row.sales / WON).toFixed(1)),
      operatingProfit: parseFloat((row.operatingProfit / WON).toFixed(1)),
      opm: row.opm,
    }));
  }, [detailRows, selectedFoodType, selectedFunctionCategories, selectedFormulations]);

  // EARLY RETURN AFTER ALL HOOKS - Check if data is not loaded
  if (!formulationBySales || !foodTypeBySales || !functionCategoryBySales || !treemapData) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ color: "#64748b", fontSize: 14 }}>데이터 로딩 중...</p>
      </div>
    );
  }

  const handleFormulationClick = useCallback((formulation: string) => {
    setSelectedFormulations((prev) =>
      prev.includes(formulation)
        ? prev.filter((f) => f !== formulation)
        : [...prev, formulation]
    );
    onSelectFormType?.(formulation);
  }, [onSelectFormType]);

  const handleFoodTypeChange = useCallback((foodType: string | "all") => {
    setSelectedFoodType(foodType);
    if (onSelectFoodType) {
      onSelectFoodType(foodType === "all" ? "" : foodType);
    }
  }, [onSelectFoodType]);

  const handleFunctionCategoryToggle = useCallback((category: string) => {
    setSelectedFunctionCategories(prev => {
      const newCategories = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];

      // Notify parent component with comma-separated string
      if (onSelectFunctionCategory) {
        onSelectFunctionCategory(newCategories.length > 0 ? newCategories.join(',') : "");
      }

      return newCategories;
    });
  }, [onSelectFunctionCategory]);

  const handleSelectAllCategories = useCallback(() => {
    setSelectedFunctionCategories([...availableFunctionCategories]);
    // Notify parent component
    if (onSelectFunctionCategory) {
      onSelectFunctionCategory(availableFunctionCategories.join(','));
    }
  }, [availableFunctionCategories, onSelectFunctionCategory]);

  const handleClearCategories = useCallback(() => {
    setSelectedFunctionCategories([]);
    // Notify parent component
    if (onSelectFunctionCategory) {
      onSelectFunctionCategory("");
    }
  }, [onSelectFunctionCategory]);

  return (
    <div style={{ flex: 1, display: "flex", gap: 8, minHeight: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 160, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          padding: "5px 12px",
          border: "1px solid #e2e8f0",
          flexShrink: 0
        }}>
          <label style={{
            display: "block",
            fontSize: 10,
            fontWeight: 600,
            color: "#94a3b8",
            marginBottom: 4
          }}>
            회계연도
          </label>
          <select
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
              fontSize: 12,
              borderRadius: 8,
              padding: "6px 8px",
              outline: "none"
            }}
            value={selectedYearValue}
            onChange={(e) => onYearChange?.(e.target.value === "" ? undefined : e.target.value)}
          >
            <option value="">전체</option>
            {sortedYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        {/* Food Type Filter */}
        <div style={{
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          padding: 12,
          border: "1px solid #e2e8f0",
          flexShrink: 0
        }}>
          <label style={{
            display: "block",
            fontSize: 10,
            fontWeight: 600,
            color: "#94a3b8",
            marginBottom: 4
          }}>
            식품분류
          </label>
          <select
            style={{
              width: "100%",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#334155",
              fontSize: 12,
              borderRadius: 8,
              padding: "6px 8px",
              outline: "none"
            }}
            value={selectedFoodType}
            onChange={(e) => handleFoodTypeChange(e.target.value as string | "all")}
          >
            <option value="all">전체</option>
            {(availableFoodTypes || []).map((ft) => (
              <option key={ft} value={ft}>
                {ft}
              </option>
            ))}
          </select>
        </div>

        {/* Function Category Filter */}
        <div style={{
          background: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
          padding: 12,
          border: "1px solid #e2e8f0",
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
            color: "#334155",
            fontWeight: 600,
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: 6,
            flexShrink: 0
          }}>
            <h3 style={{ fontSize: 12 }}>{categoryLabel}</h3>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8, flexShrink: 0 }}>
            <button
              onClick={handleSelectAllCategories}
              style={{
                flex: 1,
                fontSize: 9,
                fontWeight: 500,
                padding: "4px 6px",
                borderRadius: 8,
                background: "#eff6ff",
                color: "#2563eb",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#dbeafe")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#eff6ff")}
            >
              전체선택
            </button>
            <button
              onClick={handleClearCategories}
              style={{
                flex: 1,
                fontSize: 9,
                fontWeight: 500,
                padding: "4px 6px",
                borderRadius: 8,
                background: "#f8fafc",
                color: "#64748b",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
            >
              해제
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2, maxHeight: 405, paddingRight: 4 }}>
            {(availableFunctionCategories || []).map((cat) => {
              const isChecked = selectedFunctionCategories.length === 0 || selectedFunctionCategories.includes(cat);
              return (
                <label
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "2px 6px",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleFunctionCategoryToggle(cat)}
                    style={{ width: 12, height: 12, accentColor: "#3b82f6", borderRadius: 4 }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: "#334155",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                    title={cat}
                  >
                    {cat}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minHeight: 0, minWidth: 0 }}>
        {/* KPI Cards */}
        <div style={{ height: 60, flexShrink: 0, display: "flex", gap: 6, marginTop: 8 }}>
          <div style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
            padding: "10px 10px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>제품매출</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 0 }}>
                {summaryKPIs.totalSales.toLocaleString()}
                <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginLeft: 4 }}>억</span>
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>카테고리</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginTop: 0 }}>{summaryKPIs.categoryCount}개</p>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
            padding: "10px 10px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>영업이익</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: summaryKPIs.totalOP >= 0 ? "#0f172a" : "#ef4444", marginTop: 0 }}>
                {summaryKPIs.totalOP.toLocaleString()}
                <span style={{ fontSize: 10, fontWeight: 500, color: "#64748b", marginLeft: 4 }}>억</span>
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>영업이익</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: summaryKPIs.avg영업이익 >= 0 ? "#10b981" : "#ef4444", marginTop: 0 }}>
                {summaryKPIs.avg영업이익.toFixed(1)}%
              </p>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
            padding: "10px 12px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>TOP 카테고리</p>
              <p style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#3b82f6",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 140,
                marginTop: 0
              }} title={summaryKPIs.topCategory?.name}>
                {summaryKPIs.topCategory?.name || "-"}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>매출</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#475569", marginTop: 0 }}>
                {summaryKPIs.topCategory?.totalSales.toLocaleString() || 0}억
              </p>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
            padding: "10px 10px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>제형 수</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 0 }}>
                {summaryKPIs.formulationCount}
                <span style={{ fontSize: 10, fontWeight: 500, marginLeft: 4 }}>개</span>
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}>식품분류</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", marginTop: 0 }}>
                {selectedFoodType === "all" ? "전체" : selectedFoodType}
              </p>
            </div>
          </div>
        </div>

        {/* Charts - Top Row */}
        <div style={{ height: 240, display: "flex", gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1.7, minWidth: 0 }}>
            <FunctionCategoryChart
              data={categoryData}
              prevYearData={prevYearCategoryData}
              currentYear={currentYear}
              prevYear={prevYear}
              title={`${categoryLabel}별 매출 & 영업이익 (Top 10)`}
              onCategorySelect={onSelectFunctionCategory}
            />
          </div>

          <div style={{ flex: 0.7, minWidth: 0 }}>
            <FormulationTreemap
              data={enhancedTreemapData}
              selectedFormulations={selectedFormulations}
              onCellClick={handleFormulationClick}
            />
          </div>
        </div>

        {/* Bottom Row - Table and Map */}
        <div style={{ height: 336, display: "flex", gap: 8, flexShrink: 0 }}>
          {/* Detail Table */}
          <div style={{ flex: 1.7, minWidth: 0 }}>
            <FormulationDetailTable
              data={detailData}
              categoryMode={resolvedCategoryMode}
              onDetailSelect={onDetailSelect}
            />
          </div>

          {/* World Map */}
          <div style={{ flex: 0.7, minWidth: 0, minHeight: 0 }}>
            <WorldSalesMap
              data={(countryBySales || []).map((item) => ({ name: item.name, value: item.value }))}
              title="국가별 매출 분포"
              onCountryClick={onCountrySelect}
              onExpand={onCountryExpand}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
