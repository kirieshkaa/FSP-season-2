DOCKER_COMPOSE ?= docker compose
COUNT ?= 120
SEED ?= 42

.PHONY: help up build down ps logs restart-nginx seed seed-products seed-boxes clean

help:
	@echo "fsp-2026 make targets:"
	@echo "  make up             build images and start the stack in background"
	@echo "  make build          rebuild backend/frontend images"
	@echo "  make down           stop and remove containers"
	@echo "  make ps             show container status"
	@echo "  make logs           follow all container logs"
	@echo "  make restart-nginx  restart nginx (re-reads config mount)"
	@echo "  make seed           seed products (COUNT=$(COUNT) SEED=$(SEED)) and boxes"
	@echo "  make seed-products  seed products: make seed-products COUNT=50 SEED=7"
	@echo "  make seed-boxes     seed/update the 5 standard boxes (S/M/L/XL/XXL)"
	@echo "  make clean          down + prune built images"

up:
	$(DOCKER_COMPOSE) up -d --build

build:
	$(DOCKER_COMPOSE) build

down:
	$(DOCKER_COMPOSE) down

ps:
	$(DOCKER_COMPOSE) ps

logs:
	$(DOCKER_COMPOSE) logs -f --tail=100

restart-nginx:
	$(DOCKER_COMPOSE) restart nginx

seed-products:
	$(DOCKER_COMPOSE) exec -T backend python scripts/seed_products.py --count $(COUNT) --seed $(SEED)

seed-boxes:
	$(DOCKER_COMPOSE) exec -T backend python scripts/seed_boxes.py

seed: seed-products seed-boxes

clean: down
	$(DOCKER_COMPOSE) rm -f
	$(DOCKER_COMPOSE) build --pull