from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_config


class Base(DeclarativeBase):
    pass


def get_engine():
    cfg = get_config()
    return create_async_engine(
        cfg.database.url,
        echo=False,
        pool_size=cfg.database.pool_size,
        max_overflow=cfg.database.max_overflow,
        pool_recycle=cfg.database.pool_recycle,
        pool_pre_ping=True,
    )


engine = get_engine()

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
