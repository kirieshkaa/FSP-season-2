from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.exceptions import AppException
from app.features.auth.deps import CurrentUser, get_current_user_id
from app.features.boxes.deps import get_box_service
from app.features.boxes.schemas import (
    BoxCreateRequest,
    BoxListResponse,
    BoxResponse,
    BoxUpdateRequest,
    StockAdjustRequest,
    StockAdjustResponse,
)
from app.features.boxes.service import BoxService


router = APIRouter(prefix="/boxes", tags=["boxes"])

require_authenticated = get_current_user_id


@router.post("", response_model=BoxResponse, status_code=status.HTTP_201_CREATED)
async def create_box(
    body: BoxCreateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    box_service: BoxService = Depends(get_box_service),
):
    return await box_service.create_box(
        name=body.name,
        type=body.type,
        width=body.width,
        height=body.height,
        depth=body.depth,
        max_weight=body.max_weight,
        available_count=body.available_count,
        wear_rate=body.wear_rate,
    )


@router.get("", response_model=BoxListResponse)
async def list_boxes(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_authenticated),
    box_service: BoxService = Depends(get_box_service),
):
    result = await box_service.list_boxes(page, limit)
    return BoxListResponse(
        items=[BoxResponse.model_validate(p) for p in result.items],
        total=result.total,
        page=result.page,
        limit=result.limit,
    )


@router.post("/stock-adjust", response_model=StockAdjustResponse)
async def adjust_stock(
    body: StockAdjustRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    box_service: BoxService = Depends(get_box_service),
):
    try:
        items = await box_service.adjust_stock(
            [(str(i.id), i.delta) for i in body.items]
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    return StockAdjustResponse(
        items=[BoxResponse.model_validate(p) for p in items]
    )


@router.get("/{box_id}", response_model=BoxResponse)
async def get_box(
    box_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    box_service: BoxService = Depends(get_box_service),
):
    try:
        return await box_service.get_box(box_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.patch("/{box_id}", response_model=BoxResponse)
async def update_box(
    box_id: str,
    body: BoxUpdateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    box_service: BoxService = Depends(get_box_service),
):
    fields = body.model_dump(exclude_unset=True, exclude_none=True)
    try:
        return await box_service.update_box(box_id, fields)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{box_id}")
async def delete_box(
    box_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    box_service: BoxService = Depends(get_box_service),
):
    try:
        await box_service.delete_box(box_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    return {"ok": True, "message": "Box deleted"}
