.PHONY: build up down logs migrate seed db-shell

build:
	docker-compose -f local.yml build

up:
	docker-compose -f local.yml up -d

down:
	docker-compose -f local.yml down

logs:
	docker-compose -f local.yml logs -f

migrate:
	docker-compose -f local.yml exec backend alembic upgrade head

seed:
	docker-compose -f local.yml exec backend python -m app.db.seed

db-shell:
	docker-compose -f local.yml exec postgres psql -U aatron -d aatron_vision
