# コマンドリファレンス

`make`（Linux / macOS）と `npm scripts`（Windows も含む全 OS）の 2 系統を用意している。
どちらでも同じことができるので、環境に合うほうを使う。

---

## make コマンド（Linux / macOS）

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

### 初回セットアップ

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

`make clean` は `data/` と `backups/` を消す。残したいバックアップがあれば先に退避する。

---

## npm scripts（クロスプラットフォーム）

Windows / Linux / macOS で共通して使用できる。Node.js が必要。

### 基本操作

```bash
npm run up              # コンテナ起動（mssqlのみ）
npm run down            # コンテナ停止
npm run clean           # 完全削除（コンテナ+データ+バックアップ）
npm run wait            # SQL Server起動待ち
npm run detect          # 環境検出
npm run init            # DDL流し込み（環境自動検出）
```

### 初回セットアップ

```bash
npm run up      # コンテナ起動
npm run wait    # SQL Server起動待ち
npm run init    # DDL流し込み
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

### LibreOffice Base からの接続検証

```bash
npm run lo:setup            # JDK と JDBC ドライバを .tools/ に用意（sudo 不要）
npm run lo:test             # ヘッドレスで接続・読み書きを検証（JDBC）
npm run lo:test -- --odbc   # 同上（ODBC / 要DSN）
npm run lo:base             # 接続設定済みの AppDB.odb を作って Base で開く
npm run lo:base -- --odbc   # 同上（ODBC / 要DSN）
```

`lo:test` は `test:libreoffice`（CI から呼ぶ名前）と同じもの。
詳細は [libreoffice-base.md](libreoffice-base.md) を参照。

### データ生成

```bash
npm run seed              # デフォルト（1,000件）
npm run seed:small        # 1,000件
npm run seed:medium       # 10,000件
npm run seed:large        # 100,000件
```

### バックアップ / リストア

```bash
npm run backup            # バックアップ作成（7世代管理）
npm run restore           # バックアップ一覧表示
npm run restore -- <file> # 指定ファイルからリストア
```

バックアップは `./backups/` にホストマウントされる。`make clean` / `npm run clean` で削除される。

---

## 対話型コマンド

npm scripts では対話型コマンドに制限があるため、以下は直接実行する。

```bash
# sqlcmdでDB接続
docker exec -it sqlserver-test /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'P@ssw0rd123!' -C -d AppDB

# コンテナにbash接続
docker exec -it sqlserver-test /bin/bash
```
