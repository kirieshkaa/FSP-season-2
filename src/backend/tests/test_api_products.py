"""Tests for product catalog endpoints."""

from app.features.auth.entities import UserRole, UserStatus

BASE = "/api/v1"


async def _login(client, identifier, password):
    return await client.post(
        f"{BASE}/auth/login",
        json={"name": identifier, "password": password},
    )


async def _token_for(client, container, username, role):
    await container.users.add_user(
        name=username,
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


async def _create_product(client, token, **overrides):
    payload = {
        "name": "widget",
        "destination": "warehouse-a",
        "x": 10.0,
        "y": 20.0,
        "z": 30.0,
        "weight": 5.0,
        "quantity": 4,
    }
    payload.update(overrides)
    return await client.post(f"{BASE}/products", json=payload, headers=_h(token))


class TestProductAccess:
    async def test_requires_authentication(self, client):
        assert (await client.get(f"{BASE}/products")).status_code == 401

    async def test_plain_user_can_read(self, client, container):
        token = await _token_for(client, container, "user1", UserRole.USER)
        response = await client.get(f"{BASE}/products", headers=_h(token))
        assert response.status_code == 200

    async def test_plain_user_can_create(self, client, container):
        token = await _token_for(client, container, "user1", UserRole.USER)
        response = await _create_product(client, token)
        assert response.status_code == 201
        assert response.json()["id"]
        assert response.json()["x"] == 10.0


class TestProductCrud:
    async def test_get_by_id(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_product(client, token)).json()

        response = await client.get(
            f"{BASE}/products/{created['id']}", headers=_h(token)
        )

        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    async def test_defaults_applied(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        body = (await _create_product(client, token)).json()

        assert body["name"] == "widget"
        assert body["destination"] == "warehouse-a"
        assert body["must_stay_upright"] is False
        assert body["is_stackable"] is True
        assert body["is_floor_only"] is False
        assert body["max_top_load"] == 0
        assert body["minimum_support_ratio"] == 0
        assert body["incompatible_tags"] == []
        assert body["tags"] == []
        assert body["allowed_rotations"] is None

    async def test_name_and_destination_can_be_updated(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_product(client, token)).json()

        response = await client.patch(
            f"{BASE}/products/{created['id']}",
            json={"name": "renamed-widget", "destination": "warehouse-b"},
            headers=_h(token),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "renamed-widget"
        assert body["destination"] == "warehouse-b"
        assert body["x"] == created["x"]

    async def test_tags_and_rotations_roundtrip(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        body = (
            await _create_product(
                client,
                token,
                tags=["fragile", "electronics"],
                incompatible_tags=["liquid"],
                allowed_rotations=["up", "side"],
                must_stay_upright=True,
                is_floor_only=True,
            )
        ).json()

        assert body["tags"] == ["fragile", "electronics"]
        assert body["incompatible_tags"] == ["liquid"]
        assert body["allowed_rotations"] == ["up", "side"]
        assert body["must_stay_upright"] is True
        assert body["is_floor_only"] is True

    async def test_get_unknown_is_404(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        response = await client.get(
            f"{BASE}/products/00000000-0000-0000-0000-000000000000",
            headers=_h(token),
        )
        assert response.status_code == 404

    async def test_malformed_id_is_400(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        response = await client.get(f"{BASE}/products/NOPE", headers=_h(token))
        assert response.status_code == 400

    async def test_list_is_paginated(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        for i in range(3):
            await _create_product(client, token, x=float(i + 1))

        response = await client.get(
            f"{BASE}/products", params={"page": 1, "limit": 2}, headers=_h(token)
        )

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 3
        assert len(body["items"]) == 2
        assert body["page"] == 1
        assert body["limit"] == 2

    async def test_update_product(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_product(client, token)).json()

        response = await client.patch(
            f"{BASE}/products/{created['id']}",
            json={"weight": 99.0, "is_stackable": False},
            headers=_h(token),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["weight"] == 99.0
        assert body["is_stackable"] is False
        assert body["x"] == created["x"]

    async def test_update_can_clear_rotations(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (
            await _create_product(client, token, allowed_rotations=["up"])
        ).json()

        response = await client.patch(
            f"{BASE}/products/{created['id']}",
            json={"allowed_rotations": None},
            headers=_h(token),
        )

        assert response.status_code == 200
        assert response.json()["allowed_rotations"] is None

    async def test_update_rejects_bad_support_ratio(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_product(client, token)).json()

        response = await client.patch(
            f"{BASE}/products/{created['id']}",
            json={"minimum_support_ratio": 2.0},
            headers=_h(token),
        )

        assert response.status_code == 400

    async def test_delete_product(self, client, container):
        token = await _token_for(client, container, "adm", UserRole.ADMIN)
        created = (await _create_product(client, token)).json()

        response = await client.delete(
            f"{BASE}/products/{created['id']}", headers=_h(token)
        )

        assert response.status_code == 200
        assert await container.products.get_by_id(created["id"]) is None

    async def test_user_can_update_and_delete(self, client, container):
        user = await _token_for(client, container, "user1", UserRole.USER)
        created = (await _create_product(client, user)).json()

        updated = await client.patch(
            f"{BASE}/products/{created['id']}",
            json={"weight": 1.0},
            headers=_h(user),
        )
        deleted = await client.delete(
            f"{BASE}/products/{created['id']}", headers=_h(user)
        )

        assert updated.status_code == 200
        assert deleted.status_code == 200
