# Feature Implementation Plan

## 📋 요구사항 정리

### 1. 대시보드 CRUD 기능
- **위치**: http://localhost:8080/dashboards
- **기능**: 대시보드 추가 및 삭제

### 2. 스냅샷 삭제 기능
- **위치**: http://localhost:8080/dashboards/{dashboard_key}/snapshots
- **기능**: 스냅샷 삭제

### 3. Raw 데이터 기본 표시
- **위치**: 각 대시보드 페이지
- **기능**: 스냅샷이 있을 때 맨 처음에는 raw 데이터 테이블 표시

### 4. 스냅샷-대시보드 매핑 현황
- **위치**: http://localhost:8080/dashboards/upload (또는 새 페이지)
- **기능**: 업로드한 스냅샷이 어떤 대시보드와 연결되어 있는지 확인

---

## 🏗️ 구현 계획

### Phase 1: Backend API 확장

#### 1.1 Dashboard CRUD API
```
POST /api/v1/dashboards
- Request: { key, name, description }
- Response: DashboardItem
- Service: DashboardService.create_dashboard()
- Repository: DashboardRepository.create()

DELETE /api/v1/dashboards/{dashboard_key}
- Response: 204 No Content
- Service: DashboardService.delete_dashboard()
- Repository: DashboardRepository.delete_by_key()
- Cascade: Delete all related snapshot_items
```

**Files to modify:**
- `backend/app/routers/dashboards_router.py` (+2 endpoints)
- `backend/app/services/dashboard_service.py` (+2 methods)
- `backend/app/repositories/dashboard_repository.py` (+2 methods)
- `backend/app/schemas/dashboard_schema.py` (+1 request schema: DashboardCreateRequest)

---

#### 1.2 Snapshot Delete API
```
DELETE /api/v1/dashboards/{dashboard_key}/snapshots/{snapshot_date}?feed_key={feed_key}
- Response: 204 No Content
- Service: SnapshotService.delete_snapshot()
- Repository: SnapshotRepository.delete_snapshot_item()
- Side effect: Delete JSON file from local storage or S3
```

**Files to modify:**
- `backend/app/routers/dashboards_router.py` (+1 endpoint)
- `backend/app/services/snapshot_service.py` (+1 method: delete_snapshot())
- `backend/app/repositories/snapshot_repository.py` (+1 method: delete_snapshot_item())

---

#### 1.3 Snapshot-Dashboard Mapping API
```
GET /api/v1/snapshots/mapping
- Response: {
    "snapshots": [
      {
        "dashboardKey": "sales-overview",
        "dashboardName": "매출 현황",
        "snapshotDate": "2024-12-18",
        "feedKey": "example",
        "generatedAt": "2024-12-18T10:00:00Z",
        "uri": "file://..."
      },
      ...
    ]
  }
- Service: SnapshotService.list_all_snapshots_with_dashboards()
- Repository: SnapshotRepository.list_all_with_dashboard_info()
  - JOIN snapshot_items with dashboards
```

**Files to create/modify:**
- `backend/app/routers/snapshots_router.py` (NEW - dedicated snapshots router)
- `backend/app/services/snapshot_service.py` (+1 method)
- `backend/app/repositories/snapshot_repository.py` (+1 method with JOIN)
- `backend/app/schemas/snapshot_schema.py` (NEW - SnapshotMappingResponse)

---

### Phase 2: Frontend 구현

#### 2.1 Dashboard 리스트 페이지 개선 (`/dashboards`)

**현재 상태:**
- 대시보드 리스트만 표시 (read-only)

**개선 사항:**
```tsx
// frontend/src/app/dashboards/page.tsx
- Add "Create Dashboard" button
- Add delete icon for each dashboard item
- Confirmation modal for delete
- Success/error toast notifications
```

**새로운 컴포넌트:**
- `components/organisms/DashboardList.tsx` (기존 페이지를 organism으로 분리)
- `components/molecules/DashboardCard.tsx` (개별 대시보드 카드, delete 버튼 포함)
- `components/molecules/DashboardCreateModal.tsx` (대시보드 생성 모달)
- `components/molecules/ConfirmDialog.tsx` (삭제 확인 다이얼로그, 재사용 가능)

**새로운 service 메서드:**
```typescript
// frontend/src/services/dashboardService.ts
createDashboard(data: { key: string; name: string; description?: string })
deleteDashboard(dashboardKey: string)
```

---

#### 2.2 Snapshot 리스트 페이지 개선 (`/dashboards/{key}/snapshots`)

**현재 상태:**
- 스냅샷 리스트만 표시 (read-only)

**개선 사항:**
```tsx
// frontend/src/app/dashboards/[dashboardId]/snapshots/page.tsx
- Add delete icon for each snapshot entry
- Group by date, allow delete by (date + feed_key)
- Confirmation modal for delete
- Refresh list after deletion
```

**새로운 컴포넌트:**
- `components/molecules/SnapshotListItem.tsx` (delete 버튼 포함)
- Use existing `ConfirmDialog.tsx`

**새로운 service 메서드:**
```typescript
// frontend/src/services/dashboardService.ts
deleteSnapshot(dashboardKey: string, snapshotDate: string, feedKey: string)
```

---

#### 2.3 Dashboard 상세 페이지 - Raw 데이터 우선 표시

**현재 상태:**
- 각 대시보드마다 커스텀 차트가 먼저 표시됨
- Raw 테이블은 하단에 있음 (sales-overview만 존재)

**개선 사항:**
```tsx
// frontend/src/app/dashboards/[dashboardId]/page.tsx
- Add tab navigation: ["Raw Data", "Charts"]
- Default tab: "Raw Data" when feed exists
- Show full data table in Raw Data tab (all columns, all rows with pagination)
- Charts tab: existing visualizations
```

**구현 방법:**
1. useState로 `activeTab` 관리 ("raw" | "charts")
2. 초기값은 `feed가 있으면 "raw", 없으면 "charts"`
3. TabButton 컴포넌트 재사용 (이미 customer-overview에 존재)
4. Raw Data 탭:
   - Full table with all columns
   - Client-side pagination (50 rows per page)
   - Search/filter 기능 (optional, v2)
5. Charts 탭:
   - 기존 차트 로직 유지

**컴포넌트 수정:**
- `frontend/src/app/dashboards/[dashboardId]/page.tsx` (탭 추가)
- `components/molecules/DataTable.tsx` (NEW - 재사용 가능한 테이블 컴포넌트)

---

#### 2.4 Snapshot 매핑 현황 페이지 (`/snapshots/mapping`)

**새 페이지 생성:**
```
frontend/src/app/snapshots/
  └── mapping/
      └── page.tsx
```

**기능:**
- 모든 스냅샷을 대시보드별로 그룹화하여 표시
- 테이블 형식: Dashboard Name | Snapshot Date | Feed Key | Generated At | Actions
- Delete 버튼 (각 스냅샷마다)
- Filter: 대시보드별, 날짜별
- Sort: 최신순, 대시보드명순

**새로운 컴포넌트:**
- `app/snapshots/mapping/page.tsx` (메인 페이지)
- `components/organisms/SnapshotMappingTable.tsx`
- Use existing `ConfirmDialog.tsx`

**새로운 service:**
```typescript
// frontend/src/services/snapshotService.ts (NEW)
getSnapshotMappings(): Promise<SnapshotMappingResponse>
```

**Navigation 추가:**
- 메인 네비게이션에 "Snapshot 현황" 링크 추가
- 또는 Upload 페이지에 "View All Snapshots" 버튼 추가

---

### Phase 3: Database & Infrastructure

#### 3.1 Migration for Cascade Delete
```python
# alembic/versions/XXXX_add_cascade_delete.py
# Modify ForeignKey in snapshot_items table
# ondelete="CASCADE" ensures snapshots are deleted when dashboard is deleted
```

**Files to modify:**
- `backend/app/models/snapshot_item.py` (verify `ondelete="CASCADE"` exists - already present!)

---

## 🗂️ File Structure Changes

### New Files (8개)
```
backend/
  app/
    routers/
      snapshots_router.py                   # NEW
    schemas/
      snapshot_schema.py                    # NEW

frontend/
  src/
    app/
      snapshots/
        mapping/
          page.tsx                          # NEW
    components/
      molecules/
        DashboardCard.tsx                   # NEW
        DashboardCreateModal.tsx            # NEW
        ConfirmDialog.tsx                   # NEW
        SnapshotListItem.tsx                # NEW
        DataTable.tsx                       # NEW
      organisms/
        DashboardList.tsx                   # NEW (refactor from page)
        SnapshotMappingTable.tsx            # NEW
    services/
      snapshotService.ts                    # NEW
```

### Modified Files (10개)
```
backend/
  app/
    routers/
      dashboards_router.py                  # +3 endpoints (POST, DELETE dashboard, DELETE snapshot)
    services/
      dashboard_service.py                  # +2 methods
      snapshot_service.py                   # +2 methods
    repositories/
      dashboard_repository.py               # +2 methods
      snapshot_repository.py                # +2 methods
    schemas/
      dashboard_schema.py                   # +1 request schema

frontend/
  src/
    app/
      dashboards/
        page.tsx                            # Add create/delete UI
        [dashboardId]/
          page.tsx                          # Add tabs (raw/charts)
          snapshots/
            page.tsx                        # Add delete UI
    services/
      dashboardService.ts                   # +2 methods
```

---

## 🎯 Implementation Order

### Sprint 1: Backend Foundation (2-3 hours)
1. ✅ Dashboard CRUD API (create, delete)
2. ✅ Snapshot delete API
3. ✅ Snapshot mapping API with JOIN
4. ✅ Add schemas (DashboardCreateRequest, SnapshotMappingResponse)
5. ✅ Test APIs with curl/Postman

### Sprint 2: Reusable Components (1-2 hours)
1. ✅ ConfirmDialog component (재사용)
2. ✅ DataTable component (재사용)
3. ✅ DashboardCard component
4. ✅ TabButton enhancement (if needed)

### Sprint 3: Dashboard Management UI (2 hours)
1. ✅ Dashboard list page - create modal
2. ✅ Dashboard list page - delete button + confirmation
3. ✅ Service methods (createDashboard, deleteDashboard)
4. ✅ Success/error toasts

### Sprint 4: Snapshot Management UI (2 hours)
1. ✅ Snapshot list page - delete buttons
2. ✅ Snapshot delete service method
3. ✅ Snapshot mapping page
4. ✅ Navigation updates

### Sprint 5: Raw Data Display (1-2 hours)
1. ✅ Add tabs to dashboard detail page
2. ✅ Raw data table with pagination
3. ✅ Default to raw tab when feed exists

### Sprint 6: Testing & Polish (1 hour)
1. ✅ E2E test all CRUD operations
2. ✅ Check cascade deletes work correctly
3. ✅ UI polish (loading states, error handling)
4. ✅ Responsive design check

---

## 🔍 Technical Considerations

### Security
- ✅ No authentication required (PoC)
- ⚠️ Add confirmation dialogs for all destructive operations
- ⚠️ Validate dashboard keys (no special characters, unique constraint)

### Error Handling
- Dashboard delete: Check if snapshots exist (optional warning)
- Snapshot delete: Handle file deletion errors gracefully
- Show user-friendly error messages

### Performance
- Snapshot mapping API: Use SQL JOIN instead of N+1 queries
- Client-side pagination for raw data (start with simple implementation)
- Debounce search/filter inputs (if added)

### Data Consistency
- `ondelete="CASCADE"` already set in models
- Delete JSON files when deleting snapshots (both S3 and local)
- Atomic operations (transaction scope in service layer)

---

## 📝 Schema Updates

### DashboardCreateRequest
```python
class DashboardCreateRequest(BaseModel):
    key: str = Field(..., regex=r"^[a-z0-9-]+$")  # Validate format
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
```

### SnapshotMappingItem
```python
class SnapshotMappingItem(BaseModel):
    dashboard_key: str
    dashboard_name: str
    snapshot_date: date
    feed_key: str
    generated_at: datetime
    uri: str

class SnapshotMappingResponse(BaseModel):
    snapshots: list[SnapshotMappingItem]
```

---

## ✅ Acceptance Criteria

### Dashboard CRUD
- [ ] 대시보드 생성: key, name, description 입력 → DB 저장 → 리스트 갱신
- [ ] 대시보드 삭제: 확인 모달 → 삭제 → 관련 스냅샷도 함께 삭제 (cascade)
- [ ] 삭제 시 이미 스냅샷이 있으면 경고 메시지 표시 (optional)

### Snapshot Delete
- [ ] 스냅샷 삭제: 날짜 + feed_key 조합으로 삭제
- [ ] 파일 시스템에서 JSON 파일도 삭제 (file:// URI인 경우)
- [ ] 삭제 후 리스트 자동 갱신

### Raw Data Display
- [ ] 대시보드 진입 시 기본 탭: Raw Data
- [ ] Raw Data 탭: 전체 컬럼, 전체 행 (페이지네이션)
- [ ] Charts 탭: 기존 차트들
- [ ] 탭 전환 부드럽게 작동

### Snapshot Mapping
- [ ] 모든 스냅샷 리스트 표시 (대시보드명, 날짜, feed 키 포함)
- [ ] 대시보드별 필터링 가능
- [ ] 각 스냅샷마다 삭제 버튼
- [ ] 삭제 시 확인 모달

---

## 🚀 Next Steps

1. Review this plan
2. Get user confirmation
3. Start with Sprint 1 (Backend Foundation)
4. Iterate through sprints
5. Test and deploy

---

**Estimated Total Time:** 8-12 hours
**Priority:** All features are high priority
**Risk Level:** Low (PoC environment, no auth, simple CRUD operations)
