# Dashboard Development Guide (BI PoC)

## 목적
- BI PoC 대시보드 개발 규칙과 워크플로를 단일 문서로 정리합니다.

## Scope
- 스냅샷은 파일 기반(parquet/JSON)으로 관리.
- UI는 코드 기반으로 유지.
- 차트 규칙은 `04_CHART_DEV_GUIDE.md`를 따릅니다.

## Dashboard Types

### Custom Dashboard
- 경로: `frontend/src/app/dashboards/{dashboardKey}/page.tsx`
- 복잡한 필터/차트/비즈니스 로직 포함
- 차트 3개 이상 또는 커스텀 필터 필요 시 사용

### Generic Dashboard
- 경로: `frontend/src/app/dashboards/[dashboardId]/page.tsx`
- 단순 프로토타입/기본 차트 + Raw 데이터

## Routing Priority
1) `/dashboards/{key}` -> custom page 우선
2) 없으면 `/dashboards/[dashboardId]` fallback

## 자동 파일 관리

### 생성
- API로 대시보드 생성 시 프론트 템플릿 자동 생성
- 템플릿: `backend/templates/dashboard_page_template.tsx`
- 생성 위치: `/app/frontend_dashboards/{dashboardKey}/page.tsx`

### 삭제
- 대시보드 삭제 시 프론트 디렉토리 자동 제거
- 스냅샷 데이터는 cascade 삭제

### 볼륨 마운트 (필수)
- `frontend/src/app/dashboards` -> `/app/frontend_dashboards`
- docker-compose에서 마운트 확인 필요

## Backend Workflow (Stats First)
1) 서비스 작성
   - `backend/app/services/{dashboard}_service.py`
   - 스냅샷 로딩은 `SnapshotService` 사용
2) 스키마 정의
   - `backend/app/schemas/dashboard_schema.py`
3) 라우터 추가
   - `GET /api/v1/dashboards/{key}/stats/{dashboard}`
   - `Cache-Control: private, max-age=300`
4) Raw 데이터는 `/snapshots/preview` 사용

## Frontend Workflow
1) 페이지 생성
   - `frontend/src/app/dashboards/{key}/page.tsx`
2) stats 응답으로 KPI/차트 렌더
3) Raw 탭 제공
   - `dashboardService.getSnapshotPreview`
4) Plotly는 동적 로딩

## 필수 규칙 (MUST)
1) 5-section 템플릿 구조 유지
2) 스냅샷 날짜 표시
3) KPI는 비교 기준 포함 (YoY/MoM/Target 중 1개 이상)
4) 숫자 단위 명시
5) Loading/Error/Empty 상태 처리
6) Raw 탭 제공
7) 차트 제목 필수 (세부 규칙은 `04_CHART_DEV_GUIDE.md`)

## 권장 규칙 (SHOULD)
1) 필터 2개 이상이면 Reset 버튼 제공
2) 차트는 2열 그리드 기본
3) KPI는 4-6개 유지
4) Raw 테이블은 페이지네이션 적용

## 금지 사항
- 샘플 데이터 하드코딩 금지
- 콘솔 로그 커밋 금지
- 직접 API 호출 금지 (services/hook 사용)

## 성능 체크리스트
- 필요한 컬럼만 요청 (`columns` query)
- stats API로 집계 후 렌더
- Plotly lazy-load
- gzip은 proxy 또는 app 중 하나만 사용

## 트러블슈팅

### 대시보드 디렉토리 미생성
- docker-compose 볼륨 마운트 확인
- backend 로그 확인

### 차트 렌더 실패
- Plotly dynamic import 확인
- 스냅샷 feedKey 확인

## 참고
- 아키텍처: `02_BI_SERVICE_ARCHITECTURE.md`
- 차트 규칙: `04_CHART_DEV_GUIDE.md`
- 카탈로그: `05_PLATFORM_REUSE_CATALOG.md`
