from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.features.auth.entities import UserRole, UserStatus


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth_service"}

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, name="user_id"
    )
    username: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, name="user_name"
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, name="user_email"
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False, name="user_password"
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole, native_enum=False, values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False,
        default=UserRole.USER,
        name="role",
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(
            UserStatus,
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=UserStatus.PENDING,
        name="status",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class RefreshTokenModel(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "auth_service"}

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        name="refresh_token_id",
    )
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    refresh_token: Mapped[str] = mapped_column(String(512), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
