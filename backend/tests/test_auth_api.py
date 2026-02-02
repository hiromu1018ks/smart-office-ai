"""Tests for auth API endpoints (TDD - RED phase).

This file tests all auth endpoints before implementation.
Tests should fail initially (RED), then pass after implementation (GREEN).
"""

from datetime import timedelta
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from fastapi import status
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.user import User


# Test constants
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
TOTP_SETUP_URL = "/api/v1/auth/2fa/setup"
TOTP_ENABLE_URL = "/api/v1/auth/2fa/enable"
TOTP_DISABLE_URL = "/api/v1/auth/2fa/disable"
TOTP_VERIFY_URL = "/api/v1/auth/2fa/verify"
ME_URL = "/api/v1/auth/me"


class TestRegisterEndpoint:
    """Test POST /api/v1/auth/register endpoint."""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        """Test successful user registration."""
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert data["email"] == "newuser@example.com"
        assert data["username"] == "newuser"
        assert data["is_active"] is True
        assert data["totp_enabled"] is False

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient):
        """Test registration with duplicate email fails."""
        # First registration
        await client.post(
            REGISTER_URL,
            json={
                "email": "duplicate@example.com",
                "username": "user1",
                "password": "SecurePass123",
            },
        )

        # Duplicate email
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "duplicate@example.com",
                "username": "user2",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "email" in data["detail"].lower() or "already" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_duplicate_username(self, client: AsyncClient):
        """Test registration with duplicate username fails."""
        # First registration
        await client.post(
            REGISTER_URL,
            json={
                "email": "user1@example.com",
                "username": "duplicateuser",
                "password": "SecurePass123",
            },
        )

        # Duplicate username
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "user2@example.com",
                "username": "duplicateuser",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "username" in data["detail"].lower() or "already" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        """Test registration with invalid email."""
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "notanemail",
                "username": "testuser",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """Test registration with weak password."""
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "weak",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_short_username(self, client: AsyncClient):
        """Test registration with short username."""
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "test@example.com",
                "username": "ab",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_missing_fields(self, client: AsyncClient):
        """Test registration with missing required fields."""
        # Missing password
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "test@example.com",
                "username": "testuser",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestLoginEndpoint:
    """Test POST /api/v1/auth/login endpoint."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient):
        """Test successful login."""
        # Register user first
        await client.post(
            REGISTER_URL,
            json={
                "email": "loginuser@example.com",
                "username": "loginuser",
                "password": "SecurePass123",
            },
        )

        # Login
        response = await client.post(
            LOGIN_URL,
            json={
                "email": "loginuser@example.com",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert isinstance(data["expires_in"], int)

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient):
        """Test login with wrong password."""
        # Register user first
        await client.post(
            REGISTER_URL,
            json={
                "email": "wrongpass@example.com",
                "username": "wrongpass",
                "password": "SecurePass123",
            },
        )

        # Login with wrong password
        response = await client.post(
            LOGIN_URL,
            json={
                "email": "wrongpass@example.com",
                "password": "WrongPassword",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Test login with non-existent user."""
        response = await client.post(
            LOGIN_URL,
            json={
                "email": "nonexistent@example.com",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, test_db_session: AsyncSession):
        """Test login with inactive user."""
        # Create inactive user directly
        user = User(
            id="inactive-user-login",
            email="inactive@example.com",
            username="inactive",
            hashed_password=get_password_hash("SecurePass123"),
            is_active=False,
        )
        test_db_session.add(user)
        await test_db_session.commit()

        # Try to login
        response = await client.post(
            LOGIN_URL,
            json={
                "email": "inactive@example.com",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_login_missing_fields(self, client: AsyncClient):
        """Test login with missing fields."""
        response = await client.post(
            LOGIN_URL,
            json={"email": "test@example.com"},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_login_with_totp_enabled_requires_code(self, client: AsyncClient, test_user_with_totp: User):
        """Test login with TOTP enabled but no code provided."""
        response = await client.post(
            LOGIN_URL,
            json={
                "email": test_user_with_totp["email"],
                "password": "SecurePass123",
                # totp_code missing
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "totp" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_with_totp_enabled_valid_code(self, client: AsyncClient, test_user_with_totp: User):
        """Test login with TOTP enabled and valid code."""
        import pyotp

        # Get current TOTP code
        totp = pyotp.TOTP(test_user_with_totp["totp_secret"])
        code = totp.now()

        response = await client.post(
            LOGIN_URL,
            json={
                "email": test_user_with_totp["email"],
                "password": "SecurePass123",
                "totp_code": code,
            },
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

    @pytest.mark.asyncio
    async def test_login_with_totp_enabled_invalid_code(self, client: AsyncClient, test_user_with_totp: User):
        """Test login with TOTP enabled but invalid code."""
        response = await client.post(
            LOGIN_URL,
            json={
                "email": test_user_with_totp["email"],
                "password": "SecurePass123",
                "totp_code": "000000",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "totp" in response.json()["detail"].lower()


class TestTOTPSetupEndpoint:
    """Test POST /api/v1/auth/2fa/setup endpoint."""

    @pytest.mark.asyncio
    async def test_totp_setup_success(self, client: AsyncClient, test_user: User, test_db_session: AsyncSession):
        """Test successful TOTP setup returns secret but does not save it."""
        # Verify TOTP is not enabled initially
        from sqlalchemy import select
        result = await test_db_session.execute(select(User).where(User.id == test_user["id"]))
        user = result.scalar_one()
        assert user.totp_secret is None

        # Call setup endpoint
        response = await client.post(
            TOTP_SETUP_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "secret" in data
        assert "qr_code_uri" in data
        assert len(data["secret"]) == 32
        assert data["qr_code_uri"].startswith("otpauth://totp/")

        # Verify secret is NOT saved to database
        await test_db_session.refresh(user)
        assert user.totp_secret is None

    @pytest.mark.asyncio
    async def test_totp_setup_unauthorized(self, client: AsyncClient):
        """Test TOTP setup without authentication."""
        response = await client.post(TOTP_SETUP_URL)

        # HTTPBearer returns 403 when credentials are missing
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_totp_setup_already_enabled(
        self, client: AsyncClient, test_user_with_totp: User
    ):
        """Test TOTP setup when already enabled."""
        response = await client.post(
            TOTP_SETUP_URL,
            headers={"Authorization": f"Bearer {test_user_with_totp['token']}"},
        )

        # Should return 400 since TOTP is already enabled
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already enabled" in response.json()["detail"].lower()


class TestTOTPEnableEndpoint:
    """Test POST /api/v1/auth/2fa/enable endpoint."""

    @pytest.mark.asyncio
    async def test_totp_enable_success(self, client: AsyncClient, test_user: User):
        """Test successful TOTP enablement after verification."""
        import pyotp

        # First, get a secret from setup
        setup_response = await client.post(
            TOTP_SETUP_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )
        secret = setup_response.json()["secret"]

        # Generate valid TOTP code
        totp = pyotp.TOTP(secret)
        code = totp.now()

        # Enable TOTP
        response = await client.post(
            TOTP_ENABLE_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"secret": secret, "code": code},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["enabled"] is True

    @pytest.mark.asyncio
    async def test_totp_enable_with_invalid_code(self, client: AsyncClient, test_user: User):
        """Test TOTP enablement with invalid code."""
        # Get a secret from setup
        setup_response = await client.post(
            TOTP_SETUP_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )
        secret = setup_response.json()["secret"]

        # Try to enable with invalid code
        response = await client.post(
            TOTP_ENABLE_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"secret": secret, "code": "000000"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.asyncio
    async def test_totp_enable_unauthorized(self, client: AsyncClient):
        """Test TOTP enable without authentication."""
        response = await client.post(
            TOTP_ENABLE_URL,
            json={"secret": "A" * 32, "code": "123456"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestTOTPDisableEndpoint:
    """Test POST /api/v1/auth/2fa/disable endpoint."""

    @pytest.mark.asyncio
    async def test_totp_disable_success(self, client: AsyncClient, test_user_with_totp: User):
        """Test successful TOTP disable."""
        import pyotp

        # Get valid TOTP code
        totp = pyotp.TOTP(test_user_with_totp["totp_secret"])
        code = totp.now()

        # Disable TOTP
        response = await client.post(
            TOTP_DISABLE_URL,
            headers={"Authorization": f"Bearer {test_user_with_totp['token']}"},
            json={"code": code},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["enabled"] is False

    @pytest.mark.asyncio
    async def test_totp_disable_with_invalid_code(self, client: AsyncClient, test_user_with_totp: User):
        """Test TOTP disable with invalid code."""
        response = await client.post(
            TOTP_DISABLE_URL,
            headers={"Authorization": f"Bearer {test_user_with_totp['token']}"},
            json={"code": "000000"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_totp_disable_when_not_enabled(self, client: AsyncClient, test_user: User):
        """Test TOTP disable when not enabled."""
        response = await client.post(
            TOTP_DISABLE_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"code": "123456"},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTOTPVerifyEndpoint:
    """Test POST /api/v1/auth/2fa/verify endpoint."""

    @pytest.mark.asyncio
    async def test_totp_verify_success(self, client: AsyncClient, test_user_with_totp: User):
        """Test successful TOTP verification."""
        # Get current TOTP code
        import pyotp

        totp = pyotp.TOTP(test_user_with_totp["totp_secret"])
        current_code = totp.now()

        response = await client.post(
            TOTP_VERIFY_URL,
            headers={"Authorization": f"Bearer {test_user_with_totp['token']}"},
            json={"code": current_code},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["verified"] is True

    @pytest.mark.asyncio
    async def test_totp_verify_invalid_code(
        self, client: AsyncClient, test_user_with_totp: User
    ):
        """Test TOTP verification with invalid code."""
        response = await client.post(
            TOTP_VERIFY_URL,
            headers={"Authorization": f"Bearer {test_user_with_totp['token']}"},
            json={"code": "000000"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["verified"] is False

    @pytest.mark.asyncio
    async def test_totp_verify_unauthorized(self, client: AsyncClient):
        """Test TOTP verification without authentication."""
        response = await client.post(
            TOTP_VERIFY_URL,
            json={"code": "123456"},
        )

        # HTTPBearer returns 403 when credentials are missing
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_totp_verify_invalid_format(
        self, client: AsyncClient, test_user: User
    ):
        """Test TOTP verification with invalid format."""
        response = await client.post(
            TOTP_VERIFY_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"code": "abcdef"},
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestGetCurrentUserDep:
    """Test get_current_user_dep dependency function."""

    @pytest.mark.asyncio
    async def test_get_current_user_with_missing_sub(self, client: AsyncClient, test_db_session: AsyncSession):
        """Test get_current_user_dep with token missing sub claim."""
        from app.core.security import create_access_token
        from app.api.v1.auth import get_current_user_dep
        from fastapi.security import HTTPAuthorizationCredentials
        from fastapi import HTTPException

        # Create token without sub claim
        from jose import jwt
        token = jwt.encode({"email": "test@example.com"}, "secret", algorithm="HS256")

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_dep(credentials, test_db_session)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_with_nonexistent_user_id(self, client: AsyncClient, test_db_session: AsyncSession):
        """Test get_current_user_dep with valid token but nonexistent user."""
        from app.api.v1.auth import get_current_user_dep
        from fastapi.security import HTTPAuthorizationCredentials
        from fastapi import HTTPException

        # Create token with nonexistent user ID
        token = create_access_token({"sub": "nonexistent-user-id", "email": "test@example.com"})

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_dep(credentials, test_db_session)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_optional_user_without_credentials(self, client: AsyncClient, test_db_session: AsyncSession):
        """Test get_optional_user returns None when no credentials provided."""
        from app.api.v1.auth import get_optional_user

        result = await get_optional_user(None, test_db_session)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_optional_user_with_invalid_token(self, client: AsyncClient, test_db_session: AsyncSession):
        """Test get_optional_user returns None with invalid token."""
        from app.api.v1.auth import get_optional_user
        from fastapi.security import HTTPAuthorizationCredentials

        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")

        result = await get_optional_user(credentials, test_db_session)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_optional_user_with_valid_token(self, client: AsyncClient, test_db_session: AsyncSession):
        """Test get_optional_user returns user with valid token."""
        from app.api.v1.auth import get_optional_user
        from fastapi.security import HTTPAuthorizationCredentials
        from app.models.user import User

        # Create user
        user = User(
            id="optional-user-123",
            email="optional@example.com",
            username="optionaluser",
            hashed_password=get_password_hash("SecurePass123"),
            is_active=True,
        )
        test_db_session.add(user)
        await test_db_session.commit()

        token = create_access_token({"sub": user.id, "email": user.email})
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        result = await get_optional_user(credentials, test_db_session)
        assert result is not None
        assert result.id == user.id


class TestMeEndpoint:
    """Test GET /api/v1/auth/me endpoint."""

    @pytest.mark.asyncio
    async def test_me_success(self, client: AsyncClient, test_user: User):
        """Test getting current user info."""
        response = await client.get(
            ME_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == test_user["id"]
        assert data["email"] == test_user["email"]
        assert data["username"] == test_user["username"]
        assert data["is_active"] is True
        assert data["totp_enabled"] is False

    @pytest.mark.asyncio
    async def test_me_unauthorized(self, client: AsyncClient):
        """Test getting current user without authentication."""
        response = await client.get(ME_URL)

        # HTTPBearer returns 403 when credentials are missing
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @pytest.mark.asyncio
    async def test_me_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token."""
        response = await client.get(
            ME_URL,
            headers={"Authorization": "Bearer invalid.token"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @pytest.mark.asyncio
    async def test_me_totp_enabled(
        self, client: AsyncClient, test_user_with_totp: User
    ):
        """Test getting current user info with TOTP enabled."""
        response = await client.get(
            ME_URL,
            headers={"Authorization": f"Bearer {test_user_with_totp['token']}"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["totp_enabled"] is True


# Pytest fixtures
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


@pytest_asyncio.fixture
async def client(test_db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database session override."""
    from app.main import app
    from app.core.database import get_db

    # Override database dependency
    async def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(client: AsyncClient) -> dict:
    """Create a test user and return user data with token."""
    # Register user
    response = await client.post(
        REGISTER_URL,
        json={
            "email": "testuser@example.com",
            "username": "testuser",
            "password": "SecurePass123",
        },
    )
    user_data = response.json()

    # Create token
    token = create_access_token(
        {"sub": user_data["id"], "email": user_data["email"]},
        timedelta(minutes=30),
    )

    return {
        "id": user_data["id"],
        "email": user_data["email"],
        "username": user_data["username"],
        "token": token,
    }


@pytest_asyncio.fixture
async def test_user_with_totp(client: AsyncClient, test_db_session: AsyncSession) -> dict:
    """Create a test user with TOTP enabled."""
    import pyotp
    from app.models.user import User

    # Create user with TOTP secret
    totp_secret = pyotp.random_base32()
    user = User(
        id="totp-user-123",
        email="totpuser@example.com",
        username="totpuser",
        hashed_password=get_password_hash("SecurePass123"),
        totp_secret=totp_secret,
        is_active=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)

    # Create token
    token = create_access_token(
        {"sub": user.id, "email": user.email},
        timedelta(minutes=30),
    )

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "totp_secret": totp_secret,
        "token": token,
    }


class TestEdgeCases:
    """Test edge cases and error paths."""

    @pytest.mark.asyncio
    async def test_register_with_empty_username(self, client: AsyncClient):
        """Test registration with empty username."""
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "test@example.com",
                "username": "",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_register_with_invalid_username_special_chars(self, client: AsyncClient):
        """Test registration with special characters in username."""
        response = await client.post(
            REGISTER_URL,
            json={
                "email": "test@example.com",
                "username": "user@#$",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_login_with_empty_email(self, client: AsyncClient):
        """Test login with empty email."""
        response = await client.post(
            LOGIN_URL,
            json={
                "email": "",
                "password": "SecurePass123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.asyncio
    async def test_totp_verify_with_totp_not_enabled(self, client: AsyncClient, test_user: User):
        """Test TOTP verify when TOTP is not enabled."""
        response = await client.post(
            TOTP_VERIFY_URL,
            headers={"Authorization": f"Bearer {test_user['token']}"},
            json={"code": "123456"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["verified"] is False
        assert "not enabled" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_me_with_deleted_user(self, client: AsyncClient, test_db_session: AsyncSession):
        """Test /me endpoint with user that was deleted after token creation."""
        from app.main import app
        from app.core.database import get_db

        # Create user
        user = User(
            id="deleted-user-123",
            email="deleted@example.com",
            username="deleteduser",
            hashed_password=get_password_hash("SecurePass123"),
            is_active=True,
        )
        test_db_session.add(user)
        await test_db_session.commit()
        await test_db_session.refresh(user)

        # Create token
        token = create_access_token({"sub": user.id, "email": user.email})

        # Delete user
        await test_db_session.delete(user)
        await test_db_session.commit()

        # Override dependency and try to access /me
        async def override_get_db():
            yield test_db_session

        app.dependency_overrides[get_db] = override_get_db

        response = await client.get(
            ME_URL,
            headers={"Authorization": f"Bearer {token}"},
        )

        app.dependency_overrides.clear()

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
