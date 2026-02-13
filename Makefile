.PHONY: help up down start stop restart logs ps clean purge reset init sql shell test

# 環境変数（デフォルト値付き）
SA_PASSWORD ?= P@ssw0rd123!

# デフォルトターゲット
help:
	@echo "SQL Server Test Environment"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  up       - コンテナ起動（初回はイメージ取得あり）"
	@echo "  down     - コンテナ停止（ボリューム保持）"
	@echo "  start    - 停止中のコンテナを再開"
	@echo "  stop     - コンテナを一時停止"
	@echo "  restart  - コンテナ再起動"
	@echo "  logs     - ログ表示"
	@echo "  ps       - コンテナ状態確認"
	@echo "  clean    - コンテナ+ボリューム完全削除"
	@echo "  purge    - clean + イメージ削除"
	@echo "  reset    - clean + up（完全リセット）"
	@echo "  init     - DDL流し込み"
	@echo "  sql      - sqlcmdでDB接続"
	@echo "  shell    - コンテナにbash接続"
	@echo "  test     - SQL Server接続テスト"

# コンテナ起動
up:
	docker compose up -d

# コンテナ停止（ボリューム保持）
down:
	docker compose down

# コンテナ再開
start:
	docker compose start

# コンテナ一時停止
stop:
	docker compose stop

# コンテナ再起動
restart:
	docker compose restart

# ログ表示
logs:
	docker compose logs -f

# コンテナ状態確認
ps:
	docker compose ps

# 完全削除（コンテナ+ボリューム+ネットワーク）
clean:
	docker compose down -v --remove-orphans

# 完全削除+イメージ削除
purge: clean
	docker rmi mcr.microsoft.com/mssql/server:2022-latest dbeaver/cloudbeaver:latest 2>/dev/null || true

# 完全リセット（削除して再起動）
reset: clean up
	@echo "Waiting for SQL Server to start..."
	@sleep 10

# DDL流し込み
init:
	@echo "Applying DDL..."
	@for f in ddl/01-database.sql ddl/02-tables.sql ddl/03-data.sql ddl/04-users-onprem.sql; do \
		echo "Applying $$f..."; \
		docker exec -i sqlserver-test \
			/opt/mssql-tools18/bin/sqlcmd \
			-S localhost -U sa -P '$(SA_PASSWORD)' \
			-C -i /dev/stdin < $$f; \
	done
	@echo "DDL applied successfully."

# sqlcmdでDB接続
sql:
	docker exec -it sqlserver-test \
		/opt/mssql-tools18/bin/sqlcmd \
		-S localhost -U sa -P '$(SA_PASSWORD)' \
		-C -d AppDB

# コンテナにbash接続
shell:
	docker exec -it sqlserver-test /bin/bash

# SQL Server接続テスト
test:
	@echo "Testing SQL Server connection..."
	@docker exec sqlserver-test \
		/opt/mssql-tools18/bin/sqlcmd \
		-S localhost -U sa -P '$(SA_PASSWORD)' \
		-C -Q "SELECT @@VERSION AS 'SQL Server Version'" \
		&& echo "" && echo "✓ SQL Server is running and accessible." \
		|| (echo "✗ Failed to connect to SQL Server." && exit 1)
