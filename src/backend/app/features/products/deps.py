from fastapi import Depends

from app.core.database import get_db
from app.features.products.repository import ProductRepository
from app.features.products.service import ProductService


async def get_product_repo(session=Depends(get_db)):
    return ProductRepository(session)


async def get_product_service(product_repo=Depends(get_product_repo)):
    return ProductService(product_repo)
