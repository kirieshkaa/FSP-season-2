from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from app.features.password_reset.entities import PasswordResetToken


class IPasswordResetRepository(ABC):
    @abstractmethod
    async def create(self, token: PasswordResetToken) -> None:
        pass

    @abstractmethod
    async def get(self, token: str) -> Optional[PasswordResetToken]:
        pass

    @abstractmethod
    async def delete(self, token: str) -> None:
        pass

    @abstractmethod
    async def delete_by_user_id(self, user_id: UUID) -> None:
        pass

    @abstractmethod
    async def delete_expired(self) -> None:
        pass
