from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

_engine: AsyncEngine | None = None
_async_session_local: sessionmaker | None = None

Base = declarative_base()

def _normalize_database_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    # Common placeholder from docs/examples; treat as unset so the app can boot.
    if "[YOUR-PASSWORD]" in url or "YOUR-PASSWORD" in url or "[" in url or "]" in url:
        return ""
    # Accept Supabase "postgresql://" URLs and upgrade to async driver.
    if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is not None:
        return _engine

    url = _normalize_database_url(settings.DATABASE_URL)
    if not url:
        raise RuntimeError("DATABASE_URL is not set. Please set it in backend/.env")

    # Local Postgres often doesn't use SSL.
    _engine = create_async_engine(url, echo=False, future=True)
    return _engine


def get_sessionmaker() -> sessionmaker:
    global _async_session_local
    if _async_session_local is not None:
        return _async_session_local
    engine = get_engine()
    _async_session_local = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    return _async_session_local


async def get_db() -> AsyncSession:
    AsyncSessionLocal = get_sessionmaker()
    async with AsyncSessionLocal() as session:
        yield session

