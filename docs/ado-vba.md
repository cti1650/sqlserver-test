# ADO / Excel VBA / Access からの接続

Windows の Office 系クライアントから接続する場合の設定とサンプル。

---

## ADO 接続文字列

```ini
Provider=MSOLEDBSQL;
Server=localhost,1433;
Database=AppDB;
User ID=app_user;
Password=AppUserP@ss123!;
Encrypt=True;
TrustServerCertificate=True;
```

`MSOLEDBSQL`（Microsoft OLE DB Driver for SQL Server）が必要。
入っていない場合は [Microsoft のダウンロードページ](https://learn.microsoft.com/sql/connect/oledb/download-oledb-driver-for-sql-server)から入れる。

---

## Excel VBA サンプル

```vba
Sub GetCustomerList()
    Dim conn As Object
    Set conn = CreateObject("ADODB.Connection")

    conn.Open "Provider=MSOLEDBSQL;" & _
              "Server=localhost,1433;" & _
              "Database=AppDB;" & _
              "User ID=app_user;" & _
              "Password=AppUserP@ss123!;" & _
              "Encrypt=Yes;" & _
              "TrustServerCertificate=Yes;"

    ' 顧客マスタ取得
    Dim rs As Object
    Set rs = conn.Execute("SELECT CustomerCode, CustomerName, Tel FROM M_Customer WHERE IsActive = 1")

    ' 結果をシートに出力
    Sheet1.Range("A1").CopyFromRecordset rs

    rs.Close
    conn.Close
End Sub

Sub GetSalesWithDetails()
    Dim conn As Object
    Set conn = CreateObject("ADODB.Connection")

    conn.Open "Provider=MSOLEDBSQL;" & _
              "Server=localhost,1433;" & _
              "Database=AppDB;" & _
              "User ID=app_user;" & _
              "Password=AppUserP@ss123!;" & _
              "Encrypt=Yes;" & _
              "TrustServerCertificate=Yes;"

    ' 売上明細を取得（ヘッダと結合）
    Dim sql As String
    sql = "SELECT h.SalesNo, h.SalesDate, d.ProductName, d.Quantity, d.Amount " & _
          "FROM T_Sales h INNER JOIN T_SalesDetail d ON h.SalesId = d.SalesId " & _
          "ORDER BY h.SalesNo, d.RowNo"

    Dim rs As Object
    Set rs = conn.Execute(sql)

    Sheet1.Range("A1").CopyFromRecordset rs

    rs.Close
    conn.Close
End Sub
```

---

## ODBC DSN の作成（Windows）

Access のリンクテーブルなどで使う DSN の作成手順。

1. 「ODBC データソース (64bit)」を開く
   - **LibreOffice など 32bit のアプリから使う場合は `C:\Windows\SysWOW64\odbcad32.exe`（32bit 版）を開く。
     ビット数が食い違うと DSN が見つからない**
2. 「システム DSN」タブ → 「追加」
3. 「ODBC Driver 18 for SQL Server」を選択
4. 以下を入力
   - 名前: `SQLServerTest`
   - サーバー: `localhost,1433`
5. 「SQL Server 認証」を選択
   - ログイン ID: `app_user`
   - パスワード: `AppUserP@ss123!`
6. 「既定のデータベース」→ `AppDB`
7. 「接続の暗号化」→ 必須、「サーバー証明書を信頼する」→ ON

macOS から ODBC で繋ぐ場合は手順が大きく異なる。[libreoffice-base.md](libreoffice-base.md#odbc-で接続するmacos) を参照。
