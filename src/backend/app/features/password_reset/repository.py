from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.password_reset.entities import PasswordResetToken
from app.features.password_reset.interfaces import IPasswordResetRepository
from app.features.password_reset.models import (
    PasswordResetTokenModel as PasswordResetTokenModelDB,
)


class PasswordResetRepository(IPasswordResetRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, token: PasswordResetToken) -> None:
        expires_at = (
            token.expires_at.replace(tzinfo=None)
            if token.expires_at.tzinfo
            else token.expires_at
        )
        token_model = PasswordResetTokenModelDB(
            user_id=token.user_id,
            reset_token=UUID(token.reset_token),
            expires_at=expires_at,
        )
        self._session.add(token_model)
        await self._session.commit()

    async def get(self, token: str) -> Optional[PasswordResetToken]:
        result = await self._session.execute(
            select(PasswordResetTokenModelDB).where(
                PasswordResetTokenModelDB.reset_token == UUID(token)
            )
        )
        token_model = result.scalar_one_or_none()
        if not token_model:
            return None
        return PasswordResetToken(
            user_id=token_model.user_id,
            reset_token=str(token_model.reset_token),
            expires_at=token_model.expires_at,
        )

    async def delete(self, token: str) -> None:
        await self._session.execute(
            delete(PasswordResetTokenModelDB).where(
                PasswordResetTokenModelDB.reset_token == UUID(token)
            )
        )
        await self._session.commit()

    async def delete_by_user_id(self, user_id: UUID) -> None:
        await self._session.execute(
            delete(PasswordResetTokenModelDB).where(
                PasswordResetTokenModelDB.user_id == user_id
            )
        )
        await self._session.commit()

    async def delete_expired(self) -> None:
        await self._session.execute(
            delete(PasswordResetTokenModelDB).where(
                PasswordResetTokenModelDB.expires_at < datetime.utcnow()
            )
        )
        await self._session.commit()
