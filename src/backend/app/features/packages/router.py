from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.exceptions import AppException
from app.features.auth.deps import CurrentUser, get_current_user_id
from app.features.packages.deps import get_package_service
from app.features.packages.schemas import (
    PackageCreateRequest,
    PackageListResponse,
    PackageResponse,
    PackageUpdateRequest,
    StockAdjustRequest,
    StockAdjustResponse,
)
from app.features.packages.service import PackageService


router = APIRouter(prefix="/packages", tags=["packages"])

require_authenticated = get_current_user_id


@router.post("", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package(
    body: PackageCreateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    package_service: PackageService = Depends(get_package_service),
):
    return await package_service.create_package(
        width=body.width,
        height=body.height,
        depth=body.depth,
        max_weight=body.max_weight,
        available_count=body.available_count,
        wear_rate=body.wear_rate,
    )


@router.get("", response_model=PackageListResponse)
async def list_packages(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_authenticated),
    package_service: PackageService = Depends(get_package_service),
):
    result = await package_service.list_packages(page, limit)
    return PackageListResponse(
        items=[PackageResponse.model_validate(p) for p in result.items],
        total=result.total,
        page=result.page,
        limit=result.limit,
    )


@router.post("/stock-adjust", response_model=StockAdjustResponse)
async def adjust_stock(
    body: StockAdjustRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    package_service: PackageService = Depends(get_package_service),
):
    try:
        items = await package_service.adjust_stock(
            [(str(i.package_id), i.delta) for i in body.items]
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    return StockAdjustResponse(
        items=[PackageResponse.model_validate(p) for p in items]
    )


@router.get("/{package_id}", response_model=PackageResponse)
async def get_package(
    package_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    package_service: PackageService = Depends(get_package_service),
):
    try:
        return await package_service.get_package(package_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.patch("/{package_id}", response_model=PackageResponse)
async def update_package(
    package_id: str,
    body: PackageUpdateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    package_service: PackageService = Depends(get_package_service),
):
    fields = body.model_dump(exclude_unset=True, exclude_none=True)
    try:
        return await package_service.update_package(package_id, fields)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{package_id}")
async def delete_package(
    package_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    package_service: PackageService = Depends(get_package_service),
):
    try:
        await package_service.delete_package(package_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    return {"ok": True, "message": "Package deleted"}
