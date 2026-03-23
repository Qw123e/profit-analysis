from datetime import date, datetime

from pydantic import BaseModel


class SnapshotMappingItem(BaseModel):
    dashboard_key: str
    dashboard_name: str
    snapshot_date: date
    feed_key: str
    generated_at: datetime
    s3_uri: str


class SnapshotMappingResponse(BaseModel):
    snapshots: list[SnapshotMappingItem]
