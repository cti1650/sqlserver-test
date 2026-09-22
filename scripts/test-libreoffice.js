/**
 * LibreOffice Base から SQL Server への接続をヘッドレスで検証する。
 *
 * ci/libreoffice/ConnTest.xba を LibreOffice のユーザープロファイルに配置し、
 * soffice を headless で起動してマクロを実行、結果ファイルを判定する。
 *
 * 環境変数:
 *   LO_TEST_URL         接続URL（必須）
 *                       ODBC: sdbc:odbc:<DSN名>
 *                       JDBC: jdbc:sqlserver://host:port;databaseName=...
 *   LO_TEST_DRIVERCLASS JDBCドライバークラス（JDBC時のみ）
 *   LO_TEST_USER        ユーザー名（既定 app_user）
 *   LO_TEST_PASS        パスワード（既定 AppUserP@ss123!）
 *   LO_TEST_CHARSET     CharSet接続プロパティ（任意）
 *   LO_TEST_REQUIRE_JP  1 なら日本語の書き込み成功も必須にする
 *   SOFFICE             soffice実行ファイルのパス（自動検出を上書き）
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MACRO_SRC = path.join(__dirname, '..', 'ci', 'libreoffice', 'ConnTest.xba');
const RESULT_FILE = path.join(os.tmpdir(), 'lo_conn_test.txt');
const MACRO_URL =
  'vnd.sun.star.script:Standard.ConnTest.RunTest?language=Basic&location=application';

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

function run(cmd, args, extraEnv, timeout) {
  return spawnSync(cmd, args, {
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
    timeout,
  });
}

function killSoffice() {
  // 起動済みインスタンスがあると新しいマクロを読まないため落としておく
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/F', '/IM', 'soffice.bin'], { stdio: 'ignore' });
    spawnSync('taskkill', ['/F', '/IM', 'soffice.exe'], { stdio: 'ignore' });
  } else {
    spawnSync('pkill', ['-x', 'soffice'], { stdio: 'ignore' });
    spawnSync('pkill', ['-x', 'soffice.bin'], { stdio: 'ignore' });
  }
}

function installMacro(soffice) {
  const basicDir = profileBasicDir();
  const stdDir = path.join(basicDir, 'Standard');

  // プロファイル未作成なら一度起動して作らせる
  if (!fs.existsSync(stdDir)) {
    console.log('Creating LibreOffice user profile...');
    run(soffice, ['--headless', '--terminate_after_init'], {}, 120000);
  }
  fs.mkdirSync(stdDir, { recursive: true });

  fs.copyFileSync(MACRO_SRC, path.join(stdDir, 'ConnTest.xba'));

  // 既存モジュールを残したまま ConnTest を登録する
  const modules = fs
    .readdirSync(stdDir)
    .filter((f) => f.endsWith('.xba'))
    .map((f) => path.basename(f, '.xba'));
  const elements = modules
    .map((m) => ` <library:element library:name="${m}"/>`)
    .join('\n');
  fs.writeFileSync(
    path.join(stdDir, 'script.xlb'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE library:library PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" "library.dtd">
<library:library xmlns:library="http://openoffice.org/2000/library" library:name="Standard" library:readonly="false" library:passwordprotected="false">
${elements}
</library:library>
`
  );
  console.log(`Macro installed: ${stdDir} (modules: ${modules.join(', ')})`);
}

function main() {
  const url = process.env.LO_TEST_URL;
  if (!url) {
    console.error('LO_TEST_URL is required.');
    process.exit(1);
  }

  const soffice = sofficePath();
  if (soffice.includes(path.sep) && !fs.existsSync(soffice)) {
    console.error(`soffice not found: ${soffice}`);
    console.error('Set SOFFICE to the soffice executable path.');
    process.exit(1);
  }

  killSoffice();
  installMacro(soffice);

  if (fs.existsSync(RESULT_FILE)) fs.unlinkSync(RESULT_FILE);

  console.log(`Running LibreOffice connection test (${url})...`);
  const r = run(
    soffice,
    ['--headless', '--norestore', '--nologo', MACRO_URL],
    {
      LO_TEST_URL: url,
      LO_TEST_USER: process.env.LO_TEST_USER || 'app_user',
      LO_TEST_PASS: process.env.LO_TEST_PASS || 'AppUserP@ss123!',
      LO_TEST_DRIVERCLASS: process.env.LO_TEST_DRIVERCLASS || '',
      LO_TEST_CHARSET: process.env.LO_TEST_CHARSET || '',
      LO_TEST_OUT: RESULT_FILE,
    },
    300000
  );
  killSoffice();

  if (!fs.existsSync(RESULT_FILE)) {
    console.error('');
    console.error(`No result file produced (soffice exit=${r.status}).`);
    console.error('The macro did not run. Check the LibreOffice installation.');
    process.exit(1);
  }

  const out = fs.readFileSync(RESULT_FILE, 'utf8').trim();
  console.log('');
  console.log('--- LibreOffice result ---');
  console.log(out);
  console.log('--------------------------');

  if (!out.includes('RESULT: SUCCESS')) {
    console.error('LibreOffice connection test FAILED.');
    process.exit(1);
  }
  if (process.env.LO_TEST_REQUIRE_JP === '1' && !out.includes('JP-WRITE: OK')) {
    console.error('Japanese write was required but did not succeed.');
    process.exit(1);
  }
  console.log('LibreOffice connection test passed.');
}

main();
