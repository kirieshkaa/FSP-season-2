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
STANDARD_TAGS = ["fragile", "liquid", "food", "electronic", "hazard", "heavy"]
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

# Real-world product catalog: (name, width, depth, height in mm, weight in g,
# quantity range, flags, tags). Dimensions fit the smallest box the product
# can reasonably ship in; quantity reflects typical warehouse stock: small
# high-turnover items get many units, bulky ones a few.
PRODUCT_CATALOG: list[tuple[str, float, float, float, float, int, int, dict, list[str]]] = [
    ("Наушники Bluetooth Sony WH-1000XM5", 250, 240, 80, 250, 1, 3, {}, ["electronic"]),
    ("Наушники Apple AirPods Pro", 62, 46, 25, 62, 2, 6, {}, ["electronic"]),
    ("Чехол для телефона", 160, 82, 12, 40, 15, 50, {}, []),
    ("Подушка декоративная", 400, 400, 120, 700, 2, 6, {}, []),
    ("Ноутбук Lenovo IdeaPad", 360, 240, 20, 1800, 1, 3, {}, ["electronic"]),
    ("Монитор Dell 27\"", 590, 360, 60, 6100, 1, 2, {"upright": True, "stackable": False}, ["electronic", "fragile"]),
    ("Клавиатура механическая", 440, 130, 40, 850, 1, 4, {}, ["electronic"]),
    ("Мышь беспроводная Logitech", 125, 68, 40, 101, 2, 8, {}, ["electronic"]),
    ("Колонка портативная JBL", 180, 70, 70, 690, 1, 4, {}, ["electronic"]),
    ("Powerbank 20000mAh", 150, 70, 25, 345, 2, 8, {}, ["electronic"]),
    ("Кабель USB-C 1м", 60, 60, 20, 55, 20, 80, {}, ["electronic"]),
    ("Роутер Wi-Fi 6", 250, 180, 60, 590, 1, 3, {}, ["electronic"]),
    ("Внешний SSD 1TB", 115, 40, 12, 65, 2, 8, {}, ["electronic"]),
    ("Веб-камера Full HD", 95, 58, 55, 165, 1, 4, {}, ["electronic"]),
    ("Микрофон студийный USB", 160, 130, 60, 480, 1, 3, {"stackable": False}, ["electronic", "fragile"]),
    ("Гарнитура игровая", 210, 180, 100, 340, 1, 4, {}, ["electronic"]),
    ("Пылесос робот", 340, 340, 95, 3500, 1, 2, {}, ["electronic"]),
    ("Кофемашина капсульная", 330, 240, 330, 5200, 1, 2, {"stackable": False}, ["electronic"]),
    ("Чайник электрический", 230, 200, 250, 1250, 1, 3, {}, ["electronic"]),
    ("Фен для волос", 250, 120, 85, 640, 1, 4, {}, ["electronic"]),
    ("Утюг с отпариванием", 300, 150, 140, 1450, 1, 3, {}, ["electronic"]),
    ("Блендер погружной", 200, 180, 300, 1400, 1, 3, {}, ["electronic"]),
    ("Мультиварка 5л", 320, 320, 330, 4600, 1, 2, {"stackable": False}, ["electronic"]),
    ("Тостер 2-секционный", 280, 190, 210, 1100, 1, 3, {}, ["electronic"]),
    ("Планшет Samsung Galaxy", 270, 190, 45, 520, 1, 4, {}, ["electronic"]),
    ("Смарт-часы Garmin", 108, 105, 60, 90, 2, 6, {}, ["electronic"]),
    ("Фитнес-браслет Xiaomi", 95, 88, 40, 60, 3, 10, {}, ["electronic"]),
    ("Электронная книга PocketBook", 162, 115, 25, 190, 1, 4, {}, ["electronic"]),
    ("Проектор мини", 130, 120, 50, 460, 1, 2, {"upright": True}, ["electronic", "fragile"]),
    ("Фотоаппарат Canon EOS", 130, 105, 75, 650, 1, 3, {"stackable": False}, ["electronic", "fragile"]),
]


def _jit(rng: random.Random, base: float, percent: float = 0.08) -> float:
    """Base value with a small random jitter (mm/g)."""
    return round(base * rng.uniform(1 - percent, 1 + percent), 2)


def _random_product(rng: random.Random) -> dict:
    name, w, d, h, weight, qmin, qmax, flags, tags = rng.choice(PRODUCT_CATALOG)
    weight = round(weight * rng.uniform(0.85, 1.15), 2)
    is_floor_only = flags.get("floor_only", False)
    stackable = flags.get("stackable", True) and not is_floor_only
    must_stay_upright = flags.get("upright", False)

    product_tags = list(tags)
    if weight >= 3000 and "heavy" not in product_tags:
        product_tags.append("heavy")

    incompatible = []
    if "fragile" in product_tags:
        incompatible = ["heavy"]
    elif rng.random() < 0.15:
        incompatible = rng.sample(STANDARD_TAGS, k=1)

    return {
        "name": name,
        "destination": rng.choice(DESTINATIONS),
        "x": _jit(rng, w),
        "y": _jit(rng, d),
        "z": _jit(rng, h, 0.1),
        "weight": weight,
        "quantity": rng.randint(qmin, qmax),
        "must_stay_upright": must_stay_upright,
        "is_stackable": stackable,
        "max_top_load": round(weight * rng.uniform(0.8, 4.0), 2),
        "minimum_support_ratio": round(rng.uniform(0.15, 0.45), 2),
        "incompatible_tags": incompatible,
        "allowed_rotations": None if is_floor_only else rng.sample(ROTATIONS, k=rng.randint(1, 4)),
        "is_floor_only": is_floor_only,
        "tags": product_tags,
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