from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.auth.entities import RefreshTokenModel
from app.features.auth.interfaces import IRefreshTokenRepository
from app.features.auth.models import RefreshTokenModel as RefreshTokenModelDB


class RefreshTokenRepository(IRefreshTokenRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, token: RefreshTokenModel) -> None:
        expires_at = (
            token.expires_at.replace(tzinfo=None)
            if token.expires_at.tzinfo
            else token.expires_at
        )
        token_model = RefreshTokenModelDB(
            id=uuid4(),
            user_id=token.user_id,
            refresh_token=token.refresh_token,
            expires_at=expires_at,
        )
        self._session.add(token_model)
        await self._session.commit()

    async def get_and_delete(self, token: str) -> Optional[str]:
        result = await self._session.execute(
            select(RefreshTokenModelDB)
            .where(RefreshTokenModelDB.refresh_token == token)
            .where(RefreshTokenModelDB.expires_at > datetime.utcnow())
            .with_for_update()
        )
        token_model = result.scalar_one_or_none()
        if not token_model:
            return None
        await self._session.execute(
            delete(RefreshTokenModelDB).where(RefreshTokenModelDB.id == token_model.id)
        )
        await self._session.commit()
        return token_model.refresh_token

    async def get(self, token: str) -> Optional[str]:
        result = await self._session.execute(
            select(RefreshTokenModelDB)
            .where(RefreshTokenModelDB.refresh_token == token)
            .where(RefreshTokenModelDB.expires_at > datetime.utcnow())
        )
        token_model = result.scalar_one_or_none()
        if not token_model:
            return None
        return token_model.refresh_token

    async def delete(self, token: str) -> None:
        await self._session.execute(
            delete(RefreshTokenModelDB).where(
                RefreshTokenModelDB.refresh_token == token
            )
        )
        await self._session.commit()

    async def delete_expired(self) -> None:
        await self._session.execute(
            delete(RefreshTokenModelDB).where(
                RefreshTokenModelDB.expires_at < datetime.utcnow()
            )
        )
        await self._session.commit()

    async def delete_by_user_id(self, user_id: str) -> None:
        await self._session.execute(
            delete(RefreshTokenModelDB).where(RefreshTokenModelDB.user_id == user_id)
        )
        await self._session.commit()
