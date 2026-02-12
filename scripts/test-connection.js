const { execSql } = require('./exec-sql');

console.log('Testing SQL Server connection...');

const result = execSql("SELECT @@VERSION AS 'SQL Server Version'");

if (result.success) {
  console.log('Connection test passed.');
  process.exit(0);
} else {
  console.error('Connection test failed.');
  process.exit(1);
}
