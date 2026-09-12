from enum import IntEnum
from typing import Dict, List, Optional

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


class ResultCode(IntEnum):
    OK = 0
    INFEASIBLE = 1
    INVALID_INPUT = 100
    EMPTY = 101
    UNKNOWN_ERROR = 500


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
    result_code: ResultCode = ResultCode.UNKNOWN_ERROR
    containers: List[PackedBox] = []
    unpacked: List[str] = []
