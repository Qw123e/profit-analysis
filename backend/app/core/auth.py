from __future__ import annotations

import httpx
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


async def _get_dev_user(db: AsyncSession) -> User:
    """Return a dev admin user for local development when auth is disabled."""
    repo = UserRepository(db=db)
    user, changed = await repo.ensure_external_user(user_id=1, username="dev-admin", role="admin")
    if changed:
        await db.commit()
    return user


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Dev bypass: skip external auth service when disabled
    if settings.disable_auth:
        return await _get_dev_user(db)

    # Try to get token from Authorization header first
    token = credentials.credentials if credentials else None

    # If no header token, try cookie (for OAuth/SSO)
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        async with httpx.AsyncClient(timeout=settings.auth_timeout_seconds) as client:
            response = await client.get(
                f"{settings.auth_service_url}/auth/verify",
                headers={"Authorization": f"Bearer {token}"},
                params={"project_key": settings.auth_project_key},
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable",
        ) from exc

    if response.status_code != status.HTTP_200_OK:
        detail = "Invalid token"
        if response.status_code == status.HTTP_403_FORBIDDEN:
            detail = "Access denied"
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            detail = "Auth project not found"
        status_code = (
            response.status_code
            if response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
            else status.HTTP_401_UNAUTHORIZED
        )
        raise HTTPException(status_code=status_code, detail=detail)

    data = response.json()
    user_id_raw = data.get("user_id")
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth response")

    username = data.get("username") or f"external-{user_id}"
    role = data.get("role") or "user"

    repo = UserRepository(db=db)
    user, changed = await repo.ensure_external_user(user_id=user_id, username=username, role=role)
    if changed:
        await db.commit()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")
    return user


async def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Optional authentication - returns None if no token provided"""
    # Dev bypass: skip external auth service when disabled
    if settings.disable_auth:
        return await _get_dev_user(db)

    # Try to get token from Authorization header first
    token = credentials.credentials if credentials else None

    # If no header token, try cookie (for OAuth/SSO)
    if not token:
        token = request.cookies.get("access_token")

    if not token:
        return None
    try:
        async with httpx.AsyncClient(timeout=settings.auth_timeout_seconds) as client:
            response = await client.get(
                f"{settings.auth_service_url}/auth/verify",
                headers={"Authorization": f"Bearer {token}"},
                params={"project_key": settings.auth_project_key},
            )
    except httpx.RequestError:
        # If auth service is down, return None (allow unauthenticated access)
        return None

    if response.status_code != status.HTTP_200_OK:
        return None

    data = response.json()
    user_id_raw = data.get("user_id")
    try:
        user_id = int(user_id_raw)
    except (TypeError, ValueError):
        return None

    username = data.get("username") or f"external-{user_id}"
    role = data.get("role") or "user"

    repo = UserRepository(db=db)
    user, changed = await repo.ensure_external_user(user_id=user_id, username=username, role=role)
    if changed:
        await db.commit()
    if not user or not user.is_active:
        return None
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


__all__ = ["get_current_user", "get_current_user_optional", "require_admin"]
