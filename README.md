# SQL Server 検証用 最小構成（Docker + DDL）

ADO / VBA / SSMS / LibreOffice Base での動作検証を目的とした
**使い捨て前提の SQL Server 検証環境**。

- SQL Server Express Edition（本番利用可能な無料版）
- コンテナは自動再起動（`restart: unless-stopped`）
- ヘルスチェック付き（SQL Server 応答監視）
- データはホストマウント（`data/`、`backups/`）で永続化
- 高可用性・本番運用は考慮しない
- 「一回は SQL Server を踏む」ための構成
- 壊して・戻して・試すための最小セット

---

## クイックスタート

```bash
# make（Linux / macOS）
make up && sleep 15 && make init && make test

# npm scripts（Windows も含む全 OS / Node.js が必要）
npm run up && npm run wait && npm run init && npm run test:connection
```

接続先は `localhost:1433` / DB は `AppDB`。

ブラウザから触るなら CloudBeaver（http://localhost:8978）も同梱している。
ただし `npm run up` は SQL Server のみを起動するので、CloudBeaver も使うなら
`make up` か `docker compose up -d` を使う。

検証が終わったら `make clean`（または `npm run clean`）で丸ごと消す。

---

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [コマンドリファレンス](docs/commands.md) | make / npm scripts の一覧、セットアップ、バックアップ |
| [接続情報](docs/connection.md) | 接続パラメータ、CloudBeaver、外部サーバー接続、環境変数 |
| [DDL](docs/ddl.md) | テーブル構成、流し込み方法、環境自動検出 |
| [ADO / Excel VBA / Access](docs/ado-vba.md) | 接続文字列、VBA サンプル、Windows の ODBC DSN 作成 |
| [LibreOffice Base](docs/libreoffice-base.md) | JDBC / ODBC 接続手順（Windows・macOS） |

---

## 構成

```
.
├── docker-compose.yml
├── ddl/                       # 分割DDL
│   ├── 01-database.sql        # DB作成（Azure SQL DB以外）
│   ├── 02-tables.sql          # テーブル定義
│   ├── 03-data.sql            # サンプルデータ
│   ├── 04-users-onprem.sql    # ユーザー（オンプレ/RDS用）
│   └── 04-users-azure.sql     # ユーザー（Azure SQL DB用）
├── data/                      # DBデータ（ホストマウント、git除外）
├── backups/                   # バックアップ（ホストマウント、git除外）
├── Makefile                   # Linux/Mac用
├── package.json               # クロスプラットフォーム用
├── scripts/                   # npm scripts用ヘルパー
├── cloudbeaver-config/        # CloudBeaver初期接続設定
├── docs/                      # 各種手順書
└── .env.example
```

---

## この構成でできること

- SQL Server 接続確認
- ADO / VBA での SELECT / INSERT / UPDATE
- LibreOffice Base からの JDBC / ODBC 接続
- identity / datetime2 / NULL の挙動確認
- トランザクション検証（COMMIT / ROLLBACK / SAVEPOINT / XACT_ABORT）
- 分離レベル検証（READ UNCOMMITTED / READ COMMITTED / REPEATABLE READ / SERIALIZABLE）
- 大量データ検証（最大 100,000 件）
- バックアップ / リストア（7 世代管理）
- sa / 一般ユーザー差分の体験

---

## 割り切り事項（意図的にやらない）

- 外部アラート通知
- HA / 冗長化
- 本番相当の権限制御
- Secrets 管理
