from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class CustomerBase(BaseModel):
    name: str
    phone_numbers: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone_numbers: Optional[str] = None

class CustomerRead(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerBalance(BaseModel):
    customer_id: int
    customer_name: str
    balance: float
