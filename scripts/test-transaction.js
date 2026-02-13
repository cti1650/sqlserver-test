const { execSql } = require('./exec-sql');

console.log('=== Transaction Tests ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

function getCount() {
  const result = execSql('SELECT COUNT(*) AS cnt FROM T_Sales', { database: 'AppDB', silent: true });
  const match = result.output?.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Test 1: COMMIT確認
test('COMMIT - データが保持される', () => {
  const before = getCount();

  const sql = `
USE AppDB;
GO
BEGIN TRANSACTION;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-COMMIT-001', GETDATE(), 'C001', 1000, 100);
COMMIT;
`;
  execSql(sql, { database: 'AppDB', silent: true });

  const after = getCount();
  if (after !== before + 1) {
    throw new Error(`Expected ${before + 1} records, got ${after}`);
  }
});

// Test 2: ROLLBACK確認
test('ROLLBACK - データが元に戻る', () => {
  const before = getCount();

  const sql = `
USE AppDB;
GO
BEGIN TRANSACTION;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-ROLLBACK-001', GETDATE(), 'C001', 2000, 200);
ROLLBACK;
`;
  execSql(sql, { database: 'AppDB', silent: true });

  const after = getCount();
  if (after !== before) {
    throw new Error(`Expected ${before} records (unchanged), got ${after}`);
  }
});

// Test 3: 複数INSERT + COMMIT
test('複数INSERT + COMMIT - 全データが保持される', () => {
  const before = getCount();

  const sql = `
USE AppDB;
GO
BEGIN TRANSACTION;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-MULTI-001', GETDATE(), 'C001', 3000, 300);
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-MULTI-002', GETDATE(), 'C002', 4000, 400);
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-MULTI-003', GETDATE(), 'C003', 5000, 500);
COMMIT;
`;
  execSql(sql, { database: 'AppDB', silent: true });

  const after = getCount();
  if (after !== before + 3) {
    throw new Error(`Expected ${before + 3} records, got ${after}`);
  }
});

// Test 4: 複数INSERT + ROLLBACK
test('複数INSERT + ROLLBACK - 全データが元に戻る', () => {
  const before = getCount();

  const sql = `
USE AppDB;
GO
BEGIN TRANSACTION;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-MULTI-RB-001', GETDATE(), 'C001', 6000, 600);
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-MULTI-RB-002', GETDATE(), 'C002', 7000, 700);
ROLLBACK;
`;
  execSql(sql, { database: 'AppDB', silent: true });

  const after = getCount();
  if (after !== before) {
    throw new Error(`Expected ${before} records (unchanged), got ${after}`);
  }
});

// Test 5: SAVEPOINT + 部分ROLLBACK
test('SAVEPOINT - 部分的なROLLBACKが機能する', () => {
  const before = getCount();

  const sql = `
USE AppDB;
GO
BEGIN TRANSACTION;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-SAVE-001', GETDATE(), 'C001', 8000, 800);
SAVE TRANSACTION SavePoint1;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-SAVE-002', GETDATE(), 'C002', 9000, 900);
ROLLBACK TRANSACTION SavePoint1;
COMMIT;
`;
  execSql(sql, { database: 'AppDB', silent: true });

  const after = getCount();
  // SavePoint1以降のINSERTはROLLBACKされるが、それ以前のINSERTはCOMMITされる
  if (after !== before + 1) {
    throw new Error(`Expected ${before + 1} records, got ${after}`);
  }
});

// Test 6: エラー時の自動ROLLBACK (XACT_ABORT)
test('XACT_ABORT ON - エラー時に自動ROLLBACKされる', () => {
  const before = getCount();

  const sql = `
USE AppDB;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES ('TX-ABORT-001', GETDATE(), 'C001', 10000, 1000);
-- 意図的にエラーを発生させる（存在しないテーブル）
INSERT INTO NonExistentTable (Col1) VALUES ('error');
COMMIT;
`;
  // エラーが発生するが、それは想定内
  execSql(sql, { database: 'AppDB', silent: true });

  const after = getCount();
  // XACT_ABORT ONなのでエラー時に全体がROLLBACKされる
  if (after !== before) {
    throw new Error(`Expected ${before} records (auto-rollback), got ${after}`);
  }
});

// クリーンアップ: テストデータ削除
console.log('\nCleaning up test data...');
execSql("DELETE FROM T_Sales WHERE SalesNo LIKE 'TX-%'", { database: 'AppDB', silent: true });

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
