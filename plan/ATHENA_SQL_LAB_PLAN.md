# Athena SQL Lab 기능 구현 계획

## 개요
Superset의 SQL Lab과 유사하게, 사용자가 Athena SQL 쿼리를 실행하고 결과를 확인한 뒤 해당 데이터를 스냅샷으로 저장할 수 있는 기능 구현

## 구현 범위

### 1. Backend API (FastAPI)

#### 1.1 Athena Query Router 생성
- **파일**: `backend/app/routers/athena_router.py`
- **엔드포인트**:
  - `POST /api/v1/athena/query` - SQL 쿼리 실행 시작
  - `GET /api/v1/athena/query/{execution_id}/status` - 쿼리 상태 확인
  - `GET /api/v1/athena/query/{execution_id}/results` - 쿼리 결과 조회 (페이지네이션)
  - `POST /api/v1/athena/query/{execution_id}/save-snapshot` - 결과를 스냅샷으로 저장

#### 1.2 Athena Service 확장
- **파일**: `backend/app/services/athena_service.py` (신규)
- **기능**:
  - `start_query(sql, database)` - 쿼리 시작, execution_id 반환
  - `get_query_status(execution_id)` - 상태 폴링 (QUEUED, RUNNING, SUCCEEDED, FAILED)
  - `get_query_results(execution_id, limit, offset)` - 결과 페이지네이션
  - `save_as_snapshot(execution_id, dashboard_key, feed_key, date)` - 스냅샷 저장

#### 1.3 Athena Client 확장
- **파일**: `backend/app/clients/athena_client.py` (기존 파일 확장)
- **추가 메서드**:
  - `get_query_execution(execution_id)` - 쿼리 상태 조회
  - `get_query_results(execution_id)` - 결과 조회 (페이지네이션)

#### 1.4 Schema 정의
- **파일**: `backend/app/schemas/athena_schema.py` (신규)
```python
class QueryRequest(BaseModel):
    sql: str
    database: str = "default"

class QueryStatusResponse(BaseModel):
    execution_id: str
    status: str  # QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED
    state_change_reason: str | None = None
    submitted_at: datetime | None = None
    completed_at: datetime | None = None

class QueryResultResponse(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    total_rows: int
    offset: int
    limit: int

class SaveSnapshotRequest(BaseModel):
    dashboard_key: str
    feed_key: str
    snapshot_date: str  # YYYY-MM-DD
```

### 2. Frontend (Next.js)

#### 2.1 SQL Lab 페이지
- **파일**: `frontend/src/app/sql-lab/page.tsx`
- **구성요소**:
  - SQL 에디터 (Monaco Editor 또는 CodeMirror)
  - Database 선택 드롭다운
  - 실행 버튼 + 단축키 (Cmd+Enter)
  - 쿼리 상태 표시 (로딩 스피너, 진행률)
  - 결과 테이블 (페이지네이션)
  - "스냅샷으로 저장" 버튼 + 모달

#### 2.2 UI 컴포넌트
- **SQL Editor**: `frontend/src/components/molecules/SqlEditor.tsx`
  - 구문 강조 (SQL)
  - 자동 완성 (테이블명, 컬럼명 - 향후)
  - 줄 번호
  - 실행 단축키

- **Query Result Table**: 기존 `DataTable` 컴포넌트 재사용

- **Save Snapshot Modal**: `frontend/src/components/molecules/SaveSnapshotModal.tsx`
  - Dashboard 선택 (기존 대시보드 목록)
  - Feed Key 입력
  - Snapshot Date 선택

#### 2.3 Service 추가
- **파일**: `frontend/src/services/athenaService.ts`
```typescript
export const athenaService = {
  executeQuery: (sql: string, database: string) => Promise<{ execution_id: string }>,
  getQueryStatus: (executionId: string) => Promise<QueryStatus>,
  getQueryResults: (executionId: string, limit: number, offset: number) => Promise<QueryResult>,
  saveAsSnapshot: (executionId: string, dashboardKey: string, feedKey: string, date: string) => Promise<void>
}
```

### 3. 네비게이션 추가
- 메인 헤더 또는 사이드바에 "SQL Lab" 링크 추가
- 경로: `/sql-lab`

## 구현 순서

### Phase 1: Backend API (우선)
1. `athena_schema.py` 생성
2. `athena_client.py` 확장 (상태 조회, 결과 조회)
3. `athena_service.py` 생성
4. `athena_router.py` 생성 및 라우터 등록

### Phase 2: Frontend 기본 기능
1. `athenaService.ts` 생성
2. `sql-lab/page.tsx` 기본 레이아웃
3. SQL 에디터 통합 (간단한 textarea로 시작)
4. 쿼리 실행 및 상태 폴링 로직
5. 결과 테이블 표시

### Phase 3: 스냅샷 저장 기능
1. SaveSnapshotModal 컴포넌트
2. 스냅샷 저장 API 연동
3. 성공/실패 피드백

### Phase 4: UX 개선 (선택)
1. Monaco Editor 또는 CodeMirror 통합
2. 쿼리 히스토리 저장 (localStorage)
3. 자주 쓰는 쿼리 저장 기능

## 기술 스택
- **Backend**: FastAPI, boto3, asyncio
- **Frontend**: Next.js 14, React 18, SWR
- **SQL Editor**: 기본 textarea → Monaco Editor (선택)

## 환경 변수 (이미 설정됨)
```
AWS_REGION=ap-northeast-2
ATHENA_WORKGROUP=primary
ATHENA_OUTPUT_S3=s3://bucket/athena-results/
```

## 예상 파일 구조
```
backend/
├── app/
│   ├── routers/
│   │   └── athena_router.py (신규)
│   ├── services/
│   │   └── athena_service.py (신규)
│   ├── clients/
│   │   └── athena_client.py (확장)
│   └── schemas/
│       └── athena_schema.py (신규)

frontend/
├── src/
│   ├── app/
│   │   └── sql-lab/
│   │       └── page.tsx (신규)
│   ├── components/
│   │   └── molecules/
│   │       ├── SqlEditor.tsx (신규)
│   │       └── SaveSnapshotModal.tsx (신규)
│   └── services/
│       └── athenaService.ts (신규)
```

## 주의사항
1. **비용**: Athena 쿼리는 스캔한 데이터 양에 따라 비용 발생 → LIMIT 절 권장
2. **타임아웃**: 대용량 쿼리는 시간이 오래 걸릴 수 있음 → 프론트엔드에서 폴링 처리
3. **보안**: SQL Injection 방지 (파라미터화된 쿼리는 Athena에서 직접 지원하지 않음, 권한 제어로 대응)
4. **인증**: 기존 JWT 인증 시스템 사용
