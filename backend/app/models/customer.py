from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .voucher import Voucher
    from .payment import Payment

def get_yangon_date():
    return datetime.now(ZoneInfo("Asia/Yangon")).date()

def get_yangon_now():
    return datetime.now(ZoneInfo("Asia/Yangon"))

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # UUID sent by the client for idempotent offline sync. Unique when present.
    client_id: Optional[str] = Field(default=None, unique=True, index=True)
    name: str = Field(index=True)
    phone_numbers: Optional[str] = Field(default=None) # Comma-separated phone numbers
    created_at: datetime = Field(default_factory=get_yangon_now)

    vouchers: List["Voucher"] = Relationship(back_populates="customer")
    payments: List["Payment"] = Relationship(back_populates="customer")
