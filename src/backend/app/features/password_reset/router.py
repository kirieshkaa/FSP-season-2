import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.features.password_reset.deps import get_password_reset_service
from app.features.password_reset.schemas import (
    PasswordResetRequest,
    PasswordResetResponse,
    PasswordResetUpdateRequest,
)
from app.features.password_reset.service import PasswordResetService


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reset-password", tags=["password-reset"])


@router.post("", response_model=PasswordResetResponse)
async def request_password_reset(
    body: PasswordResetRequest,
    password_reset_service: PasswordResetService = Depends(get_password_reset_service),
):
    try:
        await password_reset_service.request_reset(body.email)
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PasswordResetResponse(ok=True)


@router.post("/{token}", response_model=PasswordResetResponse)
async def update_password(
    token: str,
    request: PasswordResetUpdateRequest,
    password_reset_service: PasswordResetService = Depends(get_password_reset_service),
):
    try:
        await password_reset_service.update_password(token, request.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PasswordResetResponse(ok=True)
