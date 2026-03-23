from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a bcrypt hash."""
    password_bytes = password.encode('utf-8')
    hash_bytes = password_hash.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hash_bytes)


def create_access_token(payload: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    to_encode = payload.copy()
    expires = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.auth_token_ttl_minutes))
    to_encode.update({"exp": expires})
    return jwt.encode(to_encode, settings.auth_secret, algorithm=settings.auth_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.auth_secret, algorithms=[settings.auth_algorithm])


__all__ = ["JWTError", "hash_password", "verify_password", "create_access_token", "decode_access_token"]
