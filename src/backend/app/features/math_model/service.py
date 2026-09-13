import logging
from typing import List, Tuple

from packvium import pack_from_dict
from packvium.serialization import UnsupportedFeatureError

from app.core.exceptions import AppException
from app.features.math_model.schemas import (
    PackedBox,
    Placement,
    SolveRequest,
    SolveResponse,
)

logger = logging.getLogger(__name__)

# API rotations are degrees; packvium rotations are length/width/height axis
# permutations. 180 is indistinguishable from 0 for an axis-aligned box, and
# 270 matches 90, so both pairs share codes.
_DEGREE_TO_ROTATIONS: dict[str, tuple[str, ...]] = {
    "0": ("LWH", "LHW"),
    "90": ("WLH", "WHL"),
    "180": ("LWH", "LHW"),
    "270": ("WLH", "WHL"),
}
_ROTATION_CODES = {"LWH", "LHW", "WLH", "WHL", "HLW", "HWL"}


class UnsupportedRotationError(ValueError):
    pass


class PacketSolver:
    """Wraps the ``packvium`` packing engine for the HTTP API."""

    def solve(self, request: SolveRequest) -> Tuple[SolveResponse, int]:
        """Returns (response, http_status_code)."""
        if not request.items:
            raise AppException("No items provided", 400)
        if not request.boxes:
            raise AppException("No boxes provided", 400)

        try:
            packvium_items = [
                self._to_packvium_item(item) for item in request.items
            ]
        except UnsupportedRotationError:
            raise AppException("Invalid rotation value", 400)

        packvium_containers = []
        for box_type, box in request.boxes.items():
            packvium_containers.append(self._to_packvium_container(box_type, box))

        try:
            result = pack_from_dict(
                {
                    "items": packvium_items,
                    "containers": packvium_containers,
                    "configuration": {
                        "solver_profile": request.solver_profile,
                        # Callers may cap solver time; without a cap a large
                        # order can spend minutes on the balanced profile.
                        "time_limit_ms": request.time_limit_ms or 20000,
                    },
                }
            )
        except UnsupportedFeatureError:
            raise AppException("Unsupported packing feature", 400)
        except Exception:
            logger.exception("Packing solver failed")
            raise AppException("Internal solver error", 500)

        return self._to_response(result)

    def _to_packvium_item(self, item) -> dict:
        # Product weights are stored in grams; packvium expects kilograms.
        pv_item = {
            "id": item.id,
            "quantity": item.quantity,
            "dimensions": {
                "length": f"{item.x:.3f}",
                "width": f"{item.y:.3f}",
                "height": f"{item.z:.3f}",
            },
            "keep_upright": item.must_stay_upright,
            "stackable": item.is_stackable,
        }
        if item.weight > 0:
            pv_item["weight"] = f"{item.weight / 1000:.3f} kg"
        if item.max_top_load > 0:
            pv_item["max_top_load"] = f"{item.max_top_load / 1000:.3f} kg"
        if item.is_floor_only:
            pv_item["must_be_on_floor"] = True
        if item.minimum_support_ratio > 0:
            pv_item["minimum_support_ratio"] = item.minimum_support_ratio
        if item.allowed_rotations is not None:
            codes: list[str] = []
            for rotation in item.allowed_rotations:
                value = str(rotation).strip().upper()
                if value in _DEGREE_TO_ROTATIONS:
                    codes.extend(_DEGREE_TO_ROTATIONS[value])
                elif value in _ROTATION_CODES:
                    codes.append(value)
                else:
                    raise UnsupportedRotationError(rotation)
            pv_item["allowed_rotations"] = sorted(set(codes))
        if item.tags:
            pv_item["tags"] = list(item.tags)
        if item.incompatible_tags:
            pv_item["incompatible_tags"] = list(item.incompatible_tags)
        return pv_item

    def _to_packvium_container(self, box_type, box) -> dict:
        # Products use (length=x, width=y, height=z). The box must use the
        # same axis mapping, otherwise the solver packs into a rotated box
        # and items visually overflow the rendered container.
        pv_container = {
            "id": box_type,
            "quantity": box.count,
            "inner_dimensions": {
                "length": f"{box.width:.3f}",
                "width": f"{box.height:.3f}",
                "height": f"{box.depth:.3f}",
            },
        }
        if box.max_weight > 0:
            pv_container["max_payload"] = f"{box.max_weight:.3f} kg"
        return pv_container

    def _to_response(self, result: dict) -> Tuple[SolveResponse, int]:
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
            raw_type = container.get("container_type", container.get("id", ""))
            packed_boxes.append(
                PackedBox(
                    box_type=raw_type,
                    placements=placements,
                )
            )

        unpacked_ids = [u.get("item_id", "") for u in result.get("unpacked_items", [])]

        if unpacked_ids:
            return SolveResponse(containers=packed_boxes, unpacked=unpacked_ids), 409

        return SolveResponse(containers=packed_boxes, unpacked=[]), 200


solver = PacketSolver()
