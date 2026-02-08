-- 検証用DB作成
IF DB_ID('AppDB') IS NULL
BEGIN
  CREATE DATABASE AppDB;
END
GO

USE AppDB;
GO

-- ADO検証用テーブル
IF OBJECT_ID('dbo.Sample', 'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.Sample;
END
GO

CREATE TABLE dbo.Sample (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  Name NVARCHAR(100) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  UpdatedAt DATETIME2 NULL
);
GO

-- 検証用データ
INSERT INTO dbo.Sample (Name)
VALUES
  (N'Test A'),
  (N'Test B'),
  (N'Test C');
GO

-- ADO用ユーザー（sa直利用を避ける）
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
