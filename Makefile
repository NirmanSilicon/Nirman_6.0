.PHONY: up down migrate seed test e2e lint fmt simulate backup

up:
	docker compose up -d --build

down:
	docker compose down

migrate:
	docker compose exec api alembic upgrade head

seed:
	docker compose exec api python -m scripts.seed_demo

test:
	docker compose exec api pytest backend/tests/unit backend/tests/integration -q

e2e:
	docker compose exec api pytest backend/tests/e2e -q

backup:
	bash scripts/backup_db.sh

lint:
	ruff check backend edge simulator forecast_worker
	npm --prefix web run lint

fmt:
	ruff format backend edge simulator forecast_worker

simulate:
	docker compose exec api python -m simulator.live_publisher
