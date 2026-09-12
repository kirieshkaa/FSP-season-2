from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from uuid import UUID


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLOCKED = "blocked"


@dataclass
class User:
    id: UUID
    username: str
    email: str
    password_hash: str
    role: UserRole
    status: UserStatus
    created_at: datetime


@dataclass
class Tokens:
    access_token: str
    refresh_token: str
    access_token_id: str
    refresh_token_id: str
    role: str = "user"
    user_id: str = ""


@dataclass
class RefreshTokenModel:
    user_id: UUID
    token_id: str
    refresh_token: str
    expires_at: datetime
