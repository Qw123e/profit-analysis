"use client";

import useSWR from "swr";

import { targetService } from "@/services/targetService";
import type {
  TargetItem,
  TargetListResponse,
  TargetUpdateRequest,
  ThresholdConfig,
  ThresholdResponse,
} from "@/types/target";

const DEFAULT_THRESHOLD: ThresholdConfig = {
  green_min: 100,
  yellow_min: 90,
};

interface UseTargetDataOptions {
  dashboardKey: string;
  year?: number;
  companyCode?: string;
}

export function useTargetData({ dashboardKey, year, companyCode }: UseTargetDataOptions) {
  // 목표 데이터 조회
  const {
    data: targetData,
    error: targetError,
    isLoading: targetLoading,
    mutate: mutateTargets,
  } = useSWR<TargetListResponse>(
    dashboardKey ? ["targets", dashboardKey, year, companyCode] : null,
    () => targetService.getTargets(dashboardKey, year, companyCode),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // 임계값 조회
  const {
    data: thresholdData,
    error: thresholdError,
    isLoading: thresholdLoading,
    mutate: mutateThreshold,
  } = useSWR<ThresholdResponse>(
    dashboardKey ? ["threshold", dashboardKey] : null,
    () => targetService.getThreshold(dashboardKey),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  // 목표 저장 (관리자 전용)
  const saveTargets = async (targets: TargetItem[]) => {
    const request: TargetUpdateRequest = { targets };
    const result = await targetService.saveTargets(dashboardKey, request);
    await mutateTargets(result, false);
    return result;
  };

  // 목표 삭제 (관리자 전용)
  const deleteTargets = async (targetYear?: number) => {
    const result = await targetService.deleteTargets(dashboardKey, targetYear, companyCode);
    await mutateTargets();
    return result;
  };

  // 임계값 저장 (관리자 전용)
  const saveThreshold = async (config: ThresholdConfig) => {
    const result = await targetService.saveThreshold(dashboardKey, config);
    await mutateThreshold(result, false);
    return result;
  };

  // 특정 연월의 목표 조회
  const getTargetForMonth = (
    targetYear: number,
    targetMonth: number
  ): TargetItem | undefined => {
    return targetData?.targets.find(
      (t) => t.year === targetYear && t.month === targetMonth
    );
  };

  // 현재 임계값 (없으면 기본값)
  const threshold: ThresholdConfig = thresholdData
    ? { green_min: thresholdData.green_min, yellow_min: thresholdData.yellow_min }
    : DEFAULT_THRESHOLD;

  return {
    // 목표 데이터
    targets: targetData?.targets ?? [],
    targetError,
    targetLoading,
    mutateTargets,

    // 임계값 데이터
    threshold,
    thresholdError,
    thresholdLoading,
    mutateThreshold,

    // 액션
    saveTargets,
    deleteTargets,
    saveThreshold,

    // 유틸리티
    getTargetForMonth,

    // 전체 로딩/에러 상태
    isLoading: targetLoading || thresholdLoading,
    error: targetError || thresholdError,
  };
}
