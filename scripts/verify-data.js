const { execSql } = require('./exec-sql');

console.log('=== Customers ===');
execSql('SELECT CustomerCode, CustomerName FROM M_Customer', { database: 'AppDB' });

console.log('');
console.log('=== Products ===');
execSql('SELECT ProductCode, ProductName, UnitPrice FROM M_Product', { database: 'AppDB' });

console.log('');
console.log('=== Sales ===');
execSql('SELECT SalesNo, SalesDate, TotalAmount FROM T_Sales', { database: 'AppDB' });

console.log('');
console.log('Data verification completed.');
