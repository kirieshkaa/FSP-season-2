from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class Product:
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


@dataclass
class PaginatedProducts:
    items: list[Product]
    total: int
    page: int
    limit: int
