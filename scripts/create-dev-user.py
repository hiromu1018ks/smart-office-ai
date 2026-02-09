#!/usr/bin/env python3
"""Create a development user for Smart Office AI."""

import asyncio
import sys

# Add parent directory to path for imports
sys.path.insert(0, "/app")

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.base import Base
from app.models.user import User


async def create_dev_user():
    """Create a development user in the database."""

    # Create async engine
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    # Create async session
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        # Check if dev user already exists
        from sqlalchemy import select

        result = await session.execute(
            select(User).where(User.email == "dev@example.com")
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"⚠️  Development user already exists:")
            print(f"   Email: {existing_user.email}")
            print(f"   Username: {existing_user.username}")
            print(f"   TOTP Enabled: {'Yes' if existing_user.totp_secret else 'No'}")
            return

        # Create new dev user (without TOTP for easier development)
        dev_user = User(
            email="dev@example.com",
            username="devuser",
            hashed_password=get_password_hash("devpass123"),
            is_active=True,
            # totp_secret=None  # No 2FA for development
        )

        session.add(dev_user)
        await session.commit()
        await session.refresh(dev_user)

        print("✅ Development user created successfully!")
        print()
        print("   📧 Email: dev@example.com")
        print("   👤 Username: devuser")
        print("   🔑 Password: devpass123")
        print("   🔐 TOTP: Disabled (for easier development)")
        print()
        print("   You can now login at: http://localhost:5173/login")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_dev_user())
