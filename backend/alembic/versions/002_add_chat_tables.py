"""Add chat tables (conversations and messages).

Revision ID: 002
Revises: 001
Create Date: 2025-02-09

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create conversations table
    op.create_table(
        "conversations",
        sa.Column(
            "id",
            sa.Text(),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Text(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(255),
            nullable=True,
        ),
        sa.Column(
            "model",
            sa.String(100),
            nullable=False,
            server_default="gemma3:12b",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Create index on user_id for faster lookups
    op.create_index(
        "ix_conversations_user_id",
        "conversations",
        ["user_id"],
    )

    # Create messages table
    op.create_table(
        "messages",
        sa.Column(
            "id",
            sa.Text(),
            primary_key=True,
        ),
        sa.Column(
            "conversation_id",
            sa.Text(),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.String(20),
            nullable=False,
        ),
        sa.Column(
            "content",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "tokens",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Create index on conversation_id for faster lookups
    op.create_index(
        "ix_messages_conversation_id",
        "messages",
        ["conversation_id"],
    )


def downgrade() -> None:
    # Drop indexes first
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_index("ix_conversations_user_id", table_name="conversations")

    # Drop tables
    op.drop_table("messages")
    op.drop_table("conversations")
