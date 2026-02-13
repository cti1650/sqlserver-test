const { execSql } = require('./exec-sql');

const SIZES = {
  small: 1000,
  medium: 10000,
  large: 100000,
};

const size = process.argv[2] || 'small';
const count = SIZES[size] || parseInt(size, 10) || 1000;

console.log(`Generating ${count.toLocaleString()} sales records...`);

const sql = `
USE AppDB;
GO

SET NOCOUNT ON;

DECLARE @i INT = 1;
DECLARE @batchSize INT = 1000;
DECLARE @total INT = ${count};

WHILE @i <= @total
BEGIN
  INSERT INTO T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
  VALUES (
    CONCAT('SL', FORMAT(GETDATE(), 'yyyyMM'), '-', RIGHT('000000' + CAST(@i AS VARCHAR), 6)),
    DATEADD(DAY, -ABS(CHECKSUM(NEWID())) % 365, GETDATE()),
    'C00' + CAST((ABS(CHECKSUM(NEWID())) % 3) + 1 AS VARCHAR),
    ABS(CHECKSUM(NEWID())) % 100000,
    ABS(CHECKSUM(NEWID())) % 10000
  );

  IF @i % @batchSize = 0
  BEGIN
    PRINT CONCAT('Inserted ', @i, ' / ', @total, ' records');
  END

  SET @i = @i + 1;
END

SELECT COUNT(*) AS TotalSalesRecords FROM T_Sales;
`;

const result = execSql(sql, { database: 'AppDB' });

if (result.success) {
  console.log(`Done! Generated ${count.toLocaleString()} records.`);
} else {
  console.error('Failed to generate data:', result.error);
  process.exit(1);
}
