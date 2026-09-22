/**
 * 接続設定済みの .odb を生成して LibreOffice Base で開く。
 *
 *   npm run lo:base              # JDBC
 *   npm run lo:base -- --odbc    # ODBC（DSN は事前に作っておく）
 *
 * Base の接続ウィザードを手で埋める必要がなくなる。
 * GUI 起動時も JDBC ドライバを読ませる必要があるため、
 * Finder からではなく soffice を環境変数付きで直接起動する。
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const lo = require('./lo-common');

const RESULT_FILE = path.join(os.tmpdir(), 'lo_make_odb.txt');
const MACRO_URL =
  'vnd.sun.star.script:Standard.ConnTest.MakeOdb?language=Basic&location=application';

function resolveTarget() {
  const useOdbc = process.argv.includes('--odbc') || process.env.LO_DRIVER === 'odbc';
  if (useOdbc) {
    const dsn = process.env.LO_ODBC_DSN || 'SQLServerTest';
    return { kind: 'odbc', url: `sdbc:odbc:${dsn}`, driverClass: '', env: {} };
  }
  const javaEnv = lo.javaEnv();
  if (!javaEnv) {
    console.error('JDK か JDBC ドライバが見つからない。先に `npm run lo:setup` を実行すること。');
    process.exit(1);
  }
  return { kind: 'jdbc', url: lo.jdbcUrl(), driverClass: lo.JDBC_DRIVER_CLASS, env: javaEnv };
}

function main() {
  const soffice = lo.requireSoffice();
  const target = resolveTarget();
  const conn = lo.connection();
  const odbPath = path.join(lo.ROOT, `${conn.database}.odb`);

  lo.killSoffice();
  lo.installMacro(soffice);

  if (fs.existsSync(RESULT_FILE)) fs.unlinkSync(RESULT_FILE);
  if (fs.existsSync(odbPath)) fs.unlinkSync(odbPath);

  const env = {
    ...process.env,
    ...target.env,
    LO_TEST_URL: target.url,
    LO_TEST_USER: conn.user,
    LO_TEST_PASS: conn.password,
    LO_TEST_DRIVERCLASS: target.driverClass,
    LO_ODB_PATH: odbPath,
    LO_TEST_OUT: RESULT_FILE,
  };

  console.log(`Generating ${path.basename(odbPath)} [${target.kind}] ${target.url}`);
  spawnSync(soffice, ['--headless', '--norestore', '--nologo', MACRO_URL], {
    stdio: 'inherit',
    timeout: 300000,
    env,
  });
  lo.killSoffice();

  const out = fs.existsSync(RESULT_FILE) ? fs.readFileSync(RESULT_FILE, 'utf8').trim() : '';
  if (!out.includes('RESULT: SUCCESS') || !fs.existsSync(odbPath)) {
    console.error(out || '(no output)');
    console.error('Failed to generate the .odb file.');
    process.exit(1);
  }
  console.log(`Created: ${odbPath}`);

  // GUI 起動。JDBC の場合は Java 設定を環境変数で渡す必要があるため
  // `open` コマンドではなく soffice を直接起動する。
  console.log('Opening LibreOffice Base...');
  const child = spawn(soffice, ['--base', odbPath], {
    detached: true,
    stdio: 'ignore',
    env,
  });
  child.unref();

  console.log('');
  console.log(`  接続: ${target.url}`);
  console.log(`  ユーザー: ${conn.user} / ${conn.password}`);
  console.log('');
  console.log('左の「テーブル」に M_Customer などが並べば接続成功。');
}

main();
