/**
 * LibreOffice Base から SQL Server への接続をヘッドレスで検証する。
 *
 * ci/libreoffice/ConnTest.xba を LibreOffice のユーザープロファイルに配置し、
 * soffice を headless で起動してマクロを実行、結果ファイルを判定する。
 *
 * 引数・環境変数を何も指定しなければ JDBC でローカルコンテナに繋ぐ。
 * 事前に `npm run lo:setup` を実行しておくこと。
 *
 *   npm run lo:test              # JDBC
 *   npm run lo:test -- --odbc    # ODBC（DSN は事前に作っておく）
 *
 * 明示指定する場合の環境変数:
 *   LO_TEST_URL         接続URL（指定するとドライバ自動判定より優先）
 *   LO_TEST_DRIVERCLASS JDBCドライバークラス
 *   LO_TEST_USER        ユーザー名（既定 app_user）
 *   LO_TEST_PASS        パスワード（既定 AppUserP@ss123!）
 *   LO_TEST_CHARSET     CharSet接続プロパティ（任意）
 *   LO_TEST_REQUIRE_JP  1 なら日本語の書き込み成功も必須にする
 *   LO_ODBC_DSN         ODBC時のDSN名（既定 SQLServerTest）
 *   SOFFICE             soffice実行ファイルのパス（自動検出を上書き）
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const lo = require('./lo-common');

const RESULT_FILE = path.join(os.tmpdir(), 'lo_conn_test.txt');
const MACRO_URL =
  'vnd.sun.star.script:Standard.ConnTest.RunTest?language=Basic&location=application';

function resolveTarget() {
  const useOdbc = process.argv.includes('--odbc') || process.env.LO_DRIVER === 'odbc';

  // URL が明示されていればそのまま使う（CI はこの経路）
  if (process.env.LO_TEST_URL) {
    return {
      kind: process.env.LO_TEST_URL.startsWith('sdbc:odbc:') ? 'odbc' : 'jdbc',
      url: process.env.LO_TEST_URL,
      driverClass: process.env.LO_TEST_DRIVERCLASS || '',
      env: {},
    };
  }

  if (useOdbc) {
    const dsn = process.env.LO_ODBC_DSN || 'SQLServerTest';
    return { kind: 'odbc', url: `sdbc:odbc:${dsn}`, driverClass: '', env: {} };
  }

  const javaEnv = lo.javaEnv();
  if (!javaEnv) {
    console.error('JDK か JDBC ドライバが見つからない。');
    console.error('  npm run lo:setup');
    console.error('を先に実行すること（または JAVA_HOME と CLASSPATH を設定する）。');
    process.exit(1);
  }
  return {
    kind: 'jdbc',
    url: lo.jdbcUrl(),
    driverClass: lo.JDBC_DRIVER_CLASS,
    env: javaEnv,
  };
}

function main() {
  const soffice = lo.requireSoffice();
  const target = resolveTarget();
  const conn = lo.connection();

  lo.killSoffice();
  const { stdDir, modules } = lo.installMacro(soffice);
  console.log(`Macro installed: ${stdDir} (modules: ${modules.join(', ')})`);

  if (fs.existsSync(RESULT_FILE)) fs.unlinkSync(RESULT_FILE);

  console.log(`Running LibreOffice connection test [${target.kind}] ${target.url}`);
  const r = spawnSync(soffice, ['--headless', '--norestore', '--nologo', MACRO_URL], {
    stdio: 'inherit',
    timeout: 300000,
    env: {
      ...process.env,
      ...target.env,
      LO_TEST_URL: target.url,
      LO_TEST_USER: conn.user,
      LO_TEST_PASS: conn.password,
      LO_TEST_DRIVERCLASS: target.driverClass,
      LO_TEST_CHARSET: process.env.LO_TEST_CHARSET || '',
      LO_TEST_OUT: RESULT_FILE,
    },
  });
  lo.killSoffice();

  if (!fs.existsSync(RESULT_FILE)) {
    console.error('');
    console.error(`✗ No result file produced (soffice exit=${r.status}).`);
    console.error('');
    console.error('Possible causes:');
    console.error('  1. LibreOffice not found (check SOFFICE env var)');
    console.error('  2. User profile missing (running macOS Big Sur+?)');
    console.error('  3. LibreOffice crashed or hung (force kill and retry)');
    console.error('');
    console.error(`Debug info: ${RESULT_FILE} was not created.`);
    process.exit(1);
  }

  const out = fs.readFileSync(RESULT_FILE, 'utf8').trim();
  console.log('');
  console.log('--- LibreOffice result ---');
  console.log(out);
  console.log('--------------------------');

  if (!out.includes('RESULT: SUCCESS')) {
    console.error('');
    console.error('✗ LibreOffice connection test FAILED.');
    if (out.includes('EXCEPTION')) {
      const match = out.match(/EXCEPTION: (.+)/);
      console.error('');
      console.error('Error details:');
      if (match) console.error(`  ${match[1]}`);
    }
    console.error('');
    console.error('Next steps:');
    console.error('  1. Check SQL Server is running: npm run test:connection');
    console.error('  2. Check LibreOffice version: /Applications/LibreOffice.app --version');
    console.error('  3. Check Java: java -version');
    process.exit(1);
  }
  if (process.env.LO_TEST_REQUIRE_JP === '1' && !out.includes('JP-WRITE: OK')) {
    console.error('Japanese write was required but did not succeed.');
    process.exit(1);
  }
  if (out.includes('JP-WRITE: NG')) {
    console.log('');
    console.log('注意: 日本語の書き込みに失敗している。');
    console.log('      ODBC 経由の既知の制約。docs/libreoffice-base.md を参照。');
  }
  console.log('LibreOffice connection test passed.');
}

main();
