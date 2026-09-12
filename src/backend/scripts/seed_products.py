"""Generate random products and insert them into product_service.products.

Run from the backend root (so that ``app`` and ``.env`` are importable)::

    python scripts/seed_products.py --count 100
    python scripts/seed_products.py --count 50 --truncate
    python scripts/seed_products.py --count 20 --seed 42

The script talks to the database directly through the application's async
engine, so make sure Postgres is up and migrations are applied.
"""

import argparse
import asyncio
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.database import async_session_factory, engine
from app.features.products.models import ProductModel

ROTATIONS = ["0", "90", "180", "270"]
TAG_POOL = ["fragile", "liquid", "food", "electronic", "hazard", "heavy"]
PRODUCT_NAMES = [
    "Наушники Bluetooth Sony WH-1000XM5",
    "Наушники Apple AirPods Pro",
    "Чехол для телефона",
    "Матрас ортопедический",
    "Ноутбук Lenovo IdeaPad",
    "Монитор Dell 27\"",
    "Клавиатура механическая",
    "Мышь беспроводная Logitech",
    "Колонка портативная JBL",
    "Powerbank 20000mAh",
    "Кабель USB-C",
    "Роутер Wi-Fi 6",
    "Внешний SSD 1TB",
    "Веб-камера Full HD",
    "Микрофон студийный",
    "Гарнитура игровая",
    "Пылесос робот",
    "Кофемашина капсульная",
    "Чайник электрический",
    "Фен для волос",
    "Утюг с отпариванием",
    "Блендер погружной",
    "Мультиварка 5л",
    "Тостер 2-секционный",
    "Планшет Samsung Galaxy",
    "Смарт-часы Garmin",
    "Фитнес-браслет Xiaomi",
    "Электронная книга PocketBook",
    "Проектор мини",
    "Фотоаппарат Canon EOS",
]
DESTINATIONS = [
    "Москва",
    "Воронеж",
    "Санкт-Петербург",
    "Новосибирск",
    "Екатеринбург",
    "Казань",
    "Нижний Новгород",
    "Самара",
    "Омск",
    "Ростов-на-Дону",
    "Уфа",
    "Краснодар",
    "Владивосток",
    "Хабаровск",
    "Пермь",
    "Тюмень",
]


def _random_product(rng: random.Random) -> dict:
    weight = round(rng.uniform(0.1, 50.0), 2)
    is_floor_only = rng.random() < 0.15
    is_stackable = not is_floor_only and rng.random() < 0.7

    tags = rng.sample(TAG_POOL, k=rng.randint(0, 2))
    incompatible = []
    if "fragile" in tags:
        incompatible = ["heavy"]
    elif rng.random() < 0.2:
        incompatible = rng.sample(TAG_POOL, k=1)

    return {
        "name": rng.choice(PRODUCT_NAMES),
        "destination": rng.choice(DESTINATIONS),
        "x": round(rng.uniform(1.0, 120.0), 2),
        "y": round(rng.uniform(1.0, 120.0), 2),
        "z": round(rng.uniform(1.0, 120.0), 2),
        "weight": weight,
        "quantity": rng.randint(1, 50),
        "must_stay_upright": rng.random() < 0.3,
        "is_stackable": is_stackable,
        "max_top_load": round(weight * rng.uniform(0.5, 3.0), 2),
        "minimum_support_ratio": round(rng.uniform(0.0, 1.0), 2),
        "incompatible_tags": incompatible,
        "allowed_rotations": None if is_floor_only else rng.sample(ROTATIONS, k=rng.randint(1, 4)),
        "is_floor_only": is_floor_only,
        "tags": tags,
    }


async def generate(count: int, seed: int | None, truncate: bool) -> int:
    rng = random.Random(seed)

    products = [_random_product(rng) for _ in range(count)]

    async with async_session_factory() as session:
        if truncate:
            await session.execute(ProductModel.__table__.delete())

        await session.execute(pg_insert(ProductModel).values(products))
        await session.commit()

    return len(products)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=100, help="how many products to generate")
    parser.add_argument("--seed", type=int, default=None, help="RNG seed for reproducible output")
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="delete existing products before inserting",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    if args.count < 1:
        raise SystemExit("--count must be >= 1")

    try:
        inserted = await generate(args.count, args.seed, args.truncate)
    finally:
        await engine.dispose()

    print(f"Generated and upserted {inserted} products.")


if __name__ == "__main__":
    asyncio.run(main())
