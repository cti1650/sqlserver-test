/**
 * LibreOffice 関連スクリプトの共通処理。
 *
 * ローカル検証用のツール（JDK / JDBCドライバ）は .tools/ 配下に置く。
 * sudo が不要で、リポジトリを消せば環境も消えるようにするため。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TOOLS_DIR = path.join(ROOT, '.tools');
const JDK_DIR = path.join(TOOLS_DIR, 'jdk');
const JDBC_DIR = path.join(TOOLS_DIR, 'jdbc');

// https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/
// 13.2.0 は 13.6.0 より安定し、LibreOffice との互換性が高い
const MSSQL_JDBC_VERSION = '13.2.0.jre11';
const MSSQL_JDBC_JAR = path.join(JDBC_DIR, `mssql-jdbc-${MSSQL_JDBC_VERSION}.jar`);
const MSSQL_JDBC_URL =
  'https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/' +
  `${MSSQL_JDBC_VERSION}/mssql-jdbc-${MSSQL_JDBC_VERSION}.jar`;

// JDK 11 は mssql-jdbc と相性が良く、安定性が高い（JDK 21 は不安定）
const JDK_MAJOR = '11';

function sofficePath() {
  if (process.env.SOFFICE) return process.env.SOFFICE;
  switch (process.platform) {
    case 'darwin':
      return '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    case 'win32':
      return 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    default:
      return 'soffice';
  }
}

function requireSoffice() {
  const soffice = sofficePath();
  if (soffice.includes(path.sep) && !fs.existsSync(soffice)) {
    console.error(`LibreOffice not found: ${soffice}`);
    if (process.platform === 'darwin') {
      console.error('Install it with: brew install --cask libreoffice');
    }
    console.error('Or set SOFFICE to the soffice executable path.');
    process.exit(1);
  }
  return soffice;
}

function profileBasicDir() {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'LibreOffice', '4', 'user', 'basic');
    case 'win32':
      return path.join(process.env.APPDATA, 'LibreOffice', '4', 'user', 'basic');
    default:
      return path.join(home, '.config', 'libreoffice', '4', 'user', 'basic');
  }
}

function killSoffice() {
  // 起動済みインスタンスがあると新しい環境変数もマクロも読まないため落としておく
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/F', '/IM', 'soffice.bin'], { stdio: 'ignore' });
    spawnSync('taskkill', ['/F', '/IM', 'soffice.exe'], { stdio: 'ignore' });
  } else {
    spawnSync('pkill', ['-x', 'soffice'], { stdio: 'ignore' });
    spawnSync('pkill', ['-x', 'soffice.bin'], { stdio: 'ignore' });
  }
}

/** .tools/jdk 配下に展開された JDK の Home ディレクトリを探す */
function findLocalJavaHome() {
  if (!fs.existsSync(JDK_DIR)) return null;
  for (const entry of fs.readdirSync(JDK_DIR)) {
    const base = path.join(JDK_DIR, entry);
    // macOS は <jdk>/Contents/Home、Linux/Windows は <jdk> 直下
    for (const candidate of [path.join(base, 'Contents', 'Home'), base]) {
      const bin = path.join(candidate, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
      if (fs.existsSync(bin)) return candidate;
    }
  }
  return null;
}

/**
 * LibreOffice に Java と JDBC ドライバを渡すための環境変数を組み立てる。
 * すでに JAVA_HOME / CLASSPATH が設定されていればそちらを優先する（CI 用）。
 */
function javaEnv() {
  const javaHome = process.env.JAVA_HOME || findLocalJavaHome();
  const classpath = process.env.CLASSPATH || (fs.existsSync(MSSQL_JDBC_JAR) ? MSSQL_JDBC_JAR : null);
  if (!javaHome || !classpath) return null;
  return {
    JAVA_HOME: javaHome,
    CLASSPATH: classpath,
    // LibreOffice の Java フレームワークに GUI 設定ではなく環境変数を使わせる
    UNO_JAVA_JFW_ENV_JREHOME: '1',
    UNO_JAVA_JFW_ENV_CLASSPATH: '1',
    // JVM ヒープサイズを明示的に設定（LibreOffice の大量メモリ使用に対応）
    // Java 9+ モジュールシステムで sql モジュールを明示する（JDBC 呼び出しで必須）
    // これらは LibreOffice が JVM を起動するときに使用する
    _JAVA_OPTIONS: '-Xmx1024m --add-modules java.sql',
  };
}

/** 接続設定（既定はローカルコンテナ + app_user） */
function connection() {
  return {
    server: process.env.SQL_SERVER || '127.0.0.1',
    port: process.env.SQL_PORT || '1433',
    database: process.env.SQL_DATABASE || 'AppDB',
    user: process.env.LO_TEST_USER || 'app_user',
    password: process.env.LO_TEST_PASS || 'AppUserP@ss123!',
  };
}

function jdbcUrl() {
  const c = connection();
  return (
    `jdbc:sqlserver://${c.server}:${c.port};databaseName=${c.database};` +
    'encrypt=true;trustServerCertificate=true'
  );
}

const JDBC_DRIVER_CLASS = 'com.microsoft.sqlserver.jdbc.SQLServerDriver';

/** ci/libreoffice/ConnTest.xba をユーザープロファイルに配置する */
function installMacro(soffice) {
  const stdDir = path.join(profileBasicDir(), 'Standard');

  if (!fs.existsSync(stdDir)) {
    console.log('Creating LibreOffice user profile...');
    spawnSync(soffice, ['--headless', '--terminate_after_init'], {
      stdio: 'inherit',
      timeout: 120000,
    });
  }
  fs.mkdirSync(stdDir, { recursive: true });

  fs.copyFileSync(
    path.join(ROOT, 'ci', 'libreoffice', 'ConnTest.xba'),
    path.join(stdDir, 'ConnTest.xba')
  );

  // 既存モジュールを残したまま ConnTest を登録する
  const modules = fs
    .readdirSync(stdDir)
    .filter((f) => f.endsWith('.xba'))
    .map((f) => path.basename(f, '.xba'));
  const elements = modules.map((m) => ` <library:element library:name="${m}"/>`).join('\n');
  fs.writeFileSync(
    path.join(stdDir, 'script.xlb'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE library:library PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "library.dtd">
<library:library xmlns:library="http://openoffice.org/2000/library" library:name="Standard" library:readonly="false" library:passwordprotected="false">
${elements}
</library:library>
`
  );
  return { stdDir, modules };
}

module.exports = {
  ROOT,
  TOOLS_DIR,
  JDK_DIR,
  JDBC_DIR,
  JDK_MAJOR,
  MSSQL_JDBC_VERSION,
  MSSQL_JDBC_JAR,
  MSSQL_JDBC_URL,
  JDBC_DRIVER_CLASS,
  sofficePath,
  requireSoffice,
  profileBasicDir,
  killSoffice,
  findLocalJavaHome,
  javaEnv,
  connection,
  jdbcUrl,
  installMacro,
};
