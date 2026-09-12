from pydantic import BaseModel, EmailStr


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetUpdateRequest(BaseModel):
    password: str


class PasswordResetResponse(BaseModel):
    ok: bool = True
    message: str = (
        "If an account with this email exists, a reset code will be sent to it."
    )
