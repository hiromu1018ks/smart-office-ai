"""Authentication-related Pydantic schemas."""

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreateRequest(BaseModel):
    """Request schema for user registration."""

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        """Validate username contains only alphanumeric characters and underscores."""
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError(
                "Username must contain only alphanumeric characters, underscores, and hyphens"
            )
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserLoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr
    password: str
    totp_code: str | None = None  # Optional TOTP code for 2FA


class TokenResponse(BaseModel):
    """Response schema for JWT token."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int  # Seconds until expiration


class TOTPSetupResponse(BaseModel):
    """Response schema for TOTP setup."""

    secret: str
    qr_code_uri: str


class TOTPVerifyRequest(BaseModel):
    """Request schema for TOTP verification."""

    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class TOTPEnableRequest(BaseModel):
    """Request schema for TOTP enablement (2-step setup)."""

    secret: str = Field(..., min_length=32, max_length=32)
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class TOTPEnableResponse(BaseModel):
    """Response schema for TOTP enablement."""

    enabled: bool
    message: str


class TOTPVerifyResponse(BaseModel):
    """Response schema for TOTP verification."""

    verified: bool
    message: str


class UserResponse(BaseModel):
    """Response schema for user data."""

    id: str
    email: str
    username: str
    is_active: bool
    totp_enabled: bool

    @classmethod
    def from_user(cls, user) -> "UserResponse":
        """Create UserResponse from User model."""
        return cls(
            id=str(user.id),
            email=user.email,
            username=user.username,
            is_active=user.is_active,
            totp_enabled=user.totp_secret is not None,
        )


class ErrorResponse(BaseModel):
    """Response schema for errors."""

    detail: str
    code: str | None = None
