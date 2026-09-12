from contextlib import asynccontextmanager
from enum import IntEnum
from typing import Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from packvium import pack_from_dict
from packvium.serialization import UnsupportedFeatureError


class Box(BaseModel):
    x: float = Field(..., gt=0)
    y: float = Field(..., gt=0)
    z: float = Field(..., gt=0)
    cargo: float = Field(default=0, ge=0)
    condition: int = Field(default=100, ge=0, le=100)


class Item(BaseModel):
    id: str
    x: float = Field(..., gt=0)
    y: float = Field(..., gt=0)
    z: float = Field(..., gt=0)
    weight: float = Field(default=0, ge=0)
    quantity: int = Field(default=1, ge=1)
    keep_upright: bool = False
    stackable: bool = True
    max_top_load: float = Field(default=0, ge=0)
    minimum_support_ratio: float = Field(default=0, ge=0, le=1)
    incompatible_tags: List[str] = []
    floor_only: bool = False
    tags: List[str] = []


class SolveRequest(BaseModel):
    items: List[Item]
    boxes: Dict[str, Box]
    counts: Dict[str, int] = {}


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


class PacketSolver:
    def solve(self, request: SolveRequest) -> SolveResponse:
        if not request.items:
            return SolveResponse(result_code=ResultCode.INVALID_INPUT)
        if not request.boxes:
            return SolveResponse(result_code=ResultCode.INVALID_INPUT)

        packvium_items = []
        for item in request.items:
            pv_item = {
                "id": item.id,
                "quantity": item.quantity,
                "dimensions": {
                    "length": f"{item.x:.3f}",
                    "width": f"{item.y:.3f}",
                    "height": f"{item.z:.3f}",
                },
                "keep_upright": item.keep_upright,
                "stackable": item.stackable,
            }
            if item.weight > 0:
                pv_item["weight"] = f"{item.weight:.3f} kg"
            if item.max_top_load > 0:
                pv_item["max_top_load"] = f"{item.max_top_load:.3f} kg"
            if item.floor_only:
                pv_item["must_be_on_floor"] = True
            if item.minimum_support_ratio > 0:
                pv_item["minimum_support_ratio"] = item.minimum_support_ratio
            if item.tags:
                pv_item["tags"] = list(item.tags)
            if item.incompatible_tags:
                pv_item["incompatible_tags"] = list(item.incompatible_tags)
            packvium_items.append(pv_item)

        packvium_containers = []
        for box_type, box in request.boxes.items():
            count = request.counts.get(box_type, 1)
            for i in range(count):
                pv_container = {
                    "id": f"{box_type}_{i}",
                    "inner_dimensions": {
                        "length": f"{box.x:.3f}",
                        "width": f"{box.y:.3f}",
                        "height": f"{box.z:.3f}",
                    },
                }
                if box.cargo > 0:
                    pv_container["max_payload"] = f"{box.cargo:.3f} kg"
                packvium_containers.append(pv_container)

        try:
            result = pack_from_dict({
                "items": packvium_items,
                "containers": packvium_containers,
            })
        except UnsupportedFeatureError:
            return SolveResponse(result_code=ResultCode.INVALID_INPUT)
        except Exception:
            return SolveResponse(result_code=ResultCode.UNKNOWN_ERROR)

        packed_boxes: List[PackedBox] = []
        for container in result.get("containers", []):
            placements: List[Placement] = []
            for placement in container.get("placements", []):
                pos = placement.get("position", {})
                placements.append(
                    Placement(
                        item_id=placement.get("item_id", ""),
                        x=float(pos.get("x", {}).get("value", 0)),
                        y=float(pos.get("y", {}).get("value", 0)),
                        z=float(pos.get("z", {}).get("value", 0)),
                        orientation=placement.get("orientation", ""),
                    )
                )
            packed_boxes.append(
                PackedBox(
                    box_type=container.get("id", ""),
                    placements=placements,
                )
            )
        
        unpacked_ids = [u.get("item_id", "") for u in result.get("unpacked_items", [])]

        if unpacked_ids:
            return SolveResponse(
                result_code=ResultCode.INFEASIBLE,
                containers=packed_boxes,
                unpacked=unpacked_ids,
            )

        return SolveResponse(
            result_code=ResultCode.OK,
            containers=packed_boxes,
            unpacked=[],
        )


solver = PacketSolver()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Packistan BOOMbox Solver API",
    version="1.0.0",
    lifespan=lifespan,
    root_path="/packs/api",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lmpoffcial.ru",
        "https://www.lmpoffcial.ru",
    ],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/solve", response_model=SolveResponse)
async def solve(request: SolveRequest) -> SolveResponse:
    return solver.solve(request)