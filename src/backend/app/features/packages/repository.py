from typing import Optional

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.packages.entities import Package, PaginatedPackages
from app.features.packages.interfaces import IPackageRepository
from app.features.packages.models import PackageModel


class PackageRepository(IPackageRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_entity(self, model: PackageModel) -> Package:
        return Package(
            id=model.id,
            width=model.width,
            height=model.height,
            depth=model.depth,
            max_weight=model.max_weight,
            available_count=model.available_count,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def create(self, package: Package) -> Package:
        model = PackageModel(
            id=package.id,
            width=package.width,
            height=package.height,
            depth=package.depth,
            max_weight=package.max_weight,
            available_count=package.available_count,
        )
        self._session.add(model)
        await self._session.commit()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, package_id: str) -> Optional[Package]:
        result = await self._session.execute(
            select(PackageModel).where(PackageModel.id == package_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_all(self, page: int, limit: int) -> PaginatedPackages:
        count_result = await self._session.execute(
            select(func.count()).select_from(PackageModel)
        )
        total = count_result.scalar() or 0

        offset = (page - 1) * limit
        result = await self._session.execute(
            select(PackageModel)
            .order_by(PackageModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        models = result.scalars().all()

        return PaginatedPackages(
            items=[self._to_entity(m) for m in models],
            total=total,
            page=page,
            limit=limit,
        )

    async def update(
        self,
        package_id: str,
        fields: dict,
    ) -> Optional[Package]:
        payload = {**fields, "updated_at": func.now()}
        await self._session.execute(
            update(PackageModel)
            .where(PackageModel.id == package_id)
            .values(**payload)
        )
        await self._session.commit()
        return await self.get_by_id(package_id)

    async def delete(self, package_id: str) -> None:
        await self._session.execute(
            delete(PackageModel).where(PackageModel.id == package_id)
        )
        await self._session.commit()

    async def adjust_stock(self, package_id: str, delta: int) -> Optional[Package]:
        result = await self._session.execute(
            update(PackageModel)
            .where(
                PackageModel.id == package_id,
                PackageModel.available_count + delta >= 0,
            )
            .values(
                available_count=PackageModel.available_count + delta,
                updated_at=func.now(),
            )
        )
        await self._session.commit()
        if result.rowcount == 0:
            return None
        return await self.get_by_id(package_id)
