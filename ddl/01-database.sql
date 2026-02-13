-- ========================================
-- データベース作成（Azure SQL Database以外）
-- ========================================

IF DB_ID('AppDB') IS NULL
BEGIN
  CREATE DATABASE AppDB;
END
GO

USE AppDB;
GO
