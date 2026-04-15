"""add client_id for offline sync

Revision ID: a1b2c3d4e5f6
Revises: b06367720b50
Create Date: 2026-04-15 12:00:00.000000

Adds a nullable client_id (UUID string) column to customer, voucher, and payment
tables. This enables idempotent upserts from the offline-first frontend — when
the same request arrives twice (e.g. after a network timeout and retry) the
server returns the existing record instead of creating a duplicate.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'b06367720b50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # customer.client_id
    op.add_column('customer', sa.Column('client_id', sa.String(), nullable=True))
    op.create_unique_constraint('uq_customer_client_id', 'customer', ['client_id'])
    op.create_index('ix_customer_client_id', 'customer', ['client_id'], unique=True)

    # voucher.client_id
    op.add_column('voucher', sa.Column('client_id', sa.String(), nullable=True))
    op.create_unique_constraint('uq_voucher_client_id', 'voucher', ['client_id'])
    op.create_index('ix_voucher_client_id', 'voucher', ['client_id'], unique=True)

    # payment.client_id
    op.add_column('payment', sa.Column('client_id', sa.String(), nullable=True))
    op.create_unique_constraint('uq_payment_client_id', 'payment', ['client_id'])
    op.create_index('ix_payment_client_id', 'payment', ['client_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_payment_client_id', table_name='payment')
    op.drop_constraint('uq_payment_client_id', 'payment', type_='unique')
    op.drop_column('payment', 'client_id')

    op.drop_index('ix_voucher_client_id', table_name='voucher')
    op.drop_constraint('uq_voucher_client_id', 'voucher', type_='unique')
    op.drop_column('voucher', 'client_id')

    op.drop_index('ix_customer_client_id', table_name='customer')
    op.drop_constraint('uq_customer_client_id', 'customer', type_='unique')
    op.drop_column('customer', 'client_id')
