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

/** システムにインストールされた JAVA_HOME を見つける（Homebrew など） */
function findSystemJavaHome() {
  if (process.platform === 'darwin') {
    try {
      const result = spawnSync('/usr/libexec/java_home', [], { encoding: 'utf8' });
      if (result.status === 0) return result.stdout.trim();
    } catch (e) {
      // 失敗時は次の方法へ
    }
  }
  try {
    const result = spawnSync('which', ['java'], { encoding: 'utf8' });
    if (result.status === 0) {
      const binPath = path.dirname(result.stdout.trim());
      return path.dirname(binPath);
    }
  } catch (e) {
    // 失敗時は null
  }
  return null;
}

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

  // JAVA_HOME をセット：.tools の JDK がなければ、システムにインストールされた Java を使う
  let javaHome = target.env.JAVA_HOME || process.env.JAVA_HOME || findSystemJavaHome();
  if (!javaHome) {
    console.error('✗ Java installation not found.');
    console.error('  Install with: brew install --cask temurin@11');
    process.exit(1);
  }

  const env = {
    ...process.env,
    ...target.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, 'bin')}:${process.env.PATH}`,
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
  console.log('');
  console.log('--- Macro result ---');
  console.log(out || '(no output)');
  console.log('--------------------');
  console.log('');

  if (!out.includes('RESULT: SUCCESS')) {
    console.error('Macro execution failed.');
    process.exit(1);
  }
  if (!fs.existsSync(odbPath)) {
    console.error('.odb file was not created.');
    process.exit(1);
  }
  console.log(`✓ Created: ${odbPath}`);

  // GUI 起動。JDBC の場合は Java 設定を環境変数で渡す必要があるため
  // `open` コマンドではなく soffice を直接起動する。
  console.log('Opening LibreOffice Base...');

  // 接続情報と Java 環境をサマリ表示
  console.log('');
  console.log('Connection settings:');
  console.log(`  URL: ${target.url}`);
  console.log(`  User: ${conn.user}`);
  console.log(`  Driver: ${target.kind.toUpperCase()}`);
  if (target.driverClass) console.log(`  JavaDriverClass: ${target.driverClass}`);
  if (env.JAVA_HOME) console.log(`  JAVA_HOME: ${env.JAVA_HOME}`);
  if (env.CLASSPATH) console.log(`  CLASSPATH: ${env.CLASSPATH}`);
  console.log('');

  const child = spawn(soffice, ['--base', odbPath], {
    detached: true,
    stdio: 'ignore',
    env,
  });
  child.unref();

  console.log('Base is starting...');
  console.log('');
  console.log('If Base fails to open:');
  console.log('  1. Check Console.log (Help > Show Console)');
  console.log('  2. Run: npm run lo:test   (to verify connection works)');
  console.log('');
  console.log('If tables are empty:');
  console.log('  1. Tools > Options > LibreOffice > Advanced');
  console.log('  2. Ensure Java is enabled and JDK path is set');
  console.log('  3. Restart LibreOffice');
}

main();
