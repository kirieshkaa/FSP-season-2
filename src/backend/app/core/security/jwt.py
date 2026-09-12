import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.config import get_config


class JWTService:
    def create_access_token(
        self, user_id: str, name: str, role: str
    ) -> tuple[str, str]:
        config = get_config()
        token_id = secrets.token_urlsafe(16)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=config.tokens.access_token.expiry_minutes
        )

        payload = {
            "user_id": user_id,
            "name": name,
            "role": role,
            "jti": token_id,
            "exp": expires_at,
            "iat": datetime.now(timezone.utc),
        }

        token = jwt.encode(
            payload, config.tokens.access_token.secret, algorithm="HS256"
        )

        return token, token_id

    def create_refresh_token(
        self, user_id: str, name: str, role: str
    ) -> tuple[str, str]:
        config = get_config()
        token_id = secrets.token_urlsafe(16)
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=config.tokens.refresh_token.expiry_days
        )

        payload = {
            "user_id": user_id,
            "name": name,
            "role": role,
            "jti": token_id,
            "exp": expires_at,
            "iat": datetime.now(timezone.utc),
        }

        token = jwt.encode(
            payload, config.tokens.refresh_token.secret, algorithm="HS256"
        )

        return token, token_id

    def verify_access_token(self, token: str) -> Optional[dict]:
        try:
            config = get_config()
            payload = jwt.decode(
                token, config.tokens.access_token.secret, algorithms=["HS256"]
            )
            return payload
        except JWTError:
            return None

    def verify_refresh_token(self, token: str) -> Optional[dict]:
        try:
            config = get_config()
            payload = jwt.decode(
                token, config.tokens.refresh_token.secret, algorithms=["HS256"]
            )
            return payload
        except JWTError:
            return None


jwt_service = JWTService()
