# Hướng dẫn cho cô chủ nhiệm

Mọi việc quản lý đều làm trong **Google Sheet** (file `DB-ThiDua-10A0`), không cần biết code.

---

## 1. Tài khoản

### Tài khoản có sẵn sau khi cài

| Tên đăng nhập | Mật khẩu ban đầu | Vai trò | Làm được gì |
|---|---|---|---|
| `gvcn` | `gvcn@2026` | GVCN | Tất cả: ghi nhật ký, xếp loại, chốt tháng, xuất Excel |
| `loptruong` | `lt@2026` | Lớp trưởng | Ghi nhật ký cả lớp + xếp loại tháng |
| `totruong1` | `tt1@2026` | Tổ trưởng | Ghi nhật ký cho tổ mình phụ trách |
| *(41 tài khoản)* | *(xem mục In tài khoản)* | Phụ huynh | **Chỉ xem kết quả của con mình** |

> **Web bắt buộc đăng nhập.** Người ngoài mở link chỉ thấy trang đăng nhập, không
> xem được tên hay kết quả của học sinh nào.

> **Đổi mật khẩu `gvcn` ngay sau khi cài.** Cách đổi ở mục dưới.

### Thêm tài khoản mới

1. Mở Google Sheet → sheet **`TaiKhoan`**
2. Thêm một dòng mới, điền:

| TenDangNhap | HoTen | MatKhauMoi | MatKhauHash | VaiTro | ToPhuTrach | TrangThai |
|---|---|---|---|---|---|---|
| `totruong2` | Tổ trưởng tổ 2 | `abc12345` | *(để trống)* | TO_TRUONG | Tổ 2 | HOAT_DONG |

- **MatKhauMoi**: gõ mật khẩu thường vào đây (ít nhất 4 ký tự)
- **MatKhauHash**: **không đụng vào**, script tự điền
- **VaiTro**: bấm vào ô sẽ có sẵn danh sách chọn — `GVCN` / `LOP_TRUONG` / `TO_TRUONG`
- **ToPhuTrach**: chỉ điền nếu là tổ trưởng

3. Bấm menu **⚙️ Thi đua → 👤 Áp dụng tài khoản**

Script sẽ mã hoá mật khẩu, **tự xoá ô `MatKhauMoi`** đi (để không ai đọc trộm được), rồi báo
đã đặt mật khẩu cho những ai.

### Đổi mật khẩu

Gõ mật khẩu mới vào cột **`MatKhauMoi`** của dòng đó → bấm **👤 Áp dụng tài khoản**. Xong.

*Mật khẩu cũ không xem lại được vì đã mã hoá — đây là cố ý, để nếu ai đó mở được Sheet cũng
không đọc được mật khẩu của người khác.*

### Xoá / khoá tài khoản

Hai cách:

- **Khoá tạm** (khuyên dùng): đổi cột `TrangThai` thành `KHOA`. Tài khoản không đăng nhập
  được nữa nhưng vẫn giữ lịch sử ai đã nhập gì.
- **Xoá hẳn**: xoá cả dòng đó đi.

Cả hai đều có hiệu lực ngay, **không cần bấm gì thêm**.

### Xem đang có những tài khoản nào

Menu **⚙️ Thi đua → 👤 Xem danh sách tài khoản**.

### Ví dụ: đầu năm bàn giao cán bộ lớp mới

1. Sheet `TaiKhoan`: đổi `TrangThai` của các bạn cũ thành `KHOA`
2. Thêm dòng mới cho các bạn mới, điền `MatKhauMoi`
3. Bấm **👤 Áp dụng tài khoản**
4. Nhắn mật khẩu cho từng bạn

---

## 2. Dữ liệu nằm ở đâu — có phải mỗi tháng một file không?

**Không.** Chỉ có **một Google Sheet duy nhất cho cả năm học**.

Các tháng phân biệt bằng **cột `Thang`** trong dữ liệu, không phải bằng file hay sheet riêng:

```
Google Sheet "DB-ThiDua-10A0"   ← một file duy nhất, dùng cả năm
├── HocSinh        41 dòng, cố định cả năm
├── DanhMucLoi     34 dòng, cố định cả năm
├── DanhMucCong    8 dòng
├── TuanHoc        các trang tuần do cán bộ lớp tạo
├── TaiKhoan       tài khoản đăng nhập
├── CauHinh        các thiết lập
├── NhatKy         ⟵ MỖI LƯỢT VI PHẠM / ĐIỂM CỘNG LÀ 1 DÒNG, có cột Thang
├── XepLoaiThang   ⟵ mỗi HS × mỗi tháng = 1 dòng (41 × 9 = 369 dòng cả năm)
├── XepLoaiKy      HK1 / HK2 / cả năm
└── Log            lịch sử thao tác
```

Ví dụ sheet `NhatKy`:

| MaHS | Ngay | Thang | Loai | Ma | Diem | NguoiNhap |
|---|---|---|---|---|---|---|
| 10A0_05 | 2026-09-22 | **9** | LOI | NN01 | −1 | totruong1 |
| 10A0_05 | 2026-10-03 | **10** | LOI | SH04 | −1 | totruong1 |
| 10A0_12 | 2026-10-03 | **10** | CONG | DT10 | +3 | loptruong |

Web chỉ việc lọc theo cột `Thang` khi cô chọn tháng ở góc phải màn hình.

**Ưu điểm của cách này**: xem tháng nào cũng được, so sánh giữa các tháng được, không phải
mở nhiều file, không sợ quên file nào.

### Vậy file Excel nộp trường thì sao?

Đó là chuyện khác. Khi cần nộp, vào web tab **Quản trị → Xuất file Excel theo mẫu trường**.

Script sẽ tạo ra **một Google Sheet MỚI** gồm các tháng và HK1, HK2, điền sẵn dữ liệu,
rồi đưa link cho cô. Mở lên chọn *Tệp → Tải xuống → Microsoft Excel* để lấy file `.xlsx`.
Cần đối chiếu nội dung, bố cục với mẫu của trường trước khi nộp.

File xuất ra này **tách rời hoàn toàn** với file database — xuất bao nhiêu lần cũng được,
không ảnh hưởng gì đến dữ liệu gốc.

---

## 3. Việc làm hằng tháng

| Khi nào | Ai | Làm gì |
|---|---|---|
| Đầu mỗi tuần | Lớp trưởng / cô | Web → *Sổ thi đua* → **+ Trang tuần mới** → điền tuần mấy, từ ngày đến ngày |
| Khi chép sổ | Tổ trưởng / lớp trưởng | Web → *Sổ thi đua* → chọn tuần → gõ các mục vào cột cộng/trừ → *Lưu thay đổi* |
| Cuối tháng | Lớp trưởng hoặc cô | Web → *Bảng lớp* → chọn xếp loại từng bạn → Lưu xếp loại |
| Sau khi rà xong | Cô | Web → *Quản trị* → **Chốt tháng** (khoá lại, cán bộ lớp hết sửa được) |
| Khi cần nộp | Cô | Web → *Quản trị* → **Xuất file Excel** |

Phụ huynh đăng nhập bằng tài khoản cô phát, chỉ xem được kết quả của con mình.

---

## 3b. Trang tuần — tạo tay như mở trang sổ giấy

Web **không tự sinh lịch tuần**. Mỗi tuần, lớp trưởng (hoặc cô) vào tab *Sổ thi đua* bấm
**+ Trang tuần mới**, điền:

| Ô | Điền gì |
|---|---|
| Tuần thứ | 1, 2, 3… theo cách đánh số của trường |
| Từ ngày / Đến ngày | Khoảng ngày của tuần đó |
| Ghi chú | Không bắt buộc, ví dụ "tuần sau nghỉ Tết" |

Web đoán sẵn tuần kế tiếp và khoảng ngày, thường chỉ cần bấm **Tạo trang**.

**Tuần nghỉ Tết, nghỉ lễ thì không cần làm gì** — cứ bỏ qua, không tạo trang cho tuần đó.
Tuần sau đi học lại thì tạo trang tiếp, số tuần vẫn liền mạch.

Vào web sẽ **luôn mở sẵn trang tuần mới nhất**.

Sửa nhầm số tuần hay khoảng ngày thì bấm **Sửa**. Tạo nhầm hẳn một trang thì bấm
**Xoá trang** (chỉ xoá được khi trang đó chưa ghi mục nào).

Hệ thống tự chặn: trùng số tuần, trùng ngày bắt đầu, hai trang chồng ngày lên nhau.

---

## 4. Sang năm học mới

Menu **⚙️ Thi đua → 📅 Bắt đầu năm học mới**.

Script sẽ:
1. **Sao lưu** toàn bộ file hiện tại thành `LUU TRU 10A0-K67 2026-2027` (giữ nguyên, không mất gì)
2. Dọn sạch `TuanHoc`, `NhatKy`, `XepLoaiThang`, `XepLoaiKy`, `Log` trong file đang dùng
3. Cập nhật năm học

**Giữ nguyên**: danh mục lỗi, danh mục điểm cộng, tài khoản, cấu hình.

Sau đó:
1. Cập nhật sheet `HocSinh` nếu danh sách lớp thay đổi
2. Vào web tab *Sổ thi đua* → **+ Trang tuần mới** → tạo tuần 1 của năm học mới

Link web **không đổi**, không phải deploy lại gì cả.

> Script hỏi xác nhận bằng cách bắt gõ đúng năm học mới (ví dụ `2027-2028`) trước khi xoá.

---

## 5. Sửa quy định, danh mục lỗi

| Muốn sửa | Vào sheet | Ghi chú |
|---|---|---|
| Thêm / bớt loại lỗi, đổi điểm trừ | `DanhMucLoi` | Đặt `HienThi` = FALSE để ẩn mà không xoá |
| Thêm loại điểm cộng | `DanhMucCong` | |
| Đổi ngưỡng, bật tắt tính năng | `CauHinh` | Xem cột `MoTa` để biết mỗi dòng làm gì |
| Danh sách lớp, chia tổ, chức vụ | `HocSinh` | Cột `To` để trống thì phần xếp hạng tổ tự ẩn |

Mọi thay đổi **có hiệu lực ngay**, không cần deploy lại, không cần sửa code.

### Vài thiết lập hay dùng trong `CauHinh`

| Khoá | Đang để | Nghĩa là |
|---|---|---|
| `TuDongXepLoai` | `FALSE` | Người nhập tự chọn xếp loại. Đổi `TRUE` thì web tự tính theo quy chế trường |
| `SoNgayDuocSua` | `7` | Cán bộ lớp sửa được bản ghi trong 7 ngày, sau đó chỉ cô sửa được |
| `NguongLoiNho` | `3` | 3 lỗi nhỏ = 1 lần bị ghi sổ đầu bài (chỉ dùng cho cột "Gợi ý") |

---

## 6. Khi gặp sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Web báo "Cần đăng nhập" dù vừa đăng nhập | Phiên hết hạn sau 12 tiếng — đăng nhập lại |
| Nhập sai, muốn xoá một lượt | Vào chi tiết học sinh, hoặc sửa thẳng sheet `NhatKy` (đổi `TrangThai` thành `DA_XOA`) |
| Số liệu trên web không khớp Sheet | Menu **⚙️ Thi đua → Tính lại số liệu tất cả các tháng** |
| Lỡ chốt tháng nhầm | Sheet `XepLoaiThang`, đổi cột `DaChot` của tháng đó về `FALSE` |
| Muốn biết ai đã nhập gì | Sheet `Log` — ghi lại mọi thao tác kèm thời gian |
| Sheet `NhatKy` có nhiều dòng `DA_THAY` lạ | Bình thường — đó là bản cũ mỗi lần sửa sổ, web không đọc. Nhiều quá thì bấm **⚙️ Thi đua → 🧹 Dọn lịch sử sửa đổi** |
| Web chạy chậm dần sau vài tháng | Bấm **🧹 Dọn lịch sử sửa đổi** (nên làm mỗi học kỳ một lần) |
| Sửa code xong web không đổi | Phải **Triển khai → Quản lý bản triển khai → sửa → Phiên bản mới** |
| Đăng nhập báo sai mật khẩu dù gõ đúng | Chạy **⚙️ Thi đua → Khởi tạo database** (tự xếp lại cột nếu cấu trúc đã đổi) |
| Tài khoản phụ huynh lỗi, muốn làm lại | **👪 Xoá hết tài khoản phụ huynh** rồi **👪 Tạo tài khoản phụ huynh** |
