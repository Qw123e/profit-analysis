from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

EXTERNAL_PASSWORD_HASH = "EXTERNAL_AUTH"


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_all(self) -> list[User]:
        result = await self.db.execute(select(User).order_by(User.username.asc()))
        return list(result.scalars().all())

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalars().first()

    async def create(
        self,
        username: str,
        password_hash: str,
        role: str = "user",
        is_active: bool = True,
    ) -> User:
        user = User(username=username, password_hash=password_hash, role=role, is_active=is_active)
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update(self, user_id: int, username: str | None = None, role: str | None = None) -> User | None:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        if username is not None:
            user.username = username
        if role is not None:
            user.role = role
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_password(self, user_id: int, password_hash: str) -> User | None:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        user.password_hash = password_hash
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def set_status(self, user_id: int, is_active: bool) -> User | None:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        user.is_active = is_active
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update_last_login(self, user_id: int) -> None:
        user = await self.get_by_id(user_id)
        if not user:
            return
        user.last_login_at = datetime.utcnow()
        await self.db.flush()

    async def ensure_external_user(
        self,
        user_id: int,
        username: str | None = None,
        role: str | None = None,
    ) -> tuple[User, bool]:
        user = await self.get_by_id(user_id)
        if user:
            changed = False
            if username and user.username != username:
                user.username = username
                changed = True
            if role and user.role != role:
                user.role = role
                changed = True
            if not user.is_active:
                user.is_active = True
                changed = True
            if changed:
                await self.db.flush()
                await self.db.refresh(user)
            return user, changed

        resolved_username = username or f"external-{user_id}"
        if await self.get_by_username(resolved_username):
            resolved_username = f"{resolved_username}-{user_id}"

        user = User(
            id=user_id,
            username=resolved_username,
            password_hash=EXTERNAL_PASSWORD_HASH,
            role=role or "user",
            is_active=True,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user, True
