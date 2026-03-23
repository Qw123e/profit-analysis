# SQL Lab 스케줄러 테스트 가이드

## 문제 요약

**현상**: SQL Lab에서 스케줄을 등록했지만 실행되지 않고 로그도 남지 않음

**원인**: 스케줄을 실행하는 백그라운드 워커(scheduler)가 구현되지 않음

**해결**: `run_scheduled_queries.py` 스크립트 생성 및 실행

---

## 1. 수동 테스트 (즉시 확인)

### 1-1. 백엔드 컨테이너 접속

```bash
cd /Users/jongho.jung/Desktop/jongho_project/PoC/DA_PoC/PoC/nginx
docker compose exec bi_backend bash
```

### 1-2. croniter 패키지 설치

```bash
pip install croniter==3.0.3
```

### 1-3. 스케줄러 스크립트 실행

```bash
cd /app
python scripts/run_scheduled_queries.py
```

**예상 출력**:
```
============================================================
🕐 Scheduler run at 2026-02-11 09:30:00
============================================================

📋 Found 2 active schedule(s)
▶️  Executing schedule ID: 1 (SavedQuery ID: 5)
🔄 Running query: Daily Sales Report
✅ Success: 1234 rows, 2500ms
⏭️  Skip schedule ID 2 (not due yet)

============================================================
✅ Scheduler run completed
============================================================
```

### 1-4. 실행 로그 확인

웹 UI에서 확인:
1. https://localhost/bi_poc/sql-lab 접속
2. "실행 로그" 탭 클릭
3. 방금 실행된 로그 확인 (status: success)

---

## 2. 자동 실행 설정 (프로덕션)

### 방법 A: Docker Compose에 Scheduler 서비스 추가

`docker-compose.yml`에 추가:

```yaml
  bi_scheduler:
    build:
      context: ../20241207_NBT_BI/bi_service_poc/backend
      dockerfile: Dockerfile
    container_name: bi_scheduler
    command: >
      sh -c "
        while true; do
          python scripts/run_scheduled_queries.py
          sleep 60
        done
      "
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/bi_meta
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
    depends_on:
      - postgres
    networks:
      - app-network
```

재시작:
```bash
cd nginx
docker compose up -d --build bi_scheduler
```

### 방법 B: 호스트 Cron 설정

```bash
# Cron 편집
crontab -e

# 매 분마다 실행
* * * * * cd /path/to/nginx && docker compose exec -T bi_backend python /app/scripts/run_scheduled_queries.py >> /var/log/bi_scheduler.log 2>&1
```

### 방법 C: Kubernetes CronJob (K8s 환경)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: bi-scheduler
spec:
  schedule: "*/1 * * * *"  # 매 분마다
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scheduler
            image: bi-backend:latest
            command: ["python", "scripts/run_scheduled_queries.py"]
          restartPolicy: OnFailure
```

---

## 3. 테스트 시나리오

### 시나리오 1: 매 분마다 실행되는 스케줄

1. **스케줄 등록**:
   - Cron: `* * * * *` (매 분)
   - Query: `SELECT COUNT(*) FROM test_table`

2. **대기**: 1분 대기

3. **확인**:
   ```bash
   docker compose exec bi_backend python scripts/run_scheduled_queries.py
   ```

4. **결과**: 실행 로그에 새 항목 생성됨

### 시나리오 2: 매일 오전 9시 실행

1. **스케줄 등록**:
   - Cron: `0 9 * * *`
   - Query: `SELECT * FROM daily_sales`

2. **시간 변경 테스트** (개발용):
   ```python
   # 스크립트에서 현재 시간을 9시로 변경하여 테스트
   # should_run_now 함수에 디버그 모드 추가
   ```

3. **수동 실행으로 테스트**:
   ```bash
   docker compose exec bi_backend python scripts/run_scheduled_queries.py
   ```

---

## 4. 디버깅 팁

### 로그 확인

```bash
# 백엔드 로그
docker compose logs -f bi_backend

# 스케줄러 로그 (방법 A 사용 시)
docker compose logs -f bi_scheduler

# 데이터베이스에서 직접 확인
docker compose exec postgres psql -U postgres -d bi_meta

# 스케줄 목록
SELECT id, saved_query_id, schedule_cron, is_active, last_run_at
FROM scheduled_queries
WHERE is_active = true;

# 실행 로그
SELECT id, scheduled_query_id, execution_type, status, created_at
FROM query_execution_logs
ORDER BY created_at DESC
LIMIT 10;
```

### 일반적인 문제

**문제 1**: "croniter not found"
```bash
# 해결
docker compose exec bi_backend pip install croniter
```

**문제 2**: "SavedQuery not found"
```bash
# 원인: 스케줄에 연결된 SavedQuery가 삭제됨
# 해결: 스케줄을 비활성화하거나 삭제
```

**문제 3**: Athena 권한 오류
```bash
# 원인: AWS 자격증명 없음 또는 만료
# 해결: .env 파일에 AWS 키 확인
```

---

## 5. 프로덕션 체크리스트

- [ ] croniter 패키지 설치됨 (`requirements.txt`)
- [ ] 스케줄러 스크립트 생성됨 (`run_scheduled_queries.py`)
- [ ] 자동 실행 방법 선택 (Docker/Cron/K8s)
- [ ] 로그 모니터링 설정
- [ ] 알림 설정 (실패 시 Slack/Email)
- [ ] 백업 및 복구 계획
- [ ] 성능 모니터링 (쿼리 실행 시간)

---

## 6. 추가 개선 사항

### 향후 고려사항

1. **동시 실행 제한**: 같은 스케줄이 중복 실행되지 않도록 락(lock) 추가
2. **재시도 로직**: 실패 시 자동 재시도 (exponential backoff)
3. **알림**: 실패 시 Slack/Email 알림
4. **대시보드**: 스케줄 실행 현황 대시보드
5. **성능**: 병렬 실행 지원 (asyncio.gather)

### 예제: 재시도 로직 추가

```python
async def execute_with_retry(db, schedule, max_retries=3):
    for attempt in range(max_retries):
        try:
            await execute_scheduled_query(db, schedule)
            return
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)  # 1, 2, 4초 대기
```

---

## 문의사항

문제가 계속되면 다음 정보를 포함하여 문의:
1. 스케줄 ID
2. Cron 표현식
3. 에러 메시지
4. 백엔드 로그 (`docker compose logs bi_backend`)
