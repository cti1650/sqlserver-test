const config = {
  container: 'sqlserver-test',
  sqlcmd: '/opt/mssql-tools18/bin/sqlcmd',
  server: 'localhost',
  user: 'sa',
  password: process.env.SA_PASSWORD || 'P@ssw0rd123!',
  database: 'AppDB',
};

module.exports = config;
