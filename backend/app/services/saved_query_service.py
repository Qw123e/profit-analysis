"""SavedQuery Service"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_query import SavedQuery
from app.repositories.saved_query_repository import saved_query_repository
from app.schemas.saved_query_schema import SavedQueryCreate, SavedQueryUpdate


class SavedQueryService:
    """저장된 쿼리 서비스"""

    async def create_query(
        self, db: AsyncSession, data: SavedQueryCreate, user_id: int | None = None
    ) -> SavedQuery:
        """쿼리 저장"""
        return await saved_query_repository.create(
            db,
            user_id=user_id,
            name=data.name,
            description=data.description,
            sql=data.sql,
            database=data.database,
            is_favorite=data.is_favorite,
        )

    async def get_query(self, db: AsyncSession, query_id: int) -> SavedQuery | None:
        """쿼리 조회"""
        return await saved_query_repository.get_by_id(db, query_id)

    async def list_queries(
        self, db: AsyncSession, user_id: int | None = None, favorites_only: bool = False
    ) -> list[SavedQuery]:
        """쿼리 목록 조회"""
        return await saved_query_repository.get_all(db, user_id, favorites_only)

    async def update_query(
        self, db: AsyncSession, query_id: int, data: SavedQueryUpdate
    ) -> SavedQuery | None:
        """쿼리 수정"""
        query = await saved_query_repository.get_by_id(db, query_id)
        if not query:
            return None

        return await saved_query_repository.update(
            db,
            query,
            name=data.name,
            description=data.description,
            sql=data.sql,
            database=data.database,
            is_favorite=data.is_favorite,
        )

    async def delete_query(self, db: AsyncSession, query_id: int) -> bool:
        """쿼리 삭제"""
        query = await saved_query_repository.get_by_id(db, query_id)
        if not query:
            return False

        await saved_query_repository.delete(db, query)
        return True


saved_query_service = SavedQueryService()
