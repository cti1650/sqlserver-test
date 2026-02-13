const { execSync } = require('child_process');
const config = require('./config');

function getServerString() {
  return config.port === '1433'
    ? config.server
    : `${config.server},${config.port}`;
}

function execSql(query, options = {}) {
  const { database, silent } = options;
  const serverStr = getServerString();
  const dbFlag = database ? `-d ${database}` : '';

  // 改行を含むクエリはstdinで渡す
  const hasNewline = query.includes('\n');

  let cmd;
  if (config.external) {
    cmd = `sqlcmd -S ${serverStr} -U ${config.user} -P '${config.password}' -C ${dbFlag}`;
  } else {
    cmd = `docker exec -i ${config.container} ${config.sqlcmd} -S ${serverStr} -U ${config.user} -P '${config.password}' -C ${dbFlag}`;
  }

  if (!hasNewline) {
    cmd += ` -Q "${query}"`;
  }

  try {
    const execOptions = { encoding: 'utf8' };
    if (hasNewline) {
      execOptions.input = query;
      execOptions.stdio = silent ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'inherit', 'inherit'];
    } else {
      execOptions.stdio = silent ? 'pipe' : 'inherit';
    }
    const result = execSync(cmd, execOptions);
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
