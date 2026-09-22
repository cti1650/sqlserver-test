# LibreOffice Base からの接続

LibreOffice Base から本環境の SQL Server に接続する手順。
**JDBC / ODBC のどちらでも接続できるが、JDBC を推奨する。**

---

## どちらを使うか

| | JDBC | ODBC |
|---|------|------|
| Windows | ○ | ○（OS 標準の DM + MS 製ドライバ） |
| macOS | ○ | △（ドライバをソースビルドする必要あり） |
| 日本語の読み取り | ○ | ○ |
| 日本語の書き込み | ○ | Windows は OS ロケール依存 / **macOS は不可** |
| 追加で必要なもの | JDK + jar 1個 | OS ごとに別手順 |
| 環境差 | OS を問わず同じ手順 | OS ごとに手順が違う |

JDBC は OS のコードページを経由せず UTF-16 のまま通信するため、文字コードまわりの事故が起きない。
Windows / macOS で手順が共通になるのも利点。

**ODBC は、既に DSN 運用が確立している Windows 環境に合わせる場合だけ選ぶ。**

---

## すぐ試す（macOS / Linux）

JDK と JDBC ドライバの用意から Base の起動まで、コマンドで完結する。
LibreOffice 本体（`brew install --cask libreoffice`）と起動中の SQL Server だけ用意しておく。

```bash
npm run lo:setup   # JDK と JDBC ドライバを .tools/ に用意する（sudo 不要）
npm run lo:test    # ヘッドレスで接続・読み書きを検証する
npm run lo:base    # 接続設定済みの AppDB.odb を作って Base で開く
```

`npm run lo:base` が作る `AppDB.odb` は接続先・ユーザー・パスワードまで設定済みなので、
Base の接続ウィザードを手で埋める必要はない。左の「テーブル」に `M_Customer` などが
並べば接続成功。

ODBC 側を試したい場合は `-- --odbc` を付ける（DSN は[後述の手順](#odbc-で接続するmacos)で先に作る）。

```bash
npm run lo:test -- --odbc
npm run lo:base -- --odbc
```

> `.tools/` と `*.odb` は `.gitignore` 済み。リポジトリを消せばツールも消える。
> `AppDB.odb` にはパスワードが平文で入るので、検証用途以外では共有しないこと。

以下は、この自動化が何をやっているかの手動手順。
Windows や、GUI から自分で設定したい場合はこちらを参照する。

---

## JDBC で接続する（推奨）

### 1. JDK を入れる

LibreOffice は Java ランタイムを自前で持たないので、別途 JDK が必要。

**重要: LibreOffice 本体と JDK のアーキテクチャを揃えること。**
Apple Silicon の Mac で arm64 版 LibreOffice を使っているなら JDK も arm64 版を入れる。
Windows で 64bit 版 LibreOffice を使っているなら JDK も 64bit 版。

```bash
# macOS
brew install --cask temurin@21
```

Windows は [Adoptium](https://adoptium.net/) から Temurin 21 (LTS) の `.msi` を入れる。

JDK 17 以降であれば動作する。LTS を選んでおくのが無難。

インストール確認:

```bash
# macOS / Linux
/usr/libexec/java_home -V   # macOS
java -version
```

### 2. JDBC ドライバ (jar) を入手する

Microsoft JDBC Driver for SQL Server を Maven Central から取得する。

```bash
# macOS / Linux
mkdir -p ~/jdbc
curl -L -o ~/jdbc/mssql-jdbc-13.6.0.jre11.jar \
  https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/13.6.0.jre11/mssql-jdbc-13.6.0.jre11.jar
```

Windows は同じ URL をブラウザで開いて任意のフォルダ（例: `C:\jdbc\`）に保存する。

- `jre11` 版は JDK 11 以降で動く。JDK 21 / 25 でもこれを使う
- JDK 8 を使う場合だけ `jre8` 版を選ぶ
- 最新版は [Maven Central のバージョン一覧](https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/) で確認できる

### 3. LibreOffice に Java と jar を登録する

1. LibreOffice を起動し、**ツール › オプション › LibreOffice › 詳細** を開く
2. **「Java 実行環境を使用する」にチェック**を入れる
3. 検出された JRE の一覧から、入れた Temurin を選択する
   - 出てこない場合は「追加」でインストール先を指定する
     （macOS: `/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home`）
4. **「クラスパス」ボタン → 「アーカイブを追加」** で手順 2 の jar を追加する
5. **LibreOffice を完全に終了して起動し直す**（再起動しないと反映されない）

> macOS で LibreOffice をメニューから終了しても裏に残ることがある。
> 反映されないときは `pkill -x soffice` してから起動し直す。

### 4. Base からデータベースに接続する

1. LibreOffice Base を起動 → **「既存のデータベースに接続」** → 一覧から **JDBC** を選択
2. 接続情報を入力する

   | 項目 | 値 |
   |------|-----|
   | データソースの URL | `sqlserver://127.0.0.1:1433;databaseName=AppDB;encrypt=true;trustServerCertificate=true` |
   | JDBC ドライバークラス | `com.microsoft.sqlserver.jdbc.SQLServerDriver` |

   - URL の先頭の `jdbc:` は LibreOffice が自動で付けるので入力しない
   - 接続できない場合は `jdbc:sqlserver://...` と先頭から入力する形も試す（バージョン差がある）
   - **「クラスのテスト」を押して成功すること**を先に確認する。ここで失敗するなら
     jar の登録か再起動ができていない

3. 次の画面でユーザー名 `app_user` を入力し、**「パスワードが必要」にチェック**を入れる
4. 「テスト接続」で `AppUserP@ss123!` を入力して疎通を確認する
5. `.odb` ファイルとして保存する

### 接続パラメータの補足

- `trustServerCertificate=true` は必須。本環境の SQL Server は自己署名証明書を使っているため、
  これがないと証明書検証で失敗する
- `encrypt=true` は JDBC ドライバ 10 以降の既定値なので省略してもよいが、明示しておく
- ポートやユーザーを変える場合は [connection.md](connection.md) を参照

### 動作確認

接続後、Base の「テーブル」に `M_Customer` / `M_Product` / `T_Sales` / `T_SalesDetail` が並べば成功。
`M_Customer` を開いて日本語が正しく表示され、行を追加・編集して保存できることを確認する。

GUI を触らずに確認したい場合は [自動テスト](#自動テスト) を使う。

`app_user` は `db_datareader` / `db_datawriter` のみを持つ。
テーブル定義の変更が必要な場合は `sa` で接続する（[connection.md](connection.md)）。

### GUI を使わずに Java を設定する

CI やセットアップスクリプトからは、手順 3 の GUI 設定の代わりに環境変数で指定できる
（LibreOffice の Java フレームワークの direct mode）。

```bash
export JAVA_HOME=/path/to/jdk
export CLASSPATH=/path/to/mssql-jdbc-13.6.0.jre11.jar
export UNO_JAVA_JFW_ENV_JREHOME=1      # JAVA_HOME を JRE として使う
export UNO_JAVA_JFW_ENV_CLASSPATH=1    # CLASSPATH をクラスパスとして使う
```

この 4 つを設定しておけば、プロファイルに Java 設定が無くても JDBC 接続できる。

---

## ODBC で接続する（Windows）

Windows は OS 標準の ODBC ドライバマネージャ（`odbc32.dll`）があるので素直に繋がる。

1. [ODBC Driver 18 for SQL Server](https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server) の MSI を入れる
2. **LibreOffice と同じビット数の ODBC アドミニストレータ**で DSN を作る
   - 64bit 版 LibreOffice → `C:\Windows\System32\odbcad32.exe`
   - 32bit 版 LibreOffice → `C:\Windows\SysWOW64\odbcad32.exe`
   - **ここを間違えると「DSN が見つからない」になる。Windows ODBC の定番トラブル**
3. DSN の設定内容は [ado-vba.md の ODBC 設定手順](ado-vba.md#odbc-dsn-の作成windows) と同じ
4. Base で「既存のデータベースに接続」→ **ODBC** → 作成した DSN を選択

### 注意: 日本語は OS ロケールに依存する

LibreOffice の ODBC コネクタは SQL 文を ANSI API で渡す。Windows のドライバマネージャは
これを **システムロケールの ANSI コードページ**で Unicode に変換する。

- 日本語版 Windows（ACP = CP932）→ 日本語は通る
- 英語版 Windows（ACP = CP1252）→ **日本語が `?` に化ける**

端末のロケールが混在する運用なら ODBC は避けて JDBC にする。

---

## ODBC で接続する（macOS）

**この経路は日本語の書き込みができない。読み取り専用の用途に限る。**
日本語を入力・更新するなら JDBC を使うこと。

### なぜ Homebrew のドライバでは繋がらないか

macOS 版 LibreOffice の ODBC コネクタは、実行時に **OS 同梱の iODBC**
(`/usr/lib/libiodbc.2.dylib`) を `dlopen` する。unixODBC は参照しない。

iODBC は `SQLWCHAR` が 4 バイト、unixODBC は 2 バイトで ABI が違う。
そのため **unixODBC 向けにビルドされたドライバは iODBC から呼ぶと接続できない**。

- Homebrew の `freetds` → unixODBC 向け → **使えない**
- Microsoft の `msodbcsql18` → unixODBC 向け → **使えない**

`isql`（unixODBC 付属）で繋がっても LibreOffice では繋がらないのはこのため。

### FreeTDS を iODBC 向けにビルドする

```bash
brew install libiodbc            # keg-only
brew install openssl@3

curl -LO https://www.freetds.org/files/stable/freetds-1.5.17.tar.gz
tar xzf freetds-1.5.17.tar.gz && cd freetds-1.5.17

./configure --prefix=/opt/homebrew/opt/freetds-iodbc \
  --with-iodbc=/opt/homebrew/opt/libiodbc \
  --with-openssl=/opt/homebrew/opt/openssl@3 \
  --without-unixodbc --disable-dependency-tracking
make -j8 && make install
```

`tsql -C` の出力に `iODBC: yes` / `unixodbc: no` が出ていればよい。

### DSN を定義する

iODBC が読むのは `~/Library/ODBC/` 配下。unixODBC の `~/.odbc.ini` ではない。

`~/Library/ODBC/odbcinst.ini`:

```ini
[FreeTDS]
Description = FreeTDS Driver (iODBC build)
Driver      = /opt/homebrew/opt/freetds-iodbc/lib/libtdsodbc.so
Setup       = /opt/homebrew/opt/freetds-iodbc/lib/libtdsodbc.so
FileUsage   = 1
```

`~/Library/ODBC/odbc.ini`:

```ini
[ODBC Data Sources]
SQLServerTest = FreeTDS

[SQLServerTest]
Driver        = FreeTDS
Description   = Local SQL Server (docker)
Server        = 127.0.0.1
Port          = 1433
Database      = AppDB
TDS_Version   = 7.4
ClientCharset = UTF-8
```

`Driver` をパスではなくドライバ名で書いておくと、iODBC と unixODBC が
それぞれ自分の `odbcinst.ini` を見に行くので、同じ DSN 名を両方で使い回せる。

Base では「既存のデータベースに接続」→ **ODBC** → `SQLServerTest` を選ぶ。

### 制約（実測）

SQL Server 2022 / LibreOffice 26.8 / FreeTDS 1.5.17 での確認結果:

| 操作 | 結果 |
|------|------|
| 接続・テーブル一覧の取得 | ○ |
| ASCII データの読み書き | ○ |
| 既存の日本語データの読み取り | ○ |
| 日本語の書き込み（`CharSet` 未指定） | **× `?` に化ける** |
| 日本語の書き込み（`CharSet=UTF-8` 指定） | **× 文字化け／変換エラー** |

iODBC の ANSI API は SQL 文テキストを必ずワイド文字版に変換してドライバへ渡すが、
この変換がバイト単位の Latin-1 拡張しかしないため日本語が壊れる。
データバッファ（`SQLBindParameter` / `SQLGetData`）は変換されず素通しするので、
読み取りだけが無事に見える。

ドライバ側の設定では回避できない。**日本語を書くなら JDBC を使うこと。**

---

## 自動テスト

LibreOffice をヘッドレスで起動し、Base と同じ SDBC 経由で接続・読み書きを検証する。
検証内容は 接続 → メタデータ取得 → テーブル一覧 → SELECT → パラメータ経由の
INSERT / DELETE → 日本語の書き込み。

```bash
npm run lo:test              # JDBC（.tools/ の JDK とドライバを自動で使う）
npm run lo:test -- --odbc    # ODBC（DSN は事前に作っておく）
```

構成ファイル:

| ファイル | 役割 |
|---------|------|
| `ci/libreoffice/ConnTest.xba` | 接続検証マクロ（`RunTest`）と .odb 生成マクロ（`MakeOdb`） |
| `scripts/lo-common.js` | パス解決・環境変数の組み立て・マクロ配置 |
| `scripts/setup-libreoffice.js` | `lo:setup` の実体 |
| `scripts/test-libreoffice.js` | `lo:test` の実体 |
| `scripts/open-base.js` | `lo:base` の実体 |

明示的に指定したい場合は環境変数で上書きできる。

| 環境変数 | 説明 |
|---------|------|
| `LO_TEST_URL` | 接続 URL。指定するとドライバの自動判定より優先される |
| `LO_TEST_DRIVERCLASS` | JDBC ドライバークラス |
| `LO_TEST_USER` / `LO_TEST_PASS` | 既定は `app_user` / `AppUserP@ss123!` |
| `LO_TEST_CHARSET` | `CharSet` 接続プロパティ（任意） |
| `LO_TEST_REQUIRE_JP` | `1` で日本語書き込みの成功も必須にする |
| `LO_ODBC_DSN` | ODBC 時の DSN 名（既定 `SQLServerTest`） |
| `SOFFICE` | soffice 実行ファイルのパス（自動検出を上書き） |
| `JAVA_HOME` / `CLASSPATH` | 指定すると `.tools/` より優先される（CI はこの経路） |

> マクロは LibreOffice のユーザープロファイルの Standard ライブラリに
> `ConnTest` モジュールとして配置される。既存のモジュールは残す。
> 起動済みの LibreOffice があると設定を読み直さないため、実行前に終了させる。

### CI

`.github/workflows/client-test.yml`（手動実行）で 2 パターンを回している。

| ジョブ | ランナー | 内容 |
|-------|---------|------|
| `macos-jdbc` | `macos-15-intel` | Colima で docker-compose を起動し、JDBC で接続。日本語書き込みも必須 |
| `windows-odbc` | `windows-latest` | SQL Server Express を直接入れて ODBC DSN 経由で接続 |

Windows ランナーの Docker は Windows コンテナ専用で Linux イメージを動かせないため、
`windows-odbc` ジョブだけは `docker-compose.yml` を使わず SQL Server Express を
ランナーに直接インストールしている。**このジョブが検証しているのは
「DDL + クライアント接続」であって compose 環境そのものではない。**

macOS 側は SQL Server の公式イメージが amd64 のみのため Intel ランナー（`macos-15-intel`）を使う。

---

## トラブルシューティング

### Base が起動時にクラッシュ（Java GC Thread エラー）

**症状**: LibreOffice が起動直後に「Abort trap: 6」で落ちる、またはメモリエラーで落ちる。

**原因**: JVM のヒープメモリ不足。LibreOffice は JDBC 経由で大量のメモリを使用します。

**対応**:

1. **JVM ヒープサイズを増やす** — `lo:setup` から再度実行すると `_JAVA_OPTIONS=-Xmx512m` が設定されます
   ```bash
   npm run lo:setup
   ```

2. **LibreOffice の Java メモリ設定を確認**
   - Tools > Options > LibreOffice > Java
   - Java が**有効**か確認
   - JDK パスが正しいか確認
   - メモリ設定があれば、さらに増やす（1GB 以上推奨）

3. **再度 Base を起動**
   ```bash
   npm run lo:base
   ```

マシンのメモリが十分（8GB 以上）でも、JVM に割り当てるヒープが小さすぎるとクラッシュします。

### JDBC: 「クラスのテスト」で失敗する

- jar をクラスパスに追加した後 LibreOffice を再起動していない
- JDK と LibreOffice のアーキテクチャが違う（Intel 版 JDK × arm64 版 LibreOffice など）
- `jre8` 版の jar を JDK 11 以降で使っている

### JDBC: 証明書エラーで接続できない

URL に `trustServerCertificate=true` が入っているか確認する。

### 接続自体ができない

まずコンテナ側を確認する。

```bash
make ps       # 起動しているか
make test     # SQL Server に到達できるか
```

`docker-compose.yml` は `127.0.0.1:1433` にバインドしているため、
**同じ端末からの接続のみ**。別端末から繋ぐならポート公開設定を変更する必要がある。

### macOS ODBC: 接続時に `Server SYBASE not found` が出る

unixODBC 向けドライバを iODBC から呼んでいる。上記のソースビルド手順をやり直す。
