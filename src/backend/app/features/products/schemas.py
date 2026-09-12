from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductCreateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    x: float = Field(..., gt=0)
    y: float = Field(..., gt=0)
    z: float = Field(..., gt=0)
    weight: float = Field(0, ge=0)
    quantity: int = Field(1, ge=1)
    keep_upright: bool = False
    stackable: bool = True
    max_top_load: float = Field(0, ge=0)
    minimum_support_ratio: float = Field(0, ge=0, le=1)
    incompatible_tags: list[str] = []
    allowed_rotations: Optional[list[str]] = None
    floor_only: bool = False
    tags: list[str] = []


class ProductUpdateRequest(BaseModel):
    x: Optional[float] = Field(None, gt=0)
    y: Optional[float] = Field(None, gt=0)
    z: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, ge=0)
    quantity: Optional[int] = Field(None, ge=1)
    keep_upright: Optional[bool] = None
    stackable: Optional[bool] = None
    max_top_load: Optional[float] = Field(None, ge=0)
    minimum_support_ratio: Optional[float] = Field(None, ge=0, le=1)
    incompatible_tags: Optional[list[str]] = None
    allowed_rotations: Optional[list[str]] = None
    floor_only: Optional[bool] = None
    tags: Optional[list[str]] = None


class ProductResponse(BaseModel):
    id: str
    x: float
    y: float
    z: float
    weight: float
    quantity: int
    keep_upright: bool
    stackable: bool
    max_top_load: float
    minimum_support_ratio: float
    incompatible_tags: list[str]
    allowed_rotations: Optional[list[str]]
    floor_only: bool
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
