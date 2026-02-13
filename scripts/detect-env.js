const { execSql } = require('./exec-sql');

const ENV_TYPES = {
  AZURE_SQL_DB: 'azure-sql-db',
  AZURE_SQL_MI: 'azure-sql-mi',
  ON_PREMISE: 'on-premise',
  UNKNOWN: 'unknown',
};

function detectEnvironment() {
  console.log('Detecting SQL Server environment...');

  const result = execSql("SELECT SERVERPROPERTY('Edition') AS Edition", { silent: true });

  if (!result.success) {
    console.error('Failed to detect environment.');
    return { type: ENV_TYPES.UNKNOWN, edition: null };
  }

  const output = result.output || '';

  if (output.includes('SQL Azure')) {
    if (output.includes('Managed Instance')) {
      console.log('Detected: Azure SQL Managed Instance');
      return { type: ENV_TYPES.AZURE_SQL_MI, edition: 'Azure SQL Managed Instance' };
    }
    console.log('Detected: Azure SQL Database');
    return { type: ENV_TYPES.AZURE_SQL_DB, edition: 'Azure SQL Database' };
  }

  // Extract edition name
  const editionMatch = output.match(/(\w+\s*Edition)/i);
  const edition = editionMatch ? editionMatch[1] : 'Unknown Edition';
  console.log(`Detected: On-Premise/RDS (${edition})`);
  return { type: ENV_TYPES.ON_PREMISE, edition };
}

function getDdlFile(envType) {
  switch (envType) {
    case ENV_TYPES.AZURE_SQL_DB:
      return 'ddl-azure-sql.sql';
    case ENV_TYPES.AZURE_SQL_MI:
    case ENV_TYPES.ON_PREMISE:
    default:
      return 'ddl.sql';
  }
}

function canCreateDatabase(envType) {
  return envType !== ENV_TYPES.AZURE_SQL_DB;
}

function canCreateLogin(envType) {
  return envType !== ENV_TYPES.AZURE_SQL_DB;
}

// CLI実行時
if (require.main === module) {
  const env = detectEnvironment();
  console.log('');
  console.log('Environment:', env.type);
  console.log('Edition:', env.edition);
  console.log('DDL File:', getDdlFile(env.type));
  console.log('Can CREATE DATABASE:', canCreateDatabase(env.type));
  console.log('Can CREATE LOGIN:', canCreateLogin(env.type));
}

module.exports = { detectEnvironment, getDdlFile, canCreateDatabase, canCreateLogin, ENV_TYPES };
