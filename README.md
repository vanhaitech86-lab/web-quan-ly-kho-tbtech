# TBTECH VWM - Hệ Thống Quản Lý Doanh Nghiệp, Kho Hàng & Chứng Từ

> Phiên bản nâng cấp chuyên nghiệp & hiện đại dành riêng cho **CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH** (TBTECH INDUSTRIAL CO., LTD).

---

## Thông Tin Doanh Nghiệp Cốt Lõi
- **Đơn vị chủ quản**: CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH
- **Mã số thuế**: `0111093754`
- **Địa chỉ trụ sở**: Số 8, Ngõ 387 Phố Vũ Tông Phan, Phường Khương Đình, Thành phố Hà Nội
- **Kho hàng**: Kho bán - Số 8, Ngõ 387 Phố Vũ Tông Phan, Hà Nội
- **Hotline**: `0763181987` | **Email**: `kinhdoanh@tbtech.com.vn` | **Website**: `https://tbtech.com.vn`
- **Tài khoản ngân hàng**: `116000288899` tại Ngân hàng TMCP Công Thương Việt Nam (VietinBank)
- **Đại diện pháp luật**: Ông **Bửu Trần** - Giám đốc

---

## Các Phân Hệ & Tính Năng Nổi Bật

### 1. Tổng Quan Điều Hành (Executive Dashboard)
- Thống kê thời gian thực: Tổng giá trị kho theo giá vốn nhập, giá niêm yết xuất xưởng, lợi nhuận gộp ước tính, tổng số lượng SKUs và thiết bị.
- Biểu đồ phân bổ cơ cấu hàng tồn theo danh mục (Chart.js Doughnut).
- Biểu đồ top 5 thiết bị tồn kho giá trị nhất (Chart.js Bar Chart).
- Bảng truy cập nhanh: Hộp thư hóa đơn mới nhận, Lịch sử biến động kho gần đây.

### 2. Quản Lý Kho Hàng TBTECH (Inventory)
- Quản lý danh mục thiết bị: SKU, Tên, ĐVT, Tồn kho, Định mức tối thiểu, Giá vốn, Giá bán, Vị trí kệ kho, Nhà cung cấp, Serial/Ghi chú, Số HĐ nhập.
- Bộ lọc đa chiều: Tìm kiếm nhanh (Ctrl+K), lọc theo danh mục, lọc theo trạng thái tồn (Còn hàng, Sắp hết, Hết hàng).
- Thêm / Sửa thiết bị với form validate trực quan.
- Điều chỉnh nhập / xuất kho nhanh kèm ghi chú lý do.
- Bảo mật thao tác xóa đơn lẻ và xóa hàng loạt bằng mật khẩu quản trị (`admin123`).
- Xuất báo cáo kho định dạng CSV chuẩn UTF-8 có dấu tiếng Việt (mở bằng Excel không lỗi font).
- **Công cụ đối soát file Excel với kho**: Tải file bảng kê Excel/CSV lên để hệ thống tự động so sánh, cảnh báo lệch tên hoặc mặt hàng chưa có trong kho TBTECH.

### 3. AI OCR Trích Xuất Hóa Đơn PDF (Invoice Reader)
- Bóc tách tự động dữ liệu hóa đơn điện tử: Bên bán, MST, Địa chỉ, Số HĐ, Ngày lập, Bảng chi tiết mặt hàng, Thuế suất VAT, Tổng thanh toán.
- Tích hợp sẵn 5 hóa đơn mẫu thực tế từ các hãng công nghệ lớn:
  1. Fortinet Firewall FortiGate 100F
  2. Bửu Trần Tech Switch 24 Port PoE
  3. Vinh Long Hải Cáp mạng UTP Cat6
  4. Tecotec Máy hiện sóng kỹ thuật số DSO
  5. Dell Vietnam Laptop Latitude 5540
- Trực quan hóa hóa đơn điện tử song song với bảng dữ liệu bóc tách AI.
- Nút bấm **"Tự Động Nhập Vào Kho TBTECH"**: Tự động cộng số lượng tồn kho, cập nhật giá vốn, thêm mặt hàng mới nếu chưa có, và ghi nhật ký vào lịch sử.

### 4. Đọc Email Kế Toán (Gmail Sync)
- Hộp thư kế toán mô phỏng tiếp nhận hóa đơn gửi đến email kế toán.
- Trạng thái trực quan: "Chờ nhập kho" và "Đã nhập kho".
- 1-Click mở xem chi tiết, quét bóc tách và nhập trực tiếp vào kho.

### 5. Quản Lý & Xuất Chứng Từ Khổ Chuẩn A4 (Documents)
- Hỗ trợ 3 mẫu văn bản hành chính theo quy định:
  1. **Phiếu Xuất Kho (Mẫu số 02 - VT ban hành theo Thông tư 200/2014/TT-BTC)**: Đầy đủ 5 vị trí ký tên, tự động đọc số tiền thành chữ tiếng Việt (`Một trăm sáu mươi lăm triệu đồng chẵn`).
  2. **Biên Bản Bàn Giao Và Nghiệm Thu Thiết Bị**: Kèm cam kết bảo hành chính hãng TBTECH.
  3. **Hợp Đồng Mua Bán Hàng Hóa**: Căn cứ Luật Dân sự 2015 và Luật Thương mại 2005.
- Tùy chọn: "Tự động trừ số lượng trong kho TBTECH khi lưu chứng từ".
- Tự động điền thông tin khách hàng từ Danh bạ.
- Thêm thiết bị trực tiếp từ kho hàng.
- Chế độ in ấn đạt chuẩn tỷ lệ A4, không vỡ layout khi in ra giấy hoặc lưu PDF.
- Kho lưu trữ chứng từ đã xuất để tra cứu và in lại bất kỳ lúc nào.

### 6. Quản Lý Khách Hàng (Customers)
- Danh bạ đối tác: Tên công ty, MST, Người đại diện, Chức danh, SĐT, Email, Địa chỉ giao hàng.
- Thống kê lịch sử mua hàng và tổng chi tiêu.
- Nút 1-chạm "Lập Chứng Từ Nhanh" cho từng khách hàng.

### 7. Nhật Ký Giao Dịch & Kiểm Toán (History Log)
- Lưu trữ toàn bộ luồng luân chuyển hàng hóa: Nhập kho (IMPORT), Xuất kho (EXPORT), Điều chỉnh (ADJUST).
- Chi tiết số lượng, đơn giá, ngày giờ, đối tác.
- Xuất nhật ký giao dịch ra file CSV.

### 8. Cấu Hình Doanh Nghiệp & Sao Lưu (Settings)
- Chỉnh sửa thông tin công ty TBTECH, tài khoản ngân hàng VietinBank.
- Nút "Mặc Định TBTECH" để khôi phục nhanh thông số chuẩn.
- Cấu hình khóa Google Gemini API Key.
- Sao lưu toàn bộ hệ thống ra file JSON & Phục hồi dữ liệu từ file JSON.

---

## Hướng Dẫn Vận Hành Cục Bộ

Bạn có thể mở trực tiếp file `index.html` bằng bất kỳ trình duyệt web nào (Chrome, Edge, Firefox), hoặc sử dụng server local:

```bash
# Bằng Python
python -m http.server 3000

# Hoặc bằng Node.js / npx
npx serve .
```

Sau đó truy cập: `http://localhost:3000`

---
© 2026 CÔNG TY TNHH THIẾT BỊ VÀ VẬT TƯ CÔNG NGHIỆP TBTECH. Tất cả các quyền được bảo lưu.
