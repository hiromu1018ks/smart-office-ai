"""User model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.chat import Conversation


class User(TimestampMixin, Base):
    """
    User model for authentication and profile.

    Attributes:
        id: UUID primary key
        email: Unique email address
        username: Unique username for display
        hashed_password: Bcrypt hashed password
        totp_secret: TOTP secret for 2FA (nullable)
        is_active: Active status flag
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        Text, primary_key=True, default=lambda: str(uuid.uuid4())
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    totp_secret: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        default=None,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Relationships
    conversations: Mapped[list["Conversation"]] = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Conversation.created_at.desc()",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"
