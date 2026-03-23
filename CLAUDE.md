# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BI dashboard service PoC built with Next.js (frontend), FastAPI (backend), PostgreSQL (metadata), and AWS Athena (data queries). The system renders ~10 fixed dashboards with ~20 charts each, optimized for <2s response time via daily snapshot materialization instead of real-time Athena queries.

## Development Commands

### Docker Compose (Recommended)

**IMPORTANT**: When rebuilding services, minimize output noise to keep logs readable:
```bash
# Rebuild with minimal output (REQUIRED for user readability)
docker compose up -d --build {service_name} --quiet-pull 2>&1 | grep -E "(Creating|Recreating|Starting|ERROR|error)" || echo "{service_name} rebuilt successfully"

# Examples:
docker compose up -d --build bi_backend --quiet-pull 2>&1 | grep -E "(Creating|Recreating|Starting|ERROR|error)" || echo "Backend rebuilt successfully"
docker compose up -d --build bi_frontend --quiet-pull 2>&1 | grep -E "(Creating|Recreating|Starting|ERROR|error)" || echo "Frontend rebuilt successfully"
```

**Start all services:**
```bash
docker compose up --build
```

**Access points:**
- Frontend (via nginx): http://localhost:8080
- Backend API health: http://localhost:8080/api/health
- Dashboard list: http://localhost:8080/dashboards

**Database management:**
```bash
# Run migrations manually
docker compose exec backend alembic upgrade head

# Dashboards are created via UI/API (no default seed)

# Create new migration
docker compose exec backend alembic revision --autogenerate -m "description"

# PostgreSQL direct access (binds to port 55432 to avoid local conflicts)
psql -h localhost -p 55432 -U postgres -d bi_meta
```

**Snapshot testing (local files, no S3):**
```bash
# Method 1: CLI script
docker compose cp ./sample.xlsx backend:/tmp/sample.xlsx
docker compose exec backend python scripts/dev_seed_snapshot_from_excel.py \
  --excel-path /tmp/sample.xlsx \
  --dashboard-key sales-overview \
  --feed-key example \
  --snapshot-date 2024-12-18 \
  --output-dir /tmp/dev_snapshots

# Method 2: API upload
curl -X POST "http://localhost:8080/api/v1/dashboards/sales-overview/snapshots/upload?feed_key=example&date=2024-12-18" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./sample.xlsx"
```

**Daily snapshot job (batch):**
```bash
docker compose exec backend python scripts/run_snapshot_job.py
```

### Frontend (standalone)

```bash
cd frontend
npm install
npm run dev      # Development server on port 3000
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

### Backend (standalone)

```bash
cd backend
pip install -r requirements.txt

# Start API server
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:55432/bi_meta"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

## Architecture

### Backend Structure (Router → Service → Repository pattern)

```
backend/
├── app/
│   ├── main.py              # FastAPI app factory, CORS, router registration
│   ├── core/
│   │   ├── config.py        # Pydantic settings (env vars, AWS config)
│   │   ├── database.py      # AsyncSession factory, get_db dependency
│   │   └── logging.py       # Logging setup
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── dashboard.py     # Dashboard table (id, key, name, description)
│   │   └── snapshot_item.py # SnapshotItem (dashboard_id, snapshot_date, feed_key, s3_uri)
│   ├── schemas/             # Pydantic request/response models
│   │   └── dashboard_schema.py
│   ├── repositories/        # Data access layer
│   │   ├── base_repository.py
│   │   ├── dashboard_repository.py
│   │   └── snapshot_repository.py
│   ├── services/            # Business logic
│   │   ├── dashboard_service.py  # Orchestrates dashboard + snapshot fetching
│   │   └── snapshot_service.py   # Handles Excel ingestion, S3/file reads
│   ├── routers/             # API endpoints
│   │   ├── health_router.py      # GET /api/health
│   │   └── dashboards_router.py  # GET /api/v1/dashboards, snapshots, upload
│   ├── clients/
│   │   └── athena_client.py      # AWS Athena query execution (not used in MVP)
│   └── utils/
│       └── errors.py             # Custom exceptions
├── scripts/
│   ├── seed_dashboards.py              # Optional seed (empty by default)
│   ├── delete_seeded_dashboards.py     # Remove legacy seeded dashboards
│   ├── dev_seed_snapshot_from_excel.py # Excel → local JSON snapshot
│   └── run_snapshot_job.py             # Daily batch job entry point
├── alembic/
│   └── versions/                       # Database migrations
└── entrypoint.sh                       # Runs migrations + starts server
```

**Key patterns:**
- **Dependency injection:** Routers depend on `AsyncSession` via `Depends(get_db)`, pass to services
- **Service layer:** `DashboardService` and `SnapshotService` orchestrate business logic, call repositories
- **Repository layer:** Encapsulates SQLAlchemy queries, returns ORM models
- **Error handling:** Custom exceptions (`DashboardNotFoundError`, `SnapshotNotFoundError`) raised in services, caught in routers to return HTTP errors
- **Snapshot storage:** `s3_uri` column stores either `s3://...` or `file://...` URIs. `SnapshotService.fetch_snapshot_data()` handles both

### Frontend Structure (Next.js 14 App Router)

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                       # Root layout
│   │   ├── page.tsx                         # Home page
│   │   ├── dashboards/
│   │   │   ├── page.tsx                     # Dashboard list
│   │   │   ├── [dashboardId]/
│   │   │   │   └── page.tsx                 # Generic dashboard (fallback)
│   │   │   │   └── snapshots/page.tsx       # Snapshot list for dashboard
│   │   │   ├── adfsfes/
│   │   │   │   └── page.tsx                 # adfsfes-specific dashboard
│   │   │   ├── health-function/
│   │   │   │   └── page.tsx                 # health-function-specific dashboard
│   │   │   └── upload/page.tsx              # Excel upload form
│   ├── components/
│   │   └── organisms/
│   │       └── DashboardExampleChart.tsx    # Generic chart component
│   ├── hooks/
│   │   └── useDashboardSnapshot.ts          # SWR hook for snapshot data
│   └── types/
│       └── snapshot.ts                      # TypeScript types
└── public/                                  # Static assets
```

**Key patterns:**
- **Dashboard routing priority:** Next.js routes specific dashboards first (e.g., `/dashboards/adfsfes`), then falls back to `[dashboardId]` for generic dashboards
- **Client components:** Dashboard pages use `"use client"` for interactivity
- **Dynamic imports:** Plotly.js loaded via `next/dynamic` with `{ ssr: false }` to avoid SSR issues
- **Data fetching:** SWR hook (`useDashboardSnapshot`) fetches from `/api/v1/dashboards/{key}/snapshots?date={date}`
- **Routing:** Dashboard ID from URL params, snapshot date from query string
- **Custom dashboards:** Each dashboard with custom logic has its own directory (e.g., `adfsfes/`, `health-function/`)
- **Generic fallback:** `[dashboardId]/page.tsx` serves as fallback for dashboards without custom pages

### Database Schema

**dashboards:**
- `id` (PK), `key` (unique), `name`, `description`, `is_active`

**snapshot_items:**
- `id` (PK), `dashboard_id` (FK → dashboards.id), `snapshot_date`, `feed_key`, `s3_uri`, `generated_at`
- Index on `(dashboard_id, snapshot_date)`
- Stores S3 or local file URIs pointing to JSON snapshots

### Snapshot Data Model

Snapshots are JSON files with structure:
```json
{
  "feeds": {
    "example": {
      "columns": ["col1", "col2", ...],
      "rows": [[val1, val2, ...], ...]
    }
  }
}
```

Frontend transforms this into `RowObject[]` for filtering/charting.

## Environment Variables

Required in `.env` (see `.env.example`):

```bash
# Backend
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/bi_meta
AWS_REGION=ap-northeast-2
ATHENA_WORKGROUP=primary
ATHENA_OUTPUT_S3=s3://bucket/prefix/
SNAPSHOT_S3_PREFIX=s3://bucket/snapshots/  # Optional, uses local files if not set

# Frontend
NEXT_PUBLIC_API_URL=/api  # Proxied via nginx in Docker

# Infrastructure
POSTGRES_HOST_PORT=55432  # Avoid local port 5432 conflicts
NGINX_PORT=8080
```

## Docker Compose Services

- **postgres:** PostgreSQL 15, binds to host port 55432 (not 5432), volume `postgres_data`
- **backend:** Python 3.11, runs migrations on startup, exposed on 8000 (internal), bind-mounts `./data` at `/app/data`
- **frontend:** Node 20, Next.js standalone build, exposed on 3000 (internal)
- **nginx:** Routes `/` → frontend:3000, `/api` → backend:8000, exposes port 8080

## Common Workflows

### Dashboard Development Workflow with Claude Code

**Standard workflow for creating and customizing dashboards:**

1. **User creates dashboard** via UI/API
   - `POST /api/v1/dashboards` with `key`, `name`, `description`
   - **⚡ Backend automatically creates:** `frontend/src/app/dashboards/{dashboard-key}/page.tsx`
   - Basic dashboard page with tabs (Charts/Raw Data) is ready instantly
   - Dashboard accessible at: `http://localhost:8080/dashboards/{dashboard-key}`

2. **User uploads snapshot data** via API or script
   - API upload: `POST /api/v1/dashboards/{key}/snapshots/upload?feed_key={key}&date={date}`
   - Script: `dev_seed_snapshot_from_excel.py`

3. **User provides chart requirements** to Claude Code
   - Specify which charts to display (e.g., "연도별 총매출 추이", "Top 10 고객별 매출")
   - Specify any filters or interactions needed

4. **Claude Code edits existing page.tsx**
   - Opens `frontend/src/app/dashboards/{dashboard-key}/page.tsx`
   - Adds metrics calculation using `feedToObjects()`, `groupSum()`, `safeNumber()`
   - Adds custom chart rendering sections using Plotly.js
   - Maintains consistent styling: dark theme (`#0b1220` background, `#e8eefc` text)

5. **User reviews and confirms**
   - Check dashboard at `http://localhost:8080/dashboards/{dashboard-key}`
   - Provide feedback for further adjustments

**Important notes for Claude Code:**
- Always use existing snapshot data; never create sample data
- Follow existing patterns: other special dashboards (sales-overview, customer-overview, health-function)
- Use `feedToObjects()`, `groupSum()`, `safeNumber()` utilities from `@/utils/snapshotTransformers`
- Maintain consistent UI styling with `cardStyle`, `titleStyle`, dark theme colors

**Automatic file management:**
- ✅ **Auto-creation**: Dashboard creation automatically generates `frontend/src/app/dashboards/{key}/page.tsx`
- ✅ **Auto-deletion**: Dashboard deletion automatically removes the entire directory
- ✅ **Logs**: Backend prints creation/deletion messages to Docker logs for easy review
- ⚠️ **No manual cleanup needed**: Files are always in sync with database

### Adding a new dashboard

1. Create the dashboard via UI/API (`POST /api/v1/dashboards`)
2. Upload snapshot data via API or script
3. (Optional) Add custom chart logic to `frontend/src/app/dashboards/[dashboardId]/page.tsx`

### Creating a database migration

```bash
# 1. Modify models in backend/app/models/
# 2. Generate migration
docker compose exec backend alembic revision --autogenerate -m "add_new_column"
# 3. Review backend/alembic/versions/XXXX_add_new_column.py
# 4. Apply migration
docker compose exec backend alembic upgrade head
```

### Debugging snapshot data

- Check `snapshot_items` table for `s3_uri` value
- For `file://` URIs, inspect container filesystem: `docker compose exec backend ls -la /app/data/snapshots`
- For `s3://` URIs, verify AWS credentials and S3 object existence
- Backend logs show snapshot fetch errors in `SnapshotService.fetch_snapshot_data()`

## Testing Data Format

Excel files for snapshot upload should have:
- First row: column headers
- Subsequent rows: data values
- Recommended columns for `sales-overview`: 회계연도, 기간, 분기, 매출국가, 영업부문, 영업이익
- Recommended columns for `customer-overview`: 회계연도, 분기, 매출국가, 고객명, 그룹명, 평가클래스, 총매출, 공헌이익, 영업이익, 판관비 計, 기간, 제품명

## Dashboard Template Structure (AI Agent Optimized)

**IMPORTANT:** This project is designed for AI agents to generate/modify dashboard code. All dashboard pages MUST follow the 5-section template structure below for maximum AI comprehension and modification success rate.

### Template Structure

Every dashboard page (`frontend/src/app/dashboards/{dashboard-key}/page.tsx`) MUST follow this exact structure:

```typescript
"use client";

// ============================================
// 1. IMPORTS
// ============================================
import dynamic from "next/dynamic";
import React, { useEffect, useState, type ComponentType } from "react";
import useSWR from "swr";

// Services & Hooks
import { dashboardService } from "@/services/dashboardService";

// Common Components
import { DashboardHeader } from "@/components/molecules/DashboardHeader";
import { FilterPanel } from "@/components/molecules/FilterPanel";
import { KpiGrid } from "@/components/molecules/KpiGrid";
import { ChartCard } from "@/components/molecules/ChartCard";
import { MiniCard } from "@/components/molecules/MiniCard";
import { FilterSelect } from "@/components/molecules/FilterSelect";
import { TabButton } from "@/components/molecules/TabButton";

// Utils
import { numberFormat } from "@/utils/snapshotTransformers";
import { cardStyle, titleStyle, mainContainerStyle } from "@/utils/dashboardStyles";
import { getPlotlyLayout, plotlyConfig } from "@/utils/plotlyLayouts";

// Types
import type { FilterValue } from "@/types/common";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div style={{ padding: 20 }}>Loading chart...</div>
}) as unknown as ComponentType<any>;

// ============================================
// 2. TYPES (Dashboard-specific)
// ============================================
// Define dashboard-specific types here, or import from @/types/snapshot

// ============================================
// 3. UTILS (Dashboard-specific)
// ============================================
// Helper functions specific to this dashboard
// Example: const formatMonthLabel = (month: string) => { ... };

// ============================================
// 4. MAIN COMPONENT
// ============================================
export default function DashboardPage() {
  // --- 4.1. State Management ---
  const [mounted, setMounted] = useState(false);
  const [mainTab, setMainTab] = useState<"raw" | "charts">("charts");
  // Add filter states here

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 4.2. Data Fetching ---
  const { data, error, isLoading } = useSWR(
    ["dashboard-key", /* dependencies */],
    () => dashboardService.getData({ /* params */ }),
    {
      revalidateOnFocus: false,
      keepPreviousData: true
    }
  );

  // --- 4.3. Event Handlers ---
  const handleFilterReset = () => {
    // Reset all filters
  };

  // --- 4.4. Loading/Error States ---
  if (!mounted) return <main style={{ padding: 24 }}>Loading...</main>;
  if (isLoading && !data) return <main style={{ padding: 24 }}>Loading Dashboard...</main>;
  if (error && !data) return <main style={{ padding: 24 }}>Error: {error.message}</main>;
  if (!data) return <main style={{ padding: 24 }}>No data available</main>;

  // --- 4.5. Render ---
  return (
    <main style={mainContainerStyle}>
      <ErrorBoundary>
        {/* Section 1: Header */}
        <DashboardHeader
          title="Dashboard Name"
          subtitle="Snapshot date info"
        />

        {/* Section 2: Filters */}
        <FilterPanel onReset={handleFilterReset}>
          {/* Filter components here */}
        </FilterPanel>

        {/* Section 3: KPIs */}
        <KpiGrid columns={4}>
          <MiniCard title="KPI 1" value="123" suffix="units" />
          {/* More KPI cards */}
        </KpiGrid>

        {/* Section 4: Tabs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <TabButton active={mainTab === "charts"} onClick={() => setMainTab("charts")} label="Charts" />
          <TabButton active={mainTab === "raw"} onClick={() => setMainTab("raw")} label="Raw Data" />
        </div>

        {/* Section 5: Charts */}
        {mainTab === "charts" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Chart Group 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <Chart1Component data={data.chart1} />
              <Chart2Component data={data.chart2} />
            </div>

            {/* More chart groups */}
          </div>
        )}

        {/* Section 6: Raw Data Tab */}
        {mainTab === "raw" && (
          <div style={cardStyle}>
            <h3 style={titleStyle}>RAW DATA</h3>
            {/* Raw data display */}
          </div>
        )}
      </ErrorBoundary>
    </main>
  );
}

// ============================================
// 5. CHART COMPONENTS (Inline)
// ============================================

function Chart1Component({ data }: { data: ChartDataType }) {
  return (
    <ChartCard title="Chart 1 Title">
      <Plot
        data={[
          {
            type: 'bar',
            name: 'Series 1',
            x: data.map(d => d.x),
            y: data.map(d => d.y),
            marker: { color: '#3b82f6' }
          }
        ]}
        layout={{
          ...getPlotlyLayout(450),
          xaxis: { title: 'X Axis', gridcolor: '#e2e8f0', color: '#1e293b' },
          yaxis: { title: 'Y Axis', gridcolor: '#e2e8f0', color: '#1e293b' },
          legend: { orientation: 'h', y: -0.2, font: { color: '#0f172a' } }
        }}
        config={plotlyConfig}
        style={{ width: '100%' }}
      />
    </ChartCard>
  );
}

// More chart components...
```

### Key Principles

**1. Single File = Single Dashboard**
- One page.tsx per dashboard
- All logic, charts, and components in ONE file
- AI generates/modifies ONE file only

**2. Clear Section Boundaries**
- Sections 1-5 are MANDATORY
- Each section has a clear responsibility
- Comments with `====` markers make sections instantly recognizable

**3. Chart Components are Inline**
- Define chart components AFTER the main component (Section 5)
- Each chart is a function component
- Use `ChartCard` wrapper for consistency

**4. Common Components Usage**
- `DashboardHeader`: Page header with title/subtitle
- `FilterPanel`: Filter container with reset button
- `KpiGrid`: KPI cards layout
- `ChartCard`: Chart wrapper with title
- `MiniCard`: Individual KPI card
- `FilterSelect`: Single-select filter
- `MultiFilterSelect`: Multi-select filter
- `TabButton`: Tab navigation

**5. Naming Conventions**
- Chart components: `{MetricName}Chart` (e.g., `SalesTrendChart`)
- Event handlers: `handle{Action}` (e.g., `handleFilterReset`)
- State variables: descriptive names (e.g., `selectedYear`, `selectedMonth`)

### Example Reference

See `frontend/src/app/dashboards/gcc/page.tsx` for a complete working example following this template.

### AI Agent Instructions

When creating or modifying a dashboard:

1. **READ** the existing template structure
2. **IDENTIFY** which section needs changes:
   - Adding filter? → Modify Section 2
   - Adding chart? → Add to Section 5 + reference in Section 5 rendering
   - Changing KPIs? → Modify Section 3
   - Adding utility function? → Add to Section 3
3. **MODIFY** only the relevant sections
4. **MAINTAIN** the 5-section structure
5. **USE** existing common components whenever possible
6. **INLINE** all chart components in Section 5

### Why This Structure?

This structure optimizes for:
- ✅ AI comprehension (clear section boundaries)
- ✅ AI modification success rate (one file, clear targets)
- ✅ Consistency across dashboards (same pattern everywhere)
- ✅ Easy navigation (section comments)
- ✅ Reduced file juggling (everything in one place)

## Dashboard Development Guidelines

**CRITICAL**: All dashboard development and modifications MUST follow the rules defined in `docs/DASHBOARD_GUIDELINES.md`.

### Quick Reference

**🔴 MUST (필수 준수 - 위반 시 머지 불가)**:
1. 5-section 템플릿 구조 준수
2. 스냅샷 날짜 명시 (`DashboardHeader` subtitle)
3. 모든 KPI에 비교 기준 제공 (`change` prop)
4. 모든 숫자에 단위 명시 (`suffix`/`prefix`)
5. 로딩/에러/빈 데이터 상태 처리
6. 모든 차트에 `ChartCard` + 제목

**🟡 SHOULD (강력 권장)**:
7. 필터 초기화 버튼 (필터 2개 이상 시)
8. Raw Data 탭 제공
9. 차트 2열 그리드 레이아웃
10. KPI 4-6개 제한

**🚫 절대 금지**:
- 샘플 데이터 하드코딩
- console.log 커밋
- 차트 라이브러리 혼용 (Plotly.js만 사용)
- 컴포넌트에서 API 직접 호출 (dashboardService 사용)

**코드 리뷰 체크리스트**: `docs/DASHBOARD_GUIDELINES.md`의 "코드 리뷰 체크리스트" 섹션 참조

**상세 내용**: 모든 규칙의 이유, 예제 코드, 예외 사항은 `docs/DASHBOARD_GUIDELINES.md` 참조

## Notes

- **No real-time Athena queries in MVP:** All data served from pre-materialized snapshots
- **Snapshot persistence:** `./data/snapshots` keeps uploaded files on the host via bind mount
- **API versioning:** All dashboard endpoints under `/api/v1/`
- **CORS:** Backend allows localhost:3000, localhost:8080 (frontend dev + nginx proxy)
- **Migrations auto-run:** Backend entrypoint runs `alembic upgrade head` on startup
