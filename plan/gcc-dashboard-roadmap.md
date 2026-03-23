# GCC 대시보드 구현 로드맵

작성일: 2025-12-30
대상: gcc 대시보드 (4개 스냅샷 활용)

---

## 📊 데이터 소스

### 1. **sales** (2025-12-30)
- **건수**: 114,955행
- **컬럼**: 22개
- **주요 컬럼**:
  - `compid`: 법인 (1200=한국, 5100=상해, 5200=광저우)
  - `년`, `월`, `년-월`: 기간
  - `대분류명`: SC/MU 구분 (스킨케어/메이크업)
  - `고객사코드`, `고객사명`: 고객 정보
  - `품목코드`, `품목명`: 제품 정보
  - `판매개수`, `총매출`, `제품매출`, `순매출`: 매출 데이터
  - `소분류명`, `중분류명`, `카테고리(2308)`: 제품 분류

### 2. **confirm** (2025-12-29)
- **건수**: 125,200행
- **컬럼**: 15개
- **주요 컬럼**:
  - `compid`, `법인`, `년`, `월`
  - `확정일자`: 확정 건수 집계 기준
  - `품목코드`, `품목명`
  - `소분류명`, `대분류명`, `카테고리(2308)`
  - `담당자`, `담당자팀`

### 3. **first_in** (2025-12-29)
- **건수**: 108,070행
- **컬럼**: 19개
- **주요 컬럼**:
  - `compid`, `년`, `월`
  - `초도입고일`: 초도 건수 집계 기준
  - `품목코드`, `품목명`, `고객사명`
  - `소분류명`, `중분류명`, `대분류명`
  - `담당자`, `담당자사번`, `변경팀`

### 4. **request** (2025-12-29)
- **건수**: 192,104행
- **컬럼**: 32개
- **주요 컬럼**:
  - `compid`, `개발법인`, `의뢰법인`, `년`, `월`
  - `의뢰일자`: 의뢰 건수 집계 기준
  - `의뢰구분`, `고객사명`, `브랜드명`
  - `개발상태`, `확정/취소/보류`, `삭제여부`
  - `담당랩`, `담당팀`, `담당자`
  - `소분류명`, `중분류명`, `대분류명`, `카테고리(2308)`

---

## 🎯 구현 목표

### 주요 차트 (우선순위순)

1. **제품매출 추이 차트** (라인 차트)
2. **제품매출 성장률** (테이블)
3. **초도 건수 차트** (막대 + 라인 혼합)
4. **초도 생산 건수** (테이블)
5. **확정경영회의 RAW DATA** (상세 테이블)
6. **법인별/카테고리별 상세 분석**

---

## 📐 데이터 정의

### 법인 매핑 (compid)
```
1200 = 한국
5100 = 상해
5200 = 광저우
(기타 법인도 동적 감지)
```

### SC/MU 구분
```
카테고리(2308) 컬럼 기준:

SC (스킨케어) 카테고리:
- 스킨류
- 크림류
- 클렌징
- 팩/마스크
- 선
- 헤어

MU (메이크업) 카테고리:
- 베이스 메이크업
- 립 메이크업
- 아이 메이크업

기타:
- 기타 (스킨케어/메이크업 둘 다 존재)

분류 로직:
const isSkincare = ['스킨류', '크림류', '클렌징', '팩/마스크', '선', '헤어'].includes(row['카테고리(2308)']);
const isMakeup = ['베이스 메이크업', '립 메이크업', '아이 메이크업'].includes(row['카테고리(2308)']);
```

### 용어 정의
```
LYM   = Last Year (Same) Month - 전년 동월
TYM   = This Year Month - 당년 당월
LYMΣ  = 전년도 1월부터 동(Same)월까지의 누적
TYMΣ  = 당년도 1월부터 당월까지의 누적
M     = 당월
C     = 카테고리(유형)
```

### 계산 공식
```
당월 = 특정 월의 데이터
누적 = 1월부터 해당 월까지의 합계
성장률 = (당년 값 - 전년 값) / 전년 값 × 100
```

---

## 🎨 구현 순서

### Phase 1: 기본 구조 및 데이터 로딩 ✅

**목표**: 4개 스냅샷 데이터를 로드하고 기본 필터 구현

**작업 내용**:
- [x] gcc/page.tsx에서 4개 스냅샷 병렬 로드
  ```typescript
  const { data: salesData } = useDashboardSnapshot({
    dashboardKey: "gcc",
    date: "2025-12-30",
    feedKey: "sales"
  });
  const { data: confirmData } = useDashboardSnapshot({
    dashboardKey: "gcc",
    date: "2025-12-29",
    feedKey: "confirm"
  });
  const { data: firstInData } = useDashboardSnapshot({
    dashboardKey: "gcc",
    date: "2025-12-29",
    feedKey: "first_in"
  });
  const { data: requestData } = useDashboardSnapshot({
    dashboardKey: "gcc",
    date: "2025-12-29",
    feedKey: "request"
  });
  ```

- [ ] 필터 UI 구현
  - 연도 필터: 2024, 2025 (멀티셀렉트)
  - 법인 필터: 동적 감지 (1200, 5100, 5200 등)
  - 카테고리 필터: SC, MU, 전체

- [ ] feedToObjects 유틸로 데이터 변환
  ```typescript
  const salesRows = feedToObjects(salesData.feeds.sales);
  const confirmRows = feedToObjects(confirmData.feeds.confirm);
  const firstInRows = feedToObjects(firstInData.feeds.first_in);
  const requestRows = feedToObjects(requestData.feeds.request);
  ```

**완료 조건**:
- 4개 스냅샷 모두 로드 성공
- 필터 선택 시 상태 변경 확인
- 로딩/에러 상태 처리 완료

---

### Phase 2: KPI 카드 구현

**목표**: 주요 지표 4개를 카드로 표시

**작업 내용**:
- [ ] KPI 계산 로직
  ```typescript
  const SC_CATEGORIES = ['스킨류', '크림류', '클렌징', '팩/마스크', '선', '헤어'];
  const MU_CATEGORIES = ['베이스 메이크업', '립 메이크업', '아이 메이크업'];

  const kpis = useMemo(() => {
    const filtered = salesRows.filter(r => {
      if (selectedYear && r['년'] !== selectedYear) return false;
      if (selectedCompid && r['compid'] !== selectedCompid) return false;

      const category = r['카테고리(2308)'];
      if (selectedCategory === 'SC' && !SC_CATEGORIES.includes(category)) return false;
      if (selectedCategory === 'MU' && !MU_CATEGORIES.includes(category)) return false;

      return true;
    });

    return {
      총매출: filtered.reduce((sum, r) => sum + safeNumber(r['순매출']), 0),
      총초도건수: firstInRows.filter(...).length,
      총확정건수: confirmRows.filter(...).length,
      총의뢰건수: requestRows.filter(...).length,
    };
  }, [salesRows, selectedYear, selectedCompid, selectedCategory]);
  ```

- [ ] MiniCard 컴포넌트로 표시
  ```typescript
  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, 1fr)' }}>
    <MiniCard title="총 매출" value={numberFormat(kpis.총매출 / 100000000)} suffix="억원" />
    <MiniCard title="초도 건수" value={String(kpis.총초도건수)} suffix="건" />
    <MiniCard title="확정 건수" value={String(kpis.총확정건수)} suffix="건" />
    <MiniCard title="의뢰 건수" value={String(kpis.총의뢰건수)} suffix="건" />
  </div>
  ```

**완료 조건**:
- KPI 4개 정확하게 계산
- 필터 변경 시 실시간 업데이트
- 억원 단위 포맷팅 정확

---

### Phase 3: 차트 1 - 제품매출 추이 (우선순위 1)

**목표**: 확대경영회의 제품매출 RAW DATA 추출 및 라인 차트

**데이터 소스**: `sales` 스냅샷

**작업 내용**:
- [ ] 월별 매출 집계
  ```typescript
  const salesTrend = useMemo(() => {
    const grouped = new Map<string, { [compid: number]: number }>();

    salesRows.forEach(r => {
      const key = `${r['년']}-${String(r['월']).padStart(2, '0')}`;
      const compid = r['compid'];
      const revenue = safeNumber(r['순매출']);

      if (!grouped.has(key)) grouped.set(key, {});
      const map = grouped.get(key)!;
      map[compid] = (map[compid] || 0) + revenue;
    });

    return Array.from(grouped.entries())
      .map(([month, compids]) => ({ month, ...compids }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [salesRows]);
  ```

- [ ] Plotly 라인 차트 구현
  ```typescript
  <Plot
    data={[
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: '2024년',
        x: salesTrend.filter(d => d.month.startsWith('2024')).map(d => d.month),
        y: salesTrend.filter(d => d.month.startsWith('2024')).map(d => d[1200] || 0),
        line: { color: theme.blue }
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: '2025년',
        x: salesTrend.filter(d => d.month.startsWith('2025')).map(d => d.month),
        y: salesTrend.filter(d => d.month.startsWith('2025')).map(d => d[1200] || 0),
        line: { color: theme.purple }
      }
    ]}
    layout={getPlotlyLayout(400)}
  />
  ```

- [ ] RAW DATA 테이블 구현
  - 법인별(스디푸, 크리푸 등) 월별 상세 데이터
  - ⚠️ **스디푸, 크리푸 매핑 확인 필요**

**완료 조건**:
- 2024, 2025 연도별 라인 차트 표시
- 월별 추이 정확하게 표시
- 법인별 필터 적용 시 차트 변경

---

### Phase 4: 차트 2 - 제품매출 성장률 (우선순위 2)

**목표**: 당해년도 및 누적 성장률 테이블

**데이터 소스**: `sales` 스냅샷

**작업 내용**:
- [ ] 성장률 계산
  ```typescript
  const salesGrowth = useMemo(() => {
    const calc = (year: number, cumulative = false) => {
      let current = 0, previous = 0;

      if (cumulative) {
        // 누적: 1월부터 현재 월까지
        const maxMonth = Math.max(...salesRows.filter(r => r['년'] === year).map(r => r['월']));
        current = salesRows
          .filter(r => r['년'] === year && r['월'] <= maxMonth)
          .reduce((sum, r) => sum + safeNumber(r['순매출']), 0);
        previous = salesRows
          .filter(r => r['년'] === year - 1 && r['월'] <= maxMonth)
          .reduce((sum, r) => sum + safeNumber(r['순매출']), 0);
      } else {
        // 당월
        const maxMonth = Math.max(...salesRows.filter(r => r['년'] === year).map(r => r['월']));
        current = salesRows
          .filter(r => r['년'] === year && r['월'] === maxMonth)
          .reduce((sum, r) => sum + safeNumber(r['순매출']), 0);
        previous = salesRows
          .filter(r => r['년'] === year - 1 && r['월'] === maxMonth)
          .reduce((sum, r) => sum + safeNumber(r['순매출']), 0);
      }

      return previous > 0 ? ((current - previous) / previous) * 100 : 0;
    };

    return {
      당월_2024: calc(2024, false),
      누적_2024: calc(2024, true),
      당월_2025: calc(2025, false),
      누적_2025: calc(2025, true),
    };
  }, [salesRows]);
  ```

- [ ] 테이블 UI 구현
  ```typescript
  <table style={tableStyle}>
    <thead>
      <tr>
        <th>구분</th>
        <th>2024년 당월</th>
        <th>2024년 누적</th>
        <th>2025년 당월</th>
        <th>2025년 누적</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>성장률</td>
        <td>{salesGrowth.당월_2024.toFixed(1)}%</td>
        <td>{salesGrowth.누적_2024.toFixed(1)}%</td>
        <td>{salesGrowth.당월_2025.toFixed(1)}%</td>
        <td>{salesGrowth.누적_2025.toFixed(1)}%</td>
      </tr>
    </tbody>
  </table>
  ```

**완료 조건**:
- LYM, TYM, LYMΣ, TYMΣ 개념으로 정확히 계산
- 성장률 % 표시
- 음수는 빨간색, 양수는 파란색 표시

---

### Phase 5: 차트 3 - 초도 건수 (우선순위 3)

**목표**: 초도 생산 건수 추이 및 성장률

**데이터 소스**: `first_in` 스냅샷

**작업 내용**:
- [ ] 초도 건수 집계
  ```typescript
  const firstInTrend = useMemo(() => {
    const byMonth = groupSum(firstInRows, '년-월', '품목코드', 'count');
    return byMonth.sort((a, b) => a.name.localeCompare(b.name));
  }, [firstInRows]);
  ```

- [ ] 막대 + 라인 혼합 차트
  ```typescript
  <Plot
    data={[
      {
        type: 'bar',
        name: '2024년',
        x: firstInTrend.filter(d => d.name.startsWith('2024')).map(d => d.name),
        y: firstInTrend.filter(d => d.name.startsWith('2024')).map(d => d.value),
        marker: { color: theme.blue }
      },
      {
        type: 'bar',
        name: '2025년',
        x: firstInTrend.filter(d => d.name.startsWith('2025')).map(d => d.name),
        y: firstInTrend.filter(d => d.name.startsWith('2025')).map(d => d.value),
        marker: { color: theme.purple }
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: '2025 누적',
        x: firstInTrend.filter(d => d.name.startsWith('2025')).map(d => d.name),
        y: firstInTrend.filter(d => d.name.startsWith('2025')).map((d, i, arr) =>
          arr.slice(0, i + 1).reduce((sum, item) => sum + item.value, 0)
        ),
        yaxis: 'y2',
        line: { color: theme.green }
      }
    ]}
    layout={{
      ...getPlotlyLayout(400),
      yaxis2: { overlaying: 'y', side: 'right' }
    }}
  />
  ```

- [ ] 초도 생산 성장률 테이블

**완료 조건**:
- 월별 초도 건수 막대 차트
- 누적 라인 차트 (우측 Y축)
- SC/MU 별도 집계 가능

---

### Phase 6: 차트 4 - 확정 건수

**목표**: 확정경영회의 확정 건수 집계

**데이터 소스**: `confirm` 스냅샷

**작업 내용**:
- [ ] 확정일자 기준 건수 집계
  ```typescript
  const confirmTrend = useMemo(() => {
    const byMonth = new Map<string, number>();

    confirmRows.forEach(r => {
      const date = r['확정일자'];
      if (!date) return;

      const month = date.substring(0, 7); // YYYY-MM
      byMonth.set(month, (byMonth.get(month) || 0) + 1);
    });

    return Array.from(byMonth.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [confirmRows]);
  ```

- [ ] 차트/테이블 구현

**완료 조건**:
- 확정일자 기준 정확한 집계
- 법인별, 카테고리별 필터 적용

---

### Phase 7: 차트 5 - 신규의뢰 건수

**목표**: 의뢰 건수 추이 및 상세 분석

**데이터 소스**: `request` 스냅샷

**작업 내용**:
- [ ] 의뢰일자 기준 건수 집계
  ```typescript
  const requestTrend = useMemo(() => {
    // 삭제여부, 확정/취소/보류 필터링
    const valid = requestRows.filter(r => {
      if (r['삭제여부'] === 'Y') return false;
      // 추가 필터 조건
      return true;
    });

    // 월별 집계
    // ...
  }, [requestRows]);
  ```

- [ ] RAW DATA 상세 테이블
  - 담당팀별 집계
  - 법인별 집계

**완료 조건**:
- 의뢰일자 기준 정확한 집계
- 상태별 필터링 (삭제, 취소, 보류 제외)

---

### Phase 8: 법인별 상세 분석

**목표**: 스디푸, 크리푸, 물분산 등 세부 분류

**작업 내용**:
- [ ] ⚠️ **스디푸, 크리푸, 물분산 매핑 확인 필요**
  - 현재 데이터에서 정확한 위치 불명
  - 담당팀? 소분류명? 별도 로직?

- [ ] 매핑 확정 후 구현

**완료 조건**:
- 법인별 상세 분류 정확
- RAW DATA 테이블 완성

---

## 🎨 UI 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│  GCC Dashboard                                               │
│  [필터: 연도 | 법인 | 카테고리(SC/MU)]                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [KPI 카드 4개]                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│  │총매출  │ │초도건수│ │확정건수│ │의뢰건수│              │
│  │1,234억 │ │  456건 │ │  789건 │ │  321건 │              │
│  └────────┘ └────────┘ └────────┘ └────────┘              │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│  [차트 1: 제품매출 추이] (Phase 3)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  라인 차트 (2024 vs 2025 월별 매출)                   │  │
│  │  - 2024년 라인 (파란색)                                │  │
│  │  - 2025년 라인 (보라색)                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  REPORT DATA (연도 계산)                                     │
│  ┌─────┬─────────┬─────────┬──────┐                       │
│  │구분 │2024 LYM │2025 TYM │증감률│                       │
│  ├─────┼─────────┼─────────┼──────┤                       │
│  │당월 │  100억  │  120억  │ +20% │                       │
│  │누적 │  500억  │  550억  │ +10% │                       │
│  └─────┴─────────┴─────────┴──────┘                       │
│                                                               │
│  RAW DATA (매출)                                             │
│  ┌────┬──────┬──────┬──────┬──────┐                       │
│  │법인│ 1월  │ 2월  │ 3월  │ ...  │                       │
│  ├────┼──────┼──────┼──────┼──────┤                       │
│  │한국│ 10.2 │ 11.7 │ 12.5 │ ...  │                       │
│  │상해│  6.8 │  5.5 │ 12.7 │ ...  │                       │
│  └────┴──────┴──────┴──────┴──────┘                       │
├─────────────────────────────────────────────────────────────┤
│  [차트 2: 제품매출 성장률] (Phase 4)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  성장률 테이블                                         │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  [차트 3: 초도 건수] (Phase 5)                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  막대 + 라인 혼합 차트                                 │  │
│  │  - 2024 막대 (파란색)                                  │  │
│  │  - 2025 막대 (보라색)                                  │  │
│  │  - 2025 누적 라인 (초록색, 우측 Y축)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  RAW DATA (초도생산 건수)                                    │
├─────────────────────────────────────────────────────────────┤
│  [차트 4: 확정 건수] (Phase 6)                               │
├─────────────────────────────────────────────────────────────┤
│  [차트 5: 신규의뢰 건수] (Phase 7)                           │
│  RAW DATA (의뢰건수)                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚠️ 확인 필요 사항

### 1. 스디푸, 크리푸, 물분산 매핑
현재 데이터 분석 결과:
- `담당랩`: 모두 "temp" (의미없음)
- `담당팀`: PW2팀, LL2 TEAM, LM1팀, CL1팀 등
- `소분류명`: 아이섀도, 립글로스, 파운데이션 등

**질문**:
- 스디푸, 크리푸, 물분산은 어떤 컬럼/값으로 구분하나요?
- 담당팀 매핑? 소분류명 매핑? 별도 로직?

### 2. 법인 추가 확인
현재 감지된 법인:
- 1200: 80,440건 (한국)
- 5100: 24,364건 (상해)
- 5200: 10,151건 (광저우)

다른 compid가 추가되면 자동으로 필터에 추가될 예정.

### 3. 기간 설정
- 기본 표시: 2024, 2025 전체
- 월별 필터 추가 필요 여부?

---

## 📝 기술 스택

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Plotly.js (차트)
- SWR (데이터 페칭)

### Utils
- `feedToObjects`: 스냅샷 → 객체 배열 변환
- `groupSum`: 그룹별 집계
- `safeNumber`: 안전한 숫자 변환
- `numberFormat`: 숫자 포맷팅 (천 단위 콤마)

### Components
- `MiniCard`: KPI 카드
- `TabButton`: 탭 버튼
- `FilterSelect`: 필터 셀렉트
- `DataTable`: RAW DATA 테이블

---

## 🚀 다음 단계

1. **Phase 1 완료 후 사용자 확인**
   - 4개 스냅샷 로딩 확인
   - 필터 동작 확인

2. **스디푸/크리푸/물분산 매핑 확정**
   - 사용자와 확인 후 구현

3. **차트별 순차 구현**
   - Phase 2 → Phase 3 → ... 순서대로

4. **각 Phase 완료 시 사용자 리뷰**
   - 데이터 정확성 검증
   - UI/UX 피드백

---

## 📅 예상 일정

- Phase 1-2: 기본 구조 + KPI (1-2시간)
- Phase 3-4: 제품매출 차트 (2-3시간)
- Phase 5-6: 초도/확정 차트 (2-3시간)
- Phase 7-8: 의뢰/상세분석 (2-3시간)

**총 예상**: 7-11시간

---

작성자: Claude
최종 수정: 2025-12-30
