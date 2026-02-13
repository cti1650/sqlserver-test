const isExternal = process.env.SQL_EXTERNAL === 'true';

const config = {
  // 外部サーバーモード
  external: isExternal,

  // Docker設定（ローカルモード時のみ使用）
  container: process.env.SQL_CONTAINER || 'sqlserver-test',
  sqlcmd: '/opt/mssql-tools18/bin/sqlcmd',

  // 接続設定
  server: process.env.SQL_SERVER || 'localhost',
  port: process.env.SQL_PORT || '1433',
  user: process.env.SQL_USER || 'sa',
  password: process.env.SQL_PASSWORD || process.env.SA_PASSWORD || 'P@ssw0rd123!',
  database: process.env.SQL_DATABASE || 'AppDB',
};

module.exports = config;
