"""Pytest fixtures for the auth service.

Strategy
--------
* Config reads YAML + env at import time; we set the token secrets and other
  required env vars *before* importing ``app.main`` so config validation and
  the SQLAlchemy engine construction succeed.
* The ASGI app is exercised with ``httpx.ASGITransport`` which does **not**
  run the lifespan — so Redis/Postgres are never contacted.
* Every repository/service dependency is overridden with an in-memory fake.
"""

import os

# Must happen before anything imports app/config.py or app/main.py.
os.environ.setdefault("ACCESS_TOKEN_SECRET", "test-access-secret")
os.environ.setdefault("REFRESH_TOKEN_SECRET", "test-refresh-secret")
os.environ.setdefault("BACKEND_HOST", "127.0.0.1")
os.environ.setdefault("BACKEND_PORT", "8000")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("POSTGRES_DB", "test")
os.environ.setdefault("POSTGRES_USER", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("POSTGRES_SSL_MODE", "disable")
os.environ.setdefault("REDIS_HOST", "localhost")
os.environ.setdefault("REDIS_PORT", "6379")
os.environ.setdefault("REDIS_DB", "0")

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_config
from app.features.auth.deps import (
    get_access_token_repo,
    get_refresh_token_repo,
    get_user_repo,
)
from app.features.password_reset.deps import (
    get_email_sender,
    get_password_reset_repo,
)
from app.features.boxes.deps import get_box_repo
from app.features.products.deps import get_product_repo
from tests.fakes import (
    FakeAccessTokenRepository,
    FakeEmailSender,
    FakeBoxRepository,
    FakePasswordResetRepository,
    FakeProductRepository,
    FakeRedis,
    FakeRefreshTokenRepository,
    FakeSession,
    FakeUserRepository,
)

# Importing main is safe now that env vars are in place. The module level
# ``engine = get_engine()`` only builds a lazy engine — no connection is made.
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _clear_config_cache():
    """Ensure config is built from the test environment, not a stale cache."""
    get_config.cache_clear()
    yield
    get_config.cache_clear()


class FakeContainer:
    """Bundle of fakes shared by a single test."""

    def __init__(self):
        self.users = FakeUserRepository()
        self.refresh_tokens = FakeRefreshTokenRepository()
        self.access_tokens = FakeAccessTokenRepository()
        self.password_resets = FakePasswordResetRepository()
        self.email = FakeEmailSender()
        self.boxes = FakeBoxRepository()
        self.products = FakeProductRepository()


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    from app.core import redis as redis_module

    client = FakeRedis()
    monkeypatch.setattr(redis_module, "redis_client", client)
    monkeypatch.setattr(redis_module, "get_redis", lambda: client)
    # The rate limiter holds a module-level reference to get_redis.
    import app.core.rate_limiter as rate_limiter

    monkeypatch.setattr(rate_limiter, "get_redis", lambda: client)
    return client


@pytest.fixture
def container():
    return FakeContainer()


@pytest.fixture
def client(container):
    """AsyncClient bound to the app with all DB/Redis deps overridden."""

    async def _fake_db():
        yield FakeSession()

    app.dependency_overrides[get_user_repo] = lambda: container.users
    app.dependency_overrides[get_refresh_token_repo] = lambda: container.refresh_tokens
    app.dependency_overrides[get_access_token_repo] = lambda: container.access_tokens
    app.dependency_overrides[get_password_reset_repo] = (
        lambda: container.password_resets
    )
    app.dependency_overrides[get_email_sender] = lambda: container.email
    app.dependency_overrides[get_box_repo] = lambda: container.boxes
    app.dependency_overrides[get_product_repo] = lambda: container.products

    # get_db is used by health + repo factory fallbacks.
    from app.core.database import get_db

    app.dependency_overrides[get_db] = _fake_db

    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://testserver")
    yield client

    app.dependency_overrides.clear()


@pytest.fixture
def auth_header():
    """Build a bearer header from a raw access token."""

    def _make(token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    return _make
