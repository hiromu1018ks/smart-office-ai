"""Tests for auth schemas (TDD - GREEN phase)."""

import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    ErrorResponse,
    TOTPSetupResponse,
    TOTPVerifyRequest,
    TOTPVerifyResponse,
    TokenResponse,
    UserCreateRequest,
    UserLoginRequest,
    UserResponse,
)


class TestUserCreateRequest:
    """Test UserCreateRequest schema."""

    def test_valid_user_create_request(self):
        """Test valid user creation request."""
        data = {
            "email": "test@example.com",
            "username": "testuser",
            "password": "SecurePass123",
        }
        schema = UserCreateRequest(**data)

        assert schema.email == "test@example.com"
        assert schema.username == "testuser"
        assert schema.password == "SecurePass123"

    def test_email_validation(self):
        """Test email validation."""
        # Valid emails
        UserCreateRequest(
            email="test@example.com",
            username="testuser",
            password="SecurePass123",
        )
        UserCreateRequest(
            email="user+tag@example.co.uk",
            username="testuser",
            password="SecurePass123",
        )

        # Invalid emails
        with pytest.raises(ValidationError):
            UserCreateRequest(
                email="notanemail",
                username="testuser",
                password="SecurePass123",
            )

        with pytest.raises(ValidationError):
            UserCreateRequest(
                email="@example.com",
                username="testuser",
                password="SecurePass123",
            )

    def test_username_min_length(self):
        """Test username minimum length validation."""
        # Too short
        with pytest.raises(ValidationError) as exc_info:
            UserCreateRequest(
                email="test@example.com",
                username="ab",
                password="SecurePass123",
            )
        assert "at least 3 characters" in str(exc_info.value).lower()

    def test_username_max_length(self):
        """Test username maximum length validation."""
        # Too long
        with pytest.raises(ValidationError) as exc_info:
            UserCreateRequest(
                email="test@example.com",
                username="a" * 51,
                password="SecurePass123",
            )
        assert "at most 50 characters" in str(exc_info.value).lower()

    def test_username_alphanumeric_validation(self):
        """Test username alphanumeric validation."""
        # Valid: alphanumeric with underscore and hyphen
        UserCreateRequest(
            email="test@example.com",
            username="test_user-123",
            password="SecurePass123",
        )

        # Invalid: special characters
        with pytest.raises(ValidationError) as exc_info:
            UserCreateRequest(
                email="test@example.com",
                username="test@user",
                password="SecurePass123",
            )
        assert "alphanumeric" in str(exc_info.value).lower()

    def test_password_min_length(self):
        """Test password minimum length validation."""
        # Too short
        with pytest.raises(ValidationError) as exc_info:
            UserCreateRequest(
                email="test@example.com",
                username="testuser",
                password="Short1",
            )
        assert "at least 8 characters" in str(exc_info.value).lower()

    def test_password_requires_uppercase(self):
        """Test password requires uppercase letter."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreateRequest(
                email="test@example.com",
                username="testuser",
                password="lowercase123",
            )
        assert "uppercase" in str(exc_info.value).lower()

    def test_password_requires_lowercase(self):
        """Test password requires lowercase letter."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreateRequest(
                email="test@example.com",
                username="testuser",
                password="UPPERCASE123",
            )
        assert "lowercase" in str(exc_info.value).lower()

    def test_password_requires_digit(self):
        """Test password requires digit."""
        with pytest.raises(ValidationError) as exc_info:
            UserCreateRequest(
                email="test@example.com",
                username="testuser",
                password="NoDigitsHere",
            )
        assert "digit" in str(exc_info.value).lower()


class TestUserLoginRequest:
    """Test UserLoginRequest schema."""

    def test_valid_login_request(self):
        """Test valid login request."""
        data = {
            "email": "test@example.com",
            "password": "anypassword",
        }
        schema = UserLoginRequest(**data)

        assert schema.email == "test@example.com"
        assert schema.password == "anypassword"

    def test_login_requires_email(self):
        """Test login requires email field."""
        with pytest.raises(ValidationError) as exc_info:
            UserLoginRequest(password="password")
        assert "email" in str(exc_info.value).lower()

    def test_login_requires_password(self):
        """Test login requires password field."""
        with pytest.raises(ValidationError) as exc_info:
            UserLoginRequest(email="test@example.com")
        assert "password" in str(exc_info.value).lower()


class TestTokenResponse:
    """Test TokenResponse schema."""

    def test_valid_token_response(self):
        """Test valid token response."""
        data = {
            "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "token_type": "bearer",
            "expires_in": 1800,
        }
        schema = TokenResponse(**data)

        assert schema.access_token == data["access_token"]
        assert schema.token_type == "bearer"
        assert schema.expires_in == 1800

    def test_token_response_default_token_type(self):
        """Test token response defaults to bearer."""
        schema = TokenResponse(access_token="token123", expires_in=1800)

        assert schema.token_type == "bearer"

    def test_token_response_serialization(self):
        """Test token response can be serialized to JSON."""
        schema = TokenResponse(
            access_token="test_token", expires_in=1800
        )

        data = schema.model_dump()
        assert data == {
            "access_token": "test_token",
            "token_type": "bearer",
            "expires_in": 1800,
        }


class TestTOTPSetupResponse:
    """Test TOTPSetupResponse schema."""

    def test_valid_totp_setup_response(self):
        """Test valid TOTP setup response."""
        data = {
            "secret": "JBSWY3DPEHPK3PXP",
            "qr_code_uri": "otpauth://totp/...",
        }
        schema = TOTPSetupResponse(**data)

        assert schema.secret == "JBSWY3DPEHPK3PXP"
        assert schema.qr_code_uri == "otpauth://totp/..."


class TestTOTPVerifyRequest:
    """Test TOTPVerifyRequest schema."""

    def test_valid_totp_verify_request(self):
        """Test valid TOTP verify request."""
        schema = TOTPVerifyRequest(code="123456")

        assert schema.code == "123456"

    def test_totp_code_must_be_6_digits(self):
        """Test TOTP code must be exactly 6 digits."""
        # Too short
        with pytest.raises(ValidationError):
            TOTPVerifyRequest(code="12345")

        # Too long
        with pytest.raises(ValidationError):
            TOTPVerifyRequest(code="1234567")

        # Non-numeric
        with pytest.raises(ValidationError):
            TOTPVerifyRequest(code="abcdef")

        # Exactly 6 digits - valid
        TOTPVerifyRequest(code="000000")
        TOTPVerifyRequest(code="999999")


class TestTOTPVerifyResponse:
    """Test TOTPVerifyResponse schema."""

    def test_valid_totp_verify_response(self):
        """Test valid TOTP verify response."""
        schema = TOTPVerifyResponse(verified=True, message="TOTP verified")

        assert schema.verified is True
        assert schema.message == "TOTP verified"

    def test_totp_verify_response_false(self):
        """Test TOTP verify response with False."""
        schema = TOTPVerifyResponse(
            verified=False, message="Invalid TOTP code"
        )

        assert schema.verified is False
        assert schema.message == "Invalid TOTP code"


class TestUserResponse:
    """Test UserResponse schema."""

    def test_valid_user_response(self):
        """Test valid user response."""
        data = {
            "id": "user-123",
            "email": "test@example.com",
            "username": "testuser",
            "is_active": True,
            "totp_enabled": False,
        }
        schema = UserResponse(**data)

        assert schema.id == "user-123"
        assert schema.email == "test@example.com"
        assert schema.username == "testuser"
        assert schema.is_active is True
        assert schema.totp_enabled is False

    def test_user_response_from_user_model(self):
        """Test UserResponse.from_user class method."""
        from app.models.user import User

        # Create a mock user object
        class MockUser:
            id = "user-123"
            email = "test@example.com"
            username = "testuser"
            is_active = True
            totp_secret = None

        mock_user = MockUser()
        response = UserResponse.from_user(mock_user)

        assert response.id == "user-123"
        assert response.email == "test@example.com"
        assert response.username == "testuser"
        assert response.is_active is True
        assert response.totp_enabled is False

    def test_user_response_totp_enabled_when_secret_exists(self):
        """Test totp_enabled is True when user has TOTP secret."""
        class MockUserWithTOTP:
            id = "user-123"
            email = "test@example.com"
            username = "testuser"
            is_active = True
            totp_secret = "JBSWY3DPEHPK3PXP"

        mock_user = MockUserWithTOTP()
        response = UserResponse.from_user(mock_user)

        assert response.totp_enabled is True


class TestErrorResponse:
    """Test ErrorResponse schema."""

    def test_valid_error_response(self):
        """Test valid error response."""
        schema = ErrorResponse(detail="Not found", code="NOT_FOUND")

        assert schema.detail == "Not found"
        assert schema.code == "NOT_FOUND"

    def test_error_response_without_code(self):
        """Test error response without code."""
        schema = ErrorResponse(detail="Something went wrong")

        assert schema.detail == "Something went wrong"
        assert schema.code is None
