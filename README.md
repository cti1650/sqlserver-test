# SQL Server 検証用 最小構成（Docker + DDL）

ADO / VBA / SSMS での動作検証を目的とした
**使い捨て前提の SQL Server 検証環境**。

- SQL Server Express Edition（本番利用可能な無料版）
- コンテナは自動再起動（`restart: unless-stopped`）
- ヘルスチェック付き（SQL Server応答監視）
- データはホストマウント（`data/`、`backups/`）で永続化
- 高可用性・本番運用は考慮しない
- 「一回は SQL Server を踏む」ための構成
- 壊して・戻して・試すための最小セット

---

## 構成

```
.
├── docker-compose.yml
├── ddl/                    # 分割DDL
│   ├── 01-database.sql     # DB作成（Azure SQL DB以外）
│   ├── 02-tables.sql       # テーブル定義
│   ├── 03-data.sql         # サンプルデータ
│   ├── 04-users-onprem.sql # ユーザー（オンプレ/RDS用）
│   └── 04-users-azure.sql  # ユーザー（Azure SQL DB用）
├── data/                   # DBデータ（ホストマウント、git除外）
├── backups/                # バックアップ（ホストマウント、git除外）
├── Makefile                # Linux/Mac用
├── package.json            # クロスプラットフォーム用
├── scripts/                # npm scripts用ヘルパー
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
make ps       # コンテナ状態確認
make stop     # 一時停止
make start    # 再開
make restart  # 再起動
make down     # 停止（データ保持）
make clean    # 完全削除（コンテナ+データ+バックアップ）
make purge    # clean + イメージ削除
make reset    # リセット（削除→再起動）
make shell    # コンテナにbash接続
make test     # SQL Server接続テスト
```

---

## npm scripts（クロスプラットフォーム）

Windows / Linux / Mac で共通して使用できます。Node.js が必要です。

### 基本操作

```bash
npm run up              # コンテナ起動（mssqlのみ）
npm run down            # コンテナ停止
npm run clean           # 完全削除（コンテナ+データ+バックアップ）
npm run wait            # SQL Server起動待ち
npm run detect          # 環境検出
npm run init            # DDL流し込み（環境自動検出）
```

### テスト

```bash
npm run test:connection   # 接続テスト
npm run test:tables       # テーブル確認
npm run test:data         # データ確認
npm run test:transaction  # トランザクションテスト（COMMIT/ROLLBACK/SAVEPOINT）
npm run test:isolation    # 分離レベルテスト
npm run test              # 基本テスト実行（up → wait → init → verify）
npm run ci                # CI用（テスト後にクリーンアップ）
```

### データ生成

```bash
npm run seed              # デフォルト（1,000件）
npm run seed:small        # 1,000件
npm run seed:medium       # 10,000件
npm run seed:large        # 100,000件
```

### バックアップ/リストア

```bash
npm run backup            # バックアップ作成（7世代管理）
npm run restore           # バックアップ一覧表示
npm run restore -- <file> # 指定ファイルからリストア
```

バックアップは `./backups/` にホストマウントされます。`make clean` で削除されます。

### 初回セットアップ（npm）

```bash
npm run up      # コンテナ起動
npm run wait    # SQL Server起動待ち
npm run init    # DDL流し込み
```

### 対話型コマンド

npm scriptsでは対話型コマンドに制限があるため、以下は直接実行してください：

```bash
# sqlcmdでDB接続
docker exec -it sqlserver-test /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'P@ssw0rd123!' -C -d AppDB

# コンテナにbash接続
docker exec -it sqlserver-test /bin/bash
```

### 外部サーバーへの接続

環境変数を設定することで、外部のSQL Serverに接続できます。

```bash
# .envファイルに設定するか、直接環境変数を指定
export SQL_EXTERNAL=true
export SQL_SERVER=external-server.example.com
export SQL_PORT=1433
export SQL_USER=your_user
export SQL_PASSWORD=your_password
export SQL_DATABASE=AppDB

# 接続テスト
npm run test:connection

# DDL適用
npm run init
```

| 環境変数 | デフォルト | 説明 |
|---------|-----------|------|
| SQL_EXTERNAL | false | trueで外部サーバーモード |
| SQL_SERVER | localhost | サーバーアドレス |
| SQL_PORT | 1433 | ポート番号 |
| SQL_USER | sa | ユーザー名 |
| SQL_PASSWORD | P@ssw0rd123! | パスワード |
| SQL_DATABASE | AppDB | データベース名 |
### 環境自動検出

`npm run init` は接続先のSQL Server環境を自動検出し、適切なDDLファイルを選択します。

```bash
# 環境を確認
npm run detect
```

| 環境 | 実行されるDDL | 備考 |
|------|--------------|------|
| Azure SQL Database | 02, 03, 04-azure | CREATE DATABASE/LOGIN除外 |
| Azure SQL Managed Instance | 01, 02, 03, 04-onprem | フルDDL |
| AWS RDS / ローカル / Express | 01, 02, 03, 04-onprem | フルDDL |

DDLは `ddl/` 配下に分割されており、環境に応じて必要なファイルのみ実行されます。

---

### 初回セットアップ（make）

```bash
make up       # コンテナ起動（初回はイメージ取得で時間がかかる）
sleep 15      # SQL Server起動待ち
make test     # 接続確認
make init     # DDL流し込み
```

### 検証が終わったら

```bash
make clean    # 完全削除（コンテナ+データ+バックアップ）
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

```bash
docker exec -i sqlserver-test `
  /opt/mssql-tools18/bin/sqlcmd `
  -S localhost `
  -U sa `
  -P "P@ssw0rd123!" `
  -C `
  -i ddl.sql
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

## Excel VBA からの接続サンプル

```vba
Sub GetCustomerList()
    Dim conn As Object
    Set conn = CreateObject("ADODB.Connection")

    conn.Open "Provider=MSOLEDBSQL;" & _
              "Server=localhost,1433;" & _
              "Database=AppDB;" & _
              "User ID=app_user;" & _
              "Password=AppUserP@ss123!;" & _
              "Encrypt=Yes;" & _
              "TrustServerCertificate=Yes;"

    ' 顧客マスタ取得
    Dim rs As Object
    Set rs = conn.Execute("SELECT CustomerCode, CustomerName, Tel FROM M_Customer WHERE IsActive = 1")

    ' 結果をシートに出力
    Sheet1.Range("A1").CopyFromRecordset rs

    rs.Close
    conn.Close
End Sub

Sub GetSalesWithDetails()
    Dim conn As Object
    Set conn = CreateObject("ADODB.Connection")

    conn.Open "Provider=MSOLEDBSQL;" & _
              "Server=localhost,1433;" & _
              "Database=AppDB;" & _
              "User ID=app_user;" & _
              "Password=AppUserP@ss123!;" & _
              "Encrypt=Yes;" & _
              "TrustServerCertificate=Yes;"

    ' 売上明細を取得（ヘッダと結合）
    Dim sql As String
    sql = "SELECT h.SalesNo, h.SalesDate, d.ProductName, d.Quantity, d.Amount " & _
          "FROM T_Sales h INNER JOIN T_SalesDetail d ON h.SalesId = d.SalesId " & _
          "ORDER BY h.SalesNo, d.RowNo"

    Dim rs As Object
    Set rs = conn.Execute(sql)

    Sheet1.Range("A1").CopyFromRecordset rs

    rs.Close
    conn.Close
End Sub
```

---

## Access ODBC設定手順

1. 「ODBCデータソース(64bit)」を開く
2. 「システムDSN」タブ → 「追加」
3. 「ODBC Driver 18 for SQL Server」を選択
4. 以下を入力:
   - 名前: `SQLServerTest`
   - サーバー: `localhost,1433`
5. 「SQL Server認証」を選択
   - ログインID: `app_user`
   - パスワード: `AppUserP@ss123!`
6. 「既定のデータベース」→ `AppDB`
7. 「接続の暗号化」→ 必須、「サーバー証明書を信頼する」→ ON

---

## この構成でできること

- SQL Server 接続確認
- ADO / VBA での SELECT / INSERT / UPDATE
- identity / datetime2 / NULL の挙動確認
- トランザクション検証（COMMIT / ROLLBACK / SAVEPOINT / XACT_ABORT）
- 分離レベル検証（READ UNCOMMITTED / READ COMMITTED / REPEATABLE READ / SERIALIZABLE）
- 大量データ検証（最大100,000件）
- バックアップ / リストア（7世代管理）
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
| MSSQL_PID | Express | SQL Serverエディション（Express/Developer/Evaluation）|
| CB_SERVER_NAME | SQL Server Test | CloudBeaverサーバー名 |
| CB_ADMIN_NAME | cbadmin | CloudBeaver管理者名 |
| CB_ADMIN_PASSWORD | P@ssw0rd123! | CloudBeaver管理者パスワード |

---

## 割り切り事項（意図的にやらない）

- 外部アラート通知
- HA / 冗長化
- 本番相当の権限制御
- Secrets 管理

---

