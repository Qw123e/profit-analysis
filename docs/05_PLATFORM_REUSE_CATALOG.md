# PLATFORM REUSE CATALOG - BI Service PoC

> BI 대시보드 서비스의 재사용 가능한 코드 카탈로그

## Scope
- BI PoC 전용 카탈로그
- 공통/모노레포 문서의 항목과 충돌 시 본 문서를 우선

## 프로젝트 개요

**Domain**: localhost:8080 (nginx reverse proxy)
**Ports**: Frontend 3000, Backend 8000, Database 55432, Nginx 8080
**Tech Stack**: Next.js 14 App Router, TypeScript, FastAPI, PostgreSQL, AWS Athena
**Purpose**: 고정 대시보드 렌더링, Excel 스냅샷 업로드, Plotly.js 차트 시각화

---

## 📦 FRONTEND COMPONENTS

### Molecules (30-100 lines)

| Component | Path | Props | Purpose |
|-----------|------|-------|---------|
| **DashboardCard** | `frontend/src/components/molecules/DashboardCard.tsx` | `dashboardKey, name, description?, onEdit?, onDelete?` | 대시보드 메타데이터 카드, 호버 효과, 액션 버튼 |
| **DataTable** | `frontend/src/components/molecules/DataTable.tsx` | `columns, rows, pageSize?` | 페이지네이션 지원 테이블, sticky 헤더, null 처리 |
| **Toast** | `frontend/src/components/molecules/Toast.tsx` | `toasts[], onRemove` | 알림 시스템 (success/error/info), 3초 자동 닫힘 |
| **DashboardCreateModal** | `frontend/src/components/molecules/DashboardCreateModal.tsx` | `open, onClose, onSubmit, loading` | 대시보드 생성 폼, 키 패턴 검증 `^[a-z0-9-]+$` |
| **DashboardEditModal** | `frontend/src/components/molecules/DashboardEditModal.tsx` | `open, dashboard, onClose, onSubmit, loading` | 대시보드 수정 폼, 읽기 전용 key 필드 |
| **ConfirmDialog** | `frontend/src/components/molecules/ConfirmDialog.tsx` | `open, title, message, onConfirm, onCancel, variant, loading` | 확인 다이얼로그 (danger/warning/info) |

### Organisms (100-700+ lines)

| Component | Path | State Management | Purpose |
|-----------|------|-----------------|---------|
| **DashboardExampleChart** | `frontend/src/components/organisms/DashboardExampleChart.tsx` | Props only | Plotly.js 차트 래퍼 (ssr: false), 기본 scatter plot |
| **Custom Dashboard Pages** | `frontend/src/app/dashboards/{key}/page.tsx` | useState, useMemo, SWR | 대시보드별 커스텀 차트 페이지 (health-function, adfsfes 등) |

---

## 🎣 HOOKS

| Hook | Path | Return Type | Purpose |
|------|------|-------------|---------|
| **useDashboardSnapshot** | `frontend/src/hooks/useDashboardSnapshot.ts` | `{data, error, isLoading, mutate}` | SWR 기반 스냅샷 데이터 가져오기 |
| **useToast** | `frontend/src/hooks/useToast.ts` | `{toasts, showToast, removeToast}` | Toast 알림 관리, 3초 자동 제거 |
| **useSalesMetrics** | `frontend/src/hooks/useSalesMetrics.ts` | `{rows, filteredRows, metrics}` | 매출 데이터 집계 (총매출, 기간별, 분기별, 국가별) |
| **useProductMetrics** | `frontend/src/hooks/useProductMetrics.ts` | `{categories, counts2022, counts2023, accum2022, accum2023}` | 제품 카테고리 집계 |
| **useFilterOptions** | `frontend/src/hooks/useFilterOptions.ts` | `{years, periods, quarters, countries, bizUnits}` | 필터 옵션 추출 |

## 🧰 FRONTEND UTILS

| Utility | Path | Purpose |
|---------|------|---------|
| **feedToObjects** | `frontend/src/utils/snapshotTransformers.ts` | SnapshotFeed → RowObject[] 변환 |
| **safeNumber** | `frontend/src/utils/snapshotTransformers.ts` | 안전한 숫자 변환 (실패 시 0) |
| **normalizeLabel** | `frontend/src/utils/snapshotTransformers.ts` | 값 → 문자열 라벨 (null → "미분류") |
| **groupSum** | `frontend/src/utils/snapshotTransformers.ts` | 그룹핑 + 집계 (groupBy + sumBy) |
| **sumAll** | `frontend/src/utils/snapshotTransformers.ts` | 컬럼 합계 (필터 옵션 지원) |
| **numberFormat** | `frontend/src/utils/snapshotTransformers.ts` | 한국어 숫자 포맷팅 (1,000,000) |

---

## 🌐 SERVICES (API Clients)

| Service | Path | Endpoints | Request/Response |
|---------|------|-----------|------------------|
| **httpClient** | `frontend/src/services/httpClient.ts` | GET/POST base functions | JSON 파싱, NEXT_PUBLIC_API_URL 사용 |
| **dashboardService** | `frontend/src/services/dashboardService.ts` | 10 endpoints (CRUD + snapshots + filters + aggregate) | 완전한 대시보드 관리 |
| **snapshotService** | `frontend/src/services/snapshotService.ts` | 2 endpoints (mapping, delete) | 스냅샷 목록 및 삭제 |

### dashboardService Endpoints:
- `listDashboards()` - GET /v1/dashboards
- `createDashboard(data)` - POST /v1/dashboards
- `updateDashboard(key, data)` - PUT /v1/dashboards/{key}
- `deleteDashboard(key)` - DELETE /v1/dashboards/{key}
- `getDashboardSnapshot({dashboardKey, date})` - GET snapshots
- `listSnapshots(key)` - GET snapshots list
- `getSnapshotPreview()` - GET snapshot preview with pagination
- `uploadSnapshot()` - POST multipart upload
- `getCustomerFilters()` - GET filter options
- `aggregateCustomer()` - POST aggregate with filters

---

## 📘 TYPES

| File | Key Types |
|------|-----------|
| **snapshot.ts** | `SnapshotFeed: {columns[], rows[][]}`, `DashboardSnapshotResponse`, `SnapshotPreviewResponse` |
| **dashboard.ts** | `DashboardItem: {key, name, description?}`, `DashboardListResponse` |
| **customer.ts** | `FilterOptions`, `AggregateRequest`, `AggregateResponse`, `GroupValue` |
| **snapshotList.ts** | `SnapshotIndexEntry`, `SnapshotIndexItem`, `DashboardSnapshotListResponse` |

---

## 🎨 STYLING PATTERNS

### Dark Theme Colors
```css
Background: #0b1220 (main), #111a2e (cards)
Text: #e8eefc (primary), #94a3b8 (secondary)
Borders: #1e2740, #2e3b52
Links: #8ab4ff
```

### Chart Colors (Plotly)
```css
Blue: #60a5fa
Purple: #a78bfa
Cyan: #60d4fa
Red: #dc2626
```

### Interactive States
```css
Card: background: #111a2e, border: 1px solid #1e2740, boxShadow: 0 2px 8px rgba(0,0,0,0.08)
Button hover: background: #2e3b52, cursor: pointer
Modal overlay: background: rgba(0,0,0,0.5)
```

### Component Styles
```typescript
cardStyle: {
  background: "#111a2e",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #1e2740",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
}

titleStyle: {
  margin: "0 0 8px 0",
  fontSize: 16,
  fontWeight: 700
}
```

---

## 🔧 BACKEND MODELS

| Model | Table | Key Columns | Relationships |
|-------|-------|-------------|---------------|
| **Dashboard** | `dashboards` | id, key (unique, indexed), name, description, is_active | snapshot_items (1:N) |
| **SnapshotItem** | `snapshot_items` | id, dashboard_id (FK), snapshot_date (indexed), feed_key, s3_uri, generated_at | dashboard (N:1, cascade delete) |

### Storage URIs
- **S3**: `s3://bucket/prefix/...`
- **Local**: `file:///app/data/snapshots/...`

---

## 🔌 BACKEND ROUTERS

| Router | Prefix | Key Endpoints |
|--------|--------|---------------|
| **dashboards_router** | `/api/v1/dashboards` | CRUD, snapshots, upload, filters, aggregate |
| **snapshots_router** | `/api/v1/snapshots` | GET /mapping |
| **health_router** | `/api/health` | GET health check |

### Endpoint Details (dashboards_router):
```python
GET    /api/v1/dashboards                                    → list_dashboards()
POST   /api/v1/dashboards                                    → create_dashboard()
PUT    /api/v1/dashboards/{key}                             → update_dashboard()
DELETE /api/v1/dashboards/{key}                             → delete_dashboard()
GET    /api/v1/dashboards/{key}/snapshots                   → get_dashboard_snapshot()
GET    /api/v1/dashboards/{key}/snapshots/list              → list_dashboard_snapshots()
GET    /api/v1/dashboards/{key}/snapshots/preview           → preview_dashboard_snapshot()
POST   /api/v1/dashboards/{key}/snapshots/upload            → upload_snapshot_excel()
GET    /api/v1/dashboards/{key}/filters                     → get_filter_options()
POST   /api/v1/dashboards/{key}/aggregate                   → aggregate_dashboard()
DELETE /api/v1/dashboards/{key}/snapshots/{date}            → delete_snapshot()
```

---

## 💼 BACKEND SERVICES

| Service | Path | Key Methods |
|---------|------|-------------|
| **DashboardService** | `backend/app/services/dashboard_service.py` | `list_dashboards()`, `create_dashboard()`, `get_snapshot()`, `aggregate_dashboard()`, `_create_frontend_dashboard_page()`, `_delete_frontend_dashboard_page()` |
| **SnapshotService** | `backend/app/services/snapshot_service.py` | `fetch_snapshot_feeds()`, `ingest_snapshot_from_excel()`, `delete_snapshot()`, `_load_json_from_s3()`, `_load_json_from_file()` |

### DashboardService Methods:
- **CRUD**: `list_dashboards()`, `create_dashboard()`, `update_dashboard()`, `delete_dashboard()`
- **Snapshots**: `get_snapshot()`, `list_snapshot_index()`
- **Filtering**: `get_filter_options()`, `aggregate_dashboard()`
- **File Management**: `_create_frontend_dashboard_page()`, `_delete_frontend_dashboard_page()`
- **Helpers**: `_safe_number()`, `_normalize_label()`, `_apply_filters()`, `_group_sum()`

### SnapshotService Methods:
- **Fetch**: `fetch_snapshot_feeds()`, `fetch_snapshot_feed()`
- **Ingestion**: `ingest_snapshot_from_excel()` - Excel → SnapshotFeed → JSON file
- **Cleanup**: `delete_snapshot()` - Delete DB record + file
- **Storage**: `_load_json_from_s3()`, `_load_json_from_file()`, `_load_json_any()`

---

## 📊 BACKEND REPOSITORIES

| Repository | Path | Custom Methods |
|------------|------|----------------|
| **DashboardRepository** | `backend/app/repositories/dashboard_repository.py` | `list_active()`, `get_by_key()`, `create()`, `update()`, `delete_by_key()` |
| **SnapshotRepository** | `backend/app/repositories/snapshot_repository.py` | `latest_snapshot_date()`, `snapshot_items()`, `snapshot_item()`, `upsert_snapshot_item()`, `list_items_for_dashboard()`, `delete_snapshot_item()`, `list_all_with_dashboard_info()` |

---

## 🎯 DESIGN PATTERNS

### 1. Automatic Frontend File Management
```
Dashboard Creation Flow:
1. User creates dashboard via API/UI
2. Backend creates DB record
3. Backend auto-generates frontend/src/app/dashboards/{key}/page.tsx from template
4. Template variables: {{DASHBOARD_KEY}}, {{DASHBOARD_NAME}} (PascalCase)
5. Logs creation to Docker logs

Dashboard Deletion Flow:
1. User deletes dashboard via API
2. Backend deletes DB record (cascade deletes snapshots)
3. Backend auto-removes frontend/src/app/dashboards/{key}/ directory
4. Logs deletion to Docker logs
```

### 2. Data Transformation Pipeline
```
Frontend:
SnapshotFeed → feedToObjects() → filter (useMemo) → aggregate (groupSum) → render (Plotly)

Backend:
Excel upload → pandas.read_excel() → SnapshotFeed JSON → save to file/S3 → store URI in DB
```

### 3. Repository-Service-Router Pattern
```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → Database
```

### 4. Error Handling
```python
# Custom Exceptions (backend/app/utils/errors.py)
- DashboardNotFoundError → 404
- InvalidSnapshotDateError → 400
- SnapshotNotFoundError → 404
- SnapshotFetchError → 502

# Error Pattern (Routers)
try:
    result = service.method(request)
    return result
except DashboardNotFoundError as e:
    raise HTTPException(status_code=404, detail=str(e))
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
```

### 5. Frontend Data Fetching (SWR)
```typescript
// Composite cache key
const { data, error, isLoading } = useDashboardSnapshot({
  dashboardKey: "health-function",
  date: "2024-12-18"
});

// SWR key: ["dashboardSnapshot", "health-function", "2024-12-18"]
// Auto-revalidate on focus, deduplicate requests
```

### 6. Dynamic Chart Loading
```typescript
// Avoid SSR issues with Plotly.js
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });
```

### 7. Docker Volume Sharing
```yaml
# Backend container can write to frontend directory
backend:
  volumes:
    - ./data:/app/data
    - ./frontend/src/app/dashboards:/app/frontend_dashboards
```

---

## 🔐 SECURITY & ERROR HANDLING

### Frontend Error Pattern
```typescript
try {
  const result = await dashboardService.method();
  setState(result);
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  showToast(message, 'error');
}
```

### Backend Error Pattern
```python
try:
    result = service.method(request)
    return result
except ValueError as e:
    raise HTTPException(status_code=404, detail=str(e))
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
```

### Input Validation
```python
# Dashboard key pattern
key: str = Field(..., pattern=r"^[a-z0-9-]+$")

# Date validation
selected_date = date_type.fromisoformat(snapshot_date)
```

---

## 🚀 REUSABILITY SCORE

| Component/Pattern | Score | Notes |
|-------------------|-------|-------|
| DataTable, Toast, ConfirmDialog | ⭐⭐⭐⭐⭐ | 모든 프로젝트에서 재사용 가능 |
| httpClient, dashboardService | ⭐⭐⭐⭐⭐ | HTTP 추상화, API 클라이언트 패턴 |
| snapshotTransformers utils | ⭐⭐⭐⭐⭐ | 데이터 변환 유틸리티 |
| Repository Pattern | ⭐⭐⭐⭐⭐ | 제네릭 CRUD 리포지토리 |
| DashboardCard, DashboardModals | ⭐⭐⭐⭐ | 도메인 특화되었지만 패턴 재사용 가능 |
| useDashboardSnapshot hook | ⭐⭐⭐⭐ | SWR 기반 데이터 페칭 패턴 |
| Auto File Management | ⭐⭐⭐ | 도메인 특화, 템플릿 패턴 재사용 가능 |
| DashboardService, SnapshotService | ⭐⭐⭐ | 비즈니스 로직 특화 |

---

## 📝 CRITICAL PATHS

### High-Value Reusable Code

1. **Frontend Components**: DataTable, Toast, ConfirmDialog - 모든 프로젝트에서 사용
2. **HTTP Client**: httpGet, httpPost - 간단하고 깔끔한 API 호출
3. **Data Transformers**: feedToObjects, groupSum, safeNumber - 데이터 처리 유틸리티
4. **Hook Pattern**: useDashboardSnapshot, useToast - SWR + 상태 관리 템플릿
5. **Repository Pattern**: 제네릭 CRUD, AsyncSession 사용
6. **Service Layer**: 비즈니스 로직 분리, 단일 책임
7. **Error Handling**: 일관된 에러 처리 패턴
8. **Auto File Management**: 템플릿 기반 파일 생성/삭제

### Project-Specific (Low Reusability)

1. Custom Dashboard Pages - 대시보드별 커스텀 차트
2. SnapshotService - Excel 파싱, JSON 저장 로직
3. AggregateRequest/Response - 도메인 특화 스키마

---

## 📈 Custom Dashboard Components

### Common Components in Dashboard Pages

| Component | Usage | Props |
|-----------|-------|-------|
| **TabButton** | Charts/Raw Data 탭 전환 | `active, onClick, label` |
| **MiniCard** | KPI 카드 (총매출, 영업이익 등) | `title, value, suffix?` |
| **FilterSelect** | 검색 가능한 드롭다운 필터 | `label, value, options, onChange` |
| **PeriodRangeSlider** | 기간 범위 선택 슬라이더 | `minPeriod, maxPeriod, startValue, endValue, onStartChange, onEndChange` |
| **ErrorBoundary** | 렌더링 에러 처리 | `children` |

### Plotly Chart Layout Template
```typescript
layout={{
  paper_bgcolor: "#111a2e",
  plot_bgcolor: "#111a2e",
  font: { color: "#e8eefc" },
  margin: { l: 60, r: 20, t: 30, b: 40 },
  height: 340
}}
config={{ displayModeBar: false, responsive: true }}
style={{ width: "100%" }}
```

---

## 🗂️ Directory Structure

### Frontend
```
frontend/src/
├── app/
│   ├── dashboards/
│   │   ├── page.tsx                # Dashboard list
│   │   ├── [dashboardId]/          # Generic fallback
│   │   │   ├── page.tsx
│   │   │   └── snapshots/page.tsx
│   │   ├── {custom-key}/           # Custom dashboards (auto-created)
│   │   │   └── page.tsx
│   │   └── upload/page.tsx
│   └── snapshots/mapping/page.tsx
├── components/
│   ├── molecules/
│   │   ├── DashboardCard.tsx
│   │   ├── DataTable.tsx
│   │   ├── Toast.tsx
│   │   ├── DashboardCreateModal.tsx
│   │   ├── DashboardEditModal.tsx
│   │   └── ConfirmDialog.tsx
│   └── organisms/
│       └── DashboardExampleChart.tsx
├── hooks/
│   ├── useDashboardSnapshot.ts
│   ├── useToast.ts
│   ├── useSalesMetrics.ts
│   ├── useProductMetrics.ts
│   └── useFilterOptions.ts
├── services/
│   ├── httpClient.ts
│   ├── dashboardService.ts
│   └── snapshotService.ts
├── utils/
│   └── snapshotTransformers.ts
└── types/
    ├── snapshot.ts
    ├── dashboard.ts
    ├── customer.ts
    └── snapshotList.ts
```

### Backend
```
backend/
├── app/
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── logging.py
│   ├── models/
│   │   ├── base.py
│   │   ├── dashboard.py
│   │   └── snapshot_item.py
│   ├── schemas/
│   │   ├── dashboard_schema.py
│   │   └── snapshot_schema.py
│   ├── repositories/
│   │   ├── base_repository.py
│   │   ├── dashboard_repository.py
│   │   └── snapshot_repository.py
│   ├── services/
│   │   ├── dashboard_service.py
│   │   └── snapshot_service.py
│   ├── routers/
│   │   ├── health_router.py
│   │   ├── dashboards_router.py
│   │   └── snapshots_router.py
│   ├── utils/
│   │   └── errors.py
│   └── main.py
├── templates/
│   └── dashboard_page_template.tsx
└── scripts/
    ├── seed_dashboards.py
    ├── delete_seeded_dashboards.py
    ├── dev_seed_snapshot_from_excel.py
    └── run_snapshot_job.py
```

---

## 🎯 Key Workflows

### 1. Dashboard Creation Workflow
```
1. User clicks "Create Dashboard" → DashboardCreateModal opens
2. User enters key (^[a-z0-9-]+$), name, description → Submit
3. Frontend calls dashboardService.createDashboard()
4. Backend creates DB record
5. Backend auto-creates frontend/src/app/dashboards/{key}/page.tsx from template
6. Backend logs creation to Docker logs
7. Frontend shows success toast, refreshes list
```

### 2. Snapshot Upload Workflow
```
1. User navigates to /dashboards/upload
2. User selects dashboard, uploads Excel file
3. Frontend calls dashboardService.uploadSnapshot()
4. Backend parses Excel with pandas.read_excel()
5. Backend saves as JSON to /app/data/snapshots/ or S3
6. Backend creates SnapshotItem record with s3_uri
7. Frontend shows success toast
```

### 3. Dashboard Rendering Workflow
```
1. User visits /dashboards/{key}
2. Next.js routes to custom page.tsx if exists, else [dashboardId]
3. Page calls useDashboardSnapshot({ dashboardKey, date })
4. SWR fetches from dashboardService.getDashboardSnapshot()
5. Backend fetches SnapshotItem, reads JSON from file/S3
6. Frontend transforms with feedToObjects(), filters, aggregates
7. Renders Plotly charts with transformed data
```

### 4. Dashboard Deletion Workflow
```
1. User clicks delete icon → ConfirmDialog opens
2. User confirms → Frontend calls dashboardService.deleteDashboard()
3. Backend deletes DB record (cascade deletes snapshots)
4. Backend auto-removes frontend/src/app/dashboards/{key}/ directory
5. Backend deletes snapshot files from /app/data/snapshots/
6. Backend logs deletion to Docker logs
7. Frontend shows success toast, refreshes list
```

---

**Last Updated**: 2025-12-29
**Total Reusable Components**: 30+ (6 molecules, 2 organisms, 5 hooks, 2 services, 6 utils, 2 repositories, 2 services)
