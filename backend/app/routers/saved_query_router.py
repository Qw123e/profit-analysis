"""SavedQuery Router"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.saved_query_schema import (
    SavedQueryCreate,
    SavedQueryListResponse,
    SavedQueryResponse,
    SavedQueryUpdate,
)
from app.services.saved_query_service import saved_query_service

router = APIRouter(prefix="/saved-queries", tags=["saved-queries"])


@router.post("", response_model=SavedQueryResponse)
async def create_saved_query(
    data: SavedQueryCreate, db: AsyncSession = Depends(get_db)
) -> SavedQueryResponse:
    """쿼리 저장"""
    query = await saved_query_service.create_query(db, data)
    return SavedQueryResponse.model_validate(query)


@router.get("", response_model=SavedQueryListResponse)
async def list_saved_queries(
    favorites_only: bool = False, db: AsyncSession = Depends(get_db)
) -> SavedQueryListResponse:
    """저장된 쿼리 목록 조회"""
    queries = await saved_query_service.list_queries(db, favorites_only=favorites_only)
    return SavedQueryListResponse(items=[SavedQueryResponse.model_validate(q) for q in queries])


@router.get("/{query_id}", response_model=SavedQueryResponse)
async def get_saved_query(query_id: int, db: AsyncSession = Depends(get_db)) -> SavedQueryResponse:
    """쿼리 상세 조회"""
    query = await saved_query_service.get_query(db, query_id)
    if not query:
        raise HTTPException(status_code=404, detail="쿼리를 찾을 수 없습니다.")
    return SavedQueryResponse.model_validate(query)


@router.put("/{query_id}", response_model=SavedQueryResponse)
async def update_saved_query(
    query_id: int, data: SavedQueryUpdate, db: AsyncSession = Depends(get_db)
) -> SavedQueryResponse:
    """쿼리 수정"""
    query = await saved_query_service.update_query(db, query_id, data)
    if not query:
        raise HTTPException(status_code=404, detail="쿼리를 찾을 수 없습니다.")
    return SavedQueryResponse.model_validate(query)


@router.delete("/{query_id}")
async def delete_saved_query(query_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    """쿼리 삭제"""
    success = await saved_query_service.delete_query(db, query_id)
    if not success:
        raise HTTPException(status_code=404, detail="쿼리를 찾을 수 없습니다.")
    return {"success": True}
