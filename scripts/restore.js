const { execSql } = require('./exec-sql');

const backupName = process.argv[2];

if (!backupName) {
  console.log('Usage: npm run restore <backup-file>');
  console.log('Example: npm run restore AppDB_2024-01-15.bak');
  console.log('\nListing available backups...\n');

  // バックアップ一覧を表示
  const listSql = `
SELECT
  name AS BackupFile,
  CAST(backup_size / 1024 / 1024 AS DECIMAL(10,2)) AS SizeMB,
  backup_finish_date AS CompletedAt
FROM msdb.dbo.backupset
WHERE database_name = 'AppDB'
ORDER BY backup_finish_date DESC;
`;
  execSql(listSql, { database: 'master' });
  process.exit(0);
}

const backupPath = `/var/opt/mssql/backup/${backupName}`;

console.log(`Restoring from: ${backupName}`);

const sql = `
USE master;
GO

-- 既存の接続を切断
ALTER DATABASE AppDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

RESTORE DATABASE AppDB
FROM DISK = '${backupPath}'
WITH REPLACE;
GO

ALTER DATABASE AppDB SET MULTI_USER;
GO

SELECT 'Restore completed successfully' AS Status;
`;

const result = execSql(sql, { database: 'master' });

if (result.success) {
  console.log(`\nRestore completed from: ${backupPath}`);
} else {
  console.error('Restore failed:', result.error);
  process.exit(1);
}
