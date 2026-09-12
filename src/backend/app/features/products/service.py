from datetime import datetime, timezone

from app.core.exceptions import AppException
from app.features.products.entities import PaginatedProducts, Product
from app.features.products.interfaces import IProductRepository


class ProductNotFoundError(AppException):
    def __init__(self):
        super().__init__("Product not found", 404)


class ProductAlreadyExistsError(AppException):
    def __init__(self, product_id: str):
        super().__init__(f"Product {product_id} already exists", 400)


class ProductService:
    def __init__(self, product_repo: IProductRepository):
        self._product_repo = product_repo

    async def create_product(
        self,
        product_id: str,
        x: float,
        y: float,
        z: float,
        weight: float = 0,
        quantity: int = 1,
        keep_upright: bool = False,
        stackable: bool = True,
        max_top_load: float = 0,
        minimum_support_ratio: float = 0,
        incompatible_tags: list[str] | None = None,
        allowed_rotations: list[str] | None = None,
        floor_only: bool = False,
        tags: list[str] | None = None,
    ) -> Product:
        if await self._product_repo.get_by_id(product_id):
            raise ProductAlreadyExistsError(product_id)

        now = datetime.now(timezone.utc)
        product = Product(
            id=product_id,
            x=x,
            y=y,
            z=z,
            weight=weight,
            quantity=quantity,
            keep_upright=keep_upright,
            stackable=stackable,
            max_top_load=max_top_load,
            minimum_support_ratio=minimum_support_ratio,
            incompatible_tags=incompatible_tags or [],
            allowed_rotations=allowed_rotations,
            floor_only=floor_only,
            tags=tags or [],
            created_at=now,
            updated_at=now,
        )
        return await self._product_repo.create(product)

    async def get_product(self, product_id: str) -> Product:
        product = await self._product_repo.get_by_id(product_id)
        if not product:
            raise ProductNotFoundError()
        return product

    async def list_products(self, page: int, limit: int) -> PaginatedProducts:
        return await self._product_repo.get_all(page, limit)

    async def update_product(self, product_id: str, fields: dict) -> Product:
        if not fields:
            return await self.get_product(product_id)
        product = await self._product_repo.update(product_id, fields)
        if not product:
            raise ProductNotFoundError()
        return product

    async def delete_product(self, product_id: str) -> None:
        if not await self._product_repo.get_by_id(product_id):
            raise ProductNotFoundError()
        await self._product_repo.delete(product_id)
