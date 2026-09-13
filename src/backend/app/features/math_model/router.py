from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.features.auth.deps import CurrentUser, get_current_user_id
from app.features.math_model.schemas import ResultCode, SolveRequest, SolveResponse
from app.features.math_model.service import solver


router = APIRouter(prefix="/math-model", tags=["math-model"])

_RESULT_STATUS: dict[ResultCode, int] = {
    ResultCode.OK: 200,
    ResultCode.INFEASIBLE: 409,
    ResultCode.INVALID_INPUT: 400,
    ResultCode.EMPTY: 400,
    ResultCode.UNKNOWN_ERROR: 500,
}


@router.post("/solve", response_model=SolveResponse)
async def solve(
    body: SolveRequest,
    current_user: CurrentUser = Depends(get_current_user_id),
) -> JSONResponse:
    response = solver.solve(body)
    return JSONResponse(
        status_code=_RESULT_STATUS[response.result_code],
        content=response.model_dump(mode="json"),
    )