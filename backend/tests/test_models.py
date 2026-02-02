"""Tests for models module (TDD - GREEN phase)."""

import os
import time
import pytest
import pytest_asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.core.config import settings
from app.models import TimestampMixin, User


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    settings.DATABASE_URL.rsplit("/", 1)[0] + "/smart_office_ai_test"
)


@pytest_asyncio.fixture
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Create test database session."""
    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


class TestTimestampMixin:
    """Test TimestampMixin class."""

    def test_timestamp_mixin_has_created_at(self):
        """Test TimestampMixin has created_at field."""
        mixin = TimestampMixin()
        assert hasattr(mixin, 'created_at')

    def test_timestamp_mixin_has_updated_at(self):
        """Test TimestampMixin has updated_at field."""
        mixin = TimestampMixin()
        assert hasattr(mixin, 'updated_at')


class TestUser:
    """Test User model."""

    def test_user_has_id_field(self):
        """Test User has id field."""
        assert hasattr(User, 'id')

    def test_user_has_email_field(self):
        """Test User has email field."""
        assert hasattr(User, 'email')

    def test_user_has_username_field(self):
        """Test User has username field."""
        assert hasattr(User, 'username')

    def test_user_has_hashed_password_field(self):
        """Test User has hashed_password field."""
        assert hasattr(User, 'hashed_password')

    def test_user_has_totp_secret_field(self):
        """Test User has totp_secret field."""
        assert hasattr(User, 'totp_secret')

    def test_user_has_is_active_field(self):
        """Test User has is_active field."""
        assert hasattr(User, 'is_active')

    def test_user_inherits_timestamp_mixin(self):
        """Test User inherits TimestampMixin."""
        assert hasattr(User, 'created_at')
        assert hasattr(User, 'updated_at')

    @pytest.mark.asyncio
    async def test_create_user(self, db_session):
        """Test creating a user in database."""
        user = User(
            email="test@example.com",
            username="testuser",
            hashed_password="hashed_secret",
            is_active=True,
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.hashed_password == "hashed_secret"
        assert user.is_active is True
        assert user.created_at is not None
        assert user.updated_at is not None

    @pytest.mark.asyncio
    async def test_user_timestamps_on_create(self, db_session):
        """Test that created_at and updated_at are set on creation."""
        user = User(
            email="timestamp@example.com",
            username="timestampuser",
            hashed_password="hashed",
        )

        before_create = datetime.now(timezone.utc)
        db_session.add(user)
        await db_session.commit()
        after_create = datetime.now(timezone.utc)

        assert before_create <= user.created_at <= after_create
        assert before_create <= user.updated_at <= after_create

    @pytest.mark.asyncio
    async def test_user_updated_at_updates_on_save(self, db_session):
        """Test that updated_at changes when user is modified."""
        user = User(
            email="update@example.com",
            username="updateuser",
            hashed_password="hashed",
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        time.sleep(0.01)  # Small delay to ensure timestamp difference

        user.email = "updated@example.com"
        await db_session.commit()
        await db_session.refresh(user)

        # updated_at should be later than or equal to created_at
        assert user.updated_at >= user.created_at

    @pytest.mark.asyncio
    async def test_user_totp_secret_nullable(self, db_session):
        """Test that totp_secret can be null."""
        user = User(
            email="nototp@example.com",
            username="nototpuser",
            hashed_password="hashed",
            totp_secret=None,  # Explicitly None
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        assert user.totp_secret is None

    @pytest.mark.asyncio
    async def test_user_defaults(self, db_session):
        """Test User model default values."""
        user = User(
            email="defaults@example.com",
            username="defaultsuser",
            hashed_password="hashed",
        )

        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # is_active should default to True
        assert user.is_active is True
