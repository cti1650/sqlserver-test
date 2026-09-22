# 接続情報

---

## 接続パラメータ

| 項目 | 値 |
|------|-----|
| ホスト | `localhost` / `127.0.0.1` |
| ポート | `1433` |
| データベース | `AppDB` |
| 管理ユーザー | `sa` / `P@ssw0rd123!` |
| アプリユーザー | `app_user` / `AppUserP@ss123!`（`db_datareader` + `db_datawriter`） |
| 暗号化 | ON（自己署名証明書のため「サーバー証明書を信頼する」も ON） |

`docker-compose.yml` は **`127.0.0.1:1433` にバインド**している。
同じ端末からの接続のみを想定しており、別端末から繋ぐにはポート公開設定の変更が必要。

---

## クライアント別の設定

### SSMS / Azure Data Studio

| 項目 | 値 |
|------|-----|
| Server | `localhost,1433` |
| Auth | SQL Login |
| User | `sa` |
| Password | `P@ssw0rd123!` |
| Encrypt | ON |
| TrustServerCertificate | ON |

### ADO / VBA / Access

[ado-vba.md](ado-vba.md) を参照。

### LibreOffice Base

[libreoffice-base.md](libreoffice-base.md) を参照。

### JDBC

```
jdbc:sqlserver://127.0.0.1:1433;databaseName=AppDB;encrypt=true;trustServerCertificate=true
```

ドライバークラスは `com.microsoft.sqlserver.jdbc.SQLServerDriver`。
セットアップ手順は [libreoffice-base.md](libreoffice-base.md#jdbc-で接続する推奨) にまとめてある。

---

## CloudBeaver（Web クライアント）

ブラウザから SQL Server を操作できる Web クライアントを同梱している。

- URL: http://localhost:8978
- 管理者: `cbadmin` / `P@ssw0rd123!`

SQL Server 接続は `cloudbeaver-config/data-sources.json` で自動設定されるため、
ログイン後すぐに使用できる。

---

## 外部サーバーへの接続

環境変数を設定することで、npm scripts の接続先を外部の SQL Server に切り替えられる。

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
| SQL_EXTERNAL | false | true で外部サーバーモード |
| SQL_SERVER | localhost | サーバーアドレス |
| SQL_PORT | 1433 | ポート番号 |
| SQL_USER | sa | ユーザー名 |
| SQL_PASSWORD | P@ssw0rd123! | パスワード |
| SQL_DATABASE | AppDB | データベース名 |

---

## コンテナ側の環境変数

`.env.example` をコピーして `.env` を作成し、設定を変更できる。

```bash
cp .env.example .env
```

| 変数 | デフォルト値 | 説明 |
|------|-------------|------|
| SA_PASSWORD | P@ssw0rd123! | SQL Server sa パスワード |
| MSSQL_PID | Express | SQL Server エディション（Express / Developer / Evaluation）|
| CB_SERVER_NAME | SQL Server Test | CloudBeaver サーバー名 |
| CB_ADMIN_NAME | cbadmin | CloudBeaver 管理者名 |
| CB_ADMIN_PASSWORD | P@ssw0rd123! | CloudBeaver 管理者パスワード |

---

## 文字コードについて

DB の照合順序は SQL Server の既定（`SQL_Latin1_General_CP1_CI_AS`）のまま。
文字列カラムはすべて `NVARCHAR` なので日本語データ自体は問題なく格納できるが、
**クライアントによっては書き込み時の文字コード変換で問題が出る**。

詳細と回避策は [libreoffice-base.md](libreoffice-base.md) を参照。
