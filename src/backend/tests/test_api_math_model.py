"""Tests for the math model packing solver endpoint."""

from app.features.auth.entities import UserRole, UserStatus

BASE = "/api/v1"


async def _login(client, identifier, password):
    return await client.post(
        f"{BASE}/auth/login",
        json={"name": identifier, "password": password},
    )


async def _token_for(client, container, name, role):
    await container.users.add_user(
        name=name,
        email=f"{name}@example.com",
        password="password123",
        role=role,
        status=UserStatus.APPROVED,
    )
    response = await _login(client, name, "password123")
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _h(token):
    return {"Authorization": f"Bearer {token}"}


def _payload(**overrides):
    payload = {
        "items": [
            {
                "id": "i1",
                "x": 10.0,
                "y": 10.0,
                "z": 10.0,
                "quantity": 1,
            }
        ],
        "boxes": {
            "c1": {"width": 100.0, "height": 100.0, "depth": 100.0},
        },
    }
    payload.update(overrides)
    return payload


class TestMathModelSolve:
    async def test_requires_authentication(self, client):
        response = await client.post(f"{BASE}/math-model/solve", json=_payload())
        assert response.status_code == 401

    async def test_solves_single_item_happy_path(self, client, container):
        token = await _token_for(client, container, "solver", UserRole.ADMIN)

        response = await client.post(
            f"{BASE}/math-model/solve", json=_payload(), headers=_h(token)
        )

        assert response.status_code == 200, response.text
        body = response.json()
        assert "result_code" not in body
        assert len(body["containers"]) == 1
        assert body["containers"][0]["box_type"] == "c1"
        assert body["containers"][0]["placements"][0]["item_id"] == "i1#1"
        assert body["unpacked"] == []

    async def test_long_item_fits_in_long_box(self, client, container):
        # Box dimensions are (width=x, height=y, depth=z); a long-but-low
        # item (x=100, y=20, z=10) must pack into the long box axis, not a
        # rotated one. Guards the solver axis mapping.
        token = await _token_for(client, container, "solver", UserRole.ADMIN)

        response = await client.post(
            f"{BASE}/math-model/solve",
            json=_payload(
                items=[
                    {
                        "id": "i1",
                        "x": 100.0,
                        "y": 20.0,
                        "z": 10.0,
                        "quantity": 1,
                    }
                ],
                boxes={
                    "c1": {"width": 110.0, "height": 30.0, "depth": 30.0},
                },
            ),
            headers=_h(token),
        )

        assert response.status_code == 200, response.text
        placement = response.json()["containers"][0]["placements"][0]
        assert placement["item_id"] == "i1#1"
        token = await _token_for(client, container, "solver", UserRole.ADMIN)

        response = await client.post(
            f"{BASE}/math-model/solve",
            json=_payload(items=[]),
            headers=_h(token),
        )

        assert response.status_code == 400
        assert "result_code" not in response.json()

    async def test_empty_boxes_is_400(self, client, container):
        token = await _token_for(client, container, "solver", UserRole.ADMIN)

        response = await client.post(
            f"{BASE}/math-model/solve",
            json=_payload(boxes={}),
            headers=_h(token),
        )

        assert response.status_code == 400
        assert "result_code" not in response.json()

    async def test_oversized_item_is_infeasible_409(self, client, container):
        token = await _token_for(client, container, "solver", UserRole.ADMIN)
        payload = _payload(
            items=[{"id": "big", "x": 500.0, "y": 500.0, "z": 500.0}]
        )

        response = await client.post(
            f"{BASE}/math-model/solve", json=payload, headers=_h(token)
        )

        assert response.status_code == 409
        body = response.json()
        assert "result_code" not in body
        assert body["unpacked"] == ["big#1"]

    async def test_invalid_dimensions_rejected_400(self, client, container):
        token = await _token_for(client, container, "solver", UserRole.ADMIN)
        payload = _payload(
            items=[{"id": "i1", "x": -1.0, "y": 10.0, "z": 10.0}]
        )

        response = await client.post(
            f"{BASE}/math-model/solve", json=payload, headers=_h(token)
        )

        assert response.status_code == 400

    async def test_invalid_rotation_is_400(self, client, container):
        token = await _token_for(client, container, "solver", UserRole.ADMIN)
        payload = _payload(
            items=[{"id": "i1", "allowed_rotations": ["sideways"]}]
        )

        response = await client.post(
            f"{BASE}/math-model/solve", json=payload, headers=_h(token)
        )

        assert response.status_code == 400
        assert "result_code" not in response.json()

    async def test_counts_expand_containers(self, client, container):
        token = await _token_for(client, container, "solver", UserRole.ADMIN)
        payload = _payload(
            boxes={"c1": {"width": 100.0, "height": 100.0, "depth": 100.0, "count": 3}}
        )

        response = await client.post(
            f"{BASE}/math-model/solve", json=payload, headers=_h(token)
        )

        assert response.status_code == 200
        body = response.json()
        assert "result_code" not in body
        # Only the containers actually used are reported, but the box_type
        # is mapped back to the original key (not the internal "c1_0").
        assert len(body["containers"]) >= 1
        assert all(c["box_type"] == "c1" for c in body["containers"])

    async def test_max_weight_is_applied(self, client, container):
        token = await _token_for(client, container, "solver", UserRole.ADMIN)
        payload = _payload(
            boxes={"c1": {"width": 100.0, "height": 100.0, "depth": 100.0, "max_weight": 30.0}}
        )

        response = await client.post(
            f"{BASE}/math-model/solve", json=payload, headers=_h(token)
        )

        assert response.status_code == 200
        assert "result_code" not in response.json()
