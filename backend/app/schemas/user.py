from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from app.models.user import UserRole

class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    role: UserRole

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def password_must_contain_digit(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v

class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
