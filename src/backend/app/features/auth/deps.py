from dataclasses import dataclass
from typing import Callable, Optional

from fastapi import Depends, Header, HTTPException, status

from app.core.database import get_db
from app.features.auth.access_token_repository import AccessTokenRepository
from app.features.auth.refresh_token_repository import RefreshTokenRepository
from app.features.auth.repository import UserRepository
from app.features.auth.service import AuthService
from app.core.security import jwt_service


@dataclass
class CurrentUser:
    user_id: str
    token_id: str
    role: str


async def get_user_repo(session=Depends(get_db)):
    return UserRepository(session)


async def get_refresh_token_repo(session=Depends(get_db)):
    return RefreshTokenRepository(session)


async def get_access_token_repo():
    return AccessTokenRepository()


async def get_auth_service(
    user_repo=Depends(get_user_repo),
    refresh_token_repo=Depends(get_refresh_token_repo),
    access_token_repo=Depends(get_access_token_repo),
):
    return AuthService(user_repo, refresh_token_repo, access_token_repo)


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    access_token_repo=Depends(get_access_token_repo),
) -> CurrentUser:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    token = parts[1]
    payload = jwt_service.verify_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    token_id = payload.get("jti")
    is_revoked = await access_token_repo.is_revoked(token_id)
    if is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    role = payload.get("role", "user")

    return CurrentUser(user_id=user_id, token_id=token_id, role=role)


def require_roles(*allowed: str) -> Callable:
    """Dependency factory: allow only the given roles."""

    async def _dependency(
        current_user: CurrentUser = Depends(get_current_user_id),
    ) -> CurrentUser:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return _dependency
