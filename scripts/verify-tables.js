const { execSql } = require('./exec-sql');

console.log('Verifying tables...');

const result = execSql(
  "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
  { database: 'AppDB' }
);

if (result.success) {
  console.log('Table verification passed.');
  process.exit(0);
} else {
  console.error('Table verification failed.');
  process.exit(1);
}
