"""SavedQuery 스키마"""

from datetime import datetime

from pydantic import BaseModel, Field


class SavedQueryCreate(BaseModel):
    """저장된 쿼리 생성 요청"""

    name: str = Field(..., min_length=1, max_length=200, description="쿼리 이름")
    description: str | None = Field(None, description="쿼리 설명")
    sql: str = Field(..., min_length=1, description="SQL 쿼리")
    database: str = Field(default="default", description="데이터베이스")
    is_favorite: bool = Field(default=False, description="즐겨찾기 여부")


class SavedQueryUpdate(BaseModel):
    """저장된 쿼리 수정 요청"""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    sql: str | None = Field(None, min_length=1)
    database: str | None = None
    is_favorite: bool | None = None


class SavedQueryResponse(BaseModel):
    """저장된 쿼리 응답"""

    id: int
    user_id: int | None
    name: str
    description: str | None
    sql: str
    database: str
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SavedQueryListResponse(BaseModel):
    """저장된 쿼리 목록 응답"""

    items: list[SavedQueryResponse]
