"""add extra charge to voucher

Revision ID: e2f3a4b5c6d7
Revises: d1e2f3a4b5c6
Create Date: 2026-04-19 00:00:00.000000

Adds extra_charge_note and extra_charge_amount columns to the voucher table
for optional extra charges like delivery fees.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('voucher', sa.Column('extra_charge_note', sa.String(), nullable=True))
    op.add_column('voucher', sa.Column('extra_charge_amount', sa.Float(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('voucher', 'extra_charge_amount')
    op.drop_column('voucher', 'extra_charge_note')
