"""Tests for package management endpoints and the approval toggle."""

from app.features.auth.entities import UserRole, UserStatus

BASE = "/api/v1"


async def _login(client, identifier, password):
    return await client.post(
        f"{BASE}/auth/login",
        json={"username": identifier, "password": password},
    )


async def _token_for(client, container, username, role):
    await container.users.add_user(
        username=username,
        email=f"{username}@example.com",
        password="password123",
        role=role,
        status=UserStatus.APPROVED,
    )
    response = await _login(client, username, "password123")
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


async def _create_package(client, token, **overrides):
    payload = {
        "width": 10.0,
        "height": 20.0,
        "depth": 30.0,
        "max_weight": 5.0,
        "available_count": 4,
    }
    payload.update(overrides)
    return await client.post(f"{BASE}/packages", json=payload, headers=_h(token))


class TestPackageAccess:
    async def test_requires_authentication(self, client):
        assert (await client.get(f"{BASE}/packages")).status_code == 401

    async def test_plain_user_can_read(self, client, container):
        token = await _token_for(client, container, "user1", UserRole.USER)
        response = await client.get(f"{BASE}/packages", headers=_h(token))
        assert response.status_code == 200

    async def test_plain_user_can_create(self, client, container):
        token = await _token_for(client, container, "user1", UserRole.USER)
        response = await _create_package(client, token)
        assert response.status_code == 201
        assert response.json()["available_count"] == 4

    async def test_admin_can_create(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        assert (await _create_package(client, token)).status_code == 201


class TestPackageCrud:
    async def test_get_by_id(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token)).json()

        response = await client.get(
            f"{BASE}/packages/{created['id']}", headers=_h(token)
        )

        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    async def test_get_unknown_is_404(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        response = await client.get(
            f"{BASE}/packages/{'0' * 8}-0000-0000-0000-000000000000",
            headers=_h(token),
        )
        assert response.status_code == 404

    async def test_list_is_paginated(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        for i in range(3):
            await _create_package(client, token, width=float(i + 1))

        response = await client.get(
            f"{BASE}/packages", params={"page": 1, "limit": 2}, headers=_h(token)
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 3
        assert len(body["items"]) == 2
        assert body["page"] == 1
        assert body["limit"] == 2

    async def test_update_package(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token)).json()

        response = await client.patch(
            f"{BASE}/packages/{created['id']}",
            json={"width": 99.0, "height": 1.0, "depth": 1.0, "max_weight": 1.0},
            headers=_h(token),
        )

        assert response.status_code == 200
        assert response.json()["width"] == 99.0

    async def test_update_only_count(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token, available_count=4)).json()

        response = await client.patch(
            f"{BASE}/packages/{created['id']}",
            json={"available_count": 42},
            headers=_h(token),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["available_count"] == 42
        assert body["width"] == created["width"]

    async def test_update_partial_single_field(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token, available_count=4)).json()

        response = await client.patch(
            f"{BASE}/packages/{created['id']}",
            json={"width": 77.0},
            headers=_h(token),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["width"] == 77.0
        assert body["height"] == created["height"]
        assert body["available_count"] == 4

    async def test_update_rejects_negative_count(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token, available_count=4)).json()

        response = await client.patch(
            f"{BASE}/packages/{created['id']}",
            json={"available_count": -1},
            headers=_h(token),
        )

        assert response.status_code == 400
        assert (await container.packages.get_by_id(created["id"])).available_count == 4

    async def test_delete_package(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token)).json()

        response = await client.delete(
            f"{BASE}/packages/{created['id']}", headers=_h(token)
        )

        assert response.status_code == 200
        assert await container.packages.get_by_id(created["id"]) is None

    async def test_user_can_update_and_delete(self, client, container):
        user = await _token_for(client, container, "user1", UserRole.USER)
        created = (await _create_package(client, user)).json()

        updated = await client.patch(
            f"{BASE}/packages/{created['id']}",
            json={"width": 1.0, "height": 1.0, "depth": 1.0, "max_weight": 1.0},
            headers=_h(user),
        )
        deleted = await client.delete(
            f"{BASE}/packages/{created['id']}", headers=_h(user)
        )

        assert updated.status_code == 200
        assert deleted.status_code == 200


class TestStockAdjust:
    async def test_add_and_remove_bulk(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        first = (await _create_package(client, token, available_count=1)).json()
        second = (await _create_package(client, token, available_count=10)).json()

        response = await client.post(
            f"{BASE}/packages/stock-adjust",
            json={
                "items": [
                    {"package_id": first["id"], "delta": 5},
                    {"package_id": second["id"], "delta": -4},
                ]
            },
            headers=_h(token),
        )

        assert response.status_code == 200
        counts = {p["id"]: p["available_count"] for p in response.json()["items"]}
        assert counts[first["id"]] == 6
        assert counts[second["id"]] == 6

    async def test_remove_below_zero_is_400(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token, available_count=3)).json()

        response = await client.post(
            f"{BASE}/packages/stock-adjust",
            json={"items": [{"package_id": created["id"], "delta": -4}]},
            headers=_h(token),
        )

        assert response.status_code == 400
        unchanged = await container.packages.get_by_id(created["id"])
        assert unchanged.available_count == 3

    async def test_zero_delta_is_400(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token)).json()

        response = await client.post(
            f"{BASE}/packages/stock-adjust",
            json={"items": [{"package_id": created["id"], "delta": 0}]},
            headers=_h(token),
        )

        assert response.status_code == 400

    async def test_unknown_package_is_404_and_nothing_applied(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_package(client, token, available_count=10)).json()

        response = await client.post(
            f"{BASE}/packages/stock-adjust",
            json={
                "items": [
                    {"package_id": created["id"], "delta": 5},
                    {
                        "package_id": "00000000-0000-0000-0000-000000000000",
                        "delta": 1,
                    },
                ]
            },
            headers=_h(token),
        )

        assert response.status_code == 404
        unchanged = await container.packages.get_by_id(created["id"])
        assert unchanged.available_count == 10

    async def test_user_can_adjust_stock(self, client, container):
        user = await _token_for(client, container, "user1", UserRole.USER)
        created = (await _create_package(client, user)).json()

        response = await client.post(
            f"{BASE}/packages/stock-adjust",
            json={"items": [{"package_id": created["id"], "delta": 1}]},
            headers=_h(user),
        )
        assert response.status_code == 200


class TestApprovalToggle:
    async def test_admin_can_read_and_flip_require_approval(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)

        initial = await client.get(
            f"{BASE}/admin/settings/require-approval", headers=_h(token)
        )
        assert initial.json()["require_approval"] is True

        flipped = await client.put(
            f"{BASE}/admin/settings/require-approval",
            json={"require_approval": False},
            headers=_h(token),
        )
        assert flipped.json()["require_approval"] is False

        after = await client.get(
            f"{BASE}/admin/settings/require-approval", headers=_h(token)
        )
        assert after.json()["require_approval"] is False

    async def test_non_admin_cannot_flip(self, client, container):
        token = await _token_for(client, container, "user1", UserRole.USER)
        response = await client.put(
            f"{BASE}/admin/settings/require-approval",
            json={"require_approval": False},
            headers=_h(token),
        )
        assert response.status_code == 403

    async def test_registration_auto_approves_when_disabled(self, client, container):
        admin = await _token_for(client, container, "adm", UserRole.ADMIN)
        await client.put(
            f"{BASE}/admin/settings/require-approval",
            json={"require_approval": False},
            headers=_h(admin),
        )

        await client.post(
            f"{BASE}/auth/register",
            json={
                "username": "newbie",
                "email": "newbie@example.com",
                "password": "password123",
            },
        )

        newbie = await container.users.get_by_username("newbie")
        assert newbie.status == UserStatus.APPROVED
        assert (await _login(client, "newbie", "password123")).status_code == 200

    async def test_registration_stays_pending_when_enabled(self, client, container):
        await client.post(
            f"{BASE}/auth/register",
            json={
                "username": "newbie",
                "email": "newbie@example.com",
                "password": "password123",
            },
        )

        newbie = await container.users.get_by_username("newbie")
        assert newbie.status == UserStatus.PENDING
