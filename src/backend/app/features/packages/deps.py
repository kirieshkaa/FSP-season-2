from fastapi import Depends

from app.core.database import get_db
from app.features.packages.repository import PackageRepository
from app.features.packages.service import PackageService


async def get_package_repo(session=Depends(get_db)):
    return PackageRepository(session)


async def get_package_service(package_repo=Depends(get_package_repo)):
    return PackageService(package_repo)
