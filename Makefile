.DEFAULT_GOAL := help

.PHONY: help start-db stop-db kill-db restart-db status-db logs-db reset-db

help:
	@echo "make start-db    : PostgreSQL 실행 (준비 완료까지 대기)"
	@echo "make stop-db     : PostgreSQL 중지 (데이터 유지)"
	@echo "make kill-db     : stop-db와 동일"
	@echo "make restart-db  : .env를 다시 읽어 컨테이너 재생성 (데이터 유지)"
	@echo "make status-db   : 컨테이너 상태 확인"
	@echo "make logs-db     : DB 로그 보기 (Ctrl+C로 종료)"
	@echo "make reset-db CONFIRM=reset : DB 데이터를 삭제하고 .env 값으로 새로 생성"

start-db:
	docker compose up -d --wait postgres

stop-db:
	docker compose stop postgres

kill-db: stop-db

restart-db:
	docker compose up -d --force-recreate --wait postgres

status-db:
	docker compose ps -a postgres

logs-db:
	docker compose logs --follow --tail=100 postgres

reset-db:
	@if [ "$(CONFIRM)" != "reset" ]; then \
		echo "DB 데이터를 모두 삭제합니다. 실행하려면: make reset-db CONFIRM=reset"; \
		exit 1; \
	fi
	docker compose config --quiet
	docker compose down --volumes
	docker compose up -d --wait postgres
