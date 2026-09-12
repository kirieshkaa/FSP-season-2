from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis


router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check(response: Response, db: AsyncSession = Depends(get_db)):
    errors = []

    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        errors.append(f"Database unavailable: {str(e)}")

    try:
        redis = get_redis()
        await redis.ping()
    except Exception as e:
        errors.append(f"Redis unavailable: {str(e)}")

    if errors:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "healthy": False,
            "error": "; ".join(errors),
        }

    return {"healthy": True}
