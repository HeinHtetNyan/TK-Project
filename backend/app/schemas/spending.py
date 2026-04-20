from datetime import datetime, date
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator, field_serializer
from zoneinfo import ZoneInfo


def _yangon_today() -> date:
    return datetime.now(ZoneInfo("Asia/Yangon")).date()


class SpendingBase(BaseModel):
    description: str
    amount: float = Field(ge=0)
    spending_date: date = Field(default_factory=_yangon_today)

    @field_validator("spending_date", mode="before")
    @classmethod
    def parse_spending_date(cls, v: Any) -> Any:
        if v is None:
            return _yangon_today()
        if isinstance(v, str) and v:
            try:
                return datetime.strptime(v, "%d-%m-%Y").date()
            except ValueError:
                pass
        return v

    @field_serializer("spending_date")
    def serialize_spending_date(self, v: date, _info):
        if v:
            return v.strftime("%d-%m-%Y")
        return v


class SpendingCreate(SpendingBase):
    client_id: Optional[str] = None


class SpendingUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    spending_date: Optional[date] = None

    @field_validator("spending_date", mode="before")
    @classmethod
    def parse_spending_date(cls, v: Any) -> Any:
        if isinstance(v, str) and v:
            try:
                return datetime.strptime(v, "%d-%m-%Y").date()
            except ValueError:
                pass
        return v


class SpendingRead(SpendingBase):
    id: int
    client_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
