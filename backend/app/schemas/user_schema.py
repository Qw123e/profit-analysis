from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class UserItem(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None


class UserListResponse(BaseModel):
    items: list[UserItem]


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9._-]+$")
    password: str = Field(..., min_length=6, max_length=128)
    role: Literal["admin", "user"] = "user"


class UserUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9._-]+$")
    role: Literal["admin", "user"] | None = None


class UserPasswordResetRequest(BaseModel):
    password: str = Field(..., min_length=6, max_length=128)


class UserStatusUpdateRequest(BaseModel):
    is_active: bool


class UserDashboardAccessRequest(BaseModel):
    dashboard_keys: list[str] = []


class UserDashboardAccessResponse(BaseModel):
    user_id: str
    dashboard_keys: list[str]
