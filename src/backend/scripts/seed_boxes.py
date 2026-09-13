"""Seed the standard box fleet (S/M/L/XL/XXL) into box_service.boxes.

Run from the backend root (so that ``app`` and ``.env`` are importable)::

    python scripts/seed_boxes.py

Re-running updates the same named boxes (matched by ``type``) without
duplicates; the boxes table has no unique constraint on ``type``, so the
script matches existing rows explicitly.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, update

from app.core.database import async_session_factory, engine
from app.features.boxes.models import BoxModel

BOXES = [
    ("S", 200, 150, 100, 5000, 342, 1.0),
    ("M", 350, 250, 200, 10000, 128, 1.0),
    ("L", 500, 400, 300, 15000, 64, 1.0),
    ("XL", 600, 500, 400, 25000, 23, 1.0),
    ("XXL", 800, 600, 500, 40000, 8, 1.0),
]


def _row(box_type: str, width: float, height: float, depth: float, max_weight: float, count: int, wear_rate: float) -> dict:
    return {
        "name": f"Коробка {box_type}",
        "type": box_type,
        "width": width,
        "height": height,
        "depth": depth,
        "max_weight": max_weight,
        "available_count": count,
        "wear_rate": wear_rate,
    }


async def generate() -> tuple[int, int]:
    async with async_session_factory() as session:
        existing = set(
            (await session.execute(select(BoxModel.type))).scalars().all()
        )

        updated = 0
        for box_type, width, height, depth, max_weight, count, wear_rate in BOXES:
            if box_type in existing:
                await session.execute(
                    update(BoxModel)
                    .where(BoxModel.type == box_type)
                    .values(**_row(box_type, width, height, depth, max_weight, count, wear_rate))
                )
                updated += 1

        rows = [
            _row(box_type, width, height, depth, max_weight, count, wear_rate)
            for box_type, width, height, depth, max_weight, count, wear_rate in BOXES
            if box_type not in existing
        ]
        if rows:
            await session.execute(BoxModel.__table__.insert().values(rows))

        await session.commit()
        return len(rows), updated


async def main() -> None:
    try:
        inserted, updated = await generate()
    finally:
        await engine.dispose()

    print(f"Inserted {inserted}, updated {updated} box types.")


if __name__ == "__main__":
    asyncio.run(main())