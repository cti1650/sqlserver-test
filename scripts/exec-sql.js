const { execSync } = require('child_process');
const config = require('./config');

function getServerString() {
  return config.port === '1433'
    ? config.server
    : `${config.server},${config.port}`;
}

function buildCommand(query, options = {}) {
  const { database } = options;
  const serverStr = getServerString();
  const dbFlag = database ? `-d ${database}` : '';

  if (config.external) {
    // 外部サーバー: ローカルのsqlcmdを使用
    return `sqlcmd -S ${serverStr} -U ${config.user} -P '${config.password}' -C ${dbFlag} -Q "${query}"`;
  }
  // ローカル: dockerコンテナ内のsqlcmdを使用
  return `docker exec ${config.container} ${config.sqlcmd} -S ${serverStr} -U ${config.user} -P '${config.password}' -C ${dbFlag} -Q "${query}"`;
}

function execSql(query, options = {}) {
  const { silent } = options;
  const cmd = buildCommand(query, options);

  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function execSqlFile(filePath) {
  const serverStr = getServerString();
  const fs = require('fs');
  const sql = fs.readFileSync(filePath, 'utf8');

  let cmd;
  if (config.external) {
    cmd = `sqlcmd -S ${serverStr} -U ${config.user} -P '${config.password}' -C`;
  } else {
    cmd = `docker exec -i ${config.container} ${config.sqlcmd} -S ${serverStr} -U ${config.user} -P '${config.password}' -C`;
  }

  try {
    execSync(cmd, { input: sql, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { execSql, execSqlFile, config };
