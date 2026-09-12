from datetime import datetime, timezone
from uuid import uuid4

from app.core.exceptions import AppException
from app.features.packages.entities import Package, PaginatedPackages
from app.features.packages.interfaces import IPackageRepository


class PackageNotFoundError(AppException):
    def __init__(self):
        super().__init__("Package not found", 404)


class InvalidCountError(AppException):
    def __init__(self, message: str = "Count must be a positive integer"):
        super().__init__(message, 400)


class InsufficientStockError(AppException):
    def __init__(self, message: str = "Not enough stock to remove"):
        super().__init__(message, 400)


class PackageService:
    def __init__(self, package_repo: IPackageRepository):
        self._package_repo = package_repo

    async def create_package(
        self,
        width: float,
        height: float,
        depth: float,
        max_weight: float,
        available_count: int = 0,
    ) -> Package:
        now = datetime.now(timezone.utc)
        package = Package(
            id=uuid4(),
            width=width,
            height=height,
            depth=depth,
            max_weight=max_weight,
            available_count=available_count,
            created_at=now,
            updated_at=now,
        )
        return await self._package_repo.create(package)

    async def get_package(self, package_id: str) -> Package:
        package = await self._package_repo.get_by_id(package_id)
        if not package:
            raise PackageNotFoundError()
        return package

    async def list_packages(self, page: int, limit: int) -> PaginatedPackages:
        return await self._package_repo.get_all(page, limit)

    async def update_package(
        self,
        package_id: str,
        fields: dict,
    ) -> Package:
        package = await self._package_repo.update(package_id, fields)
        if not package:
            raise PackageNotFoundError()
        return package

    async def delete_package(self, package_id: str) -> None:
        package = await self._package_repo.get_by_id(package_id)
        if not package:
            raise PackageNotFoundError()
        await self._package_repo.delete(package_id)

    async def adjust_stock(
        self, items: list[tuple[str, int]]
    ) -> list[Package]:
        if not items:
            raise InvalidCountError("At least one package must be provided")

        for package_id, delta in items:
            if delta == 0:
                raise InvalidCountError(
                    f"Delta for package {package_id} must be non-zero"
                )

        await self._assert_all_exist(items)

        updated = []
        for package_id, delta in items:
            package = await self._package_repo.adjust_stock(package_id, delta)
            if not package:
                raise InsufficientStockError(
                    f"Package {package_id} does not have enough stock"
                )
            updated.append(package)
        return updated

    async def _assert_all_exist(self, items: list[tuple[str, int]]) -> None:
        for package_id, _ in items:
            if not await self._package_repo.get_by_id(package_id):
                raise PackageNotFoundError()
