# DDL

---

## 構成

DDL は接続先の環境に応じて必要なファイルだけを流せるよう分割してある。

| ファイル | 内容 |
|---------|------|
| `ddl/01-database.sql` | DB 作成（Azure SQL Database 以外） |
| `ddl/02-tables.sql` | テーブル定義 |
| `ddl/03-data.sql` | サンプルデータ |
| `ddl/04-users-onprem.sql` | ユーザー作成（オンプレ / RDS / Managed Instance 用） |
| `ddl/04-users-azure.sql` | ユーザー作成（Azure SQL Database 用） |

### テーブル

| テーブル | 用途 |
|---------|------|
| `M_Customer` | 顧客マスタ（Access のフォームで編集される想定） |
| `M_Product` | 商品マスタ |
| `T_Sales` | 売上ヘッダ（Excel から一括登録される想定） |
| `T_SalesDetail` | 売上明細（`T_Sales` に外部キー） |

文字列カラムはすべて `NVARCHAR`。主キーは全テーブルに設定してあるので、
Access や LibreOffice Base のグリッドからそのまま編集できる。

---

## 流し込み

### make / npm

```bash
make init        # ローカルコンテナ向け（01〜04-onprem を順に実行）
npm run init     # 接続先環境を自動検出して必要なファイルだけ実行
```

### 環境自動検出

`npm run init` は接続先の SQL Server 環境を自動検出し、適切な DDL ファイルを選択する。

```bash
npm run detect   # 検出結果だけ確認する
```

| 環境 | 実行される DDL | 備考 |
|------|--------------|------|
| Azure SQL Database | 02, 03, 04-azure | CREATE DATABASE / LOGIN 除外 |
| Azure SQL Managed Instance | 01, 02, 03, 04-onprem | フル DDL |
| AWS RDS / ローカル / Express | 01, 02, 03, 04-onprem | フル DDL |

### SSMS / Azure Data Studio

1. 新規クエリを開く
2. `ddl/` 配下のファイルを順番に貼り付けて実行する

### sqlcmd

```bash
docker exec -i sqlserver-test \
  /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'P@ssw0rd123!' \
  -C -i /dev/stdin < ddl/02-tables.sql
```

PowerShell の場合:

```powershell
Get-Content ddl/02-tables.sql | docker exec -i sqlserver-test `
  /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U sa -P "P@ssw0rd123!" -C
```

---

## 注意

- `02-tables.sql` は既存テーブルを `DROP TABLE` してから作り直す。**データは消える**
- Express Edition で動かすため、圧縮など Enterprise 限定の機能は使っていない
