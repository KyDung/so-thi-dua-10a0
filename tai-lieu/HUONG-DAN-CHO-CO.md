# Hướng dẫn cho cô chủ nhiệm

Mọi việc quản lý đều làm **ngay trên web**, tab **Quản trị** (chỉ tài khoản GVCN thấy), không cần
biết code và không cần mở Google Sheet.

---

## 1. Tài khoản

| Vai trò | Làm được gì |
|---|---|
| **GVCN** | Tất cả: ghi nhật ký, xếp loại, chốt tháng, quản trị, xuất Excel |
| **Cán bộ lớp** (lớp trưởng, lớp phó, thư ký…) | Quyền ngang nhau: ghi nhật ký cả lớp, tạo/sửa trang tuần, chọn xếp loại tháng, điền đánh giá tháng. Không vào được Quản trị |
| **Phụ huynh** | **Chỉ xem kết quả của con mình** |

> **Web bắt buộc đăng nhập.** Người ngoài mở link chỉ thấy trang đăng nhập, không xem được tên
> hay kết quả của học sinh nào. Ai mới được cấp tài khoản đều **bị bắt đổi mật khẩu ở lần đăng nhập đầu**.

### Tài khoản phụ huynh (tự tạo cho cả lớp)

*Quản trị → Tài khoản → **Tạo tài khoản phụ huynh*** (mất vài chục giây, bị gián đoạn thì bấm lại).

- Tên đăng nhập: họ tên con viết liền không dấu + `a0k67` — ví dụ `nguyenvanana0k67`
- Mật khẩu ban đầu: họ tên con viết liền không dấu + `1` — ví dụ `nguyenvanan1`
- Hai bạn trùng họ tên: bạn thứ hai được thêm số (`nguyenvanan2a0k67`)

Bấm **In tài khoản phụ huynh** để có bảng tên đăng nhập + mật khẩu, **cắt rời từng dòng phát riêng**.
Phụ huynh nào đã đổi mật khẩu thì bảng in ghi "(phụ huynh đã đổi)".

### Thêm cán bộ lớp

*Quản trị → Tài khoản → **Thêm cán bộ lớp***: tên đăng nhập, họ tên, vai trò (Cán bộ lớp hoặc GVCN),
mật khẩu ban đầu. Nhắn mật khẩu cho bạn đó; bạn sẽ phải đổi khi đăng nhập lần đầu.

### Quên mật khẩu / đặt lại (GVCN đặt được cho mọi tài khoản)

Tài khoản của chính cô: menu góc phải trên → **Đổi mật khẩu**. Tài khoản người khác: bấm **Đặt lại MK** ở dòng tài khoản đó → đặt mật khẩu mới (phụ huynh có sẵn gợi ý mật khẩu mặc định) →
báo cho người dùng. Họ sẽ phải đổi lại khi đăng nhập.

### Khoá / mở khoá

Bấm **Khoá** ở dòng tài khoản — người đó không đăng nhập được nữa nhưng vẫn giữ lịch sử ai đã ghi gì.
Muốn dùng lại thì **Mở khoá**. Có hiệu lực ngay.

### Ví dụ: đầu năm bàn giao cán bộ lớp mới

1. *Tài khoản*: **Khoá** các bạn cán bộ cũ
2. **Thêm cán bộ lớp** cho các bạn mới
3. *Học sinh*: cập nhật tổ, chức vụ
4. Nhắn mật khẩu cho từng bạn

---

## 2. Dữ liệu nằm ở đâu

Dữ liệu nằm trên **Firebase (Firestore)** của lớp, một cơ sở dữ liệu duy nhất dùng cả năm học.
Các tháng phân biệt bằng trường `thang` trong dữ liệu, không phải file riêng — web chỉ việc lọc theo
tháng khi cô chọn ở đầu màn hình.

Cần nộp file Excel cho trường: *Quản trị → Chốt & xuất → **Xuất Excel theo mẫu trường***. Web tạo file
`.xlsx` đúng bố cục mẫu của trường (mỗi tháng một sheet: TT | Họ tên | Những lỗi vi phạm | Kết quả | Ghi chú, dòng TỔNG, dòng ký tên; cùng phông, cỡ chữ, kích thước cột) gồm từng tháng + HK1, HK2 và tải về máy. Muốn xuất riêng một tháng thì dùng nút trong tab *Đánh giá*. Xuất bao nhiêu lần cũng được, không ảnh hưởng dữ liệu gốc.
Đối chiếu bố cục với mẫu của trường trước khi nộp.

---

## 3. Việc làm hằng tuần / hằng tháng

| Khi nào | Ai | Làm gì |
|---|---|---|
| Đầu mỗi tuần | Cán bộ lớp / cô | *Sổ thi đua* → **+ Trang tuần mới** → điền tuần mấy, từ ngày đến ngày |
| Khi chép sổ | Cán bộ lớp | *Sổ thi đua* → chọn tuần, học sinh → chọn lỗi / điểm cộng → **Thêm vào sổ** |
| Cuối tháng | Cán bộ lớp hoặc cô | *Bảng lớp* → chọn xếp loại từng bạn (hoặc **Điền theo gợi ý**) → **Lưu xếp loại** |
| Sau khi rà xong | Cô | *Quản trị → Chốt & xuất* → **Chốt tháng** (khoá lại, cán bộ lớp hết ghi/sửa được) |
| Cuối tháng | Cán bộ lớp hoặc cô | *Đánh giá* → bảng giống mẫu của trường: thấy toàn bộ lỗi trong tháng (ngày 1 → ngày cuối), tự chọn kết quả T/K/Đ/CĐ và ghi chú → **Lưu đánh giá** → **Xuất Excel tháng N** |
| Bất kỳ lúc nào | Cô, cán bộ lớp | *Tổng quan* → xem mọi lỗi / điểm cộng **theo tuần** hoặc **theo tháng** (ngày 1 → ngày cuối tháng); *Xếp hạng* cũng chọn được theo tuần hoặc tháng |
| Khi cần nộp | Cô | *Quản trị → Chốt & xuất* → **Xuất Excel** |

### Trang tuần — tạo tay như mở trang sổ giấy

Web **không tự sinh lịch tuần**. Điền: *Tuần thứ*, *Từ ngày*, *Đến ngày*, ghi chú (không bắt buộc).
Web đoán sẵn tuần kế tiếp, thường chỉ cần bấm **Tạo trang**.

**Tuần nghỉ Tết, nghỉ lễ thì không cần làm gì** — bỏ qua, tuần sau tạo tiếp, số tuần vẫn liền mạch.
Vào web sẽ mở sẵn trang tuần hiện tại. Sửa nhầm → **Sửa**. Tạo nhầm → **Xoá trang** (chỉ xoá được khi
trang chưa có mục nào). Hệ thống tự chặn: trùng số tuần, trùng ngày bắt đầu, hai trang chồng ngày.

> Tuần vắt tháng (ví dụ 28/9–4/10) được tính vào **tháng của ngày bắt đầu tuần**; riêng tuần mở năm học
> kiểu 31/8–6/9 tính vào tháng 9.

### Xoá một mục ghi nhầm

*Sổ thi đua* → cuối dòng bấm biểu tượng thùng rác. Cán bộ lớp xoá được trong **7 ngày** (chỉnh ở
*Cấu hình*), sau đó chỉ GVCN xoá được. Mục bị xoá không còn tính điểm nhưng vẫn lưu vết.

---

## 4. Sang năm học mới

*Quản trị → Chốt & xuất → **Bắt đầu năm học mới…***

Web sẽ:
1. **Tải về file sao lưu** (`SAO-LUU_…json`) toàn bộ dữ liệu năm cũ — **hãy cất giữ file này**
2. Xoá trang tuần, nhật ký, xếp loại tháng, nhật ký hệ thống của năm cũ
3. Đổi năm học

**Giữ nguyên**: danh mục lỗi, điểm cộng, tài khoản, cấu hình, danh sách học sinh.

Sau đó: cập nhật *Học sinh* nếu lớp đổi (đánh dấu "Đã nghỉ / chuyển" hoặc thêm bạn mới; nếu lớp mới hoàn toàn thì
khoá hết tài khoản cũ và tạo lại), rồi vào *Sổ thi đua* tạo trang tuần 1. Link web **không đổi**.

---

## 5. Sửa quy định, danh mục lỗi

| Muốn sửa | Vào | Ghi chú |
|---|---|---|
| Tên lỗi, điểm trừ, mức (nhỏ / hạ bậc / chưa đạt) | *Quản trị → Danh mục lỗi* | Bỏ tích **Hiện** để ẩn một lỗi mà không mất dữ liệu cũ |
| Thêm lỗi / điểm cộng mới | *Danh mục lỗi* → **Thêm lỗi**, **Thêm điểm cộng** | Mã dạng `VP04`, `DT11` |
| Ngưỡng điểm, tháng học kỳ, bật tắt tính năng | *Quản trị → Cấu hình* | Sửa xong bấm **Tính lại** ở *Tổng quan* để số liệu cũ theo quy tắc mới |
| Danh sách lớp, chia tổ, chức vụ | *Quản trị → Học sinh* | Tổ chỉ cần nếu lớp thi đua theo tổ |

### Vài thiết lập hay dùng trong *Cấu hình*

| Mục | Đang để | Nghĩa là |
|---|---|---|
| Tự lấy xếp loại theo gợi ý khi chưa ai chọn | Bật | Bạn nào chưa được chọn tay thì lấy theo gợi ý của máy. Tắt thì để trống tới khi có người chọn |
| Số ngày cán bộ lớp được xoá mục đã ghi | 7 | Sau 7 ngày chỉ cô xoá được |
| Từ N lần ghi sổ đầu bài: không được TỐT / KHÁ | 3 / 5 | Trần xếp loại tháng |

---

## 6. Khi gặp sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Phụ huynh quên mật khẩu | *Tài khoản → Cấp lại MK* |
| Nhập sai, muốn xoá một lượt | *Sổ thi đua* → thùng rác (hoặc cô xoá ở bất kỳ lúc nào) |
| Số liệu bảng lớp có vẻ lệch | *Quản trị → Chốt & xuất → **Tính lại số liệu cả lớp*** |
| Lỡ chốt tháng nhầm | *Tổng quan* → chọn tháng → **Mở chốt** |
| Muốn biết ai đã làm gì | *Quản trị → Nhật ký* — 150 thao tác gần nhất, kèm thời gian |
| Báo "Không đủ quyền" | Chưa dán `firestore.rules` mới nhất vào Firebase Console, hoặc vai trò của tài khoản chưa đúng |
| Báo "Chưa bật đăng nhập Email/Mật khẩu" | Firebase Console → Authentication → Sign-in method → bật Email/Mật khẩu |
| Tạo tài khoản phụ huynh báo "thử quá nhiều lần" | Chờ vài phút rồi bấm **Tạo tài khoản phụ huynh** lần nữa (chỉ tạo cho bạn còn thiếu) |
| Mở web ở GitHub Pages không đăng nhập được | Firebase Console → Authentication → Settings → Authorized domains: thêm `<tên>.github.io` |
