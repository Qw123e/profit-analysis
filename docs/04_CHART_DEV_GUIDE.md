# Chart Development Guide (BI PoC)

## 목적
- BI PoC 차트 구현 규칙을 단일 문서로 정리합니다.

## Scope
- Recharts 기준.
- 대시보드 규칙은 `03_DASHBOARD_DEV_GUIDE.md`를 따른다.

## 기본 규칙
1) 차트 제목 필수
2) ChartCard 또는 cardStyle 컨테이너 사용
3) 축/범례에 단위 표기
4) 3열 이상 그리드 금지

## Recharts 사용 규칙
- `ResponsiveContainer`로 반응형 처리
- `CartesianGrid`는 `#f1f5f9`로 약하게
- 축 라인 제거(`axisLine={false}`, `tickLine={false}`)
- Tooltip은 라운드 + 얇은 그림자

## 레이아웃 규칙
- 1열: 핵심 트렌드 차트
- 2열: 세부 분석 차트
- 3열 이상: 금지

## 차트 타입 가이드
- 시계열: LineChart
- 비교: BarChart (grouped)
- Top N: BarChart (horizontal)
- 비중: PieChart (donut 포함)
- 혼합: ComposedChart (bar + line)

## 색상/테마
- 공통 테마: `utils/theme.ts`
- 다크/라이트 혼용 금지
- 동일 차트 내 컬러는 일관성 유지

## 디자인 패턴
- 카드: 흰 배경, 라운드 12px, 얕은 그림자(0 1px 2px rgba(15, 23, 42, 0.06))
- 헤더: 아이콘 + 타이틀 + 메타 배지(10px, round 999)
- 라벨: 11-12px, `#64748b`
- 보조 텍스트: `#94a3b8`
- 배경: `linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)`

## 성능
- 필요한 컬럼만 요청 (`columns` query)
- 큰 데이터는 stats API로 집계 후 렌더
- Raw 테이블은 preview API로 페이지네이션

## 예시
```tsx
<ChartCard title="월별 매출 추이">
  <div style={{ width: "100%", height: 320 }}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 10px rgba(15, 23, 42, 0.15)" }}
        />
        <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
</ChartCard>
```
