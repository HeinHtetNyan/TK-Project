from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.STAFF)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
