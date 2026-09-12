"""API tests for /admin/* user moderation endpoints."""

from app.features.auth.entities import UserRole, UserStatus

BASE = "/api/v1"


async def _login(client, identifier, password):
    return await client.post(
        f"{BASE}/auth/login",
        json={"username": identifier, "password": password},
    )


async def _admin_token(client, container):
    await container.users.add_user(
        username="admin",
        email="admin@example.com",
        password="adminpass123",
        role=UserRole.ADMIN,
        status=UserStatus.APPROVED,
    )
    response = await _login(client, "admin", "adminpass123")
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


async def _user_token(client, container, username="alice"):
    await container.users.add_user(
        username=username,
        email=f"{username}@example.com",
        status=UserStatus.APPROVED,
    )
    response = await _login(client, username, "password123")
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


class TestAdminAccessControl:
    async def test_requires_authentication(self, client):
        response = await client.get(f"{BASE}/admin/users")
        assert response.status_code == 401

    async def test_regular_user_forbidden(self, client, container):
        token = await _user_token(client, container)

        response = await client.get(
            f"{BASE}/admin/users", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 403

    async def test_admin_can_list_users(self, client, container):
        token = await _admin_token(client, container)
        await container.users.add_user(username="bob", email="bob@example.com")

        response = await client.get(
            f"{BASE}/admin/users", headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert {u["username"] for u in body["items"]} == {"admin", "bob"}

    async def test_list_filters_by_status(self, client, container):
        token = await _admin_token(client, container)
        await container.users.add_user(
            username="pending", email="p@example.com", status=UserStatus.PENDING
        )

        response = await client.get(
            f"{BASE}/admin/users",
            params={"status_filter": "pending"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["total"] == 1
        assert response.json()["items"][0]["username"] == "pending"

    async def test_list_rejects_invalid_status(self, client, container):
        token = await _admin_token(client, container)

        response = await client.get(
            f"{BASE}/admin/users",
            params={"status_filter": "nonsense"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 400


class TestModerationActions:
    async def test_approve_pending_user(self, client, container):
        token = await _admin_token(client, container)
        pending = await container.users.add_user(
            username="pending", email="p@example.com", status=UserStatus.PENDING
        )

        response = await client.post(
            f"{BASE}/admin/users/{pending.id}/actions",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "approved"
        updated = await container.users.get_by_id(str(pending.id))
        assert updated.status == UserStatus.APPROVED
        assert (await _login(client, "pending", "password123")).status_code == 200

    async def test_reject_user(self, client, container):
        token = await _admin_token(client, container)
        user = await container.users.add_user(username="bob", email="bob@example.com")

        response = await client.post(
            f"{BASE}/admin/users/{user.id}/actions",
            json={"action": "reject"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert (await container.users.get_by_id(str(user.id))).status == (
            UserStatus.REJECTED
        )

    async def test_block_then_unblock(self, client, container):
        token = await _admin_token(client, container)
        user = await container.users.add_user(username="bob", email="bob@example.com")

        blocked = await client.post(
            f"{BASE}/admin/users/{user.id}/actions",
            json={"action": "block"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert blocked.status_code == 200
        assert (await container.users.get_by_id(str(user.id))).status == (
            UserStatus.BLOCKED
        )

        unblocked = await client.post(
            f"{BASE}/admin/users/{user.id}/actions",
            json={"action": "unblock"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert unblocked.status_code == 200
        assert (await container.users.get_by_id(str(user.id))).status == (
            UserStatus.APPROVED
        )

    async def test_invalid_action_rejected(self, client, container):
        token = await _admin_token(client, container)
        user = await container.users.add_user(username="bob", email="bob@example.com")

        response = await client.post(
            f"{BASE}/admin/users/{user.id}/actions",
            json={"action": "explode"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert (await container.users.get_by_id(str(user.id))).status == (
            UserStatus.APPROVED
        )

    async def test_delete_user(self, client, container):
        token = await _admin_token(client, container)
        user = await container.users.add_user(username="bob", email="bob@example.com")

        response = await client.delete(
            f"{BASE}/admin/users/{user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert await container.users.get_by_id(str(user.id)) is None

    async def test_unknown_user_is_404(self, client, container):
        token = await _admin_token(client, container)

        response = await client.post(
            f"{BASE}/admin/users/{'0' * 8}-0000-0000-0000-000000000000/actions",
            json={"action": "approve"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404


class TestSelfProtection:
    async def test_admin_cannot_change_own_status(self, client, container):
        token = await _admin_token(client, container)
        admin = await container.users.get_by_username("admin")

        response = await client.post(
            f"{BASE}/admin/users/{admin.id}/actions",
            json={"action": "block"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400

    async def test_admin_cannot_delete_self(self, client, container):
        token = await _admin_token(client, container)
        admin = await container.users.get_by_username("admin")

        response = await client.delete(
            f"{BASE}/admin/users/{admin.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
