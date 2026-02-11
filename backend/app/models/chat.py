"""Chat models for conversation history."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text, String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Conversation(TimestampMixin, Base):
    """
    Conversation model for chat sessions.

    Attributes:
        id: UUID primary key
        user_id: Foreign key to users table
        title: Conversation title
        model: AI model used for this conversation
        messages: Related messages
    """

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(
        Text, primary_key=True, default=lambda: str(uuid.uuid4())
    )

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default=None,
    )

    model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="gemma3:12b",
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    def __repr__(self) -> str:
        return (
            f"<Conversation(id={self.id}, user_id={self.user_id}, title={self.title})>"
        )


class Message(TimestampMixin, Base):
    """
    Message model for chat messages.

    Attributes:
        id: UUID primary key
        conversation_id: Foreign key to conversations table
        role: Message role (system, user, assistant)
        content: Message content
        tokens: Token count (optional)
    """

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        Text, primary_key=True, default=lambda: str(uuid.uuid4())
    )

    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        default=None,
    )

    # Relationships
    conversation: Mapped["Conversation"] = relationship(
        "Conversation", back_populates="messages"
    )

    def __repr__(self) -> str:
        return f"<Message(id={self.id}, conversation_id={self.conversation_id}, role={self.role})>"
