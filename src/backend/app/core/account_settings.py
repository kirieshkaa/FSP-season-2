from app.config import get_config
from app.core.redis import get_redis

_REQUIRE_APPROVAL_KEY = "settings:require_approval"


class AccountSettingsService:
    async def is_approval_required(self) -> bool:
        redis = get_redis()
        override = await redis.get(_REQUIRE_APPROVAL_KEY)
        if override is None:
            return not get_config().account.auto_approve
        return override == "1"

    async def set_approval_required(self, required: bool) -> bool:
        redis = get_redis()
        await redis.set(_REQUIRE_APPROVAL_KEY, "1" if required else "0")
        return required


account_settings = AccountSettingsService()
