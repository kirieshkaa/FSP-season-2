from abc import ABC, abstractmethod
from typing import Optional

from app.features.auth.entities import (
    RefreshTokenModel,
    User,
    UserRole,
    UserStatus,
)


class IUserRepository(ABC):
    @abstractmethod
    async def create(self, user: User) -> User:
        pass

    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_username(self, username: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def update_password(self, user_id: str, password_hash: str) -> None:
        pass

    @abstractmethod
    async def get_all(
        self, page: int, limit: int, status_filter: Optional[UserStatus] = None
    ) -> tuple[list[User], int]:
        pass

    @abstractmethod
    async def update_status(self, user_id: str, status: UserStatus) -> None:
        pass

    @abstractmethod
    async def update_role(self, user_id: str, role: UserRole) -> None:
        pass

    @abstractmethod
    async def update_email(self, user_id: str, email: str) -> None:
        pass

    @abstractmethod
    async def delete(self, user_id: str) -> None:
        pass


class IRefreshTokenRepository(ABC):
    @abstractmethod
    async def create(self, token: RefreshTokenModel) -> None:
        pass

    @abstractmethod
    async def get(self, token: str) -> Optional[str]:
        pass

    @abstractmethod
    async def get_and_delete(self, token: str) -> Optional[str]:
        pass

    @abstractmethod
    async def delete(self, token: str) -> None:
        pass

    @abstractmethod
    async def delete_expired(self) -> None:
        pass

    @abstractmethod
    async def delete_by_user_id(self, user_id: str) -> None:
        pass


class IAccessTokenRepository(ABC):
    @abstractmethod
    async def revoke(self, token_id: str, expiry_seconds: int) -> None:
        pass

    @abstractmethod
    async def is_revoked(self, token_id: str) -> bool:
        pass
