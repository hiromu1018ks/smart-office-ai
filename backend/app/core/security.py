"""Security functions for authentication and authorization.

Provides password hashing, JWT token management, TOTP validation,
and FastAPI dependencies for user authentication.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError
from pyotp import TOTP
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User


# Bcrypt rounds for password hashing
BCRYPT_ROUNDS = 12


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Bcrypt hashed password string
    """
    # Bcrypt has a 72-byte limit for passwords
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password: Plain text password to verify
        hashed_password: Bcrypt hashed password

    Returns:
        True if password matches, False otherwise
    """
    try:
        password_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Data to encode in the token (e.g., {"sub": user_id, "email": email})
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    # Set expiration time (use timezone-aware datetime)
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})

    # Encode JWT using PyJWT
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify a JWT access token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload if valid, None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except (InvalidTokenError, ValueError):
        return None


def generate_totp_secret() -> str:
    """
    Generate a random TOTP secret for 2FA.

    Returns:
        Base32-encoded secret key (32 characters)
    """
    import secrets

    # Generate 32 random bytes, encode as Base32
    random_bytes = secrets.token_bytes(32)
    secret = random_bytes[:20]  # 160 bits = 32 Base32 chars
    import base64

    return base64.b32encode(secret).decode("utf-8")


def verify_totp(secret: str, token: str, window: int = 1) -> bool:
    """
    Verify a TOTP code against a secret.

    Args:
        secret: Base32-encoded TOTP secret
        token: 6-digit TOTP code to verify
        window: Number of time steps to check before/after current time (default: 1)

    Returns:
        True if token is valid, False otherwise
    """
    try:
        totp = TOTP(secret, digits=6)
        return totp.verify(token, valid_window=window)
    except Exception:
        return False


async def get_current_user(
    token: str,
    db: AsyncSession,
) -> User:
    """
    FastAPI dependency to get the current authenticated user from JWT token.

    Args:
        token: JWT access token from Authorization header
        db: Database session

    Returns:
        Authenticated User object

    Raises:
        HTTPException: If token is invalid, expired, or user not found/inactive
    """
    from fastapi import HTTPException, status

    # Decode token
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Query user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def generate_totp_qr_code_uri(secret: str, username: str) -> str:
    """
    Generate a QR code URI for TOTP setup.

    Args:
        secret: Base32-encoded TOTP secret
        username: Username for the account

    Returns:
        otpauth:// URI for QR code generation
    """
    totp = TOTP(secret)
    return totp.provisioning_uri(
        name=username,
        issuer_name="Smart Office AI"
    )
