-- ========================================
-- ADO用ユーザー（オンプレ/RDS/Managed Instance用）
-- ========================================

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'app_user')
BEGIN
  CREATE LOGIN app_user WITH PASSWORD = 'AppUserP@ss123!';
END
GO

USE AppDB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'app_user')
BEGIN
  CREATE USER app_user FOR LOGIN app_user;
END
GO

ALTER ROLE db_datareader ADD MEMBER app_user;
ALTER ROLE db_datawriter ADD MEMBER app_user;
GO
