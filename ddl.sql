-- 検証用DB作成
IF DB_ID('AppDB') IS NULL
BEGIN
  CREATE DATABASE AppDB;
END
GO

USE AppDB;
GO

-- ========================================
-- マスタテーブル
-- ========================================

-- 顧客マスタ（Accessのフォームで編集される想定）
IF OBJECT_ID('dbo.M_Customer', 'U') IS NOT NULL DROP TABLE dbo.M_Customer;
GO

CREATE TABLE dbo.M_Customer (
  CustomerCode NVARCHAR(10) PRIMARY KEY,
  CustomerName NVARCHAR(50) NOT NULL,
  CustomerKana NVARCHAR(50),
  PostalCode NVARCHAR(8),
  Address1 NVARCHAR(100),
  Address2 NVARCHAR(100),
  Tel NVARCHAR(15),
  Fax NVARCHAR(15),
  Email NVARCHAR(100),
  Remarks NVARCHAR(MAX),
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
  UpdatedAt DATETIME NULL
);
GO

-- 商品マスタ
IF OBJECT_ID('dbo.M_Product', 'U') IS NOT NULL DROP TABLE dbo.M_Product;
GO

CREATE TABLE dbo.M_Product (
  ProductCode NVARCHAR(10) PRIMARY KEY,
  ProductName NVARCHAR(50) NOT NULL,
  CategoryCode NVARCHAR(5),
  UnitPrice INT NOT NULL DEFAULT 0,
  IsActive BIT NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
  UpdatedAt DATETIME NULL
);
GO

-- ========================================
-- トランザクションテーブル
-- ========================================

-- 売上明細（先に作成：外部キー制約のため）
IF OBJECT_ID('dbo.T_SalesDetail', 'U') IS NOT NULL DROP TABLE dbo.T_SalesDetail;
GO

-- 売上ヘッダ（Excelから一括登録される想定）
IF OBJECT_ID('dbo.T_Sales', 'U') IS NOT NULL DROP TABLE dbo.T_Sales;
GO

CREATE TABLE dbo.T_Sales (
  SalesId INT IDENTITY(1,1) PRIMARY KEY,
  SalesNo NVARCHAR(15) NOT NULL,
  SalesDate DATE NOT NULL,
  CustomerCode NVARCHAR(10) NOT NULL,
  TotalAmount INT NOT NULL DEFAULT 0,
  TaxAmount INT NOT NULL DEFAULT 0,
  Status TINYINT NOT NULL DEFAULT 1,
  CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
  UpdatedAt DATETIME NULL
);
GO

-- 売上明細（Excelから一括登録）
CREATE TABLE dbo.T_SalesDetail (
  SalesDetailId INT IDENTITY(1,1) PRIMARY KEY,
  SalesId INT NOT NULL,
  RowNo SMALLINT NOT NULL,
  ProductCode NVARCHAR(10) NOT NULL,
  ProductName NVARCHAR(50) NOT NULL,
  Quantity SMALLINT NOT NULL,
  UnitPrice INT NOT NULL,
  Amount INT NOT NULL,
  CONSTRAINT FK_SalesDetail_Sales FOREIGN KEY (SalesId) REFERENCES T_Sales(SalesId)
);
GO

-- ========================================
-- 検証用データ
-- ========================================

-- 顧客マスタ
INSERT INTO dbo.M_Customer (CustomerCode, CustomerName, CustomerKana, PostalCode, Address1, Tel)
VALUES
  (N'C001', N'株式会社テスト商事', N'カブシキガイシャテストショウジ', N'1000001', N'東京都千代田区', N'03-1234-5678'),
  (N'C002', N'有限会社サンプル工業', N'ユウゲンガイシャサンプルコウギョウ', N'5300001', N'大阪府大阪市北区', N'06-9876-5432'),
  (N'C003', N'合同会社デモ販売', N'ゴウドウガイシャデモハンバイ', N'4600001', N'愛知県名古屋市中区', N'052-111-2222');
GO

-- 商品マスタ
INSERT INTO dbo.M_Product (ProductCode, ProductName, CategoryCode, UnitPrice)
VALUES
  (N'P001', N'商品A', N'CAT01', 1000),
  (N'P002', N'商品B', N'CAT01', 2500),
  (N'P003', N'商品C', N'CAT02', 500),
  (N'P004', N'商品D', N'CAT02', 3000),
  (N'P005', N'商品E', N'CAT03', 1500);
GO

-- 売上ヘッダ
INSERT INTO dbo.T_Sales (SalesNo, SalesDate, CustomerCode, TotalAmount, TaxAmount)
VALUES
  (N'SL202401-001', '2024-01-15', N'C001', 5500, 550),
  (N'SL202401-002', '2024-01-20', N'C002', 8000, 800);
GO

-- 売上明細
INSERT INTO dbo.T_SalesDetail (SalesId, RowNo, ProductCode, ProductName, Quantity, UnitPrice, Amount)
VALUES
  (1, 1, N'P001', N'商品A', 2, 1000, 2000),
  (1, 2, N'P002', N'商品B', 1, 2500, 2500),
  (1, 3, N'P003', N'商品C', 2, 500, 1000),
  (2, 1, N'P004', N'商品D', 2, 3000, 6000),
  (2, 2, N'P005', N'商品E', 1, 1500, 1500),
  (2, 3, N'P003', N'商品C', 1, 500, 500);
GO

-- ========================================
-- ADO用ユーザー
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
