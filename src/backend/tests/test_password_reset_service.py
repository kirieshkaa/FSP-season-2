"""Unit tests for PasswordResetService."""

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import pytest

from app.core.exceptions import InvalidTokenError
from app.core.security import verify_password
from app.features.password_reset.service import PasswordResetService
from tests.fakes import (
    FakeEmailSender,
    FakePasswordResetRepository,
    FakeUserRepository,
)


@pytest.fixture
def setup():
    users = FakeUserRepository()
    resets = FakePasswordResetRepository()
    email = FakeEmailSender()
    service = PasswordResetService(resets, users, email)
    return service, users, resets, email


class TestRequestReset:
    async def test_unknown_email_is_silent(self, setup):
        service, _, resets, email = setup
        await service.request_reset("ghost@example.com")
        assert resets.tokens == {}
        assert email.sent == []

    async def test_sends_email_and_stores_token(self, setup):
        service, users, resets, email = setup
        user = await users.add_user(email="alice@example.com")

        await service.request_reset("alice@example.com")

        assert len(resets.tokens) == 1
        stored = next(iter(resets.tokens.values()))
        assert stored.user_id == user.id
        assert len(email.sent) == 1
        sent_to, reset_link = email.sent[0]
        assert sent_to == "alice@example.com"
        assert stored.reset_token in reset_link

    async def test_new_request_invalidates_previous_token(self, setup):
        service, users, resets, _ = setup
        await users.add_user(email="alice@example.com")

        await service.request_reset("alice@example.com")
        await service.request_reset("alice@example.com")

        assert len(resets.tokens) == 1

    async def test_email_failure_raises(self, setup):
        service, users, _, _ = setup
        await users.add_user(email="alice@example.com")
        service._email_sender = FakeEmailSender(fail=True)

        with pytest.raises(Exception, match="Failed to send email"):
            await service.request_reset("alice@example.com")


class TestUpdatePassword:
    async def test_valid_token_updates_password_and_deletes_token(self, setup):
        service, users, resets, email = setup
        await users.add_user(email="alice@example.com")
        await service.request_reset("alice@example.com")
        token = next(iter(resets.tokens))

        await service.update_password(token, "brand-new-pass")

        user = await users.get_by_email("alice@example.com")
        assert await verify_password("brand-new-pass", user.password_hash)
        assert token not in resets.tokens

    async def test_invalid_token_rejected(self, setup):
        service, _, _, _ = setup
        with pytest.raises(InvalidTokenError):
            await service.update_password(str(uuid4()), "newpass")

    async def test_expired_token_rejected_and_cleaned_up(self, setup):
        service, users, resets, _ = setup
        user = await users.add_user(email="alice@example.com")

        from app.features.password_reset.entities import PasswordResetToken

        token = str(uuid4())
        resets.tokens[token] = PasswordResetToken(
            user_id=UUID(str(user.id)),
            reset_token=token,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )

        with pytest.raises(InvalidTokenError):
            await service.update_password(token, "newpass")
        # service deletes the stale token
        assert token not in resets.tokens
