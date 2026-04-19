"""item voucher fk cascade

Revision ID: d1e2f3a4b5c6
Revises: c3d4e5f6g7h8
Create Date: 2026-04-19 00:00:00.000000

Drops the existing FK constraint on item.voucher_id and recreates it
with ON DELETE CASCADE so that deleting a voucher also removes its items
at the database level.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('item_voucher_id_fkey', 'item', type_='foreignkey')
    op.create_foreign_key(
        'item_voucher_id_fkey',
        'item', 'voucher',
        ['voucher_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('item_voucher_id_fkey', 'item', type_='foreignkey')
    op.create_foreign_key(
        'item_voucher_id_fkey',
        'item', 'voucher',
        ['voucher_id'], ['id'],
    )
