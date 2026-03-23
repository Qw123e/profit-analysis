/**
 * 목표 설정 관련 타입 정의
 */

/** 단일 월별 목표 */
export interface TargetItem {
  year: number;
  month: number;
  sales_target: number;
  op_target: number;
  company_code?: string | null;
}

/** 목표 저장 요청 */
export interface TargetUpdateRequest {
  targets: TargetItem[];
}

/** 목표 목록 응답 */
export interface TargetListResponse {
  dashboard_key: string;
  targets: TargetItem[];
}

/** KPI 신호등 임계값 */
export interface ThresholdConfig {
  green_min: number;
  yellow_min: number;
}

/** 임계값 응답 */
export interface ThresholdResponse {
  dashboard_key: string;
  green_min: number;
  yellow_min: number;
}

/** KPI 상태 (신호등) */
export type KPIStatus = 'green' | 'yellow' | 'red' | 'gray';

/** KPI 상태 라벨 */
export const KPI_STATUS_LABELS: Record<KPIStatus, string> = {
  green: '달성',
  yellow: '주의',
  red: '미달',
  gray: '목표 미설정',
};

/** KPI 상태 색상 */
export const KPI_STATUS_COLORS: Record<KPIStatus, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  gray: '#9ca3af',
};

/**
 * 달성률 기반 KPI 상태 계산
 */
export function getKPIStatus(
  achievementRate: number | null,
  threshold: ThresholdConfig
): KPIStatus {
  if (achievementRate === null) return 'gray';
  if (achievementRate >= threshold.green_min) return 'green';
  if (achievementRate >= threshold.yellow_min) return 'yellow';
  return 'red';
}

/**
 * 달성률 계산
 */
export function calculateAchievementRate(
  actual: number,
  target: number
): number | null {
  if (target === 0) return null;
  return (actual / target) * 100;
}
