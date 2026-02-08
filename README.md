# SQL Server 検証用 最小構成（Docker + DDL）

ADO / VBA / SSMS での動作検証を目的とした
**使い捨て前提の SQL Server 検証環境**。

- 高可用性・監視・本番運用は考慮しない
- 「一回は SQL Server を踏む」ための構成
- 壊して・戻して・試すための最小セット

---

## 構成

```
.
├── docker-compose.yml
├── ddl.sql
├── Makefile
├── README.md
├── .env.example
└── cloudbeaver-config/
    └── initial-data-sources.conf
```

---

## Makeコマンド

```bash
make help     # コマンド一覧
make up       # コンテナ起動
make init     # DDL流し込み
make sql      # DB接続（sqlcmd）
make logs     # ログ確認
make stop     # 一時停止
make start    # 再開
make restart  # 再起動
make down     # 停止（データ保持）
make clean    # 完全削除
make purge    # 完全削除+イメージ削除
make reset    # リセット（削除→再起動）
make shell    # コンテナにbash接続
make test     # SQL Server接続テスト
```

### 初回セットアップ

```bash
make up       # コンテナ起動（初回はイメージ取得で時間がかかる）
sleep 15      # SQL Server起動待ち
make test     # 接続確認
make init     # DDL流し込み
```

### 検証が終わったら

```bash
make clean    # 完全削除（ボリュームも削除）
```

---

## 接続情報（SSMS / Azure Data Studio）

| 項目 | 値 |
|------|-----|
| Server | localhost,1433 |
| Auth | SQL Login |
| User | sa |
| Password | P@ssw0rd123! |
| Encrypt | ON |
| TrustServerCertificate | ON |

---

## CloudBeaver（Webクライアント）

ブラウザからSQL Serverを操作できるWebクライアントが同梱されています。

### アクセス

- URL: http://localhost:8978
- 管理者: `cbadmin` / `P@ssw0rd123!`

### 初回の接続設定

1. 上記URLにアクセスしてログイン
2. 左上メニュー → 「Connection」→「New Connection」
3. 「SQL Server」を選択
4. 以下を入力:
   - Host: `mssql`
   - Port: `1433`
   - Database: `master`
   - User: `sa`
   - Password: `P@ssw0rd123!`
5. 「Create」で保存

※ 一度作成すれば、ボリュームに保存されるため次回以降は自動表示されます

---

## DDLの流し込み

### SSMS / Azure Data Studio

1. 新規クエリ
2. `ddl.sql` を貼り付けて実行

### sqlcmd（任意）

```bash
docker exec -i sqlserver-test \
  /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'P@ssw0rd123!' \
  -C -i /dev/stdin < ddl.sql
```

---

## ADO 検証用 接続文字列（例）

```ini
Provider=MSOLEDBSQL;
Server=localhost,1433;
Database=AppDB;
User ID=app_user;
Password=AppUserP@ss123!;
Encrypt=True;
TrustServerCertificate=True;
```

---

## この構成でできること

- SQL Server 接続確認
- ADO / VBA での SELECT / INSERT / UPDATE
- identity / datetime2 / NULL の挙動確認
- トランザクション検証
- sa / 一般ユーザー差分の体験

---

## 環境変数でのカスタマイズ

`.env.example`をコピーして`.env`を作成し、設定を変更できます。

```bash
cp .env.example .env
```

| 変数 | デフォルト値 | 説明 |
|------|-------------|------|
| SA_PASSWORD | P@ssw0rd123! | SQL Server saパスワード |
| MSSQL_PID | Developer | SQL Serverエディション |
| CB_SERVER_NAME | SQL Server Test | CloudBeaverサーバー名 |
| CB_ADMIN_NAME | cbadmin | CloudBeaver管理者名 |
| CB_ADMIN_PASSWORD | P@ssw0rd123! | CloudBeaver管理者パスワード |

---

## 割り切り事項（意図的にやらない）

- バックアップ / リストア
- 監視 / アラート
- HA / 冗長化
- 本番相当の権限制御
- Secrets 管理

---

