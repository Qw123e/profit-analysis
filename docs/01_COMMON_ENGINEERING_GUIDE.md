# Common Engineering Guide (Monorepo)

## 목적
- 모노레포 공통 아키텍처/코딩 패턴을 단일 문서로 통합합니다.

## Scope
- BI PoC는 `02_BI_SERVICE_ARCHITECTURE.md`, `03_DASHBOARD_DEV_GUIDE.md`를 우선 적용합니다.

## 기술 스택 기준 (공통)

### Frontend
- Next.js (App Router)
- TypeScript strict
- React 18.x
- HTTP client: fetch 또는 axios (프로젝트별 선택)

### Backend
- FastAPI
- SQLAlchemy async
- PostgreSQL
- Alembic

## 디렉토리 구조 (표준)

### Frontend
```
frontend/
└── src/
    ├── app/
    ├── components/
    ├── hooks/
    ├── services/
    ├── types/
    ├── utils/
    └── constants/
```

### Backend
```
backend/
└── app/
    ├── main.py
    ├── routers/
    ├── services/
    ├── repositories/
    ├── models/
    ├── schemas/
    └── core/
```

## 계층 책임

### Frontend
Component -> Hook -> Service -> API
- Component: 렌더링/이벤트 바인딩
- Hook: 상태/비즈니스 로직
- Service: HTTP 호출만

### Backend
Router -> Service -> Repository -> Database
- Router: HTTP 변환/검증
- Service: 비즈니스 로직
- Repository: DB 접근

## 개발 순서
- Backend: models -> schemas -> repositories -> services -> routers -> migration
- Frontend: types -> services -> hooks -> components -> pages

## 네이밍 규칙
- Python: snake_case 함수/변수, PascalCase 클래스
- TypeScript: camelCase 함수/변수, PascalCase 컴포넌트/타입

## 환경 변수 패턴
- `.env` + `.env.example` 쌍 유지
- `NEXT_PUBLIC_*`는 프론트 전용

## Docker 패턴 (요약)
- DB -> Backend -> Frontend 순 의존
- healthcheck 및 restart 정책 권장

## 코드 작성 규칙
- 하드코딩 금지 (상수로 분리)
- 타입 힌트 필수 (Python/TS)
- 로딩/에러/빈 상태 분기 처리
