DEV_COMPOSE=docker-compose.dev.yaml
PROD_COMPOSE=docker-compose.yaml
COMPOSE=docker compose
BUILD_TARGETS=backend
MIGRATIONS_DIR=./migrations

MIGRATE=$(COMPOSE) -f $(DEV_COMPOSE) run --rm --no-deps --entrypoint sh migrate \
	-c 'exec migrate -path=/migrations -database "$$POSTGRES_URL" "$$@"' --

create-env:
	@. ./scripts/create-env.sh

docker-build:
	$(COMPOSE) -f $(PROD_COMPOSE) build $(BUILD_TARGETS)

compose-action:
	@test -n "$(filename)" || (echo "missing filename\nusage: make compose-action filename=<compose.yaml> action=<up/down>" && exit 1)
	@test -n "$(action)" || (echo "missing action\nusage: make compose-action filename=<compose.yaml> action=<up/down>" && exit 1)
	@$(COMPOSE) -f $(filename) $(action)

dev-up:
	@make compose-action filename="$(DEV_COMPOSE)" action="up -d"

dev-down:
	@make compose-action filename="$(DEV_COMPOSE)" action=down

prod-up:
	@make compose-action filename="$(PROD_COMPOSE)" action="up -d"

prod-down:
	@make compose-action filename="$(PROD_COMPOSE)" action=down

logs:
	$(COMPOSE) -f $(DEV_COMPOSE) logs -f backend

migrate-up:
	$(MIGRATE) up

migrate-down:
	$(MIGRATE) down 1

migrate-down-all:
	$(MIGRATE) down -all

migrate-version:
	$(MIGRATE) version

migrate-force:
	@test -n "$(v)" || (echo "usage: make migrate-force v=<version>" && exit 1)
	$(MIGRATE) force $(v)

migrate-create:
	@test -n "$(name)" || (echo "usage: make migrate-create name=<migration_name>" && exit 1)
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq $(name)

.PHONY: create-env docker-build dev-up dev-down prod-up prod-down logs \
	migrate-up migrate-down migrate-down-all migrate-version migrate-force migrate-create
