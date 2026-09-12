from typing import Optional

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.boxes.entities import Box, PaginatedBoxes
from app.features.boxes.interfaces import IBoxRepository
from app.features.boxes.models import BoxModel


class BoxRepository(IBoxRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_entity(self, model: BoxModel) -> Box:
        return Box(
            id=model.id,
            name=model.name,
            type=model.type,
            width=model.width,
            height=model.height,
            depth=model.depth,
            max_weight=model.max_weight,
            available_count=model.available_count,
            wear_rate=model.wear_rate,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def create(self, box: Box) -> Box:
        model = BoxModel(
            id=box.id,
            name=box.name,
            type=box.type,
            width=box.width,
            height=box.height,
            depth=box.depth,
            max_weight=box.max_weight,
            available_count=box.available_count,
            wear_rate=box.wear_rate,
        )
        self._session.add(model)
        await self._session.commit()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, box_id: str) -> Optional[Box]:
        result = await self._session.execute(
            select(BoxModel).where(BoxModel.id == box_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_all(self, page: int, limit: int) -> PaginatedBoxes:
        count_result = await self._session.execute(
            select(func.count()).select_from(BoxModel)
        )
        total = count_result.scalar() or 0

        offset = (page - 1) * limit
        result = await self._session.execute(
            select(BoxModel)
            .order_by(BoxModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        models = result.scalars().all()

        return PaginatedBoxes(
            items=[self._to_entity(m) for m in models],
            total=total,
            page=page,
            limit=limit,
        )

    async def update(
        self,
        box_id: str,
        fields: dict,
    ) -> Optional[Box]:
        payload = {**fields, "updated_at": func.now()}
        await self._session.execute(
            update(BoxModel)
            .where(BoxModel.id == box_id)
            .values(**payload)
        )
        await self._session.commit()
        return await self.get_by_id(box_id)

    async def delete(self, box_id: str) -> None:
        await self._session.execute(
            delete(BoxModel).where(BoxModel.id == box_id)
        )
        await self._session.commit()

    async def adjust_stock(self, box_id: str, delta: int) -> Optional[Box]:
        result = await self._session.execute(
            update(BoxModel)
            .where(
                BoxModel.id == box_id,
                BoxModel.available_count + delta >= 0,
            )
            .values(
                available_count=BoxModel.available_count + delta,
                updated_at=func.now(),
            )
        )
        await self._session.commit()
        if result.rowcount == 0:
            return None
        return await self.get_by_id(box_id)
