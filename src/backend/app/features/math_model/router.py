from fastapi import APIRouter, Depends

from app.features.auth.deps import CurrentUser, get_current_user_id
from app.features.math_model.schemas import SolveRequest, SolveResponse
from app.features.math_model.service import solver


router = APIRouter(prefix="/math-model", tags=["math-model"])


@router.post("/solve", response_model=SolveResponse)
async def solve(
    body: SolveRequest,
    current_user: CurrentUser = Depends(get_current_user_id),
) -> SolveResponse:
    return solver.solve(body)
