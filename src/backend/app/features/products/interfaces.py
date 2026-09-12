from abc import ABC, abstractmethod
from typing import Optional

from app.features.products.entities import PaginatedProducts, Product


class IProductRepository(ABC):
    @abstractmethod
    async def create(self, product: Product) -> Product:
        pass

    @abstractmethod
    async def get_by_id(self, product_id: str) -> Optional[Product]:
        pass

    @abstractmethod
    async def get_all(self, page: int, limit: int) -> PaginatedProducts:
        pass

    @abstractmethod
    async def update(self, product_id: str, fields: dict) -> Optional[Product]:
        pass

    @abstractmethod
    async def delete(self, product_id: str) -> None:
        pass
