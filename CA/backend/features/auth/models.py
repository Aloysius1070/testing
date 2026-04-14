"""Authentication models"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class User(BaseModel):
    """User model"""
    id: int
    email: EmailStr
    full_name: str
    is_active: bool = True
    created_at: str


class UserInDB(User):
    """User model with hashed password"""
    hashed_password: str


class TokenData(BaseModel):
    """Token payload data"""
    email: Optional[str] = None
    user_id: Optional[int] = None
