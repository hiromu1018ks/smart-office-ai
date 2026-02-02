"""Integration tests for database initialization."""

import pytest
from sqlalchemy import text

from app.core.database import DatabaseManager, init_db, close_db


class TestDatabaseInit:
    """Test database initialization and cleanup."""

    @pytest.mark.asyncio
    async def test_init_db_creates_extensions(self):
        """Test that init_db enables required extensions."""
        # Reset singleton for test
        DatabaseManager._engine = None
        DatabaseManager._session_factory = None

        await init_db()

        engine = DatabaseManager.get_engine()
        async with engine.connect() as conn:
            # Check vector extension
            result = await conn.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            )
            rows = result.fetchall()
            assert len(rows) > 0, "vector extension should be enabled"

            # Check uuid-ossp extension
            result = await conn.execute(
                text("SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'")
            )
            rows = result.fetchall()
            assert len(rows) > 0, "uuid-ossp extension should be enabled"

    @pytest.mark.asyncio
    async def test_close_db_disposes_engine(self):
        """Test that close_db properly disposes the engine."""
        # Reset singleton for test
        DatabaseManager._engine = None
        DatabaseManager._session_factory = None

        # Get engine to ensure it's created
        engine = DatabaseManager.get_engine()
        assert engine is not None

        # Close database
        await close_db()

        # Singleton should be reset
        assert DatabaseManager._engine is None
        assert DatabaseManager._session_factory is None

        # Can create new engine after close
        new_engine = DatabaseManager.get_engine()
        assert new_engine is not None
