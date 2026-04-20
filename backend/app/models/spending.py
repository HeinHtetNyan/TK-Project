from datetime import datetime, date
from typing import Optional
from sqlmodel import SQLModel, Field
from .customer import get_yangon_date, get_yangon_now


class Spending(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_id: Optional[str] = Field(default=None, unique=True, index=True)
    description: str
    amount: float = Field(ge=0)
    spending_date: date = Field(default_factory=get_yangon_date)
    created_at: datetime = Field(default_factory=get_yangon_now)
    updated_at: datetime = Field(default_factory=get_yangon_now)
