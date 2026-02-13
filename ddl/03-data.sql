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
