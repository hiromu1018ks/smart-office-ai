"""Database configuration and session management."""

from collections.abc import AsyncGenerator
from typing import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class DatabaseManager:
    """
    Manager for database engine and session factory.

    Implements singleton-like pattern to ensure only one
    engine and session factory are created per application.
    """

    _engine = None
    _session_factory = None

    @classmethod
    def get_engine(cls):
        """Get or create the async database engine."""
        if cls._engine is None:
            cls._engine = create_async_engine(
                settings.DATABASE_URL,
                echo=settings.DB_ECHO,
                pool_pre_ping=True,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
            )
        return cls._engine

    @classmethod
    def get_session_factory(cls):
        """Get or create the session factory."""
        if cls._session_factory is None:
            engine = cls.get_engine()
            cls._session_factory = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
        return cls._session_factory


async def get_db() -> AsyncIterator[AsyncSession]:
    """
    FastAPI dependency for database sessions.

    Yields a database session and ensures cleanup after request.
    """
    session_factory = DatabaseManager.get_session_factory()
    session: AsyncSession = session_factory()

    try:
        yield session
    finally:
        await session.close()


async def init_db() -> None:
    """
    Initialize database extensions.

    Enables pgvector and uuid-ossp extensions if not already enabled.
    Should be called on application startup.
    """
    engine = DatabaseManager.get_engine()

    # Enable pgvector extension
    async with engine.begin() as conn:
        await conn.execute(
            text('CREATE EXTENSION IF NOT EXISTS vector')
        )
        await conn.execute(
            text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        )


async def close_db() -> None:
    """
    Close database connections.

    Should be called on application shutdown.
    """
    if DatabaseManager._engine is not None:
        await DatabaseManager._engine.dispose()

        # Reset singleton state for testing
        DatabaseManager._engine = None
        DatabaseManager._session_factory = None
