from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.user_dashboard_access_repository import UserDashboardAccessRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user_schema import (
    UserCreateRequest,
    UserItem,
    UserListResponse,
    UserDashboardAccessRequest,
    UserDashboardAccessResponse,
    UserPasswordResetRequest,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.utils.errors import UserNotFoundError


class UserService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db=db)
        self.dashboard_repo = DashboardRepository(db=db)
        self.access_repo = UserDashboardAccessRepository(db=db)

    async def list_users(self) -> UserListResponse:
        users = await self.user_repo.list_all()
        return UserListResponse(items=[self._to_item(u) for u in users])

    async def create_user(self, request: UserCreateRequest) -> UserItem:
        existing = await self.user_repo.get_by_username(request.username)
        if existing:
            raise ValueError(f"Username already exists: {request.username}")
        user = await self.user_repo.create(
            username=request.username,
            password_hash=hash_password(request.password),
            role=request.role,
        )
        await self.db.commit()
        return self._to_item(user)

    async def update_user(self, user_id: int, request: UserUpdateRequest) -> UserItem:
        if request.username:
            existing = await self.user_repo.get_by_username(request.username)
            if existing and existing.id != user_id:
                raise ValueError(f"Username already exists: {request.username}")
        user = await self.user_repo.update(
            user_id=user_id,
            username=request.username,
            role=request.role,
        )
        if not user:
            raise UserNotFoundError(f"User not found: {user_id}")
        await self.db.commit()
        return self._to_item(user)

    async def reset_password(self, user_id: int, request: UserPasswordResetRequest) -> UserItem:
        user = await self.user_repo.update_password(
            user_id=user_id,
            password_hash=hash_password(request.password),
        )
        if not user:
            raise UserNotFoundError(f"User not found: {user_id}")
        await self.db.commit()
        return self._to_item(user)

    async def set_status(self, user_id: int, request: UserStatusUpdateRequest) -> UserItem:
        user = await self.user_repo.set_status(user_id=user_id, is_active=request.is_active)
        if not user:
            raise UserNotFoundError(f"User not found: {user_id}")
        await self.db.commit()
        return self._to_item(user)

    async def list_user_dashboards(self, user_id: int) -> UserDashboardAccessResponse:
        _, changed = await self.user_repo.ensure_external_user(user_id=user_id)
        if changed:
            await self.db.commit()
        keys = await self.access_repo.list_dashboard_keys(user_id)
        return UserDashboardAccessResponse(user_id=str(user_id), dashboard_keys=keys)

    async def set_user_dashboards(
        self, user_id: int, request: UserDashboardAccessRequest
    ) -> UserDashboardAccessResponse:
        await self.user_repo.ensure_external_user(user_id=user_id)

        keys = list(dict.fromkeys(request.dashboard_keys))
        dashboards = await self.dashboard_repo.list_by_keys(keys)
        if len(dashboards) != len(keys):
            existing = {d.key for d in dashboards}
            missing = [k for k in keys if k not in existing]
            raise ValueError(f"Unknown dashboards: {missing}")

        dashboard_ids = [d.id for d in dashboards]
        await self.access_repo.replace_access(user_id, dashboard_ids)
        await self.db.commit()
        return UserDashboardAccessResponse(user_id=str(user_id), dashboard_keys=keys)

    @staticmethod
    def _to_item(user) -> UserItem:
        return UserItem(
            id=user.id,
            username=user.username,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login_at=user.last_login_at,
        )
