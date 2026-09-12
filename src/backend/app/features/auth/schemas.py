from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.features.auth.entities import UserRole, UserStatus


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterResponse(BaseModel):
    message: str = "Registration successful. Please wait for admin approval."


class LoginRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str

    @property
    def has_credentials(self) -> bool:
        return self.name is not None or self.email is not None


class LoginResponse(BaseModel):
    access_token: str
    role: str
    user_id: str


class RefreshResponse(BaseModel):
    access_token: str


class LogoutResponse(BaseModel):
    ok: bool = True


class TokenResponse(BaseModel):
    access_token: str


class ErrorResponse(BaseModel):
    ok: bool = False
    message: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordResponse(BaseModel):
    ok: bool = True
    message: str = "Password changed successfully"


class UpdateEmailRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateEmailResponse(BaseModel):
    ok: bool = True
    message: str = "Email updated successfully"


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email_masked: str
    role: str
    status: str
    created_at: datetime


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: UserRole
    status: UserStatus
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    limit: int
