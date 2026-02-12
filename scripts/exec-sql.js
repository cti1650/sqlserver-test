const { execSync } = require('child_process');
const config = require('./config');

function execSql(query, options = {}) {
  const { database, silent } = options;
  const dbFlag = database ? `-d ${database}` : '';
  const cmd = `docker exec ${config.container} ${config.sqlcmd} -S ${config.server} -U ${config.user} -P '${config.password}' -C ${dbFlag} -Q "${query}"`;

  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function execSqlFile(filePath) {
  const cmd = `docker exec -i ${config.container} ${config.sqlcmd} -S ${config.server} -U ${config.user} -P '${config.password}' -C`;

  try {
    const fs = require('fs');
    const sql = fs.readFileSync(filePath, 'utf8');
    execSync(cmd, { input: sql, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { execSql, execSqlFile };
