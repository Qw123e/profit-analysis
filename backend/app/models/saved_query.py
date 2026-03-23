"""SavedQuery 모델 - SQL 쿼리 저장"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.config import settings
from app.models.base import Base


class SavedQuery(Base):
    """저장된 SQL 쿼리"""

    __tablename__ = "saved_queries"
    __table_args__ = {"schema": settings.bi_schema}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 사용자 ID (선택)
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # 쿼리 이름
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # 설명
    sql: Mapped[str] = mapped_column(Text, nullable=False)  # SQL 쿼리
    database: Mapped[str] = mapped_column(String(100), nullable=False, default="default")  # 데이터베이스
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)  # 즐겨찾기
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
