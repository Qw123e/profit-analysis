"""SavedQuery Repository"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.saved_query import SavedQuery


class SavedQueryRepository:
    """저장된 쿼리 저장소"""

    async def create(self, db: AsyncSession, **kwargs) -> SavedQuery:
        """쿼리 저장"""
        query = SavedQuery(**kwargs)
        db.add(query)
        await db.commit()
        await db.refresh(query)
        return query

    async def get_by_id(self, db: AsyncSession, query_id: int) -> SavedQuery | None:
        """ID로 조회"""
        result = await db.execute(select(SavedQuery).where(SavedQuery.id == query_id))
        return result.scalars().first()

    async def get_all(
        self, db: AsyncSession, user_id: int | None = None, favorites_only: bool = False
    ) -> list[SavedQuery]:
        """전체 쿼리 조회"""
        stmt = select(SavedQuery)

        if user_id is not None:
            stmt = stmt.where(SavedQuery.user_id == user_id)

        if favorites_only:
            stmt = stmt.where(SavedQuery.is_favorite == True)

        stmt = stmt.order_by(SavedQuery.updated_at.desc())

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, db: AsyncSession, query: SavedQuery, **kwargs) -> SavedQuery:
        """쿼리 수정"""
        for key, value in kwargs.items():
            if value is not None:
                setattr(query, key, value)

        await db.commit()
        await db.refresh(query)
        return query

    async def delete(self, db: AsyncSession, query: SavedQuery) -> None:
        """쿼리 삭제"""
        await db.delete(query)
        await db.commit()


saved_query_repository = SavedQueryRepository()
