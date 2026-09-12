from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProductCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    destination: str = Field(..., min_length=1, max_length=64)
    x: float = Field(..., gt=0)
    y: float = Field(..., gt=0)
    z: float = Field(..., gt=0)
    weight: float = Field(0, ge=0)
    quantity: int = Field(1, ge=1)
    must_stay_upright: bool = False
    is_stackable: bool = True
    max_top_load: float = Field(0, ge=0)
    minimum_support_ratio: float = Field(0, ge=0, le=1)
    incompatible_tags: list[str] = []
    allowed_rotations: Optional[list[str]] = None
    is_floor_only: bool = False
    tags: list[str] = []


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=64)
    destination: Optional[str] = Field(None, min_length=1, max_length=64)
    x: Optional[float] = Field(None, gt=0)
    y: Optional[float] = Field(None, gt=0)
    z: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=1)
    must_stay_upright: Optional[bool] = None
    is_stackable: Optional[bool] = None
    max_top_load: Optional[float] = Field(None, ge=0)
    minimum_support_ratio: Optional[float] = Field(None, ge=0, le=1)
    incompatible_tags: Optional[list[str]] = None
    allowed_rotations: Optional[list[str]] = None
    is_floor_only: Optional[bool] = None
    tags: Optional[list[str]] = None


class ProductResponse(BaseModel):
    id: UUID
    name: str
    destination: str
    x: float
    y: float
    z: float
    weight: float
    quantity: int
    must_stay_upright: bool
    is_stackable: bool
    max_top_load: float
    minimum_support_ratio: float
    incompatible_tags: list[str]
    allowed_rotations: Optional[list[str]]
    is_floor_only: bool
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    limit: int
