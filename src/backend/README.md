# Backend

## Deps

- docker
- make
- uv


## 1. Setting up PostgreSQL and redis

```sh
make create-env
# fill in .env
make dev-up          # postgres + redis (dev)
make migrate-up      # apply migrations
```

## 2. Run server

```sh
uv venv
uv pip install -r requirements.txt
uvicorn app.main:app
```

## Migrations

```sh
make migrate-up          # apply all pending
make migrate-down        # roll back one step
make migrate-down-all    # roll back everything
make migrate-version     # current version
make migrate-force v=N   # force version (recovery)
make migrate-create name=add_something
```

## Seed data

Generate fake products and insert them into `product_service.products`:

```sh
make seed-products                      # 100 products (upsert, keeps existing)
make seed-products count=50 seed=42     # reproducible
# or run directly:
python scripts/generate_products.py --count 100 --truncate
```

`--truncate` wipes the table first; by default rows are upserted by `id`.


## Project structure

```
app/
  core/                     # shared infrastructure
    database.py             # SQLAlchemy engine/session
    redis.py                # redis client
    account_settings.py     # runtime approval toggle (redis-backed)
    email.py                # SMTP sender + interface
    exceptions.py           # app exceptions
    rate_limiter.py         # redis rate-limiting middleware
    security/               # jwt + password hashing
  features/
    auth/                   # register, login, refresh, logout, me, password change
    password_reset/         # password reset via email
    admin/                  # user moderation + approval settings
    boxes/                  # box CRUD + stock refill
    products/               # product catalog CRUD
    health/                 # healthcheck
  config.py                 # yaml + env config
  main.py                   # FastAPI app
```

## Roles

| Role | Access |
|------|--------|
| `user` | boxes read/write (create, update, delete, stock adjust), products read/write |
| `admin` | everything above + user moderation + approval toggle |

## Account approval

`AUTO_APPROVE_ACCOUNTS=true` (env) makes new registrations approved immediately.
Admins can override this at runtime via `GET`/`PUT /api/v1/admin/settings/require-approval`;
the override is stored in redis and takes priority over the env default.

