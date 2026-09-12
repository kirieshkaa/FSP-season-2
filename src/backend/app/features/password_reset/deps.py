from fastapi import Depends

from app.core.database import get_db
from app.core.email import SMTPSender
from app.features.auth.deps import get_user_repo
from app.features.password_reset.repository import PasswordResetRepository
from app.features.password_reset.service import PasswordResetService


async def get_password_reset_repo(session=Depends(get_db)):
    return PasswordResetRepository(session)


async def get_email_sender():
    return SMTPSender()


async def get_password_reset_service(
    password_reset_repo=Depends(get_password_reset_repo),
    user_repo=Depends(get_user_repo),
    email_sender=Depends(get_email_sender),
):
    return PasswordResetService(password_reset_repo, user_repo, email_sender)
