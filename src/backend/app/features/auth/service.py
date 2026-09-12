import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from app.config import get_config
from app.core.account_settings import account_settings
from app.core.exceptions import (
    InvalidCredentialsError,
    InvalidEmailError,
    InvalidTokenError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from app.core.security import hash_password, jwt_service, verify_password
from app.features.auth.entities import (
    RefreshTokenModel,
    Tokens,
    User,
    UserRole,
    UserStatus,
)
from app.features.auth.interfaces import (
    IAccessTokenRepository,
    IRefreshTokenRepository,
    IUserRepository,
)


class AuthService:
    def __init__(
        self,
        user_repo: IUserRepository,
        refresh_token_repo: IRefreshTokenRepository,
        access_token_repo: IAccessTokenRepository,
    ):
        self._user_repo = user_repo
        self._refresh_token_repo = refresh_token_repo
        self._access_token_repo = access_token_repo

    def _validate_email(self, email: str) -> None:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, email):
            raise InvalidEmailError()

    async def register(self, username: str, email: str, password: str) -> None:
        self._validate_email(email)

        existing_user = await self._user_repo.get_by_username(username)
        if existing_user:
            raise UserAlreadyExistsError("username")

        existing_user = await self._user_repo.get_by_email(email)
        if existing_user:
            raise UserAlreadyExistsError("email")

        password_hash = await hash_password(password)

        status = (
            UserStatus.PENDING
            if await account_settings.is_approval_required()
            else UserStatus.APPROVED
        )

        user = User(
            id=uuid4(),
            username=username,
            email=email,
            password_hash=password_hash,
            role=UserRole.USER,
            status=status,
            created_at=datetime.now(timezone.utc),
        )

        await self._user_repo.create(user)

    async def login(
        self, username: Optional[str], email: Optional[str], password: str
    ) -> Tokens:
        user: Optional[User] = None

        if email:
            self._validate_email(email)
            user = await self._user_repo.get_by_email(email)
        elif username:
            user = await self._user_repo.get_by_username(username)
        else:
            raise InvalidCredentialsError()

        if not user:
            raise UserNotFoundError()

        if user.status != UserStatus.APPROVED:
            raise InvalidCredentialsError()

        if not await verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        return await self._create_tokens(user.id, user.username, user.role.value)

    async def change_password(
        self, user_id: str, old_password: str, new_password: str
    ) -> None:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError()

        if not await verify_password(old_password, user.password_hash):
            raise InvalidCredentialsError()

        new_password_hash = await hash_password(new_password)
        await self._user_repo.update_password(user_id, new_password_hash)
        await self._refresh_token_repo.delete_by_user_id(user_id)

    async def get_user_profile(self, user_id: str) -> Optional[dict]:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            return None

        email = user.email
        email_masked = self._mask_email(email)

        return {
            "id": user.id,
            "username": user.username,
            "email": email,
            "email_masked": email_masked,
            "role": user.role.value,
            "status": user.status.value,
            "created_at": user.created_at,
        }

    def _mask_email(self, email: str) -> str:
        if not email or "@" not in email:
            return email
        local, domain = email.rsplit("@", 1)
        if len(local) <= 2:
            masked_local = local[0] + "*"
        else:
            masked_local = local[:2] + "*" * (len(local) - 2)
        return f"{masked_local}@{domain}"

    async def update_email(self, user_id: str, new_email: str, password: str) -> None:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError()

        if not await verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        existing = await self._user_repo.get_by_email(new_email)
        if existing and str(existing.id) != user_id:
            raise UserAlreadyExistsError("email")

        await self._user_repo.update_email(user_id, new_email)

    async def refresh(self, refresh_token: str) -> Tokens:
        payload = jwt_service.verify_refresh_token(refresh_token)
        if not payload:
            raise InvalidTokenError()

        user_id_str = payload.get("user_id")
        username = payload.get("username", "")
        role = payload.get("role", "user")
        user_id = UUID(user_id_str)

        stored_token = await self._refresh_token_repo.get_and_delete(refresh_token)
        if not stored_token:
            raise InvalidTokenError()

        return await self._create_tokens(user_id, username, role)

    async def logout(self, refresh_token: str) -> None:
        payload = jwt_service.verify_refresh_token(refresh_token)
        if payload:
            await self._refresh_token_repo.delete(refresh_token)

    async def _create_tokens(
        self, user_id: UUID, username: str, role: str
    ) -> Tokens:
        user_id_str = str(user_id)
        access_token, access_token_id = jwt_service.create_access_token(
            user_id_str, username, role
        )
        refresh_token, refresh_token_id = jwt_service.create_refresh_token(
            user_id_str, username, role
        )

        config = get_config()
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=config.tokens.refresh_token.expiry_days
        )

        refresh_token_model = RefreshTokenModel(
            user_id=user_id,
            token_id=refresh_token_id,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )
        await self._refresh_token_repo.create(refresh_token_model)

        return Tokens(
            access_token=access_token,
            refresh_token=refresh_token,
            access_token_id=access_token_id,
            refresh_token_id=refresh_token_id,
            role=role,
            user_id=user_id_str,
        )
