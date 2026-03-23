import { handleUnauthorized, httpDelete, httpGet, httpPost, httpPut } from "@/services/httpClient";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "@/services/authConfig";
import type { DashboardListResponse } from "@/types/dashboard";
import type { AggregateRequest, AggregateResponse, FilterOptions } from "@/types/customer";
import type {
  DashboardSnapshotResponse,
  GccAggregatedDataRequest,
  GccAggregatedDataResponse,
  HealthFunctionStatsResponse,
  SnapshotPreviewResponse
} from "@/types/snapshot";
import type { DashboardSnapshotListResponse } from "@/types/snapshotList";
import type { AIInsightRequest, AIInsightResponse } from "@/types/ai";

export const dashboardService = {
  listDashboards: async (): Promise<DashboardListResponse> => {
    return httpGet<DashboardListResponse>("/v1/dashboards");
  },

  createDashboard: async (data: {
    key: string;
    name: string;
    description?: string;
    is_public?: boolean;
  }): Promise<{ key: string; name: string; description: string | null; is_public?: boolean }> => {
    return httpPost("/v1/dashboards", data);
  },

  updateDashboard: async (
    dashboardKey: string,
    data: { name: string; description?: string; is_public?: boolean }
  ): Promise<{ key: string; name: string; description: string | null; is_public?: boolean }> => {
    return httpPut(`/v1/dashboards/${dashboardKey}`, data);
  },

  deleteDashboard: async (dashboardKey: string): Promise<void> => {
    await httpDelete(`/v1/dashboards/${dashboardKey}`);
  },

  deleteSnapshot: async ({
    dashboardKey,
    snapshotDate,
    feedKey
  }: {
    dashboardKey: string;
    snapshotDate: string;
    feedKey: string;
  }): Promise<void> => {
    await httpDelete(`/v1/dashboards/${dashboardKey}/snapshots/${snapshotDate}?feed_key=${encodeURIComponent(feedKey)}`);
  },

  getDashboardSnapshot: async ({
    dashboardKey,
    date,
    columns
  }: {
    dashboardKey: string;
    date?: string;
    columns?: string[];
  }): Promise<DashboardSnapshotResponse> => {
    const search = new URLSearchParams();
    if (date) search.set("date", date);
    if (columns && columns.length > 0) search.set("columns", columns.join(","));
    const qs = search.toString();
    return httpGet<DashboardSnapshotResponse>(
      `/v1/dashboards/${dashboardKey}/snapshots${qs ? `?${qs}` : ""}`
    );
  },

  listSnapshots: async (dashboardKey: string): Promise<DashboardSnapshotListResponse> => {
    return httpGet<DashboardSnapshotListResponse>(`/v1/dashboards/${dashboardKey}/snapshots/list`);
  },

  getSnapshotPreview: async ({
    dashboardKey,
    date,
    feedKey,
    offset,
    limit,
    compid,
    startMonth,
    endMonth
  }: {
    dashboardKey: string;
    date?: string;
    feedKey?: string;
    offset?: number;
    limit?: number;
    compid?: string;
    startMonth?: string;
    endMonth?: string;
  }): Promise<SnapshotPreviewResponse> => {
    const search = new URLSearchParams();
    if (date) search.set("date", date);
    if (feedKey) search.set("feed_key", feedKey);
    if (offset !== undefined) search.set("offset", String(offset));
    if (limit !== undefined) search.set("limit", String(limit));
    if (compid) search.set("compid", compid);
    if (startMonth) search.set("start_month", startMonth);
    if (endMonth) search.set("end_month", endMonth);
    const qs = search.toString();
    return httpGet<SnapshotPreviewResponse>(
      `/v1/dashboards/${dashboardKey}/snapshots/preview${qs ? `?${qs}` : ""}`
    );
  },

  getHealthFunctionStats: async ({
    dashboardKey,
    date,
    feedKey,
    year,
    quarter,
    customer,
    productName,
    formType,
    functionName,
    bizUnit,
    companyCode,
    evaluationClass,
    businessArea,
    salesCountry,
    procurementType,
    distributionChannel,
    distributionChannelDetail,
    foodType,
    periodStart,
    periodEnd,
    includeAllEvalClass
  }: {
    dashboardKey: string;
    date?: string;
    feedKey?: string;
    year?: string;
    quarter?: string;
    customer?: string;
    productName?: string;
    formType?: string;
    functionName?: string;
    bizUnit?: string;
    companyCode?: string;
    evaluationClass?: string;
    businessArea?: string;
    salesCountry?: string;
    procurementType?: string;
    distributionChannel?: string;
    distributionChannelDetail?: string;
    foodType?: string;
    periodStart?: number;
    periodEnd?: number;
    includeAllEvalClass?: boolean;
  }): Promise<HealthFunctionStatsResponse> => {
    const search = new URLSearchParams();
    if (date) search.set("date", date);
    if (feedKey) search.set("feed_key", feedKey);
    if (year) search.set("year", year);
    if (quarter) search.set("quarter", quarter);
    if (customer) search.set("customer", customer);
    if (productName) search.set("product", productName);
    if (formType) search.set("form_type", formType);
    if (functionName) search.set("function", functionName);
    if (bizUnit) search.set("biz_unit", bizUnit);
    if (companyCode) search.set("company_code", companyCode);
    if (evaluationClass) search.set("evaluation_class", evaluationClass);
    if (businessArea) search.set("business_area", businessArea);
    if (salesCountry) search.set("sales_country", salesCountry);
    if (procurementType) search.set("procurement_type", procurementType);
    if (distributionChannel) search.set("distribution_channel", distributionChannel);
    if (distributionChannelDetail) search.set("distribution_channel_detail", distributionChannelDetail);
    if (foodType) search.set("food_type", foodType);
    if (periodStart !== undefined) search.set("period_start", String(periodStart));
    if (periodEnd !== undefined) search.set("period_end", String(periodEnd));
    if (includeAllEvalClass === true) search.set("include_all_eval_class", "true");
    const qs = search.toString();
    const url = `/v1/dashboards/${dashboardKey}/stats/health-function${qs ? `?${qs}` : ""}`;
    console.log("🔍 [DEBUG] API Request:", { url, formType, allParams: Object.fromEntries(search.entries()) });
    return httpGet<HealthFunctionStatsResponse>(url);
  },

  getHealthFunctionAIInsight: async ({
    dashboardKey,
    payload,
  }: {
    dashboardKey: string;
    payload: AIInsightRequest;
  }): Promise<AIInsightResponse> => {
    return httpPost<AIInsightResponse>(`/v1/dashboards/${dashboardKey}/ai/insight`, payload);
  },

  uploadSnapshot: async ({
    dashboardKey,
    file,
    feedKey,
    date,
    columns
  }: {
    dashboardKey: string;
    file: File;
    feedKey?: string;
    date?: string;
    columns?: string;
  }): Promise<DashboardSnapshotResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const search = new URLSearchParams();
    if (feedKey) search.set("feed_key", feedKey);
    if (date) search.set("date", date);
    if (columns) search.set("columns", columns);
    const qs = search.toString();
    const url = `/v1/dashboards/${dashboardKey}/snapshots/upload${qs ? `?${qs}` : ""}`;

    const headers = new Headers();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers,
      body: formData
    });
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      const text = await res.text();
      throw new Error(`Upload failed (${res.status}): ${text}`);
    }
    return (await res.json()) as DashboardSnapshotResponse;
  },

  uploadSnapshotDirect: async ({
    dashboardKey,
    feedKey,
    snapshotDate,
    columns,
    rows
  }: {
    dashboardKey: string;
    feedKey: string;
    snapshotDate?: string;
    columns: string[];
    rows: (string | number | null)[][];
  }): Promise<DashboardSnapshotResponse> => {
    return httpPost<DashboardSnapshotResponse>(
      `/v1/dashboards/${dashboardKey}/snapshots/direct`,
      {
        feed_key: feedKey,
        snapshot_date: snapshotDate,
        columns,
        rows
      }
    );
  },

  downloadSnapshotFile: async ({
    dashboardKey,
    date,
    feedKey,
    format
  }: {
    dashboardKey: string;
    date?: string;
    feedKey?: string;
    format?: "parquet" | "schema" | "preview";
  }): Promise<{ blob: Blob; filename: string }> => {
    const search = new URLSearchParams();
    if (date) search.set("date", date);
    if (feedKey) search.set("feed_key", feedKey);
    if (format) search.set("file_format", format);
    const qs = search.toString();
    const url = `/v1/dashboards/${dashboardKey}/snapshots/file${qs ? `?${qs}` : ""}`;

    const headers = new Headers();
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: "GET",
      headers
    });
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized();
      }
      const text = await res.text();
      throw new Error(`Download failed (${res.status}): ${text}`);
    }

    const disposition = res.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const filename = match?.[1] ?? `snapshot.${format ?? "parquet"}`;
    const blob = await res.blob();
    return { blob, filename };
  },

  getCustomerFilters: async (dashboardKey: string, feedKey?: string): Promise<FilterOptions> => {
    const qs = feedKey ? `?feed_key=${encodeURIComponent(feedKey)}` : "";
    return httpGet<FilterOptions>(`/v1/dashboards/${dashboardKey}/filters${qs}`);
  },

  aggregateCustomer: async ({
    dashboardKey,
    payload
  }: {
    dashboardKey: string;
    payload: AggregateRequest;
  }): Promise<AggregateResponse> => {
    return httpPost<AggregateResponse>(`/v1/dashboards/${dashboardKey}/aggregate`, payload);
  },

  getGccAggregatedData: async (payload: GccAggregatedDataRequest): Promise<GccAggregatedDataResponse> => {
    return httpPost<GccAggregatedDataResponse>(`/v1/dashboards/gcc/aggregated-data`, payload);
  }
};
