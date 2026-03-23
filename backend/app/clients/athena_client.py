from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

import boto3

from app.core.config import settings


@dataclass(frozen=True)
class AthenaQueryResult:
    query_execution_id: str


@dataclass
class AthenaQueryStatus:
    execution_id: str
    status: str  # QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED
    state_change_reason: str | None = None
    submitted_at: datetime | None = None
    completed_at: datetime | None = None
    data_scanned_bytes: int | None = None
    execution_time_ms: int | None = None


@dataclass
class AthenaQueryResults:
    columns: list[str]
    rows: list[list[Any]]
    next_token: str | None = None


class AthenaClient:
    def __init__(self) -> None:
        self.client = boto3.client("athena", region_name=settings.aws_region)

    def start_query(self, sql: str, database: str) -> AthenaQueryResult:
        """SQL 쿼리 실행 시작"""
        response = self.client.start_query_execution(
            QueryString=sql,
            WorkGroup=settings.athena_workgroup,
            QueryExecutionContext={"Database": database},
            ResultConfiguration={"OutputLocation": settings.athena_output_s3},
        )
        return AthenaQueryResult(query_execution_id=response["QueryExecutionId"])

    def get_query_status(self, execution_id: str) -> AthenaQueryStatus:
        """쿼리 실행 상태 조회"""
        response = self.client.get_query_execution(QueryExecutionId=execution_id)
        execution = response["QueryExecution"]
        status_info = execution["Status"]

        return AthenaQueryStatus(
            execution_id=execution_id,
            status=status_info["State"],
            state_change_reason=status_info.get("StateChangeReason"),
            submitted_at=status_info.get("SubmissionDateTime"),
            completed_at=status_info.get("CompletionDateTime"),
            data_scanned_bytes=execution.get("Statistics", {}).get("DataScannedInBytes"),
            execution_time_ms=execution.get("Statistics", {}).get("EngineExecutionTimeInMillis"),
        )

    def get_query_results(
        self, execution_id: str, max_results: int = 1000, next_token: str | None = None
    ) -> AthenaQueryResults:
        """쿼리 결과 조회 (페이지네이션)"""
        params: dict[str, Any] = {
            "QueryExecutionId": execution_id,
            "MaxResults": max_results,
        }
        if next_token:
            params["NextToken"] = next_token

        response = self.client.get_query_results(**params)

        # 컬럼 정보 추출
        column_info = response["ResultSet"]["ResultSetMetadata"]["ColumnInfo"]
        columns = [col["Name"] for col in column_info]

        # 행 데이터 추출
        raw_rows = response["ResultSet"]["Rows"]
        rows: list[list[Any]] = []

        for i, row in enumerate(raw_rows):
            # 첫 번째 행이 헤더인 경우 스킵 (next_token이 없을 때만)
            if i == 0 and next_token is None:
                # 헤더 행인지 확인 (컬럼명과 동일한 경우)
                row_values = [d.get("VarCharValue", "") for d in row.get("Data", [])]
                if row_values == columns:
                    continue

            row_data = []
            for datum in row.get("Data", []):
                # VarCharValue가 있으면 사용, 없으면 None
                value = datum.get("VarCharValue")
                row_data.append(value)
            rows.append(row_data)

        return AthenaQueryResults(
            columns=columns,
            rows=rows,
            next_token=response.get("NextToken"),
        )

    def get_all_query_results(self, execution_id: str) -> AthenaQueryResults:
        """모든 쿼리 결과 조회 (페이지네이션 전체)"""
        all_rows: list[list[Any]] = []
        columns: list[str] = []
        next_token: str | None = None

        while True:
            result = self.get_query_results(execution_id, max_results=1000, next_token=next_token)

            if not columns:
                columns = result.columns

            all_rows.extend(result.rows)

            if result.next_token is None:
                break
            next_token = result.next_token

        return AthenaQueryResults(columns=columns, rows=all_rows, next_token=None)

