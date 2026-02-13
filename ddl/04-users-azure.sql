-- ========================================
-- ADO用ユーザー（Azure SQL Database用）
-- ========================================
-- 含まれるデータベースユーザー（パスワード認証）

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'app_user')
BEGIN
  CREATE USER app_user WITH PASSWORD = 'AppUserP@ss123!';
END
GO

ALTER ROLE db_datareader ADD MEMBER app_user;
ALTER ROLE db_datawriter ADD MEMBER app_user;
GO
