from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.exceptions import AppException
from app.features.auth.deps import CurrentUser, get_current_user_id
from app.features.products.deps import get_product_service
from app.features.products.schemas import (
    ProductCreateRequest,
    ProductListResponse,
    ProductResponse,
    ProductUpdateRequest,
)
from app.features.products.service import ProductService


router = APIRouter(prefix="/products", tags=["products"])

require_authenticated = get_current_user_id


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    product_service: ProductService = Depends(get_product_service),
):
    try:
        return await product_service.create_product(
            product_id=body.id,
            x=body.x,
            y=body.y,
            z=body.z,
            weight=body.weight,
            quantity=body.quantity,
            keep_upright=body.keep_upright,
            stackable=body.stackable,
            max_top_load=body.max_top_load,
            minimum_support_ratio=body.minimum_support_ratio,
            incompatible_tags=body.incompatible_tags,
            allowed_rotations=body.allowed_rotations,
            floor_only=body.floor_only,
            tags=body.tags,
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: CurrentUser = Depends(require_authenticated),
    product_service: ProductService = Depends(get_product_service),
):
    result = await product_service.list_products(page, limit)
    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in result.items],
        total=result.total,
        page=result.page,
        limit=result.limit,
    )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    product_service: ProductService = Depends(get_product_service),
):
    try:
        return await product_service.get_product(product_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    body: ProductUpdateRequest,
    current_user: CurrentUser = Depends(require_authenticated),
    product_service: ProductService = Depends(get_product_service),
):
    fields = body.model_dump(exclude_unset=True)
    try:
        return await product_service.update_product(product_id, fields)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: CurrentUser = Depends(require_authenticated),
    product_service: ProductService = Depends(get_product_service),
):
    try:
        await product_service.delete_product(product_id)
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    return {"ok": True, "message": "Product deleted"}
