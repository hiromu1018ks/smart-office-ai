"""Authentication API endpoints v1."""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_totp_qr_code_uri,
    generate_totp_secret,
    get_password_hash,
    verify_password,
    verify_totp,
)
from app.models.user import User
from app.schemas.auth import (
    ErrorResponse,
    TOTPEnableRequest,
    TOTPEnableResponse,
    TOTPSetupResponse,
    TOTPVerifyRequest,
    TOTPVerifyResponse,
    TokenResponse,
    UserCreateRequest,
    UserLoginRequest,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


async def get_current_user_dep(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    FastAPI dependency to get the current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer credentials
        db: Database session

    Returns:
        Authenticated User object

    Raises:
        HTTPException: If token is invalid, expired, or user not found/inactive
    """
    token = credentials.credentials

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


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """
    Get current user from Authorization header if present.

    Returns None if no credentials provided or invalid token.
    Used for endpoints that allow optional authentication.
    """
    if credentials is None:
        return None

    token = credentials.credentials
    try:
        return await get_current_user_dep(
            HTTPAuthorizationCredentials(scheme="bearer", credentials=token),
            db,
        )
    except HTTPException:
        return None


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserResponse:
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user

    Raises:
        HTTPException 400: If email or username already exists
    """
    # Check for existing email
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check for existing username
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Create new user
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserResponse.from_user(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """
    Authenticate user and return JWT token.

    Args:
        credentials: Login credentials (email, password, optional TOTP code)
        db: Database session

    Returns:
        JWT access token with expiration time

    Raises:
        HTTPException 401: If credentials are invalid or TOTP required/invalid
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    # Timing attack prevention: Always do password hash comparison
    # If user not found, compare against a dummy hash to maintain consistent timing
    if user is None:
        # Dummy hash comparison to prevent timing attacks
        verify_password(credentials.password, get_password_hash("dummy"))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    # Check if TOTP is enabled and verify code
    if user.totp_secret is not None:
        if credentials.totp_code is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TOTP code required. Two-factor authentication is enabled on this account.",
            )

        if not verify_totp(user.totp_secret, credentials.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP code",
            )

    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/2fa/setup", response_model=TOTPSetupResponse)
async def setup_totp(
    current_user: Annotated[User, Depends(get_current_user_dep)],
) -> TOTPSetupResponse:
    """
    Setup TOTP two-factor authentication (Step 1: Generate secret).

    Generates a new TOTP secret and QR code URI for the user.
    The secret is NOT stored yet - user must verify they can generate codes.

    Args:
        current_user: Authenticated user

    Returns:
        TOTP secret and QR code URI

    Raises:
        HTTPException 400: If TOTP is already enabled
        HTTPException 401: If not authenticated
    """
    # Check if TOTP is already enabled
    if current_user.totp_secret is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is already enabled. Use /2fa/disable to disable first.",
        )

    # Generate new TOTP secret (not saved yet)
    secret = generate_totp_secret()
    qr_code_uri = generate_totp_qr_code_uri(secret, current_user.username)

    # Return secret without saving - user must call /2fa/enable to confirm
    return TOTPSetupResponse(secret=secret, qr_code_uri=qr_code_uri)


@router.post("/2fa/enable", response_model=TOTPEnableResponse)
async def enable_totp(
    totp_data: TOTPEnableRequest,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TOTPEnableResponse:
    """
    Enable TOTP two-factor authentication (Step 2: Verify and save).

    Verifies the user can generate valid TOTP codes before saving the secret.

    Args:
        totp_data: TOTP enable request with secret and verification code
        current_user: Authenticated user
        db: Database session

    Returns:
        Enable result

    Raises:
        HTTPException 400: If TOTP already enabled or code invalid
        HTTPException 401: If not authenticated
    """
    # Check if TOTP is already enabled
    if current_user.totp_secret is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is already enabled",
        )

    # Verify the code matches the provided secret
    if not verify_totp(totp_data.secret, totp_data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code. Please try again.",
        )

    # Save the secret - user has proven they can generate valid codes
    current_user.totp_secret = totp_data.secret
    await db.commit()

    return TOTPEnableResponse(
        enabled=True,
        message="Two-factor authentication enabled successfully",
    )


@router.post("/2fa/disable", response_model=TOTPEnableResponse)
async def disable_totp(
    totp_data: TOTPVerifyRequest,
    current_user: Annotated[User, Depends(get_current_user_dep)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TOTPEnableResponse:
    """
    Disable TOTP two-factor authentication.

    Requires a valid TOTP code to disable.

    Args:
        totp_data: TOTP verification request with code
        current_user: Authenticated user
        db: Database session

    Returns:
        Disable result

    Raises:
        HTTPException 400: If TOTP not enabled or code invalid
        HTTPException 401: If not authenticated
    """
    if current_user.totp_secret is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="TOTP is not enabled for this account",
        )

    # Verify TOTP code before disabling
    if not verify_totp(current_user.totp_secret, totp_data.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid TOTP code",
        )

    # Clear the TOTP secret
    current_user.totp_secret = None
    await db.commit()

    return TOTPEnableResponse(
        enabled=False,
        message="Two-factor authentication disabled successfully",
    )


@router.post("/2fa/verify", response_model=TOTPVerifyResponse)
async def verify_totp_endpoint(
    totp_data: TOTPVerifyRequest,
    current_user: Annotated[User, Depends(get_current_user_dep)],
) -> TOTPVerifyResponse:
    """
    Verify a TOTP code (for checking validity without enabling).

    Args:
        totp_data: TOTP verification request with code
        current_user: Authenticated user

    Returns:
        Verification result

    Raises:
        HTTPException 401: If not authenticated
    """
    if current_user.totp_secret is None:
        return TOTPVerifyResponse(
            verified=False,
            message="TOTP is not enabled for this account",
        )

    is_valid = verify_totp(current_user.totp_secret, totp_data.code)

    if is_valid:
        return TOTPVerifyResponse(
            verified=True,
            message="TOTP code verified successfully",
        )
    else:
        return TOTPVerifyResponse(
            verified=False,
            message="Invalid TOTP code",
        )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user_dep)],
) -> UserResponse:
    """
    Get current authenticated user information.

    Args:
        current_user: Authenticated user

    Returns:
        Current user information

    Raises:
        HTTPException 401: If not authenticated
    """
    return UserResponse.from_user(current_user)
