from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class PasswordResetToken:
    user_id: UUID
    reset_token: str
    expires_at: datetime

    def is_expired(self) -> bool:
        return self.expires_at.replace(tzinfo=None) < datetime.utcnow()
