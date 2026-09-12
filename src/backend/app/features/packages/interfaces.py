from abc import ABC, abstractmethod
from typing import Optional

from app.features.packages.entities import Package, PaginatedPackages


class IPackageRepository(ABC):
    @abstractmethod
    async def create(self, package: Package) -> Package:
        pass

    @abstractmethod
    async def get_by_id(self, package_id: str) -> Optional[Package]:
        pass

    @abstractmethod
    async def get_all(self, page: int, limit: int) -> PaginatedPackages:
        pass

    @abstractmethod
    async def update(
        self,
        package_id: str,
        fields: dict,
    ) -> Optional[Package]:
        pass

    @abstractmethod
    async def delete(self, package_id: str) -> None:
        pass

    @abstractmethod
    async def adjust_stock(self, package_id: str, delta: int) -> Optional[Package]:
        """Atomically apply delta to available_count.

        Returns the updated package, or None if the package does not exist
        or the result would push available_count below zero.
        """
        pass
