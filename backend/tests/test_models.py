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
from app.models import Conversation, Message, TimestampMixin, User


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    settings.DATABASE_URL.rsplit("/", 1)[0] + "/smart_office_ai_test",
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
        assert hasattr(mixin, "created_at")

    def test_timestamp_mixin_has_updated_at(self):
        """Test TimestampMixin has updated_at field."""
        mixin = TimestampMixin()
        assert hasattr(mixin, "updated_at")


class TestUser:
    """Test User model."""

    def test_user_has_id_field(self):
        """Test User has id field."""
        assert hasattr(User, "id")

    def test_user_has_email_field(self):
        """Test User has email field."""
        assert hasattr(User, "email")

    def test_user_has_username_field(self):
        """Test User has username field."""
        assert hasattr(User, "username")

    def test_user_has_hashed_password_field(self):
        """Test User has hashed_password field."""
        assert hasattr(User, "hashed_password")

    def test_user_has_totp_secret_field(self):
        """Test User has totp_secret field."""
        assert hasattr(User, "totp_secret")

    def test_user_has_is_active_field(self):
        """Test User has is_active field."""
        assert hasattr(User, "is_active")

    def test_user_inherits_timestamp_mixin(self):
        """Test User inherits TimestampMixin."""
        assert hasattr(User, "created_at")
        assert hasattr(User, "updated_at")

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


class TestConversation:
    """Test Conversation model."""

    def test_conversation_has_id_field(self):
        """Test Conversation has id field."""
        assert hasattr(Conversation, "id")

    def test_conversation_has_user_id_field(self):
        """Test Conversation has user_id field."""
        assert hasattr(Conversation, "user_id")

    def test_conversation_has_title_field(self):
        """Test Conversation has title field."""
        assert hasattr(Conversation, "title")

    def test_conversation_has_model_field(self):
        """Test Conversation has model field."""
        assert hasattr(Conversation, "model")

    def test_conversation_inherits_timestamp_mixin(self):
        """Test Conversation inherits TimestampMixin."""
        assert hasattr(Conversation, "created_at")
        assert hasattr(Conversation, "updated_at")

    def test_conversation_has_user_relationship(self):
        """Test Conversation has user relationship."""
        assert hasattr(Conversation, "user")

    def test_conversation_has_messages_relationship(self):
        """Test Conversation has messages relationship."""
        assert hasattr(Conversation, "messages")

    @pytest.mark.asyncio
    async def test_create_conversation(self, db_session):
        """Test creating a conversation in database."""
        # Create user first
        user = User(
            email="conv_user@example.com",
            username="conv_user",
            hashed_password="hashed_secret",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        conversation = Conversation(
            user_id=user.id,
            title="Test Conversation",
            model="gemma3:12b",
        )

        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)

        assert conversation.id is not None
        assert conversation.user_id == user.id
        assert conversation.title == "Test Conversation"
        assert conversation.model == "gemma3:12b"
        assert conversation.created_at is not None
        assert conversation.updated_at is not None

    @pytest.mark.asyncio
    async def test_conversation_defaults(self, db_session):
        """Test Conversation model default values."""
        user = User(
            email="conv_defaults@example.com",
            username="conv_defaults_user",
            hashed_password="hashed_secret",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        conversation = Conversation(
            user_id=user.id,
        )

        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)

        # title should default to None
        assert conversation.title is None
        # model should default to gemma3:12b
        assert conversation.model == "gemma3:12b"

    @pytest.mark.asyncio
    async def test_conversation_cascade_delete_with_user(self, db_session):
        """Test that conversations are deleted when user is deleted."""
        user = User(
            email="cascade@example.com",
            username="cascade_user",
            hashed_password="hashed_secret",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        conversation = Conversation(
            user_id=user.id,
            title="Cascade Test",
        )
        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)

        conv_id = conversation.id

        # Delete user
        await db_session.delete(user)
        await db_session.commit()

        # Conversation should be deleted
        result = await db_session.get(Conversation, conv_id)
        assert result is None


class TestMessage:
    """Test Message model."""

    def test_message_has_id_field(self):
        """Test Message has id field."""
        assert hasattr(Message, "id")

    def test_message_has_conversation_id_field(self):
        """Test Message has conversation_id field."""
        assert hasattr(Message, "conversation_id")

    def test_message_has_role_field(self):
        """Test Message has role field."""
        assert hasattr(Message, "role")

    def test_message_has_content_field(self):
        """Test Message has content field."""
        assert hasattr(Message, "content")

    def test_message_has_tokens_field(self):
        """Test Message has tokens field."""
        assert hasattr(Message, "tokens")

    def test_message_inherits_timestamp_mixin(self):
        """Test Message inherits TimestampMixin."""
        assert hasattr(Message, "created_at")
        assert hasattr(Message, "updated_at")

    def test_message_has_conversation_relationship(self):
        """Test Message has conversation relationship."""
        assert hasattr(Message, "conversation")

    @pytest.mark.asyncio
    async def test_create_message(self, db_session):
        """Test creating a message in database."""
        # Create user first
        user = User(
            email="msg_user@example.com",
            username="msg_user",
            hashed_password="hashed_secret",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        # Create conversation
        conversation = Conversation(
            user_id=user.id,
            title="Message Test",
        )
        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)

        message = Message(
            conversation_id=conversation.id,
            role="user",
            content="Hello, AI!",
        )

        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        assert message.id is not None
        assert message.conversation_id == conversation.id
        assert message.role == "user"
        assert message.content == "Hello, AI!"
        assert message.created_at is not None
        assert message.updated_at is not None

    @pytest.mark.asyncio
    async def test_message_roles(self, db_session):
        """Test creating messages with different roles."""
        user = User(
            email="roles@example.com",
            username="roles_user",
            hashed_password="hashed_secret",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        conversation = Conversation(
            user_id=user.id,
            title="Roles Test",
        )
        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)

        # Create user message
        user_msg = Message(
            conversation_id=conversation.id,
            role="user",
            content="User message",
        )
        db_session.add(user_msg)

        # Create assistant message
        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content="Assistant response",
        )
        db_session.add(assistant_msg)

        # Create system message
        system_msg = Message(
            conversation_id=conversation.id,
            role="system",
            content="System prompt",
        )
        db_session.add(system_msg)

        await db_session.commit()

        assert user_msg.role == "user"
        assert assistant_msg.role == "assistant"
        assert system_msg.role == "system"

    @pytest.mark.asyncio
    async def test_message_cascade_delete_with_conversation(self, db_session):
        """Test that messages are deleted when conversation is deleted."""
        user = User(
            email="msg_cascade@example.com",
            username="msg_cascade_user",
            hashed_password="hashed_secret",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        conversation = Conversation(
            user_id=user.id,
            title="Message Cascade Test",
        )
        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)

        message = Message(
            conversation_id=conversation.id,
            role="user",
            content="Test message",
        )
        db_session.add(message)
        await db_session.commit()
        await db_session.refresh(message)

        msg_id = message.id

        # Delete conversation
        await db_session.delete(conversation)
        await db_session.commit()

        # Message should be deleted
        result = await db_session.get(Message, msg_id)
        assert result is None

    @pytest.mark.asyncio
    async def test_conversation_messages_relationship(self, db_session):
        """Test conversation.messages relationship."""
        user = User(
            email="rel@example.com",
            username="rel_user",
            hashed_password="hashed_secret",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        conversation = Conversation(
            user_id=user.id,
            title="Relationship Test",
        )
        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)

        # Add multiple messages
        for i in range(3):
            msg = Message(
                conversation_id=conversation.id,
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message {i}",
            )
            db_session.add(msg)

        await db_session.commit()

        # Reload conversation with messages
        from sqlalchemy.orm import selectinload
        from sqlalchemy import select

        result = await db_session.execute(
            select(Conversation)
            .where(Conversation.id == conversation.id)
            .options(selectinload(Conversation.messages))
        )
        conv = result.scalar_one()

        assert len(conv.messages) == 3
        assert all(isinstance(m, Message) for m in conv.messages)
