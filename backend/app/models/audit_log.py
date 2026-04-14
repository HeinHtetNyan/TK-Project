from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from .customer import get_yangon_now

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    action: str  # DELETE, UPDATE, etc.
    entity_type: str  # Voucher, Payment, Customer
    entity_id: str
    details: str
    created_at: datetime = Field(default_factory=get_yangon_now)
