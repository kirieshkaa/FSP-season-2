from datetime import datetime, timezone
from uuid import uuid4

from app.core.exceptions import AppException
from app.features.boxes.entities import Box, PaginatedBoxes
from app.features.boxes.interfaces import IBoxRepository


class BoxNotFoundError(AppException):
    def __init__(self):
        super().__init__("Box not found", 404)


class InvalidCountError(AppException):
    def __init__(self, message: str = "Count must be a positive integer"):
        super().__init__(message, 400)


class InsufficientStockError(AppException):
    def __init__(self, message: str = "Not enough stock to remove"):
        super().__init__(message, 400)


class BoxService:
    def __init__(self, box_repo: IBoxRepository):
        self._box_repo = box_repo

    async def create_box(
        self,
        name: str,
        type: str,
        width: float,
        height: float,
        depth: float,
        max_weight: float,
        available_count: int = 0,
        wear_rate: float = 1.0,
    ) -> Box:
        now = datetime.now(timezone.utc)
        box = Box(
            id=uuid4(),
            name=name,
            type=type,
            width=width,
            height=height,
            depth=depth,
            max_weight=max_weight,
            available_count=available_count,
            wear_rate=wear_rate,
            created_at=now,
            updated_at=now,
        )
        return await self._box_repo.create(box)

    async def get_box(self, box_id: str) -> Box:
        box = await self._box_repo.get_by_id(box_id)
        if not box:
            raise BoxNotFoundError()
        return box

    async def list_boxes(self, page: int, limit: int) -> PaginatedBoxes:
        return await self._box_repo.get_all(page, limit)

    async def update_box(
        self,
        box_id: str,
        fields: dict,
    ) -> Box:
        box = await self._box_repo.update(box_id, fields)
        if not box:
            raise BoxNotFoundError()
        return box

    async def delete_box(self, box_id: str) -> None:
        box = await self._box_repo.get_by_id(box_id)
        if not box:
            raise BoxNotFoundError()
        await self._box_repo.delete(box_id)

    async def adjust_stock(
        self, items: list[tuple[str, int]]
    ) -> list[Box]:
        if not items:
            raise InvalidCountError("At least one box must be provided")

        for box_id, delta in items:
            if delta == 0:
                raise InvalidCountError(
                    f"Delta for box {box_id} must be non-zero"
                )

        await self._assert_all_exist(items)

        updated = []
        for box_id, delta in items:
            box = await self._box_repo.adjust_stock(box_id, delta)
            if not box:
                raise InsufficientStockError(
                    f"Box {box_id} does not have enough stock"
                )
            updated.append(box)
        return updated

    async def _assert_all_exist(self, items: list[tuple[str, int]]) -> None:
        for box_id, _ in items:
            if not await self._box_repo.get_by_id(box_id):
                raise BoxNotFoundError()
