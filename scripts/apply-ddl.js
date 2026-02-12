const path = require('path');
const { execSqlFile } = require('./exec-sql');

const ddlPath = path.join(__dirname, '..', 'ddl.sql');

console.log('Applying DDL...');

const result = execSqlFile(ddlPath);

if (result.success) {
  console.log('DDL applied successfully.');
  process.exit(0);
} else {
  console.error('Failed to apply DDL:', result.error);
  process.exit(1);
}
