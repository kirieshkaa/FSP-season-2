import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml
from pydantic import BaseModel, field_validator


class ServerConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8080
    read_timeout_seconds: int = 30
    write_timeout_seconds: int = 30
    max_header_bytes: int = 4096


class DatabaseConfig(BaseModel):
    host: str = "localhost"
    port: int = 5432
    user: str = "postgres"
    password: str = "password"
    db: str = "auth_service"
    ssl_mode: str = "disable"
    max_overflow: int = 10
    pool_size: int = 5
    pool_recycle: int = 3600

    @property
    def url(self) -> str:
        ssl = "disable" if self.ssl_mode == "disable" else "require"
        return f"postgresql+asyncpg://{self.user}:{self.password}@{self.host}:{self.port}/{self.db}?ssl={ssl}"


class RedisConfig(BaseModel):
    host: str = "localhost"
    port: int = 6379
    password: str = ""
    db: int = 0


class TokenConfig(BaseModel):
    secret: str = ""
    expiry_minutes: Optional[int] = None
    expiry_days: Optional[int] = None

    @field_validator("secret")
    @classmethod
    def secret_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Token secret cannot be empty")
        return v


class TokensConfig(BaseModel):
    access_token: TokenConfig
    refresh_token: TokenConfig


class PasswordResetConfig(BaseModel):
    token_expiry_hours: int = 1


class EmailConfig(BaseModel):
    host: str = "smtp.example.com"
    port: int = 587
    username: str = "noreply@example.com"
    password: str = ""


class SecurityConfig(BaseModel):
    cookie_domain: Optional[str] = None
    cookie_secure: bool = False
    cookie_same_site: str = "lax"
    reset_link_base_url: str = "http://localhost:5173/reset-password"
    company_name: str = "AuthService"
    support_link: str = "http://localhost:5173/support"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]


class LoggingConfig(BaseModel):
    level: str = "INFO"
    format: str = "json"


class AdminConfig(BaseModel):
    username: str = "admin"
    email: str = "admin@example.com"
    password: str = "admin"


class AccountConfig(BaseModel):
    auto_approve: bool = False


class AppConfig(BaseModel):
    server: ServerConfig
    database: DatabaseConfig
    redis: RedisConfig
    tokens: TokensConfig
    password_reset: PasswordResetConfig
    email: EmailConfig
    security: SecurityConfig
    logging: LoggingConfig
    admin: AdminConfig
    account: AccountConfig


ENV_VAR_MAPPING = {
    "server": {
        "host": "BACKEND_HOST",
        "port": "BACKEND_PORT",
    },
    "database": {
        "host": "POSTGRES_HOST",
        "port": "POSTGRES_PORT",
        "user": "POSTGRES_USER",
        "password": "POSTGRES_PASSWORD",
        "db": "POSTGRES_DB",
        "ssl_mode": "POSTGRES_SSL_MODE",
    },
    "redis": {
        "host": "REDIS_HOST",
        "port": "REDIS_PORT",
        "password": "REDIS_PASSWORD",
        "db": "REDIS_DB",
    },
    "tokens": {
        "access_token_secret": "ACCESS_TOKEN_SECRET",
        "access_token_expiry_minutes": "ACCESS_TOKEN_EXPIRY_MINUTES",
        "refresh_token_secret": "REFRESH_TOKEN_SECRET",
        "refresh_token_expiry_days": "REFRESH_TOKEN_EXPIRY_DAYS",
    },
    "email": {
        "host": "EMAIL_HOST",
        "port": "EMAIL_PORT",
        "username": "EMAIL_USERNAME",
        "password": "EMAIL_PASSWORD",
    },
    "security": {
        "cookie_domain": "COOKIE_DOMAIN",
    },
    "admin": {
        "username": "ADMIN_USERNAME",
        "password": "ADMIN_PASSWORD",
    },
    "account": {
        "auto_approve": "AUTO_APPROVE_ACCOUNTS",
    },
}


def _merge_config(yaml_data: dict) -> dict:
    """Merge YAML config with environment variables, env vars take priority."""
    result = yaml_data.copy()

    # Handle flat mappings
    flat_mappings = {
        k: v for k, v in ENV_VAR_MAPPING.items() if not isinstance(v, dict)
    }

    for section, mappings in ENV_VAR_MAPPING.items():
        if section not in result:
            result[section] = {}

        if section == "tokens":
            # Handle tokens specially - flatten to access_token/refresh_token
            if "access_token" not in result[section]:
                result[section]["access_token"] = {}
            if "refresh_token" not in result[section]:
                result[section]["refresh_token"] = {}

            secret = os.environ.get("ACCESS_TOKEN_SECRET")
            if secret:
                result[section]["access_token"]["secret"] = secret
            expiry = os.environ.get("ACCESS_TOKEN_EXPIRY_MINUTES")
            if expiry:
                try:
                    result[section]["access_token"]["expiry_minutes"] = int(expiry)
                except ValueError:
                    pass

            secret = os.environ.get("REFRESH_TOKEN_SECRET")
            if secret:
                result[section]["refresh_token"]["secret"] = secret
            expiry = os.environ.get("REFRESH_TOKEN_EXPIRY_DAYS")
            if expiry:
                try:
                    result[section]["refresh_token"]["expiry_days"] = int(expiry)
                except ValueError:
                    pass
        elif section == "admin":
            username = os.environ.get("ADMIN_USERNAME")
            if username:
                result[section]["username"] = username
            email = os.environ.get("ADMIN_EMAIL")
            if email:
                result[section]["email"] = email
            password = os.environ.get("ADMIN_PASSWORD")
            if password:
                result[section]["password"] = password
        elif isinstance(mappings, dict):
            for key, env_var in mappings.items():
                if env_var in os.environ:
                    value = os.environ[env_var]
                    if key in ("port", "db", "expiry_minutes", "expiry_days"):
                        try:
                            value = int(value)
                        except ValueError:
                            pass
                    elif isinstance(value, str) and value.lower() in (
                        "true",
                        "false",
                    ):
                        value = value.lower() == "true"
                    result[section][key] = value

    return result


@lru_cache
def get_config() -> AppConfig:
    config_path = Path(__file__).parent.parent / "config.yaml"

    with open(config_path) as f:
        yaml_data = yaml.safe_load(f)

    merged_data = _merge_config(yaml_data)

    return AppConfig(
        server=ServerConfig(**merged_data.get("server", {})),
        database=DatabaseConfig(**merged_data.get("database", {})),
        redis=RedisConfig(**merged_data.get("redis", {})),
        tokens=TokensConfig(
            access_token=TokenConfig(
                **merged_data.get("tokens", {}).get("access_token", {})
            ),
            refresh_token=TokenConfig(
                **merged_data.get("tokens", {}).get("refresh_token", {})
            ),
        ),
        password_reset=PasswordResetConfig(**merged_data.get("password_reset", {})),
        email=EmailConfig(**merged_data.get("email", {})),
        security=SecurityConfig(**merged_data.get("security", {})),
        logging=LoggingConfig(**merged_data.get("logging", {})),
        admin=AdminConfig(**merged_data.get("admin", {})),
        account=AccountConfig(**merged_data.get("account", {})),
    )
