const { execSql } = require('./exec-sql');

console.log('=== Isolation Level Tests ===\n');

// 現在の分離レベルを確認
console.log('Checking default isolation level...');
const sql = `
SELECT
  CASE transaction_isolation_level
    WHEN 0 THEN 'Unspecified'
    WHEN 1 THEN 'ReadUncommitted'
    WHEN 2 THEN 'ReadCommitted'
    WHEN 3 THEN 'RepeatableRead'
    WHEN 4 THEN 'Serializable'
    WHEN 5 THEN 'Snapshot'
  END AS IsolationLevel
FROM sys.dm_exec_sessions
WHERE session_id = @@SPID;
`;
execSql(sql, { database: 'AppDB' });

console.log('\n--- Testing isolation level settings ---\n');

// 各分離レベルの設定テスト
const levels = [
  'READ UNCOMMITTED',
  'READ COMMITTED',
  'REPEATABLE READ',
  'SERIALIZABLE',
];

for (const level of levels) {
  console.log(`Setting: ${level}`);
  const testSql = `
USE AppDB;
GO
SET TRANSACTION ISOLATION LEVEL ${level};
SELECT
  CASE transaction_isolation_level
    WHEN 0 THEN 'Unspecified'
    WHEN 1 THEN 'ReadUncommitted'
    WHEN 2 THEN 'ReadCommitted'
    WHEN 3 THEN 'RepeatableRead'
    WHEN 4 THEN 'Serializable'
    WHEN 5 THEN 'Snapshot'
  END AS CurrentLevel
FROM sys.dm_exec_sessions
WHERE session_id = @@SPID;
`;
  execSql(testSql, { database: 'AppDB' });
  console.log('');
}

// Dirty Read デモ（READ UNCOMMITTED）
console.log('--- Dirty Read Demo (READ UNCOMMITTED) ---\n');

const dirtyReadSql = `
USE AppDB;
GO

-- セッション1: 未コミットのデータを挿入
BEGIN TRANSACTION;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('ISO-DIRTY-001', GETDATE(), 'C001', 99999, 9999);

-- 同じセッション内でREAD UNCOMMITTEDで読み取り
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT 'READ UNCOMMITTED can see uncommitted data:' AS Note;
SELECT SalesNo, TotalAmount FROM T_Sales WHERE SalesNo = 'ISO-DIRTY-001';

-- ROLLBACKでデータを取り消し
ROLLBACK;

-- 通常の読み取りでは見えない
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT 'After ROLLBACK, data is gone:' AS Note;
SELECT COUNT(*) AS RecordsFound FROM T_Sales WHERE SalesNo = 'ISO-DIRTY-001';
`;
execSql(dirtyReadSql, { database: 'AppDB' });

console.log('\n=== Isolation Level Tests Completed ===');
