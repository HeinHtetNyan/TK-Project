from typing import Optional, TYPE_CHECKING
from sqlalchemy import Column, Integer, ForeignKey
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .voucher import Voucher

class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    voucher_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("voucher.id", ondelete="CASCADE"), nullable=False),
    )
    lb: float = Field(gt=0)
    plastic_size: str
    plastic_price: float = Field(ge=0)
    color: str
    color_price: float = Field(ge=0)
    total_price: float = Field(default=0.0)

    voucher: "Voucher" = Relationship(back_populates="items")
