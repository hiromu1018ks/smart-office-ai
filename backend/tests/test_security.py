"""Tests for security module (TDD - RED phase).

This file tests all security functions before implementation.
Tests should fail initially (RED), then pass after implementation (GREEN).
"""

import time
from datetime import datetime, timedelta
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import Depends, HTTPException, status
import jwt
from jwt import PyJWTError as JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_totp_secret,
    get_current_user,
    get_password_hash,
    verify_password,
    verify_totp,
)
from app.models.user import User


class TestPasswordHashing:
    """Test password hashing and verification functions."""

    def test_get_password_hash_returns_hash(self):
        """Test that get_password_hash returns a bcrypt hash."""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)

        # Should return a string starting with $2b$ (bcrypt identifier)
        assert isinstance(hashed, str)
        assert len(hashed) == 60
        assert hashed.startswith("$2b$")

    def test_get_password_hash_different_each_time(self):
        """Test that hashing same password twice produces different hashes (salt)."""
        password = "SecurePassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Different hashes due to random salt
        assert hash1 != hash2

    def test_verify_password_with_correct_password(self):
        """Test that verify_password returns True for correct password."""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_with_incorrect_password(self):
        """Test that verify_password returns False for incorrect password."""
        password = "SecurePassword123!"
        wrong_password = "WrongPassword456!"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False

    def test_verify_password_with_empty_password(self):
        """Test that verify_password returns False for empty password."""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)

        assert verify_password("", hashed) is False

    def test_verify_password_with_invalid_hash(self):
        """Test that verify_password handles invalid hash gracefully."""
        password = "SecurePassword123!"

        # Should return False for invalid hash
        assert verify_password(password, "invalid_hash") is False
        assert verify_password(password, "") is False


class TestJWTTokens:
    """Test JWT token creation and decoding functions."""

    def test_create_access_token_returns_token(self):
        """Test that create_access_token returns a valid JWT token."""
        data = {"sub": "user-123", "email": "test@example.com"}
        token = create_access_token(data)

        # Should return a JWT string (3 parts separated by dots)
        assert isinstance(token, str)
        parts = token.split(".")
        assert len(parts) == 3

    def test_create_access_token_with_expiration(self):
        """Test create_access_token with custom expiration."""
        data = {"sub": "user-123"}
        expires_delta = timedelta(minutes=60)
        token = create_access_token(data, expires_delta)

        assert isinstance(token, str)
        parts = token.split(".")
        assert len(parts) == 3

    def test_decode_access_token_valid_token(self):
        """Test decode_access_token with valid token."""
        data = {"sub": "user-123", "email": "test@example.com"}
        token = create_access_token(data)

        decoded = decode_access_token(token)

        assert decoded is not None
        assert decoded["sub"] == "user-123"
        assert decoded["email"] == "test@example.com"

    def test_decode_access_token_with_expiration(self):
        """Test that token expiration is encoded correctly."""
        from datetime import timezone

        data = {"sub": "user-123"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta)

        decoded = decode_access_token(token)

        # Should have 'exp' claim
        assert "exp" in decoded
        # Expiration should be approximately 30 minutes from now
        exp_time = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)
        time_diff = (exp_time - now).total_seconds()

        # Should be about 30 minutes (1800 seconds), give or take a few seconds
        assert 1790 <= time_diff <= 1810

    def test_decode_access_token_invalid_token(self):
        """Test decode_access_token with invalid token."""
        # Invalid token format
        assert decode_access_token("invalid.token") is None
        assert decode_access_token("") is None
        assert decode_access_token("not-a-jwt") is None

    def test_decode_access_token_malformed_token(self):
        """Test decode_access_token with malformed JWT."""
        # Correct format but invalid signature
        malformed = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid"
        assert decode_access_token(malformed) is None


class TestTOTP:
    """Test TOTP (Time-based One-Time Password) functions."""

    def test_generate_totp_secret_returns_32_chars(self):
        """Test that generate_totp_secret returns 32-character string."""
        secret = generate_totp_secret()

        assert isinstance(secret, str)
        assert len(secret) == 32

    def test_generate_totp_secret_is_base32(self):
        """Test that TOTP secret is valid Base32."""
        secret = generate_totp_secret()

        # Base32 character set: A-Z, 2-7
        valid_chars = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")
        assert all(c in valid_chars for c in secret)

    def test_generate_totp_secret_unique(self):
        """Test that generate_totp_secret produces unique secrets."""
        secret1 = generate_totp_secret()
        secret2 = generate_totp_secret()

        # Should be different (random)
        assert secret1 != secret2

    def test_verify_totp_with_valid_code(self):
        """Test verify_totp with current valid TOTP code."""
        secret = generate_totp_secret()

        # Generate current TOTP code using pyotp directly
        import pyotp
        totp = pyotp.TOTP(secret)
        current_code = totp.now()

        assert verify_totp(secret, current_code) is True

    def test_verify_totp_with_invalid_code(self):
        """Test verify_totp with invalid code."""
        secret = generate_totp_secret()

        assert verify_totp(secret, "000000") is False
        assert verify_totp(secret, "wrong") is False
        assert verify_totp(secret, "") is False

    def test_verify_totp_with_wrong_secret(self):
        """Test verify_totp with wrong secret."""
        secret1 = generate_totp_secret()
        secret2 = generate_totp_secret()

        # Get valid code for secret1
        import pyotp
        totp = pyotp.TOTP(secret1)
        code = totp.now()

        # Should not verify with secret2
        assert verify_totp(secret2, code) is False

    def test_verify_totp_with_expired_code(self):
        """Test verify_totp rejects expired (old) TOTP code."""
        secret = generate_totp_secret()

        # Get code from 90 seconds ago (well outside TOTP window)
        import pyotp
        totp = pyotp.TOTP(secret)
        old_time = int(time.time()) - 90
        old_code = totp.at(old_time)

        # Should not verify old code (outside default window)
        assert verify_totp(secret, old_code) is False


class TestGetCurrentUser:
    """Test get_current_user FastAPI dependency."""

    @pytest.mark.asyncio
    async def test_verify_totp_with_invalid_secret_format(self):
        """Test verify_totp with invalid Base32 secret format."""
        # Invalid Base32 characters
        invalid_secret = "invalid@#$%secret123"
        assert verify_totp(invalid_secret, "123456") is False

    @pytest.mark.asyncio
    async def test_verify_totp_with_empty_secret(self):
        """Test verify_totp with empty secret."""
        assert verify_totp("", "123456") is False

    @pytest.mark.asyncio
    async def test_verify_totp_with_very_long_secret(self):
        """Test verify_totp with excessively long secret."""
        # Very long secret that might cause issues
        long_secret = "A" * 1000
        assert verify_totp(long_secret, "123456") is False

    @pytest_asyncio.fixture
    async def test_user(self, test_db_session: AsyncSession) -> User:
        """Create a test user in database."""
        from app.core.security import get_password_hash

        user = User(
            id="test-user-123",
            email="test@example.com",
            username="testuser",
            hashed_password=get_password_hash("password123"),
            is_active=True,
        )
        test_db_session.add(user)
        await test_db_session.commit()
        await test_db_session.refresh(user)
        return user

    @pytest.mark.asyncio
    async def test_get_current_user_with_valid_token(
        self, test_user: User, override_get_db
    ):
        """Test get_current_user with valid JWT token."""
        # Create token with user's email
        token_data = {"sub": test_user.id, "email": test_user.email}
        token = create_access_token(token_data)

        # Create dependency override
        async def get_token():
            return token

        # Get user from token
        user = await get_current_user(token=token, db=override_get_db)

        assert user is not None
        assert user.id == test_user.id
        assert user.email == test_user.email

    @pytest.mark.asyncio
    async def test_get_current_user_with_invalid_token(
        self, override_get_db
    ):
        """Test get_current_user raises exception for invalid token."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token="invalid.token", db=override_get_db)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_current_user_with_expired_token(
        self, test_user: User, override_get_db
    ):
        """Test get_current_user raises exception for expired token."""
        # Create token that expired in the past
        from app.core.config import settings

        token_data = {"sub": test_user.id, "email": test_user.email}
        expires_delta = timedelta(seconds=-1)  # Already expired
        token = create_access_token(token_data, expires_delta)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, db=override_get_db)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_current_user_with_nonexistent_user(
        self, override_get_db
    ):
        """Test get_current_user raises exception for non-existent user."""
        # Create token for user that doesn't exist
        token_data = {"sub": "nonexistent-user", "email": "ghost@example.com"}
        token = create_access_token(token_data)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, db=override_get_db)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_get_current_user_with_inactive_user(
        self, test_db_session: AsyncSession, override_get_db
    ):
        """Test get_current_user raises exception for inactive user."""
        from app.core.security import get_password_hash

        # Create inactive user
        user = User(
            id="inactive-user",
            email="inactive@example.com",
            username="inactiveuser",
            hashed_password=get_password_hash("password123"),
            is_active=False,
        )
        test_db_session.add(user)
        await test_db_session.commit()
        await test_db_session.refresh(user)

        # Create token for inactive user
        token_data = {"sub": user.id, "email": user.email}
        token = create_access_token(token_data)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, db=override_get_db)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


# Pytest fixtures for database
@pytest.fixture
def test_database_url():
    """Get test database URL."""
    import os
    from app.core.config import settings

    return os.getenv(
        "TEST_DATABASE_URL",
        settings.DATABASE_URL.rsplit("/", 1)[0] + "/smart_office_ai_test"
    )


@pytest_asyncio.fixture
async def test_engine(test_database_url):
    """Create test database engine."""
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(
        test_database_url,
        echo=False,
        pool_pre_ping=True,
    )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def clean_tables(test_engine):
    """Drop and recreate all tables."""
    from app.core.database import Base

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest_asyncio.fixture
async def test_db_session(test_engine, clean_tables):
    """Create test database session with clean tables."""
    from sqlalchemy.orm import sessionmaker

    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def override_get_db(test_db_session: AsyncSession):
    """Override get_db dependency for testing."""
    return test_db_session
