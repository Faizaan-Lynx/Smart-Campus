"""Add fire/smoke detection fields

Revision ID: add_fire_smoke_fields
Revises: add_alpr_fields
Create Date: 2026-09-08

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'add_fire_smoke_fields'
down_revision: Union[str, None] = 'add_alpr_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # IF NOT EXISTS keeps this idempotent (the app also syncs these columns on startup)
    op.execute("ALTER TABLE cameras ADD COLUMN IF NOT EXISTS detect_fire_smoke BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_type VARCHAR DEFAULT 'intrusion'")


def downgrade() -> None:
    op.execute("ALTER TABLE cameras DROP COLUMN IF EXISTS detect_fire_smoke")
    op.execute("ALTER TABLE alerts DROP COLUMN IF EXISTS alert_type")