"""API tests for /auth/* and /reset-password/* via the ASGI app."""

from app.features.auth.entities import UserStatus

BASE = "/api/v1"


async def _login(client, identifier, password):
    return await client.post(
        f"{BASE}/auth/login",
        json={"name": identifier, "password": password},
    )


def _set_cookie_value(response, name="refresh_token") -> str | None:
    """Extract a cookie from the raw header (httpx hides path-scoped cookies)."""
    header = response.headers.get("set-cookie")
    if not header or not header.startswith(f"{name}="):
        return None
    return header.split(f"{name}=", 1)[1].split(";", 1)[0]


async def _approved_token(client, container, username="alice", password="password123"):
    user = await container.users.add_user(
        name=username,
        email=f"{username}@example.com",
        password=password,
        status=UserStatus.APPROVED,
    )
    response = await _login(client, username, password)
    assert response.status_code == 200, response.text
    return response.json()["access_token"], user


class TestRegisterEndpoint:
    async def test_register_returns_message(self, client):
        response = await client.post(
            f"{BASE}/auth/register",
            json={
                "name": "alice",
                "email": "alice@example.com",
                "password": "password123",
            },
        )
        assert response.status_code == 200
        assert "approval" in response.json()["message"].lower()

    async def test_register_validation_error_is_400(self, client):
        response = await client.post(
            f"{BASE}/auth/register",
            json={"name": "ab", "email": "bad", "password": "short"},
        )
        assert response.status_code == 400
        body = response.json()
        assert body["ok"] is False
        assert "message" in body

    async def test_register_duplicate_is_400(self, client, container):
        await container.users.add_user(name="alice", email="alice@example.com")
        response = await client.post(
            f"{BASE}/auth/register",
            json={
                "name": "alice",
                "email": "other@example.com",
                "password": "password123",
            },
        )
        assert response.status_code == 400


class TestLoginEndpoint:
    async def test_login_sets_refresh_cookie_and_returns_access(self, client, container):
        await container.users.add_user(status=UserStatus.APPROVED)

        response = await _login(client, "user", "password123")

        assert response.status_code == 200
        body = response.json()
        assert body["access_token"]
        assert body["role"] == "user"
        assert _set_cookie_value(response) is not None

    async def test_login_requires_credentials(self, client):
        response = await client.post(
            f"{BASE}/auth/login", json={"password": "password123"}
        )
        assert response.status_code == 400

    async def test_login_wrong_password_is_400(self, client, container):
        await container.users.add_user(status=UserStatus.APPROVED)
        response = await _login(client, "user", "wrong")
        assert response.status_code == 400


class TestProtectedEndpoints:
    async def test_me_without_token_is_401(self, client):
        response = await client.get(f"{BASE}/auth/me")
        assert response.status_code == 401

    async def test_me_with_bad_header_is_401(self, client):
        response = await client.get(
            f"{BASE}/auth/me", headers={"Authorization": "Token abc"}
        )
        assert response.status_code == 401

    async def test_me_returns_profile(self, client, container):
        token, _ = await _approved_token(client, container)

        response = await client.get(
            f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "alice"
        assert body["email_masked"] == "al***@example.com"
        assert body["role"] == "user"

    async def test_revoked_token_is_401(self, client, container):
        token, _ = await _approved_token(client, container)
        # simulate revocation by marking the jti as revoked in redis fake
        from app.core.security import jwt_service

        payload = jwt_service.verify_access_token(token)
        container.access_tokens.revoked[payload["jti"]] = 60

        response = await client.get(
            f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401


class TestChangePasswordEndpoint:
    async def test_change_password_happy_path(self, client, container):
        token, _ = await _approved_token(client, container)

        response = await client.post(
            f"{BASE}/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "password123", "new_password": "newpassword123"},
        )

        assert response.status_code == 200
        assert (await _login(client, "alice", "newpassword123")).status_code == 200
        assert (await _login(client, "alice", "password123")).status_code == 400

    async def test_change_password_wrong_old_is_400(self, client, container):
        token, _ = await _approved_token(client, container)

        response = await client.post(
            f"{BASE}/auth/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "wrong", "new_password": "newpassword123"},
        )
        assert response.status_code == 400


class TestUpdateEmailEndpoint:
    async def test_update_email(self, client, container):
        token, _ = await _approved_token(client, container)

        response = await client.patch(
            f"{BASE}/auth/email",
            headers={"Authorization": f"Bearer {token}"},
            json={"email": "new@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        profile = await client.get(
            f"{BASE}/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert profile.json()["email_masked"].endswith("@example.com")


class TestRefreshEndpoint:
    async def test_refresh_without_cookie_is_401(self, client):
        response = await client.get(f"{BASE}/auth/refresh")
        assert response.status_code == 401

    async def test_refresh_with_invalid_cookie_is_401(self, client):
        response = await client.get(
            f"{BASE}/auth/refresh", cookies={"refresh_token": "bogus"}
        )
        assert response.status_code == 401

    async def test_refresh_rotates_and_returns_new_access(self, client, container):
        await container.users.add_user(status=UserStatus.APPROVED)
        login = await _login(client, "user", "password123")
        refresh_cookie = _set_cookie_value(login)

        response = await client.get(
            f"{BASE}/auth/refresh", cookies={"refresh_token": refresh_cookie}
        )

        assert response.status_code == 200
        assert response.json()["access_token"]
        rotated = _set_cookie_value(response)
        assert rotated is not None
        assert rotated != refresh_cookie


class TestLogoutEndpoint:
    async def test_logout_clears_cookie(self, client, container):
        await container.users.add_user(status=UserStatus.APPROVED)
        login = await _login(client, "user", "password123")
        refresh_cookie = _set_cookie_value(login)

        response = await client.post(
            f"{BASE}/auth/logout", cookies={"refresh_token": refresh_cookie}
        )

        assert response.status_code == 200
        assert response.json()["ok"] is True
        assert refresh_cookie not in container.refresh_tokens.tokens


class TestPasswordResetEndpoint:
    async def test_reset_request_for_known_email(self, client, container):
        await container.users.add_user(email="alice@example.com")

        response = await client.post(
            f"{BASE}/reset-password", json={"email": "alice@example.com"}
        )

        assert response.status_code == 200
        assert len(container.email.sent) == 1

    async def test_reset_request_for_unknown_email_is_not_revealed(self, client):
        response = await client.post(
            f"{BASE}/reset-password", json={"email": "ghost@example.com"}
        )
        assert response.status_code == 200

    async def test_reset_with_valid_token_updates_password(self, client, container):
        await container.users.add_user(name="alice", email="alice@example.com")
        await client.post(
            f"{BASE}/reset-password", json={"email": "alice@example.com"}
        )
        token = next(iter(container.password_resets.tokens))

        response = await client.post(
            f"{BASE}/reset-password/{token}", json={"password": "freshpassword"}
        )

        assert response.status_code == 200
        assert (await _login(client, "alice", "freshpassword")).status_code == 200

    async def test_reset_with_invalid_token_is_400(self, client):
        response = await client.post(
            f"{BASE}/reset-password/{'0' * 8}-0000-0000-0000-000000000000",
            json={"password": "freshpassword"},
        )
        assert response.status_code == 400


class TestHealthEndpoint:
    async def test_health_ok(self, client, container):
        response = await client.get(f"{BASE}/health")

        assert response.status_code == 200
        assert response.json()["healthy"] is True
