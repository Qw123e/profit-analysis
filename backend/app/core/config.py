from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    env: str = "local"
    database_url: str

    aws_region: str = "ap-northeast-2"
    athena_workgroup: str = "primary"
    athena_output_s3: str = "s3://mock-bucket/athena/"
    athena_mock_mode: bool = False  # 프로덕션: 실제 Athena 연결 (로컬 테스트 시 .env에서 ATHENA_MOCK_MODE=true 설정)
    snapshot_s3_prefix: str | None = None
    snapshot_local_dir: str = "/app/data/snapshots"

    auth_secret: str = "dev-secret"
    auth_algorithm: str = "HS256"
    auth_token_ttl_minutes: int = 480
    auth_cookie_name: str = "bi_auth"
    auth_cookie_secure: bool = False
    auth_service_url: str = "http://auth_service:8050"
    auth_project_key: str = "bi_poc"
    auth_timeout_seconds: float = 5.0
    disable_auth: bool = False  # 로컬 개발 시 인증 우회 (DISABLE_AUTH=true)

    bi_schema: str = "bi"

    admin_id: str | None = None
    admin_password: str | None = None

    seed_manifest_path: str = "/app/seed/manifest.json"
    seed_base_dir: str = "/app"

    gcc_snapshot_row_limit: int | None = 100000000  # No practical limit


settings = Settings()
