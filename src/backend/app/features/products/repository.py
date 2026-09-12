from typing import Optional

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.products.entities import PaginatedProducts, Product
from app.features.products.interfaces import IProductRepository
from app.features.products.models import ProductModel


class ProductRepository(IProductRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_entity(self, model: ProductModel) -> Product:
        return Product(
            id=model.id,
            x=model.x,
            y=model.y,
            z=model.z,
            weight=model.weight,
            quantity=model.quantity,
            keep_upright=model.keep_upright,
            stackable=model.stackable,
            max_top_load=model.max_top_load,
            minimum_support_ratio=model.minimum_support_ratio,
            incompatible_tags=model.incompatible_tags,
            allowed_rotations=model.allowed_rotations,
            floor_only=model.floor_only,
            tags=model.tags,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    async def create(self, product: Product) -> Product:
        model = ProductModel(
            id=product.id,
            x=product.x,
            y=product.y,
            z=product.z,
            weight=product.weight,
            quantity=product.quantity,
            keep_upright=product.keep_upright,
            stackable=product.stackable,
            max_top_load=product.max_top_load,
            minimum_support_ratio=product.minimum_support_ratio,
            incompatible_tags=product.incompatible_tags,
            allowed_rotations=product.allowed_rotations,
            floor_only=product.floor_only,
            tags=product.tags,
        )
        self._session.add(model)
        await self._session.commit()
        await self._session.refresh(model)
        return self._to_entity(model)

    async def get_by_id(self, product_id: str) -> Optional[Product]:
        result = await self._session.execute(
            select(ProductModel).where(ProductModel.id == product_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_all(self, page: int, limit: int) -> PaginatedProducts:
        count_result = await self._session.execute(
            select(func.count()).select_from(ProductModel)
        )
        total = count_result.scalar() or 0

        offset = (page - 1) * limit
        result = await self._session.execute(
            select(ProductModel)
            .order_by(ProductModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        models = result.scalars().all()

        return PaginatedProducts(
            items=[self._to_entity(m) for m in models],
            total=total,
            page=page,
            limit=limit,
        )

    async def update(self, product_id: str, fields: dict) -> Optional[Product]:
        payload = {**fields, "updated_at": func.now()}
        await self._session.execute(
            update(ProductModel).where(ProductModel.id == product_id).values(**payload)
        )
        await self._session.commit()
        return await self.get_by_id(product_id)

    async def delete(self, product_id: str) -> None:
        await self._session.execute(
            delete(ProductModel).where(ProductModel.id == product_id)
        )
        await self._session.commit()
