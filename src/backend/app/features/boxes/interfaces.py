from abc import ABC, abstractmethod
from typing import Optional

from app.features.boxes.entities import Box, PaginatedBoxes


class IBoxRepository(ABC):
    @abstractmethod
    async def create(self, box: Box) -> Box:
        pass

    @abstractmethod
    async def get_by_id(self, box_id: str) -> Optional[Box]:
        pass

    @abstractmethod
    async def get_all(self, page: int, limit: int) -> PaginatedBoxes:
        pass

    @abstractmethod
    async def update(
        self,
        box_id: str,
        fields: dict,
    ) -> Optional[Box]:
        pass

    @abstractmethod
    async def delete(self, box_id: str) -> None:
        pass

    @abstractmethod
    async def adjust_stock(self, box_id: str, delta: int) -> Optional[Box]:
        """Atomically apply delta to available_count.

        Returns the updated box, or None if the box does not exist
        or the result would push available_count below zero.
        """
        pass
