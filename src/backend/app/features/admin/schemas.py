from enum import Enum

from pydantic import BaseModel


class UserAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    BLOCK = "block"
    UNBLOCK = "unblock"


class UserActionRequest(BaseModel):
    action: UserAction


class UserActionResponse(BaseModel):
    ok: bool = True
    message: str
    status: str


class RequireApprovalRequest(BaseModel):
    require_approval: bool


class RequireApprovalResponse(BaseModel):
    require_approval: bool
