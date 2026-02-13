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
