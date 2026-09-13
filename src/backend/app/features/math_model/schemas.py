from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class Box(BaseModel):
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    depth: float = Field(..., gt=0)
    max_weight: float = Field(default=0, ge=0)
    wear_rate: float = Field(default=1.0, ge=0, le=1)
    count: int = Field(default=1, ge=1)


class Item(BaseModel):
    id: str
    x: float = Field(..., gt=0)
    y: float = Field(..., gt=0)
    z: float = Field(..., gt=0)
    weight: float = Field(default=0, ge=0)
    quantity: int = Field(default=1, ge=1)
    must_stay_upright: bool = False
    is_stackable: bool = True
    max_top_load: float = Field(default=0, ge=0)
    minimum_support_ratio: float = Field(default=0, ge=0, le=1)
    incompatible_tags: List[str] = []
    allowed_rotations: Optional[List[str]] = None
    is_floor_only: bool = False
    tags: List[str] = []


class SolveRequest(BaseModel):
    items: List[Item]
    boxes: Dict[str, Box]
    time_limit_ms: Optional[int] = Field(default=None, ge=100, le=600000)
    solver_profile: Literal["fast", "balanced", "quality", "exact_small"] = "balanced"


class Placement(BaseModel):
    item_id: str
    x: float
    y: float
    z: float
    orientation: str


class PackedBox(BaseModel):
    box_type: str
    placements: List[Placement]


class SolveResponse(BaseModel):
    containers: List[PackedBox] = []
    unpacked: List[str] = []
