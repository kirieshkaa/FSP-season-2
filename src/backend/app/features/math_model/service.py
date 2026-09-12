from typing import List

from packvium import pack_from_dict
from packvium.serialization import UnsupportedFeatureError

from app.features.math_model.schemas import (
    PackedBox,
    Placement,
    ResultCode,
    SolveRequest,
    SolveResponse,
)


class PacketSolver:
    """Wraps the ``packvium`` packing engine for the HTTP API."""

    def solve(self, request: SolveRequest) -> SolveResponse:
        if not request.items:
            return SolveResponse(result_code=ResultCode.INVALID_INPUT)
        if not request.boxes:
            return SolveResponse(result_code=ResultCode.INVALID_INPUT)

        packvium_items = [self._to_packvium_item(item) for item in request.items]

        packvium_containers = []
        container_box_types = {}
        for box_type, box in request.boxes.items():
            for i in range(box.count):
                pv_container = self._to_packvium_container(box_type, box, i)
                container_box_types[pv_container["id"]] = box_type
                packvium_containers.append(pv_container)

        try:
            result = pack_from_dict(
                {
                    "items": packvium_items,
                    "containers": packvium_containers,
                }
            )
        except UnsupportedFeatureError:
            return SolveResponse(result_code=ResultCode.INVALID_INPUT)
        except Exception:
            return SolveResponse(result_code=ResultCode.UNKNOWN_ERROR)

        return self._to_response(result, container_box_types)

    def _to_packvium_item(self, item) -> dict:
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
            pv_item["weight"] = f"{item.weight:.3f} kg"
        if item.max_top_load > 0:
            pv_item["max_top_load"] = f"{item.max_top_load:.3f} kg"
        if item.is_floor_only:
            pv_item["must_be_on_floor"] = True
        if item.minimum_support_ratio > 0:
            pv_item["minimum_support_ratio"] = item.minimum_support_ratio
        if item.allowed_rotations is not None:
            pv_item["allowed_rotations"] = list(item.allowed_rotations)
        if item.tags:
            pv_item["tags"] = list(item.tags)
        if item.incompatible_tags:
            pv_item["incompatible_tags"] = list(item.incompatible_tags)
        return pv_item

    def _to_packvium_container(self, box_type, box, index: int) -> dict:
        pv_container = {
            "id": f"{box_type}_{index}",
            "inner_dimensions": {
                "length": f"{box.depth:.3f}",
                "width": f"{box.width:.3f}",
                "height": f"{box.height:.3f}",
            },
        }
        if box.max_weight > 0:
            pv_container["max_payload"] = f"{box.max_weight:.3f} kg"
        return pv_container

    def _to_response(self, result: dict, container_box_types: dict) -> SolveResponse:
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
                    box_type=container_box_types.get(raw_type, raw_type),
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
