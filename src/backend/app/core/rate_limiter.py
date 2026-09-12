import logging
import time
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.redis import get_redis


logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, requests: int, window_seconds: int):
        self.requests = requests
        self.window_seconds = window_seconds

    async def check(self, key: str) -> None:
        redis = get_redis()
        now = time.time()
        window_start = now - self.window_seconds

        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, self.window_seconds)
        results = await pipe.execute()

        request_count = results[2]
        logger.info(
            f"Rate limit check: key={key}, count={request_count}, limit={self.requests}"
        )
        if request_count > self.requests:
            raise Exception("rate_limit_exceeded")


async def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, limits: dict[str, tuple[int, int]]):
        super().__init__(app)
        self.limits = limits

    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path
        logger.info(f"Rate limit check path: {path}")

        for pattern, (requests, window) in self.limits.items():
            logger.info(f"Checking pattern: {pattern} in {path} = {pattern in path}")
            if pattern in path:
                try:
                    client_ip = await get_client_ip(request)
                    key = f"rate:{pattern}:{client_ip}"
                    limiter = RateLimiter(requests, window)
                    await limiter.check(key)
                except Exception as e:
                    logger.warning(f"Rate limit exceeded: {e}")
                    return JSONResponse(
                        status_code=429, content={"detail": "Too many requests"}
                    )
                break

        return await call_next(request)
