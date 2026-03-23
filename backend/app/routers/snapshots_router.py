from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.snapshot_schema import SnapshotMappingResponse
from app.services.snapshot_service import SnapshotService

router = APIRouter(tags=["snapshots"])


@router.get(
    "/snapshots/mapping",
    response_model=SnapshotMappingResponse,
)
async def get_snapshot_mappings(db: AsyncSession = Depends(get_db)) -> SnapshotMappingResponse:
    """Get all snapshots with their dashboard information"""
    service = SnapshotService(db=db)
    return await service.list_all_snapshots_with_dashboards()
