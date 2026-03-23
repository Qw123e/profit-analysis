import { httpGet, httpPut, httpDelete } from "@/services/httpClient";
import type {
  TargetListResponse,
  TargetUpdateRequest,
  ThresholdConfig,
  ThresholdResponse,
} from "@/types/target";

export const targetService = {
  /**
   * 대시보드 목표 조회
   */
  getTargets: async (
    dashboardKey: string,
    year?: number,
    companyCode?: string
  ): Promise<TargetListResponse> => {
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (companyCode) params.set("company_code", companyCode);
    const qs = params.toString();
    return httpGet<TargetListResponse>(
      `/v1/dashboards/${dashboardKey}/targets${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * 대시보드 목표 저장 (관리자 전용)
   */
  saveTargets: async (
    dashboardKey: string,
    request: TargetUpdateRequest
  ): Promise<TargetListResponse> => {
    return httpPut<TargetListResponse>(
      `/v1/dashboards/${dashboardKey}/targets`,
      request
    );
  },

  /**
   * 대시보드 목표 삭제 (관리자 전용)
   */
  deleteTargets: async (
    dashboardKey: string,
    year?: number,
    companyCode?: string
  ): Promise<{ deleted: number }> => {
    const params = new URLSearchParams();
    if (year) params.set("year", String(year));
    if (companyCode) params.set("company_code", companyCode);
    const qs = params.toString();
    await httpDelete(`/v1/dashboards/${dashboardKey}/targets${qs ? `?${qs}` : ""}`);
    return { deleted: 1 };
  },

  /**
   * 임계값 조회
   */
  getThreshold: async (dashboardKey: string): Promise<ThresholdResponse> => {
    return httpGet<ThresholdResponse>(
      `/v1/dashboards/${dashboardKey}/threshold`
    );
  },

  /**
   * 임계값 저장 (관리자 전용)
   */
  saveThreshold: async (
    dashboardKey: string,
    config: ThresholdConfig
  ): Promise<ThresholdResponse> => {
    return httpPut<ThresholdResponse>(
      `/v1/dashboards/${dashboardKey}/threshold`,
      config
    );
  },
};
