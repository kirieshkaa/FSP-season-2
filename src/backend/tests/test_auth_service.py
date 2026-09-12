"""Unit tests for AuthService (no HTTP, no DB)."""

import pytest

from app.core.exceptions import (
    InvalidCredentialsError,
    InvalidEmailError,
    InvalidTokenError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from app.core.security import verify_password
from app.features.auth.entities import UserRole, UserStatus
from app.features.auth.service import AuthService
from tests.fakes import (
    FakeAccessTokenRepository,
    FakeRefreshTokenRepository,
    FakeUserRepository,
)


@pytest.fixture
def service():
    return AuthService(
        FakeUserRepository(),
        FakeRefreshTokenRepository(),
        FakeAccessTokenRepository(),
    )


def _repo(service: AuthService) -> FakeUserRepository:
    return service._user_repo  # type: ignore[return-value]


class TestRegister:
    async def test_registers_pending_user(self, service):
        await service.register("alice", "alice@example.com", "password123")

        user = await _repo(service).get_by_username("alice")
        assert user is not None
        assert user.email == "alice@example.com"
        assert user.role == UserRole.USER
        assert user.status == UserStatus.PENDING
        # password must be hashed, never stored in clear text
        assert user.password_hash != "password123"
        assert await verify_password("password123", user.password_hash)

    async def test_rejects_invalid_email(self, service):
        with pytest.raises(InvalidEmailError):
            await service.register("alice", "not-an-email", "password123")

    async def test_rejects_duplicate_username(self, service):
        await service.register("alice", "alice@example.com", "password123")
        with pytest.raises(UserAlreadyExistsError):
            await service.register("alice", "other@example.com", "password123")

    async def test_rejects_duplicate_email(self, service):
        await service.register("alice", "alice@example.com", "password123")
        with pytest.raises(UserAlreadyExistsError):
            await service.register("other", "alice@example.com", "password123")


class TestLogin:
    async def test_login_requires_pending_approval(self, service):
        await service.register("alice", "alice@example.com", "password123")
        with pytest.raises(InvalidCredentialsError):
            await service.login("alice", None, "password123")

    async def test_login_succeeds_after_approval(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")
        await _repo(service).update_status(user.id, UserStatus.APPROVED)

        tokens = await service.login("alice", None, "password123")
        assert tokens.access_token
        assert tokens.refresh_token
        assert tokens.role == "user"
        assert tokens.user_id == str(user.id)

    async def test_login_by_email(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")
        await _repo(service).update_status(user.id, UserStatus.APPROVED)

        tokens = await service.login(None, "alice@example.com", "password123")
        assert tokens.user_id == str(user.id)

    async def test_login_wrong_password(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")
        await _repo(service).update_status(user.id, UserStatus.APPROVED)

        with pytest.raises(InvalidCredentialsError):
            await service.login("alice", None, "wrong-password")

    async def test_login_unknown_user(self, service):
        with pytest.raises(UserNotFoundError):
            await service.login("ghost", None, "password123")

    async def test_login_without_credentials(self, service):
        with pytest.raises(InvalidCredentialsError):
            await service.login(None, None, "password123")


class TestChangePassword:
    async def test_change_password_updates_hash_and_revokes_refresh_tokens(
        self, service
    ):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")
        await _repo(service).update_status(user.id, UserStatus.APPROVED)
        tokens = await service.login("alice", None, "password123")
        assert service._refresh_token_repo.tokens  # type: ignore[attr-defined]

        await service.change_password(str(user.id), "password123", "newpassword123")

        refreshed = await _repo(service).get_by_id(str(user.id))
        assert await verify_password("newpassword123", refreshed.password_hash)
        assert not service._refresh_token_repo.tokens  # type: ignore[attr-defined]

    async def test_change_password_wrong_old(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")

        with pytest.raises(InvalidCredentialsError):
            await service.change_password(str(user.id), "wrong", "newpassword123")

    async def test_change_password_unknown_user(self, service):
        import uuid

        with pytest.raises(UserNotFoundError):
            await service.change_password(str(uuid.uuid4()), "a", "newpassword123")


class TestUpdateEmail:
    async def test_update_email_requires_password(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")

        await service.update_email(str(user.id), "new@example.com", "password123")
        updated = await _repo(service).get_by_id(str(user.id))
        assert updated.email == "new@example.com"

    async def test_update_email_wrong_password(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")

        with pytest.raises(InvalidCredentialsError):
            await service.update_email(str(user.id), "new@example.com", "wrong")

    async def test_update_email_already_used(self, service):
        await service.register("alice", "alice@example.com", "password123")
        await service.register("bob", "bob@example.com", "password123")
        alice = await _repo(service).get_by_username("alice")

        with pytest.raises(UserAlreadyExistsError):
            await service.update_email(str(alice.id), "bob@example.com", "password123")


class TestRefreshAndLogout:
    async def test_refresh_rotates_token(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")
        await _repo(service).update_status(user.id, UserStatus.APPROVED)

        tokens = await service.login("alice", None, "password123")
        new_tokens = await service.refresh(tokens.refresh_token)

        assert new_tokens.access_token
        # old refresh token was consumed by rotation
        assert tokens.refresh_token not in service._refresh_token_repo.tokens  # type: ignore[attr-defined]

    async def test_refresh_with_invalid_token(self, service):
        with pytest.raises(InvalidTokenError):
            await service.refresh("not-a-jwt")

    async def test_refresh_rejects_reused_token(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")
        await _repo(service).update_status(user.id, UserStatus.APPROVED)

        tokens = await service.login("alice", None, "password123")
        await service.refresh(tokens.refresh_token)

        with pytest.raises(InvalidTokenError):
            await service.refresh(tokens.refresh_token)

    async def test_logout_removes_refresh_token(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")
        await _repo(service).update_status(user.id, UserStatus.APPROVED)

        tokens = await service.login("alice", None, "password123")
        await service.logout(tokens.refresh_token)
        assert tokens.refresh_token not in service._refresh_token_repo.tokens  # type: ignore[attr-defined]


class TestProfile:
    async def test_profile_masks_email(self, service):
        await service.register("alice", "alice@example.com", "password123")
        user = await _repo(service).get_by_username("alice")

        profile = await service.get_user_profile(str(user.id))
        assert profile["username"] == "alice"
        assert profile["email_masked"] == "al***@example.com"
        assert profile["role"] == "user"
        assert profile["status"] == "pending"

    async def test_profile_unknown(self, service):
        import uuid

        assert await service.get_user_profile(str(uuid.uuid4())) is None
