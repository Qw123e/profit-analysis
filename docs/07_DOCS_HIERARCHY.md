# Docs Hierarchy (BI Service PoC)

## 목적
- docs/와 plan/ 문서의 역할과 위계를 정리해, 읽는 순서와 소스 오브 트루스를 명확히 합니다.

## 문서 위계 (상위 -> 하위)

### 0) 공통 참고 (모노레포 공용)
- `20241207_NBT_BI/bi_service_poc/docs/01_COMMON_ENGINEERING_GUIDE.md`
  - 모노레포 공통 아키텍처/코드 패턴

### 1) 핵심 아키텍처/원칙
- `20241207_NBT_BI/bi_service_poc/docs/02_BI_SERVICE_ARCHITECTURE.md`
  - BI PoC 시스템 아키텍처 기준
- `20241207_NBT_BI/bi_service_poc/docs/03_DASHBOARD_DEV_GUIDE.md`
  - 대시보드 개발 기준(구조/워크플로/규칙 통합)
- `20241207_NBT_BI/bi_service_poc/docs/04_CHART_DEV_GUIDE.md`
  - 차트 구현 규칙

### 2) 개발 워크플로/성능
- `20241207_NBT_BI/bi_service_poc/plan/DASHBOARD_PERF_PLAYBOOK.md`
  - 성능 개선 체크리스트 (운영/튜닝 가이드)

### 3) 재사용 가능한 카탈로그/리팩토링
- `20241207_NBT_BI/bi_service_poc/docs/05_PLATFORM_REUSE_CATALOG.md`
  - 컴포넌트/훅/유틸/서비스 재사용 목록

### 4) 기능 로드맵/기획 문서 (plan/)
- `20241207_NBT_BI/bi_service_poc/plan/FEATURE_PLAN.md`
  - CRUD/스냅샷/매핑 기능 구현 계획
- `20241207_NBT_BI/bi_service_poc/plan/LOGIN_RBAC_ROADMAP.md`
  - 로그인 및 역할 기반 접근 제어 로드맵
- `20241207_NBT_BI/bi_service_poc/plan/DASHBOARD_ACCESS_ROADMAP.md`
  - 사용자별 대시보드 접근 권한 설계
- `20241207_NBT_BI/bi_service_poc/plan/gcc-dashboard-roadmap.md`
  - GCC 대시보드 구현 세부 계획

### 5) 운영 문서
- `20241207_NBT_BI/bi_service_poc/docs/06_OPERATIONS_RUNBOOK.md`
  - 배포/운영/점검/장애 대응 런북

## 권장 읽는 순서
1) 01_COMMON_ENGINEERING_GUIDE.md
2) 02_BI_SERVICE_ARCHITECTURE.md
3) 03_DASHBOARD_DEV_GUIDE.md
4) 04_CHART_DEV_GUIDE.md
5) 05_PLATFORM_REUSE_CATALOG.md
6) FEATURE_PLAN.md 및 관련 로드맵
7) 06_OPERATIONS_RUNBOOK.md

## 소스 오브 트루스(SoT)
- 구조/규칙: `docs/02_BI_SERVICE_ARCHITECTURE.md`, `docs/03_DASHBOARD_DEV_GUIDE.md`
- 차트 규칙: `docs/04_CHART_DEV_GUIDE.md`
- 운영: `docs/06_OPERATIONS_RUNBOOK.md`
- 계획: `plan/*.md`
