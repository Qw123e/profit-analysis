# 20251217_bi_service_poc

Next.js(React) + FastAPI + PostgreSQL + Athena 기반 내부 BI 대시보드 서비스 PoC.

설계서: `../BI_SERVICE_ARCHITECTURE.md`

## Goals (MVP)
- 고정형 대시보드 10개, 대시보드당 차트 ~20개 렌더링
- Athena 실시간 다중 쿼리 대신 **일 1회 스냅샷/물리화** 기반으로 2초 내 응답 목표
- 메타데이터(대시보드/피드 정의, 스냅샷 인덱스)는 **로컬 Postgres**에 저장 (RDS 미사용)

## Structure
- `frontend/`: Next.js 14 (App Router, TS strict)
- `backend/`: FastAPI (Router → Service → Repository), Athena client 분리
- `nginx/`: path-based reverse proxy (`/` → frontend, `/api` → backend)

## Local Dev (Docker Compose)
1) 환경변수 준비
- `cp .env.example .env`

2) 실행
- `docker compose up --build`

3) 확인
- 접속(프록시 경유): `http://localhost:8080`
- Backend health: `http://localhost:8080/api/health`
- Dashboard list: `http://localhost:8080/dashboards`

참고:
- 로컬에 이미 PostgreSQL이 5432를 쓰는 경우가 많아, compose는 기본으로 `localhost:55432`에 바인딩됩니다.

## DB Migration / Seed
- Backend container 시작 시 `alembic upgrade head`를 수행합니다.
- 대시보드는 UI/API로 직접 생성합니다 (기본 seed 없음).
- 수동 실행이 필요하면:
  - `docker compose exec backend alembic upgrade head`

## 스냅샷 보존(로컬 파일)
- docker-compose가 로컬 `./data`를 `/app/data`로 바인드 마운트합니다. 업로드된 스냅샷은 `./data/snapshots`에 저장됩니다.

## Dev: Excel → Snapshot 테스트 (S3 없이 로컬 파일)
- 방법 1) CLI 스크립트로 등록:
  ```
  docker compose cp ./sample.xlsx backend:/tmp/sample.xlsx
  docker compose exec backend python scripts/dev_seed_snapshot_from_excel.py \
    --excel-path /tmp/sample.xlsx \
    --dashboard-key sales-overview \
    --feed-key example \
    --snapshot-date 2024-12-18 \
    --output-dir /tmp/dev_snapshots
  ```
- 이렇게 하면 `file://...` 경로로 snapshot_items가 기록되고, `/dashboards/{key}` 요청 시 해당 JSON을 읽어 렌더합니다.
- Excel 컬럼이 그대로 `columns`/`rows`로 변환되므로, 간단한 테이블/라인 차트 테스트에 사용하세요.

- 방법 2) API로 업로드해서 등록:
  ```
  curl -X POST "http://localhost:8080/api/v1/dashboards/sales-overview/snapshots/upload?feed_key=example&date=2024-12-18" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@./sample.xlsx"
  ```
  - `columns` 파라미터에 `col1,col2` 형태로 넘기면 특정 컬럼만 선택 가능.
  - 업로드된 Excel은 컨테이너 내부 `snapshot_local_dir`(기본 /app/data/snapshots) 아래 파일(JSON)로 저장되고, snapshot_items에 `file://`로 등록됩니다.

## Batch (Daily snapshot job)
- 엔트리포인트: `backend/scripts/run_snapshot_job.py`
- 실제 운영에서는 cron/systemd timer로 하루 1회 실행 권장

## Notion
- TODO: 링크 추가
