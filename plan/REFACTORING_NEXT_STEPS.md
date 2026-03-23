# Refactoring Next Steps (20241207_NBT_BI)

## 목적
- 운영 안정성과 유지보수성을 높이기 위한 추가 리팩토링 후보를 정리합니다.
- 기존 `docs/REFACTORING_RECOMMENDATIONS.md`에 없는 항목 위주로 작성합니다.
- 스냅샷은 파일 기반(parquet/JSON), UI는 코드 기반으로 유지하는 전제를 따릅니다.

## 후보 목록

### Backend

1) 자동 프론트 파일 생성 경로 하드코딩 제거
- 문제: `DashboardService`가 `/app/templates`와 `/app/frontend_dashboards`를 하드코딩.
- 영향: 로컬/비컨테이너 실행 시 실패 가능.
- 제안:
  - `app/core/config.py`에 `frontend_template_path`, `frontend_dashboard_dir` 추가.
  - 환경변수로 오버라이드 가능하게 구성.
  - 실패 시 경고 로그만 남기고 정상 API 응답 유지.

2) 인증 서비스 선택적 비활성화 옵션
- 문제: 코드 상으로는 모든 보호 API가 auth_service 의존.
- 영향: auth_service 다운 시 서비스 전체 장애.
- 제안:
  - `AUTH_REQUIRED`(bool) 옵션 추가.
  - false일 때는 mock user 또는 익명 사용자로 처리.
  - 운영에서는 true 유지.

3) Snapshot 로딩 캐시 무효화 전략
- 문제: `_load_json_any`의 LRU 캐시가 파일 변경 후에도 최신 반영 안 될 수 있음.
- 제안:
  - 캐시 키에 파일 mtime 포함 또는
  - 업로드/삭제 시 해당 uri 캐시 명시 제거.

4) 로깅 표준화
- 문제: 서비스 레이어에서 `print` 사용.
- 제안:
  - `app/core/logging.py` 로거 사용.
  - snapshot ingest/load 시간은 debug 레벨로 통일.

5) 스냅샷 파일 포맷 판단 로직 정리
- 문제: `SnapshotService.ingest_snapshot_from_file`가 다중 분기/예외가 길어짐.
- 제안:
  - 파일 확장자별 reader를 dict로 관리.
  - Excel 엔진 fallback을 별도 함수로 분리.

### Frontend

1) 자동 생성 템플릿의 컴포넌트 사용 표준화
- 문제: 템플릿이 인라인 ErrorBoundary/TabButton를 포함.
- 제안:
  - `frontend/src/components/molecules/ErrorBoundary.tsx`와 `TabButton` 사용하도록 템플릿 수정.
  - 기존 자동 생성 대시보드도 점진적 교체.

2) basePath 설정 단일화
- 문제: nginx에서 `/bi_poc` 경로 사용, 프론트 구성은 환경변수 의존.
- 제안:
  - `NEXT_PUBLIC_BASE_PATH`를 명시하고 `next.config.js`와 라우팅 유틸에서 일치시키기.

3) 스냅샷 preview/filters 공통 훅 정리
- 문제: 각 페이지에서 pagination/preview 로직 반복.
- 제안:
  - `useSnapshotPreview` 훅 추가, 공통 pagination 상태 관리.

### Infra/운영

1) 배치 스냅샷 잡 구현
- 문제: `run_snapshot_job.py` 미구현.
- 제안:
  - AthenaClient + SnapshotService 연결.
  - 락(파일/DB)으로 중복 실행 방지.

2) 환경변수 문서 단일화
- 문제: README/설정 문서에 환경변수 정보 분산.
- 제안:
  - `.env.example`와 `docs/OPERATIONS_RUNBOOK.md`에 최소 변수 목록 통합.

## 우선순위 제안
- High: Backend 1, 2, 3 / Infra 1
- Medium: Backend 4, 5 / Frontend 1
- Low: Frontend 2, 3 / Infra 2

## 실행 순서(권장)
1) Backend 1-3 (운영 안정성)
2) Infra 1 (스냅샷 자동화)
3) Frontend 1 (템플릿 표준화)
4) 나머지 항목 (개선 주기별 진행)

## 실행 계획 (상세)

### Phase 1: Backend 안정화 (1~2일)
1) 설정 경로 외부화
   - 파일: `20241207_NBT_BI/bi_service_poc/backend/app/core/config.py`
   - 변경: `frontend_template_path`, `frontend_dashboard_dir` 추가
   - 후속: `DashboardService`에서 하드코딩 경로 제거
2) Auth 선택적 비활성화
   - 파일: `20241207_NBT_BI/bi_service_poc/backend/app/core/config.py`
   - 파일: `20241207_NBT_BI/bi_service_poc/backend/app/core/auth.py`
   - 변경: `AUTH_REQUIRED` 플래그로 auth_service 의존성 제어
3) Snapshot 캐시 무효화
   - 파일: `20241207_NBT_BI/bi_service_poc/backend/app/services/snapshot_service.py`
   - 변경: 업로드/삭제 시 캐시 제거 또는 mtime 기반 키
4) 로깅 표준화
   - 파일: `20241207_NBT_BI/bi_service_poc/backend/app/core/logging.py`
   - 변경: `print` → logger 통일

### Phase 2: 배치 작업 구현 (0.5~1일)
1) Snapshot 배치 잡 구현
   - 파일: `20241207_NBT_BI/bi_service_poc/backend/scripts/run_snapshot_job.py`
   - 변경: AthenaClient + SnapshotService 실행 플로우 추가
2) 중복 실행 방지
   - 파일 락 또는 DB advisory lock 도입

### Phase 3: Frontend 템플릿 표준화 (0.5~1일)
1) 템플릿 컴포넌트 교체
   - 파일: `20241207_NBT_BI/bi_service_poc/backend/templates/dashboard_page_template.tsx`
   - 변경: ErrorBoundary/TabButton 공통 컴포넌트 사용
2) 기존 자동 생성 대시보드 점진적 교체
   - 영향: `frontend/src/app/dashboards/*/page.tsx`

### Phase 4: 추가 개선 (0.5~1일)
1) 프론트 basePath 단일화
   - 파일: `20241207_NBT_BI/bi_service_poc/frontend/next.config.js`
   - 파일: `20241207_NBT_BI/bi_service_poc/frontend/src/utils/routes.ts`
2) Snapshot preview 공통 훅 추가
   - 파일: `20241207_NBT_BI/bi_service_poc/frontend/src/hooks/useSnapshotPreview.ts`

## 완료 기준 (Acceptance)
- 환경별 경로 의존성 없이 대시보드 생성/삭제 정상 동작
- auth_service 다운 시에도 `AUTH_REQUIRED=false`에서 서비스 유지
- 스냅샷 업로드 후 최신 데이터가 즉시 반영
- 배치 잡 1회 실행 성공 및 중복 실행 방지
- 신규 대시보드 템플릿이 공통 컴포넌트를 사용
