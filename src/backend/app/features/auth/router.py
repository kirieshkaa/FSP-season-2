from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status

from app.config import get_config
from app.features.auth.deps import CurrentUser, get_auth_service, get_current_user_id
from app.features.auth.schemas import (
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    UpdateEmailRequest,
    UpdateEmailResponse,
    UserProfileResponse,
)
from app.features.auth.service import AuthService


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        await auth_service.register(
            name=body.name,
            email=body.email,
            password=body.password,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return RegisterResponse()


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    if not body.has_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name or email is required",
        )

    try:
        tokens = await auth_service.login(
            name=body.name,
            email=body.email,
            password=body.password,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    _set_refresh_token_cookie(response, tokens.refresh_token)

    return LoginResponse(
        access_token=tokens.access_token, role=tokens.role, user_id=tokens.user_id
    )


@router.get("/refresh", response_model=RefreshResponse)
async def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service),
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    try:
        tokens = await auth_service.refresh(refresh_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    _set_refresh_token_cookie(response, tokens.refresh_token)

    return RefreshResponse(access_token=tokens.access_token)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service),
):
    if refresh_token:
        try:
            await auth_service.logout(refresh_token)
        except Exception:
            pass

    _clear_refresh_token_cookie(response)

    return LogoutResponse(ok=True)


@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user_id),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        await auth_service.change_password(
            user_id=current_user.user_id,
            old_password=body.old_password,
            new_password=body.new_password,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return ChangePasswordResponse()


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user(
    current_user: CurrentUser = Depends(get_current_user_id),
    auth_service: AuthService = Depends(get_auth_service),
):
    profile = await auth_service.get_user_profile(current_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserProfileResponse(
        id=str(profile["id"]),
        name=profile["name"],
        email_masked=profile["email_masked"],
        role=profile["role"],
        status=profile["status"],
        created_at=profile["created_at"],
    )


@router.patch("/email", response_model=UpdateEmailResponse)
async def update_email(
    body: UpdateEmailRequest,
    current_user: CurrentUser = Depends(get_current_user_id),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        await auth_service.update_email(current_user.user_id, body.email, body.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return UpdateEmailResponse()


def _set_refresh_token_cookie(response: Response, refresh_token: str):
    config = get_config()
    max_age = config.tokens.refresh_token.expiry_days * 24 * 60 * 60

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=max_age,
        path="/api/v1/auth",
        domain=config.security.cookie_domain,
        secure=config.security.cookie_secure,
        httponly=True,
        samesite=config.security.cookie_same_site,
    )


def _clear_refresh_token_cookie(response: Response):
    config = get_config()

    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        path="/api/v1/auth",
        domain=config.security.cookie_domain,
        secure=config.security.cookie_secure,
        httponly=True,
        samesite=config.security.cookie_same_site,
    )
