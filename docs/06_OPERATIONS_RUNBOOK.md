# BI Service Operations Runbook

## 목적
- 20241207_NBT_BI/bi_service_poc 서비스의 운영, 배포, 점검, 장애 대응을 표준화합니다.
- FastAPI + Next.js + Postgres + (옵션) auth_service 조합을 기준으로 합니다.
- 스냅샷은 파일 기반(parquet/JSON)으로 관리하며, UI는 코드 기반으로 유지합니다.

## 구성 요소
- bi_backend: FastAPI API 서버
- bi_frontend: Next.js 프론트엔드
- postgres: 메타데이터 저장소
- auth_service: 토큰 검증 및 사용자 인증
- nginx: reverse proxy 및 경로 라우팅

## 배포 및 실행

### 로컬 (권장)
- 실행: `bash deploy-local.sh`
- 구성 파일: `nginx/docker-compose.yml` + `nginx/docker-compose.local.yml`
- nginx 로컬 설정: `nginx/nginx.local.conf`

### EC2 (프로덕션)
- 실행: `bash deploy-prod.sh`
- 구성 파일: `nginx/docker-compose.yml`
- nginx 설정: `nginx/nginx.conf`

## 엔드포인트 확인

### 로컬 기준 (nginx 경유)
- 프론트: `http://localhost/bi_poc`
- API health: `http://localhost/api/health`
- Auth health: `http://localhost/auth/health`

### 서비스 직접 접근 (컨테이너 내부)
- bi_backend: `http://bi_backend:8000`
- auth_service: `http://auth_service:8050`

## 환경 변수 (소스 오브 트루스)

### 공통
- 루트 `.env` 사용 (`nginx/docker-compose.yml`, `nginx/docker-compose.local.yml`에서 로드)
- 예시 참고: `.env.example`
- 프론트 로컬 개발은 `20241207_NBT_BI/bi_service_poc/frontend/.env.local.example` 참고

### Postgres
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST_PORT`

### Auth Service
- `DATABASE_URL` (auth_service 컨테이너 내부 DB 연결)
- `AUTH_SECRET_KEY`
- `AUTH_SECRET` (토큰 서명키로 사용하는 경우)
- `AUTH_TOKEN_TTL_MINUTES`
- `AUTH_COOKIE_NAME`
- `AUTH_COOKIE_SECURE`

### BI Backend (FastAPI)
- `DATABASE_URL`
- `AWS_REGION`
- `ATHENA_WORKGROUP`
- `ATHENA_OUTPUT_S3`
- `SNAPSHOT_S3_PREFIX`
- `SNAPSHOT_LOCAL_DIR` (기본 `/app/data/snapshots`)
- `AUTH_SERVICE_URL` (예: `http://auth_service:8050`)
- `AUTH_PROJECT_KEY`
- `GCC_SNAPSHOT_ROW_LIMIT`
- `ADMIN_ID`
- `ADMIN_PASSWORD`

### BI Frontend (Next.js)
- `NEXT_PUBLIC_API_URL` (기본 `/api`)
- `NEXT_PUBLIC_AUTH_API_URL` (기본 `/auth`)
- `NEXT_PUBLIC_AUTH_TOKEN_KEY`
- `NEXT_PUBLIC_LOGGER_API_URL`
- `NEXT_PUBLIC_LOGGER_SERVICE`

### Auth Admin UI (Vite)
- `VITE_AUTH_API_URL`
- `VITE_BI_API_URL`
- `VITE_LOGGER_API_URL`
- `VITE_LOGGER_SERVICE`
- `VITE_BASE_PATH`

## 의존성/주의 사항
- 현재 API 라우터는 인증 토큰 검증을 기본으로 사용합니다.
- auth_service가 내려가면 dashboard API는 503으로 실패할 수 있습니다.
- nginx 경로는 `/api`와 `/bi_poc` 기반으로 동작합니다.

## 데이터와 스냅샷 관리

### 스냅샷 저장 경로
- 컨테이너 내부: `/app/data/snapshots`
- 로컬 볼륨: `20241207_NBT_BI/bi_service_poc/data`

### 스냅샷 업로드 (예시)
```
curl -X POST "http://localhost/api/v1/dashboards/{dashboard_key}/snapshots/upload?feed_key=example&date=2025-01-01" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./sample.xlsx"
```

### 스냅샷 목록
```
curl "http://localhost/api/v1/dashboards/{dashboard_key}/snapshots/list"
```

### 스냅샷 미리보기 (페이지네이션)
```
curl "http://localhost/api/v1/dashboards/{dashboard_key}/snapshots/preview?feed_key=example&offset=0&limit=50"
```

## 마이그레이션
- 컨테이너 시작 시 `alembic upgrade head` 실행
- 수동 실행:
  - `docker compose exec bi_backend alembic upgrade head`

## 정상 동작 확인 체크리스트
- `GET /api/health`가 `{ "status": "ok" }` 반환
- `GET /api/v1/dashboards` 접근 가능
- 스냅샷 업로드/조회 정상 동작
- 프론트 `http://localhost/bi_poc` 로딩

## 장애 대응

### 1) 인증 실패 (401/403)
- auth_service 상태 확인: `http://localhost/auth/health`
- 프론트 토큰 유효성 확인 (로그인 재시도)
- bi_backend에서 `AUTH_SERVICE_URL` 설정 확인

### 2) 스냅샷 로딩 실패 (502)
- 스냅샷 파일 존재 확인: `20241207_NBT_BI/bi_service_poc/data/snapshots/...`
- 파일 형식 확인: `.parquet`, `.schema.json`, `.preview.json`, `.validation.json`
- API 에러 메시지 확인 (SnapshotFetchError)

### 3) 대시보드 생성/삭제 자동 파일 관리 실패
- nginx/local compose volume 마운트 확인:
  - `frontend/src/app/dashboards` ↔ `/app/frontend_dashboards`
- backend 로그 확인 (docker logs)

## 운영 로그 확인
- `docker compose logs bi_backend --tail 200`
- `docker compose logs bi_frontend --tail 200`
- `docker compose logs auth_service --tail 200`
- `docker compose logs nginx --tail 200`

## 백업/복구 (간단 가이드)
- Postgres 덤프:
  - `pg_dump -h localhost -p 55432 -U postgres bi_meta > bi_meta.dump`
- 스냅샷 파일 백업:
  - `tar -czf snapshots.tar.gz 20241207_NBT_BI/bi_service_poc/data/snapshots`

## 배치 작업
- 배치 엔트리: `backend/scripts/run_snapshot_job.py`
- 현재 미구현. 운영 환경에서 스냅샷 자동화 필요 시 구현 필요.
