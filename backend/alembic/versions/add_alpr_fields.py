"""Add confidence and bounding_box columns to license_detection

Revision ID: add_alpr_fields
Revises: 1913e0ce1b53
Create Date: 2026-06-24

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'add_alpr_fields'
down_revision: Union[str, None] = '1913e0ce1b53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'license_detection',
        sa.Column('confidence', sa.Float(), nullable=True)
    )
    op.add_column(
        'license_detection',
        sa.Column('bounding_box', sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('license_detection', 'bounding_box')
    op.drop_column('license_detection', 'confidence')
