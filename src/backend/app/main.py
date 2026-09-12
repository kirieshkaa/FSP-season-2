from contextlib import asynccontextmanager
from datetime import datetime, timezone
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_config
from app.core.database import get_db
from app.core.redis import close_redis, init_redis
from app.core.rate_limiter import RateLimitMiddleware
from app.core.security import hash_password
from app.features.admin.router import router as admin_router
from app.features.auth.entities import User, UserRole, UserStatus
from app.features.auth.refresh_token_repository import RefreshTokenRepository
from app.features.auth.repository import UserRepository
from app.features.auth.router import router as auth_router
from app.features.health.router import router as health_router
from app.features.boxes.router import router as boxes_router
from app.features.password_reset.repository import PasswordResetRepository
from app.features.password_reset.router import router as password_reset_router
from app.features.products.router import router as products_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()

    async for session in get_db():
        refresh_repo = RefreshTokenRepository(session)
        password_reset_repo = PasswordResetRepository(session)
        await refresh_repo.delete_expired()
        await password_reset_repo.delete_expired()

        config = get_config()
        user_repo = UserRepository(session)

        existing_admin = await user_repo.get_by_username(config.admin.username)
        if not existing_admin:
            admin_user = User(
                id=uuid4(),
                name=config.admin.username,
                email=config.admin.email,
                password_hash=await hash_password(config.admin.password),
                role=UserRole.ADMIN,
                status=UserStatus.APPROVED,
                created_at=datetime.now(timezone.utc),
            )
            await user_repo.create(admin_user)

        break

    yield
    await close_redis()


app = FastAPI(
    title="Backend API",
    description="Auth, user management and package services",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "auth",
            "description": "Auth service - registration, login, tokens, profile.",
        },
        {
            "name": "password-reset",
            "description": "Auth service - password reset via email.",
        },
        {
            "name": "admin",
            "description": "Auth service - user moderation and account settings.",
        },
        {
            "name": "boxes",
            "description": "Box service - packaging catalog and stock.",
        },
        {
            "name": "products",
            "description": "Product service - product catalog.",
        },
        {
            "name": "health",
            "description": "Service healthcheck.",
        },
    ],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    loc = first_error.get("loc", [])
    field = loc[-1] if loc else "field"
    msg = first_error.get("msg", "Validation error")
    return JSONResponse(
        status_code=400,
        content={"ok": False, "message": f"{field}: {msg}"},
    )


config = get_config()

frontend_url = config.security.reset_link_base_url.rstrip("/")
parsed = urlparse(frontend_url)
frontend_origin = f"{parsed.scheme}://{parsed.netloc}"
cors_origins = [frontend_origin] + config.security.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.add_middleware(
    RateLimitMiddleware,
    limits={
        "/api/v1/auth/register": (10, 60),
        "/api/v1/auth/login": (15, 60),
        "/api/v1/auth/refresh": (5, 60),
        "/api/v1/reset-password": (3, 300),
    },
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(password_reset_router, prefix="/api/v1")
app.include_router(boxes_router, prefix="/api/v1")
app.include_router(products_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=config.server.host,
        port=config.server.port,
        reload=True,
    )
