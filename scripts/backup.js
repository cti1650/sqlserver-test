const { execSql, config } = require('./exec-sql');
const { execSync } = require('child_process');

const MAX_GENERATIONS = 7;
const BACKUP_DIR = '/var/opt/mssql/backup';

const backupName = `AppDB_${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
const backupPath = `${BACKUP_DIR}/${backupName}`;

console.log(`Creating backup: ${backupName}`);

// バックアップディレクトリを作成
if (!config.external) {
  try {
    execSync(`docker exec ${config.container} mkdir -p ${BACKUP_DIR}`, { stdio: 'inherit' });
  } catch (e) {
    // ディレクトリが既に存在する場合は無視
  }
}

// Express Editionでは COMPRESSION がサポートされていないため除外
const sql = `
BACKUP DATABASE AppDB
TO DISK = '${backupPath}'
WITH FORMAT, INIT,
NAME = 'AppDB Full Backup';
`;

const result = execSql(sql, { database: 'master' });

if (!result.success) {
  console.error('Backup failed:', result.error);
  process.exit(1);
}

console.log(`Backup completed: ${backupPath}`);

// 古いバックアップを削除（7世代管理）
console.log(`\nManaging backup generations (max: ${MAX_GENERATIONS})...`);

try {
  // findを使ってファイル一覧を取得し、時刻順でソート
  const listCmd = config.external
    ? `find ${BACKUP_DIR} -name 'AppDB_*.bak' -type f | xargs ls -1t 2>/dev/null`
    : `docker exec ${config.container} bash -c "find ${BACKUP_DIR} -name 'AppDB_*.bak' -type f | xargs ls -1t 2>/dev/null"`;

  const files = execSync(listCmd, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(f => f);

  console.log(`Current backups: ${files.length}`);

  if (files.length > MAX_GENERATIONS) {
    const toDelete = files.slice(MAX_GENERATIONS);
    console.log(`Deleting ${toDelete.length} old backup(s)...`);

    for (const file of toDelete) {
      const delCmd = config.external
        ? `rm -f "${file}"`
        : `docker exec ${config.container} rm -f "${file}"`;
      execSync(delCmd, { stdio: 'inherit' });
      console.log(`  Deleted: ${file.split('/').pop()}`);
    }
  }

  // 現在のバックアップ一覧を表示
  console.log('\nCurrent backups:');
  const remaining = files.slice(0, MAX_GENERATIONS);
  remaining.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.split('/').pop()}`);
  });
} catch (e) {
  // バックアップファイルがない場合は無視
}
