from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PackageCreateRequest(BaseModel):
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    depth: float = Field(..., gt=0)
    max_weight: float = Field(..., gt=0)
    available_count: int = Field(0, ge=0)
    wear_rate: float = Field(1.0, ge=0, le=1)


class PackageUpdateRequest(BaseModel):
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    depth: Optional[float] = Field(None, gt=0)
    max_weight: Optional[float] = Field(None, gt=0)
    available_count: Optional[int] = Field(None, ge=0)
    wear_rate: Optional[float] = Field(None, ge=0, le=1)


class PackageResponse(BaseModel):
    id: UUID
    width: float
    height: float
    depth: float
    max_weight: float
    available_count: int
    wear_rate: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PackageListResponse(BaseModel):
    items: list[PackageResponse]
    total: int
    page: int
    limit: int


class StockAdjustItem(BaseModel):
    package_id: UUID
    delta: int = Field(..., description="Positive adds stock, negative removes it")


class StockAdjustRequest(BaseModel):
    items: list[StockAdjustItem] = Field(..., min_length=1)


class StockAdjustResponse(BaseModel):
    items: list[PackageResponse]
