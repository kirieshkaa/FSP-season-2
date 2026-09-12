from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.account_settings import account_settings
from app.features.auth.deps import CurrentUser, require_roles, get_user_repo
from app.features.auth.entities import UserStatus
from app.features.auth.schemas import UserListResponse, UserResponse
from app.features.admin.schemas import (
    RequireApprovalRequest,
    UserAction,
    UserActionRequest,
    UserActionResponse,
)


router = APIRouter(prefix="/admin", tags=["admin"])

get_current_admin = require_roles("admin")


async def _get_target_user(user_id: str, current_user: CurrentUser, user_repo):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status",
        )

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.get("/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_admin),
    user_repo=Depends(get_user_repo),
):
    status_enum = None
    if status_filter:
        try:
            status_enum = UserStatus(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in UserStatus]}",
            )

    users, total = await user_repo.get_all(page, limit, status_enum)

    return UserListResponse(
        items=[UserResponse.model_validate(user) for user in users],
        total=total,
        page=page,
        limit=limit,
    )


_ACTION_RESULTS: dict[UserAction, tuple[UserStatus, str]] = {
    UserAction.APPROVE: (UserStatus.APPROVED, "User approved"),
    UserAction.REJECT: (UserStatus.REJECTED, "User rejected"),
    UserAction.BLOCK: (UserStatus.BLOCKED, "User blocked"),
    UserAction.UNBLOCK: (UserStatus.APPROVED, "User unblocked"),
}


@router.post("/users/{user_id}/actions", response_model=UserActionResponse)
async def apply_user_action(
    user_id: str,
    body: UserActionRequest,
    current_user: CurrentUser = Depends(get_current_admin),
    user_repo=Depends(get_user_repo),
):
    await _get_target_user(user_id, current_user, user_repo)
    new_status, message = _ACTION_RESULTS[body.action]
    await user_repo.update_status(user_id, new_status)
    return UserActionResponse(message=message, status=new_status.value)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_admin),
    user_repo=Depends(get_user_repo),
):
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await user_repo.delete(user_id)
    return {"ok": True, "message": "User deleted"}


@router.get("/settings/require-approval")
async def get_require_approval(
    current_user: CurrentUser = Depends(get_current_admin),
):
    required = await account_settings.is_approval_required()
    return {"is_approval_required": required}


@router.put("/settings/require-approval")
async def set_require_approval(
    body: RequireApprovalRequest,
    current_user: CurrentUser = Depends(get_current_admin),
):
    required = await account_settings.set_approval_required(body.is_approval_required)
    return {"is_approval_required": required}
