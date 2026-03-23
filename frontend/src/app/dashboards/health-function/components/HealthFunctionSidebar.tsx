"use client";

import React from "react";

import { GaugeChart } from "@/components/charts/GaugeChart";
import { CheckboxFilterList } from "@/components/molecules/CheckboxFilterList";
import { DAFilterCard } from "@/components/molecules/DAFilterCard";
import { PeriodRangeSlider } from "@/components/molecules/PeriodRangeSlider";
import { COUNTRY_NAMES_KO } from "@/components/charts/WorldSalesMap";
import type { FilterValue } from "@/types/common";
import type { HealthFunctionFilterOptions } from "@/types/snapshot";

import { InsightBannerCard } from "./InsightBannerCard";

interface OverviewFilters {
  companyCode: FilterValue;
  year: FilterValue;
  quarter: FilterValue;
  month: FilterValue;
  evaluationClass: FilterValue;
  businessArea: FilterValue;
  salesCountry: FilterValue;
  procurementType: FilterValue;
  distributionChannel: FilterValue;
  distributionChannelDetail: FilterValue;
  customer: FilterValue;
  bizUnit: FilterValue;
}

interface ChannelFilters {
  selectedChannels: string[];
  formType: FilterValue;
}

interface FormulationFilters {
  formType: FilterValue;
  functionCategory: FilterValue;
  foodType: FilterValue;
}

type ChartTab = "overview" | "channel" | "function" | "formulation" | "scatter";
type ScatterQuadrant = "ALL" | "HH" | "HL" | "LH" | "LL";

interface HealthFunctionSidebarProps {
  chartTab: ChartTab;
  overviewFilters: OverviewFilters;
  setOverviewFilters: React.Dispatch<React.SetStateAction<OverviewFilters>>;
  channelFilters: ChannelFilters;
  setChannelFilters: React.Dispatch<React.SetStateAction<ChannelFilters>>;
  formulationFilters: FormulationFilters;
  setFormulationFilters: React.Dispatch<React.SetStateAction<FormulationFilters>>;
  scatterQuadrant?: ScatterQuadrant;
  setScatterQuadrant?: (val: ScatterQuadrant) => void;
  allFilterOptions: HealthFunctionFilterOptions | null;
  healthFilterOptions: HealthFunctionFilterOptions | null;
  availableChannels: string[];
  hasPeriodRange: boolean;
  periodStart: number | undefined;
  periodEnd: number | undefined;
  setPeriodStart: React.Dispatch<React.SetStateAction<number | undefined>>;
  setPeriodEnd: React.Dispatch<React.SetStateAction<number | undefined>>;
  currentSales: number;
  totalSalesTarget: number;
  insightText: string;
}

// Helper functions to convert between FilterValue and string[]
function toStringArray(value: FilterValue): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') {
    return value.includes(',') ? value.split(',').filter(Boolean) : value ? [value] : [];
  }
  if (typeof value === 'number') return [String(value)];
  return [];
}

function fromStringArray(arr: string[]): FilterValue {
  if (arr.length === 0) return undefined;
  return arr.join(',');
}

// Compact multi-select dropdown component
interface CompactMultiSelectProps {
  label: string;
  selectedValues: string[];
  options: string[];
  onChange: (selected: string[]) => void;
  labelStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
}

function CompactMultiSelect({ label, selectedValues, options, onChange, labelStyle, selectStyle }: CompactMultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = (option: string) => {
    if (selectedValues.includes(option)) {
      const newSelected = selectedValues.filter((v) => v !== option);
      // If deselecting would result in all items being deselected, treat as "all"
      onChange(newSelected);
    } else {
      const newSelected = [...selectedValues, option];
      // If selecting would result in all items being selected, treat as "all" (empty array)
      if (newSelected.length === options.length) {
        onChange([]);
      } else {
        onChange(newSelected);
      }
    }
  };

  const handleSelectAll = () => {
    // Empty array means "all" (no filter)
    onChange([]);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayText = selectedValues.length === 0
    ? "전체"
    : selectedValues.length === options.length
      ? "전체"
      : `${selectedValues.length}개 선택됨`;

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <label style={labelStyle}>{label}</label>
      <button
        type="button"
        style={{
          ...selectStyle,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "left"
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayText}
        </span>
        <span style={{ marginLeft: 4 }}>▼</span>
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 2,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            boxShadow: "0 4px 6px rgba(15, 23, 42, 0.1)",
            zIndex: 9999,
            maxHeight: 200,
            overflowY: "auto"
          }}
        >
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                flex: 1,
                padding: "4px 6px",
                fontSize: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                cursor: "pointer",
                color: "#64748b",
                fontWeight: 600
              }}
            >
              전체선택
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                flex: 1,
                padding: "4px 6px",
                fontSize: 10,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                cursor: "pointer",
                color: "#64748b",
                fontWeight: 600
              }}
            >
              선택해제
            </button>
          </div>
          {options.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 8px",
                cursor: "pointer",
                fontSize: 12,
                color: "#334155",
                borderBottom: "1px solid #f8fafc",
                background: selectedValues.includes(opt) ? "#f8fafc" : "transparent"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selectedValues.includes(opt) ? "#f8fafc" : "transparent";
              }}
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(opt)}
                onChange={() => handleToggle(opt)}
                style={{ marginRight: 6, cursor: "pointer" }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function HealthFunctionSidebar({
  chartTab,
  overviewFilters,
  setOverviewFilters,
  channelFilters,
  setChannelFilters,
  formulationFilters,
  setFormulationFilters,
  scatterQuadrant,
  setScatterQuadrant,
  allFilterOptions,
  healthFilterOptions,
  availableChannels,
  hasPeriodRange,
  periodStart,
  periodEnd,
  setPeriodStart,
  setPeriodEnd,
  currentSales,
  totalSalesTarget,
  insightText,
}: HealthFunctionSidebarProps) {
  const years = allFilterOptions?.years ?? healthFilterOptions?.years ?? [];
  const quarters = allFilterOptions?.quarters ?? healthFilterOptions?.quarters ?? [];
  const salesCountryCodes = allFilterOptions?.salesCountries ?? healthFilterOptions?.salesCountries ?? [];

  // Transform country codes to Korean names for display
  const salesCountries = React.useMemo(() => {
    return salesCountryCodes.map(code => COUNTRY_NAMES_KO[code] || code);
  }, [salesCountryCodes]);

  // Create reverse mapping (Korean name -> code)
  const countryNameToCode = React.useMemo(() => {
    const map: Record<string, string> = {};
    salesCountryCodes.forEach(code => {
      const name = COUNTRY_NAMES_KO[code] || code;
      map[name] = code;
    });
    return map;
  }, [salesCountryCodes]);

  // Helper to convert country codes to names for display
  const countryCodeToNames = React.useCallback((value: FilterValue): string[] => {
    const codes = toStringArray(value);
    return codes.map(code => COUNTRY_NAMES_KO[code] || code);
  }, []);

  // Helper to convert selected country names back to codes
  const countryNamesToCodes = React.useCallback((names: string[]): FilterValue => {
    if (names.length === 0) return undefined;
    const codes = names.map(name => countryNameToCode[name] || name);
    return codes.join(',');
  }, [countryNameToCode]);

  const distributionChannelDetails = React.useMemo(() => {
    const raw = allFilterOptions?.distributionChannelDetails ?? healthFilterOptions?.distributionChannelDetails ?? [];
    // Remove duplicates using Set
    return Array.from(new Set(raw));
  }, [allFilterOptions?.distributionChannelDetails, healthFilterOptions?.distributionChannelDetails]);
  const formTypes = allFilterOptions?.formTypes ?? healthFilterOptions?.formTypes ?? [];
  const foodTypes = allFilterOptions?.foodTypes ?? healthFilterOptions?.foodTypes ?? [];
  const functionCategories = allFilterOptions?.functionCategories ?? healthFilterOptions?.functionCategories ?? [];
  const companyCodes = allFilterOptions?.companyCodes ?? healthFilterOptions?.companyCodes ?? [];
  const selectStyle: React.CSSProperties = {
    width: "100%",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#334155",
    fontSize: 12,
    borderRadius: 8,
    padding: "6px 8px",
    outline: "none"
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 4
  };

  const renderCompactSelect = (
    label: string,
    value: FilterValue,
    options: string[],
    onChange: (val: FilterValue) => void
  ) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        style={selectStyle}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      >
        <option value="">전체</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );

  const renderCompactMultiSelect = (
    label: string,
    selectedValues: string[],
    options: string[],
    onChange: (selected: string[]) => void
  ) => (
    <CompactMultiSelect
      label={label}
      selectedValues={selectedValues}
      options={options}
      onChange={onChange}
      labelStyle={labelStyle}
      selectStyle={selectStyle}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
      {chartTab === "overview" && (
        <div style={{ height: 170 }}>
          <GaugeChart
            title="목표 달성률"
            current={currentSales}
            target={totalSalesTarget || 500000000000}
            height={170}
          />
        </div>
      )}

      {chartTab === "overview" && (
        <div style={{ height: 539, marginTop: 80 }}>
          <DAFilterCard title="분석 조건">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 414, overflowY: "visible", paddingRight: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 10, rowGap: 8 }}>
                {renderCompactSelect("회계연도", overviewFilters.year, years, (val) =>
                  setOverviewFilters((prev) => ({ ...prev, year: val }))
                )}
                {renderCompactSelect("분기", overviewFilters.quarter, quarters, (val) =>
                  setOverviewFilters((prev) => ({ ...prev, quarter: val }))
                )}
              </div>

              <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {renderCompactMultiSelect(
                  "채널",
                  toStringArray(overviewFilters.distributionChannelDetail),
                  distributionChannelDetails,
                  (selected) => setOverviewFilters((prev) => ({ ...prev, distributionChannelDetail: fromStringArray(selected) }))
                )}
                {renderCompactMultiSelect(
                  "식품분류",
                  toStringArray(formulationFilters.foodType),
                  foodTypes,
                  (selected) => setFormulationFilters((prev) => ({ ...prev, foodType: fromStringArray(selected) }))
                )}
                {renderCompactMultiSelect(
                  "제형",
                  toStringArray(formulationFilters.formType),
                  formTypes,
                  (selected) => setFormulationFilters((prev) => ({ ...prev, formType: fromStringArray(selected) }))
                )}
                {renderCompactMultiSelect(
                  "기능",
                  toStringArray(formulationFilters.functionCategory),
                  functionCategories,
                  (selected) => setFormulationFilters((prev) => ({ ...prev, functionCategory: fromStringArray(selected) }))
                )}
                {renderCompactMultiSelect(
                  "국가",
                  countryCodeToNames(overviewFilters.salesCountry),
                  salesCountries,
                  (selected) => setOverviewFilters((prev) => ({ ...prev, salesCountry: countryNamesToCodes(selected) }))
                )}
              </div>
            </div>
          </DAFilterCard>
        </div>
      )}

      {chartTab === "channel" && (
        <>
          <DAFilterCard title="분석 조건">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {renderCompactSelect("회사코드", overviewFilters.companyCode, companyCodes, (val) =>
                setOverviewFilters((prev) => ({ ...prev, companyCode: val }))
              )}
              {renderCompactSelect("회계연도", overviewFilters.year, years, (val) =>
                setOverviewFilters((prev) => ({ ...prev, year: val }))
              )}
              {renderCompactSelect("분기", overviewFilters.quarter, quarters, (val) =>
                setOverviewFilters((prev) => ({ ...prev, quarter: val }))
              )}
              <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
              {renderCompactMultiSelect(
                "제형",
                toStringArray(channelFilters.formType),
                formTypes,
                (selected) => setChannelFilters((prev) => ({ ...prev, formType: fromStringArray(selected) }))
              )}
            </div>
          </DAFilterCard>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              height: 405,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <CheckboxFilterList
              label="채널 필터"
              options={availableChannels}
              selected={channelFilters.selectedChannels}
              onChange={(selected) => setChannelFilters((prev) => ({ ...prev, selectedChannels: selected }))}
              height="100%"
            />
          </div>
        </>
      )}

      {chartTab === "function" && (
        <>
          <DAFilterCard title="분석 조건">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {renderCompactSelect("회계연도", overviewFilters.year, years, (val) =>
                setOverviewFilters((prev) => ({ ...prev, year: val }))
              )}
              {renderCompactSelect("분기", overviewFilters.quarter, quarters, (val) =>
                setOverviewFilters((prev) => ({ ...prev, quarter: val }))
              )}
              <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />
              {renderCompactMultiSelect(
                "제형",
                toStringArray(formulationFilters.formType),
                formTypes,
                (selected) => setFormulationFilters((prev) => ({ ...prev, formType: fromStringArray(selected) }))
              )}
              {renderCompactMultiSelect(
                "식품분류",
                toStringArray(formulationFilters.foodType),
                foodTypes,
                (selected) => setFormulationFilters((prev) => ({ ...prev, foodType: fromStringArray(selected) }))
              )}
              {renderCompactMultiSelect(
                "기능",
                toStringArray(formulationFilters.functionCategory),
                functionCategories,
                (selected) => setFormulationFilters((prev) => ({ ...prev, functionCategory: fromStringArray(selected) }))
              )}
            </div>
          </DAFilterCard>
          <div style={{ height: 160 }}>
            <GaugeChart
              title="목표 달성률"
              current={currentSales}
              target={totalSalesTarget || 500000000000}
              height={160}
            />
          </div>
        </>
      )}

      {chartTab === "formulation" && (
        <div style={{ height: 377 }}>
          <DAFilterCard title="분석 조건">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 306, overflowY: "auto", paddingRight: 6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 10, rowGap: 8 }}>
                {renderCompactSelect("회계연도", overviewFilters.year, years, (val) =>
                  setOverviewFilters((prev) => ({ ...prev, year: val }))
                )}
                {renderCompactSelect("분기", overviewFilters.quarter, quarters, (val) =>
                  setOverviewFilters((prev) => ({ ...prev, quarter: val }))
                )}
              </div>

              <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {renderCompactMultiSelect(
                  "채널",
                  toStringArray(overviewFilters.distributionChannelDetail),
                  distributionChannelDetails,
                  (selected) => setOverviewFilters((prev) => ({ ...prev, distributionChannelDetail: fromStringArray(selected) }))
                )}
                {renderCompactMultiSelect(
                  "식품분류",
                  toStringArray(formulationFilters.foodType),
                  foodTypes,
                  (selected) => setFormulationFilters((prev) => ({ ...prev, foodType: fromStringArray(selected) }))
                )}
                {renderCompactMultiSelect(
                  "기능",
                  toStringArray(formulationFilters.functionCategory),
                  functionCategories,
                  (selected) => setFormulationFilters((prev) => ({ ...prev, functionCategory: fromStringArray(selected) }))
                )}
                {renderCompactMultiSelect(
                  "국가",
                  countryCodeToNames(overviewFilters.salesCountry),
                  salesCountries,
                  (selected) => setOverviewFilters((prev) => ({ ...prev, salesCountry: countryNamesToCodes(selected) }))
                )}
              </div>
            </div>
          </DAFilterCard>
        </div>
      )}

      {chartTab === "scatter" && hasPeriodRange && (
        <>
          <DAFilterCard title="분석 조건">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {renderCompactSelect("회계연도", overviewFilters.year, years, (val) =>
                setOverviewFilters((prev) => ({ ...prev, year: val }))
              )}
              {renderCompactSelect("분기", overviewFilters.quarter, quarters, (val) =>
                setOverviewFilters((prev) => ({ ...prev, quarter: val }))
              )}
              <PeriodRangeSlider
                minPeriod={healthFilterOptions?.minPeriod ?? 0}
                maxPeriod={healthFilterOptions?.maxPeriod ?? 0}
                startValue={periodStart ?? healthFilterOptions?.minPeriod ?? 0}
                endValue={periodEnd ?? healthFilterOptions?.maxPeriod ?? 0}
                onStartChange={setPeriodStart}
                onEndChange={setPeriodEnd}
              />
            </div>
          </DAFilterCard>
          <CheckboxFilterList
            label="사분면 필터"
            options={["Star", "Cash Cow", "Question", "Dog"]}
            selected={
              scatterQuadrant && scatterQuadrant !== "ALL"
                ? [
                    scatterQuadrant === "HH"
                      ? "Star"
                      : scatterQuadrant === "HL"
                        ? "Cash Cow"
                        : scatterQuadrant === "LH"
                          ? "Question"
                          : "Dog"
                  ]
                : []
            }
            onChange={(selected) => {
              if (!selected.length) {
                setScatterQuadrant?.("ALL");
                return;
              }
              const last = selected[selected.length - 1];
              const next =
                last === "Star"
                  ? "HH"
                  : last === "Cash Cow"
                    ? "HL"
                    : last === "Question"
                      ? "LH"
                      : "LL";
              setScatterQuadrant?.(next);
            }}
            maxHeight={200}
            showSearch={false}
            showSelectAll={false}
          />
          <div style={{ height: 160 }}>
            <GaugeChart
              title="목표 달성률"
              current={currentSales}
              target={totalSalesTarget || 500000000000}
              height={160}
            />
          </div>
        </>
      )}

      {chartTab === "formulation" && (
        <div style={{ height: 203 }}>
          <GaugeChart
            title="목표 달성률"
            current={currentSales}
            target={totalSalesTarget || 500000000000}
            height={203}
          />
        </div>
      )}
    </div>
  );
}
