import redis.asyncio as redis

from app.config import get_config

redis_client: redis.Redis | None = None


async def init_redis() -> redis.Redis:
    global redis_client
    config = get_config().redis
    redis_client = redis.Redis(
        host=config.host,
        port=config.port,
        password=config.password if config.password else None,
        db=config.db,
        decode_responses=True,
    )
    return redis_client


async def close_redis() -> None:
    global redis_client
    if redis_client:
        await redis_client.close()


def get_redis() -> redis.Redis:
    if redis_client is None:
        raise RuntimeError("Redis not initialized")
    return redis_client
