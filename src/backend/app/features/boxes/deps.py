from fastapi import Depends

from app.core.database import get_db
from app.features.boxes.repository import BoxRepository
from app.features.boxes.service import BoxService


async def get_box_repo(session=Depends(get_db)):
    return BoxRepository(session)


async def get_box_service(box_repo=Depends(get_box_repo)):
    return BoxService(box_repo)
