.PHONY: help up down start stop restart logs ps clean reset init sql shell

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
	@echo "  reset    - clean + up（完全リセット）"
	@echo "  init     - DDL流し込み"
	@echo "  sql      - sqlcmdでDB接続"
	@echo "  shell    - コンテナにbash接続"

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

# 完全リセット（削除して再起動）
reset: clean up
	@echo "Waiting for SQL Server to start..."
	@sleep 10

# DDL流し込み
init:
	@echo "Applying DDL..."
	docker exec -i sqlserver-test \
		/opt/mssql-tools18/bin/sqlcmd \
		-S localhost -U sa -P 'P@ssw0rd123!' \
		-C -i /dev/stdin < ddl.sql
	@echo "DDL applied successfully."

# sqlcmdでDB接続
sql:
	docker exec -it sqlserver-test \
		/opt/mssql-tools18/bin/sqlcmd \
		-S localhost -U sa -P 'P@ssw0rd123!' \
		-C -d AppDB

# コンテナにbash接続
shell:
	docker exec -it sqlserver-test /bin/bash
