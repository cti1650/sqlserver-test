const path = require('path');
const fs = require('fs');
const { execSqlFile } = require('./exec-sql');
const { detectEnvironment, ENV_TYPES } = require('./detect-env');

const DDL_DIR = path.join(__dirname, '..', 'ddl');

// 環境ごとに実行するファイルを定義
const DDL_FILES = {
  [ENV_TYPES.ON_PREMISE]: [
    '01-database.sql',
    '02-tables.sql',
    '03-data.sql',
    '04-users-onprem.sql',
  ],
  [ENV_TYPES.AZURE_SQL_MI]: [
    '01-database.sql',
    '02-tables.sql',
    '03-data.sql',
    '04-users-onprem.sql',
  ],
  [ENV_TYPES.AZURE_SQL_DB]: [
    // CREATE DATABASE不可のため01を除外
    '02-tables.sql',
    '03-data.sql',
    '04-users-azure.sql',
  ],
  [ENV_TYPES.UNKNOWN]: [
    '02-tables.sql',
    '03-data.sql',
  ],
};

function applyDdl() {
  // 環境を検出
  const env = detectEnvironment();
  const files = DDL_FILES[env.type] || DDL_FILES[ENV_TYPES.UNKNOWN];

  console.log('');
  console.log(`Environment: ${env.type}`);
  console.log(`DDL files to apply: ${files.join(', ')}`);
  console.log('');

  let hasError = false;

  for (const file of files) {
    const filePath = path.join(DDL_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${file}`);
      hasError = true;
      continue;
    }

    console.log(`Applying ${file}...`);
    const result = execSqlFile(filePath);

    if (!result.success) {
      console.error(`Failed to apply ${file}:`, result.error);
      hasError = true;
      break;
    }
  }

  if (hasError) {
    console.error('');
    console.error('DDL application failed.');
    process.exit(1);
  }

  console.log('');
  console.log('All DDL files applied successfully.');
  process.exit(0);
}

applyDdl();
