# BI Service Architecture (Dashboard Focus)

## 목적
- 대시보드 개발/운영에 필요한 핵심 아키텍처만 유지합니다.

## 전제
- 스냅샷은 파일 기반(parquet/JSON)
- UI는 코드 기반
- Athena는 배치/스냅샷용 (실시간 쿼리 금지)

## High-Level Flow
```
Browser (Next.js)
  -> /api (FastAPI)
     -> snapshot files (local or S3)
     -> metadata (Postgres)
```

## Backend Responsibilities
- FastAPI는 스냅샷 파일을 읽고 집계된 응답을 제공
- Raw 테이블은 preview API로 페이지네이션 제공
- 인증은 auth_service 검증을 통과한 토큰만 허용

## Frontend Responsibilities
- stats API 기반 렌더링
- Raw 탭 제공
- Plotly.js 동적 로딩

## 필수 API
- `GET /api/health`
- `GET /api/v1/bootstrap`
- `GET /api/v1/dashboards`
- `GET /api/v1/dashboards/{key}/snapshots`
- `GET /api/v1/dashboards/{key}/snapshots/preview`
- `GET /api/v1/dashboards/{key}/stats/{dashboard}`

## 파일 구조 요약
```
frontend/src/app/dashboards/{key}/page.tsx
backend/app/services/{dashboard}_service.py
backend/app/routers/dashboards_router.py
backend/app/services/snapshot_service.py
```

## 우선 문서
- 개발 규칙: `03_DASHBOARD_DEV_GUIDE.md`
- 차트 규칙: `04_CHART_DEV_GUIDE.md`
