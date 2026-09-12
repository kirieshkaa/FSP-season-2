"""In-memory fake repositories implementing the domain interfaces.

These mirror the behaviour contracts of the SQLAlchemy-backed repositories
(e.g. ``get_and_delete`` consuming the token, ``get`` returning ``None`` for
expired tokens) so services can be tested without Postgres/Redis.
"""

from copy import deepcopy
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from app.core.email import IEmailSender
from app.features.auth.entities import (
    RefreshTokenModel,
    User,
    UserRole,
    UserStatus,
)
from app.features.auth.interfaces import (
    IAccessTokenRepository,
    IRefreshTokenRepository,
    IUserRepository,
)
from app.features.password_reset.entities import PasswordResetToken
from app.features.password_reset.interfaces import IPasswordResetRepository
from app.features.packages.entities import Package, PaginatedPackages
from app.features.packages.interfaces import IPackageRepository
from app.features.products.entities import PaginatedProducts, Product
from app.features.products.interfaces import IProductRepository


def _now_naive() -> datetime:
    return datetime.utcnow()


class FakeUserRepository(IUserRepository):
    def __init__(self):
        self.users: dict[UUID, User] = {}

    def seed(
        self,
        username: str = "user",
        email: str = "user@example.com",
        password_hash: str = "hash",
        role: UserRole = UserRole.USER,
        status: UserStatus = UserStatus.APPROVED,
    ) -> User:
        user = User(
            id=uuid4(),
            username=username,
            email=email,
            password_hash=password_hash,
            role=role,
            status=status,
            created_at=_now_naive(),
        )
        self.users[user.id] = user
        return user

    async def add_user(
        self,
        username: str = "user",
        email: str = "user@example.com",
        password: str = "password123",
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
    ) -> User:
        """Convenience helper: seed a user with a real bcrypt hash."""
        from app.core.security import hash_password

        return self.seed(
            username=username,
            email=email,
            password_hash=await hash_password(password),
            role=role or UserRole.USER,
            status=status or UserStatus.APPROVED,
        )

    def _coerce_uuid(self, value) -> UUID:
        return value if isinstance(value, UUID) else UUID(str(value))

    async def create(self, user: User) -> User:
        stored = deepcopy(user)
        if stored.id is None:
            stored.id = uuid4()
        self.users[stored.id] = stored
        return deepcopy(stored)

    async def get_by_id(self, user_id: str) -> Optional[User]:
        try:
            key = self._coerce_uuid(user_id)
        except (ValueError, AttributeError):
            return None
        user = self.users.get(key)
        return deepcopy(user) if user else None

    async def get_by_username(self, username: str) -> Optional[User]:
        for user in self.users.values():
            if user.username == username:
                return deepcopy(user)
        return None

    async def get_by_email(self, email: str) -> Optional[User]:
        for user in self.users.values():
            if user.email == email:
                return deepcopy(user)
        return None

    async def update_password(self, user_id: str, password_hash: str) -> None:
        user = self.users.get(self._coerce_uuid(user_id))
        if user:
            user.password_hash = password_hash

    async def get_all(
        self, page: int, limit: int, status_filter: Optional[UserStatus] = None
    ) -> tuple[list[User], int]:
        users = list(self.users.values())
        if status_filter:
            users = [u for u in users if u.status == status_filter]
        users.sort(key=lambda u: u.created_at, reverse=True)
        total = len(users)
        offset = (page - 1) * limit
        return [deepcopy(u) for u in users[offset : offset + limit]], total

    async def update_status(self, user_id: str, status: UserStatus) -> None:
        user = self.users.get(self._coerce_uuid(user_id))
        if user:
            user.status = status

    async def update_role(self, user_id: str, role: UserRole) -> None:
        user = self.users.get(self._coerce_uuid(user_id))
        if user:
            user.role = role

    async def update_email(self, user_id: str, email: str) -> None:
        user = self.users.get(self._coerce_uuid(user_id))
        if user:
            user.email = email

    async def delete(self, user_id: str) -> None:
        self.users.pop(self._coerce_uuid(user_id), None)


class FakeRefreshTokenRepository(IRefreshTokenRepository):
    def __init__(self):
        self.tokens: dict[str, RefreshTokenModel] = {}
        self.deleted_expired_calls = 0

    async def create(self, token: RefreshTokenModel) -> None:
        self.tokens[token.refresh_token] = deepcopy(token)

    async def get(self, token: str) -> Optional[str]:
        stored = self.tokens.get(token)
        if not stored or stored.expires_at.replace(tzinfo=None) <= _now_naive():
            return None
        return stored.refresh_token

    async def get_and_delete(self, token: str) -> Optional[str]:
        stored = self.tokens.get(token)
        if not stored or stored.expires_at.replace(tzinfo=None) <= _now_naive():
            return None
        del self.tokens[token]
        return stored.refresh_token

    async def delete(self, token: str) -> None:
        self.tokens.pop(token, None)

    async def delete_expired(self) -> None:
        self.deleted_expired_calls += 1
        now = _now_naive()
        for key in [
            k
            for k, v in self.tokens.items()
            if v.expires_at.replace(tzinfo=None) <= now
        ]:
            del self.tokens[key]

    async def delete_by_user_id(self, user_id: str) -> None:
        target = UUID(str(user_id))
        for key in [k for k, v in self.tokens.items() if v.user_id == target]:
            del self.tokens[key]


class FakeAccessTokenRepository(IAccessTokenRepository):
    def __init__(self):
        self.revoked: dict[str, int] = {}

    async def revoke(self, token_id: str, expiry_seconds: int) -> None:
        self.revoked[token_id] = expiry_seconds

    async def is_revoked(self, token_id: str) -> bool:
        return token_id in self.revoked


class FakePasswordResetRepository(IPasswordResetRepository):
    def __init__(self):
        self.tokens: dict[str, PasswordResetToken] = {}

    async def create(self, token: PasswordResetToken) -> None:
        self.tokens[token.reset_token] = deepcopy(token)

    async def get(self, token: str) -> Optional[PasswordResetToken]:
        stored = self.tokens.get(token)
        return deepcopy(stored) if stored else None

    async def delete(self, token: str) -> None:
        self.tokens.pop(token, None)

    async def delete_by_user_id(self, user_id: UUID) -> None:
        for key in [
            k for k, v in self.tokens.items() if v.user_id == UUID(str(user_id))
        ]:
            del self.tokens[key]

    async def delete_expired(self) -> None:
        for key in [k for k, v in self.tokens.items() if v.is_expired()]:
            del self.tokens[key]


class FakeEmailSender(IEmailSender):
    def __init__(self, fail: bool = False):
        self.sent: list[tuple[str, str]] = []
        self.fail = fail

    async def send_password_reset_email(self, to_email: str, reset_link: str) -> None:
        if self.fail:
            raise RuntimeError("SMTP down")
        self.sent.append((to_email, reset_link))


class FakeSession:
    """Stands in for the AsyncSession yielded by ``get_db``."""

    async def execute(self, *args, **kwargs):
        return None

    async def close(self) -> None:
        return None


class FakePipeline:
    def __init__(self, store: dict):
        self._store = store
        self._count = 0

    def zremrangebyscore(self, key, start, end):
        return self

    def zadd(self, key, mapping):
        self._count = len(mapping)
        return self

    def zcard(self, key):
        return self

    def expire(self, key, seconds):
        return self

    async def execute(self):
        return [None, None, 0, None]


class FakeRedis:
    """Minimal async Redis double: satisfies the rate limiter and healthcheck."""

    def __init__(self):
        self._store: dict[str, str] = {}

    async def ping(self) -> bool:
        return True

    async def get(self, key):
        return self._store.get(key)

    async def set(self, key, value) -> None:
        self._store[key] = value

    async def setex(self, key, seconds, value) -> None:
        self._store[key] = value

    async def close(self) -> None:
        return None

    def pipeline(self) -> FakePipeline:
        return FakePipeline({})



class FakePackageRepository(IPackageRepository):
    def __init__(self):
        self.packages: dict[UUID, Package] = {}

    async def create(self, package: Package) -> Package:
        self.packages[package.id] = deepcopy(package)
        return deepcopy(package)

    async def get_by_id(self, package_id: str) -> Optional[Package]:
        try:
            key = UUID(str(package_id))
        except (ValueError, AttributeError):
            return None
        package = self.packages.get(key)
        return deepcopy(package) if package else None

    async def get_all(self, page: int, limit: int) -> PaginatedPackages:
        items = sorted(
            self.packages.values(), key=lambda p: p.created_at, reverse=True
        )
        total = len(items)
        offset = (page - 1) * limit
        return PaginatedPackages(
            items=[deepcopy(p) for p in items[offset : offset + limit]],
            total=total,
            page=page,
            limit=limit,
        )

    async def update(
        self,
        package_id: str,
        fields: dict,
    ) -> Optional[Package]:
        package = await self.get_by_id(package_id)
        if not package:
            return None
        for key, value in fields.items():
            setattr(package, key, value)
        self.packages[package.id] = package
        return deepcopy(package)

    async def delete(self, package_id: str) -> None:
        try:
            key = UUID(str(package_id))
        except (ValueError, AttributeError):
            return
        self.packages.pop(key, None)

    async def adjust_stock(self, package_id: str, delta: int) -> Optional[Package]:
        package = await self.get_by_id(package_id)
        if not package:
            return None
        if package.available_count + delta < 0:
            return None
        package.available_count += delta
        self.packages[package.id] = package
        return deepcopy(package)


class FakeProductRepository(IProductRepository):
    def __init__(self):
        self.products: dict[str, Product] = {}

    async def create(self, product: Product) -> Product:
        self.products[product.id] = deepcopy(product)
        return deepcopy(product)

    async def get_by_id(self, product_id: str) -> Optional[Product]:
        product = self.products.get(product_id)
        return deepcopy(product) if product else None

    async def get_all(self, page: int, limit: int) -> PaginatedProducts:
        items = sorted(
            self.products.values(), key=lambda p: p.created_at, reverse=True
        )
        total = len(items)
        offset = (page - 1) * limit
        return PaginatedProducts(
            items=[deepcopy(p) for p in items[offset : offset + limit]],
            total=total,
            page=page,
            limit=limit,
        )

    async def update(self, product_id: str, fields: dict) -> Optional[Product]:
        product = await self.get_by_id(product_id)
        if not product:
            return None
        for key, value in fields.items():
            setattr(product, key, value)
        self.products[product.id] = product
        return deepcopy(product)

    async def delete(self, product_id: str) -> None:
        self.products.pop(product_id, None)
