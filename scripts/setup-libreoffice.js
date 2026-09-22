/**
 * LibreOffice Base から JDBC で接続するためのローカル環境を用意する。
 *
 *   - Temurin JDK を .tools/jdk に展開（sudo 不要）
 *   - Microsoft JDBC Driver の jar を .tools/jdbc に配置
 *   - LibreOffice の有無を確認
 *
 * すでに揃っているものはスキップする。何度実行してもよい。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const lo = require('./lo-common');

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (exit ${r.status})`);
  }
}

function adoptiumUrl() {
  const osName = { darwin: 'mac', win32: 'windows', linux: 'linux' }[process.platform];
  const arch = { arm64: 'aarch64', x64: 'x64' }[process.arch];
  if (!osName || !arch) {
    throw new Error(`Unsupported platform: ${process.platform}/${process.arch}`);
  }
  return (
    `https://api.adoptium.net/v3/binary/latest/${lo.JDK_MAJOR}/ga/` +
    `${osName}/${arch}/jdk/hotspot/normal/eclipse`
  );
}

function setupJdk() {
  const existing = lo.findLocalJavaHome();
  if (existing) {
    console.log(`JDK: already present (${existing})`);
    return existing;
  }
  if (process.env.JAVA_HOME) {
    console.log(`JDK: using JAVA_HOME (${process.env.JAVA_HOME})`);
    return process.env.JAVA_HOME;
  }
  if (process.platform === 'win32') {
    console.error('Windows では JDK の自動セットアップに対応していない。');
    console.error('https://adoptium.net/ から Temurin を入れて JAVA_HOME を設定すること。');
    process.exit(1);
  }

  fs.mkdirSync(lo.JDK_DIR, { recursive: true });
  const tarball = path.join(lo.TOOLS_DIR, 'jdk.tar.gz');
  console.log(`JDK: downloading Temurin ${lo.JDK_MAJOR} (${process.platform}/${process.arch})...`);
  sh('curl', ['-fsSL', '-o', tarball, adoptiumUrl()]);
  console.log('JDK: extracting...');
  sh('tar', ['xzf', tarball, '-C', lo.JDK_DIR]);
  fs.unlinkSync(tarball);

  const javaHome = lo.findLocalJavaHome();
  if (!javaHome) throw new Error('JDK extraction failed: java executable not found');
  console.log(`JDK: ${javaHome}`);
  return javaHome;
}

function setupJdbcDriver() {
  if (fs.existsSync(lo.MSSQL_JDBC_JAR)) {
    console.log(`JDBC driver: already present (${path.relative(lo.ROOT, lo.MSSQL_JDBC_JAR)})`);
    return;
  }
  fs.mkdirSync(lo.JDBC_DIR, { recursive: true });
  console.log(`JDBC driver: downloading mssql-jdbc ${lo.MSSQL_JDBC_VERSION}...`);
  sh('curl', ['-fsSL', '-o', lo.MSSQL_JDBC_JAR, lo.MSSQL_JDBC_URL]);
  console.log(`JDBC driver: ${path.relative(lo.ROOT, lo.MSSQL_JDBC_JAR)}`);
}

function main() {
  console.log('--- LibreOffice Base (JDBC) setup ---');

  const soffice = lo.requireSoffice();
  console.log(`LibreOffice: ${soffice}`);

  const javaHome = setupJdk();
  setupJdbcDriver();

  const java = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  const v = spawnSync(java, ['-version'], { encoding: 'utf8' });
  console.log(`Java: ${(v.stderr || '').split('\n')[0]}`);

  console.log('');
  console.log('Setup complete. Next:');
  console.log('  npm run lo:test    # ヘッドレスで接続を検証');
  console.log('  npm run lo:base    # Base で接続済みの .odb を開く');
}

try {
  main();
} catch (e) {
  console.error(`Setup failed: ${e.message}`);
  process.exit(1);
}
