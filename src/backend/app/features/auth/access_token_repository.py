from app.core.redis import get_redis
from app.features.auth.interfaces import IAccessTokenRepository


class AccessTokenRepository(IAccessTokenRepository):
    async def revoke(self, token_id: str, expiry_seconds: int) -> None:
        redis = get_redis()
        await redis.setex(f"revoked:{token_id}", expiry_seconds, "1")

    async def is_revoked(self, token_id: str) -> bool:
        redis = get_redis()
        result = await redis.get(f"revoked:{token_id}")
        return result is not None
