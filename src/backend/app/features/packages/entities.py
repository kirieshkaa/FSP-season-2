from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass
class Package:
    id: UUID
    width: float
    height: float
    depth: float
    max_weight: float
    available_count: int
    wear_rate: float
    created_at: datetime
    updated_at: datetime


@dataclass
class PaginatedPackages:
    items: list[Package]
    total: int
    page: int
    limit: int
