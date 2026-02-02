"""Init user table and enable extensions.

Revision ID: 001
Revises:
Create Date: 2025-02-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable required extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Create users table
    op.create_table(
        'users',
        sa.Column(
            'id',
            sa.Text(),
            primary_key=True,
        ),
        sa.Column(
            'email',
            sa.String(255),
            nullable=False,
        ),
        sa.Column(
            'username',
            sa.String(50),
            nullable=False,
        ),
        sa.Column(
            'hashed_password',
            sa.String(255),
            nullable=False,
        ),
        sa.Column(
            'totp_secret',
            sa.String(32),
            nullable=True,
        ),
        sa.Column(
            'is_active',
            sa.Boolean(),
            nullable=False,
            server_default='true',
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text('now()'),
        ),
    )

    # Create unique indexes
    op.create_index(
        'ix_users_email',
        'users',
        ['email'],
        unique=True,
    )
    op.create_index(
        'ix_users_username',
        'users',
        ['username'],
        unique=True,
    )


def downgrade() -> None:
    # Drop indexes first
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_email', table_name='users')

    # Drop table
    op.drop_table('users')

    # Optionally drop extensions
    # op.execute('DROP EXTENSION IF EXISTS vector')
    # op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
