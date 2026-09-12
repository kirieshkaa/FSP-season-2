from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Product:
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


@dataclass
class PaginatedProducts:
    items: list[Product]
    total: int
    page: int
    limit: int
