# Sổ điện tử theo dõi thi đua – hạnh kiểm lớp 10A0-K67

Web tĩnh + **Firebase** (Authentication + Firestore) làm backend và cơ sở dữ liệu.
Chạy được trên gói **Spark (miễn phí)**, không cần máy chủ, không cần Cloud Functions, không cần build.

Mục đích: cán bộ lớp **chép lại lỗi và điểm cộng/trừ từ sổ chính** để phụ huynh tiện theo dõi.
Khi có chênh lệch, đối chiếu sổ chính. Xếp loại nhập theo kết quả đã thống nhất với GVCN;
các phép tính và gợi ý trên web chỉ hỗ trợ theo dõi.

```
Trình duyệt (docs/)  ──Firebase JS SDK──►  Firebase Auth   (tài khoản, mật khẩu)
 phụ huynh xem                         └─►  Firestore       (dữ liệu, kiểm soát bằng firestore.rules)
 cán bộ lớp ghi sổ
 GVCN duyệt, chốt tháng, xuất Excel
```

> **Đã chuyển từ Google Sheet + Apps Script sang Firebase.** Mã Apps Script cũ đã được gỡ khỏi
> repo (vẫn xem được trong lịch sử git). Dữ liệu cũ trong Google Sheet **không tự chuyển sang**;
> với lớp mới/năm học mới thì không cần, xem mục [Chuyển dữ liệu cũ](#chuyển-dữ-liệu-cũ).

---

## Cài đặt (khoảng 10 phút)

### Bước 1 — Tạo dự án Firebase

1. Vào <https://console.firebase.google.com> → **Tạo dự án** (tắt Google Analytics cũng được).
2. **Build → Authentication → Bắt đầu → Sign-in method** → bật **Email/Mật khẩu**.
   (Web dùng "email giả" dạng `tendangnhap@so-thi-dua.local`; người dùng chỉ thấy tên đăng nhập.)
3. **Build → Firestore Database → Tạo cơ sở dữ liệu** → chọn vùng `asia-southeast1` (Singapore) → chế độ **production**.

### Bước 2 — Dán quy tắc bảo mật

**Firestore → Rules** → xoá nội dung cũ, dán toàn bộ file [firestore.rules](firestore.rules) → **Publish**.

> Đây là bước quan trọng nhất: rules là "người gác cổng" thật sự của dữ liệu (phụ huynh chỉ đọc
> được con mình, cán bộ lớp và GVCN mới ghi được, tháng đã chốt thì khoá…). Không dán rules thì
> Firestore ở chế độ production sẽ **từ chối tất cả**, web không chạy được.

### Bước 3 — Nối web với Firebase

**Cài đặt dự án (⚙) → Chung → Ứng dụng của bạn → biểu tượng Web `</>`** → đặt tên bất kỳ → copy đối tượng
`firebaseConfig` dán vào [docs/assets/js/config.js](docs/assets/js/config.js), thay các giá trị `PASTE_…`.

Các giá trị đó **không phải bí mật** (ai mở web cũng thấy). Bảo mật nằm ở `firestore.rules`.

### Bước 4 — Đưa web lên mạng

Chọn một trong hai:

- **GitHub Pages** (như trước): đẩy repo lên GitHub, *Settings → Pages → nhánh `main`, thư mục `/docs`*.
- **Firebase Hosting**: `npm i -g firebase-tools` → `firebase login` → `firebase init hosting` (chọn thư mục `docs`, KHÔNG ghi đè `index.html`) → `firebase deploy`.

Nếu dùng GitHub Pages, vào **Authentication → Settings → Authorized domains** và thêm `<tên-tài-khoản>.github.io`.

### Bước 5 — Khởi tạo lần đầu

Mở web → màn hình **Khởi tạo lần đầu** → nhập tên trường, lớp, năm học và tạo tài khoản GVCN.
Web tự nạp danh mục lỗi, điểm cộng và cấu hình theo quy chế.

> ⚠️ **Làm ngay sau khi triển khai.** Ai mở web trước sẽ có quyền tạo tài khoản GVCN đầu tiên.
> Sau khi khởi tạo xong, màn hình này bị khoá vĩnh viễn.

### Bước 6 — Nhập lớp và phát tài khoản

Đăng nhập GVCN → **Quản trị**:

1. **Học sinh**: dán danh sách họ tên (mỗi bạn một dòng) → *Thêm vào lớp*; điền tổ, chức vụ nếu cần.
2. **Tài khoản → Tạo tài khoản phụ huynh**: tự tạo cho cả lớp (tên đăng nhập = họ tên không dấu + `a0k67`,
   mật khẩu ban đầu = họ tên không dấu + `1`). Bấm **In tài khoản phụ huynh** để phát cho lớp.
3. **Thêm cán bộ lớp** (lớp trưởng, lớp phó, thư ký… — quyền ngang nhau). Mọi người sẽ được bắt đổi mật khẩu ở lần đăng nhập đầu.

Hướng dẫn đầy đủ cho cô chủ nhiệm: [tai-lieu/HUONG-DAN-CHO-CO.md](tai-lieu/HUONG-DAN-CHO-CO.md).

---

## Dùng hằng ngày

| Ai | Làm gì |
|---|---|
| **Phụ huynh** | Đăng nhập → xem điểm cộng/trừ theo tuần, xếp loại các tháng **của con mình** (không xem được bạn khác) |
| **Cán bộ lớp** (lớp trưởng, lớp phó, thư ký…) | Quyền ngang nhau: *Sổ thi đua* → ghi lỗi / điểm cộng cho cả lớp; tạo/sửa trang tuần; chọn xếp loại tháng, điền *Đánh giá*; xem Bảng lớp, Xếp hạng, Tổng quan |
| **GVCN** | Toàn quyền, thêm *Quản trị*: chốt tháng, tài khoản, cấu hình, danh mục lỗi, xuất Excel, năm học mới |

Điểm được tính tự động theo `huong-dan-thi-đua-cá-nhân-2023-2024.docx`: mỗi tuần 100 điểm, trừ lỗi,
cộng điểm tốt, xếp loại tuần theo ngưỡng; tháng = trung bình các tuần rồi áp trần ghi sổ đầu bài và
lỗi hạ bậc. Chi tiết: [tai-lieu/QUY-TAC-MAC-DINH.md](tai-lieu/QUY-TAC-MAC-DINH.md).
**Xếp loại do người nhập chọn luôn thắng gợi ý của máy**; ô nào chưa chọn thì lấy theo gợi ý nếu
bật `Tự lấy xếp loại theo gợi ý` trong *Quản trị → Cấu hình*.

---

## Kiểm thử

### Logic tính điểm (không cần mạng, không cần Firebase)

```bash
node tests/logic.test.mjs
```

### Chạy thử toàn bộ web với Firebase giả (không cần dự án Firebase)

```bash
node tests/harness/server.mjs
```

rồi mở <http://localhost:8099/>. Bản này dùng bộ nhớ trình duyệt thay cho Firebase, để thử giao diện
và luồng thao tác. **Không kiểm tra `firestore.rules`** — phần đó chỉ kiểm được trên Firebase thật hoặc
Firebase Emulator (cần Java 11+): `firebase emulators:start --only firestore,auth` rồi mở web kèm `?emulator`.

---

## Mô hình dữ liệu

| Collection | Nội dung |
|---|---|
| `cauHinh/main` | Cấu hình lớp: ngưỡng điểm, tháng học kỳ, năm học… (đọc công khai để hiện tên lớp ở trang đăng nhập) |
| `danhMucLoi`, `danhMucCong` | Danh mục lỗi / điểm cộng |
| `hocSinh` | Danh sách lớp (`10A0_01`…), tổ, chức vụ |
| `tuan` | Các trang tuần (`T2026-09-07`…) |
| `nhatKy` | Mỗi lượt vi phạm / điểm cộng là 1 dòng; **xoá mềm** (`trangThai: DA_XOA`) |
| `xepLoaiThang` | `{maHS}_{tháng}`: số liệu máy tính + xếp loại người nhập chọn + cờ chốt |
| `taiKhoan/{uid}` | Hồ sơ + vai trò của người dùng Firebase Auth |
| `dangNhap/{tên}` | Ánh xạ tên đăng nhập → email (chỉ đọc từng tên, không liệt kê được) |
| `nhatKyHeThong` | Ai làm gì, khi nào (chỉ GVCN đọc được) |
| `heThong/khoiTao` | Có mặt = đã khởi tạo, khoá màn hình cài đặt lần đầu |

Điểm tuần / điểm tháng của một học sinh được **tính lại ở trình duyệt** mỗi khi có người ghi sổ rồi lưu
vào `xepLoaiThang` để bảng lớp tải nhanh. Nghi ngờ lệch số: *Quản trị → Tính lại số liệu cả lớp*.

---

## Giới hạn cần biết

- **Không có Cloud Functions** (để giữ gói miễn phí). Hệ quả:
  - Firebase không cho đặt mật khẩu hộ người khác từ trình duyệt, nên **"Cấp lại mật khẩu"** tạo một tài khoản
    Auth mới cùng tên đăng nhập và chuyển hồ sơ sang. Tài khoản Auth cũ thành "mồ côi" (không còn quyền gì);
    có thể dọn bằng *Console → Authentication* khi muốn.
  - Số liệu tổng hợp do trình duyệt của người ghi sổ tính và ghi, rules chỉ đảm bảo đúng *vai trò* chứ không
    kiểm tra được con số. Phù hợp một lớp học; với quy mô trường nên chuyển phần tính sang Cloud Functions.
- **Hạn mức miễn phí Firestore**: 50.000 lượt đọc / 20.000 lượt ghi mỗi ngày — thừa cho một lớp ~40 học sinh.
- **Chống dò mật khẩu** do Firebase Authentication đảm nhiệm (giới hạn số lần thử, `too-many-requests`).
- **Không xoá cứng**: sửa/xoá nhật ký chỉ đổi trạng thái và có ghi `nhatKyHeThong`, vì điểm rèn luyện ảnh hưởng học bạ.
- **Múi giờ** `Asia/Ho_Chi_Minh` cho "hôm nay"; ngày lưu dạng `yyyy-MM-dd`.

## Chuyển dữ liệu cũ

Nếu cần đưa dữ liệu từ Google Sheet cũ sang: tải sheet `HocSinh` về lấy cột họ tên và dán vào
*Quản trị → Học sinh*; nhật ký các tháng trước nhập lại qua *Sổ thi đua* (hoặc giữ file Excel làm tư liệu lưu).
Mã Apps Script cũ: `git show eafa9dd:apps-script/Code.gs`.

---

## 🔒 Quyền riêng tư

- Trang web có thể công khai, nhưng **dữ liệu chỉ đọc được sau khi đăng nhập** và theo vai trò (xem `firestore.rules`).
  Người chưa đăng nhập chỉ thấy tên lớp, tên trường và ánh xạ tên đăng nhập → email.
- **Không đẩy lên repo**: danh sách học sinh thật, file Excel gốc, ảnh sổ (đã có trong `.gitignore`).
- Bản in tài khoản phụ huynh chứa mật khẩu ban đầu: cắt rời phát riêng, không đăng nhóm chung.

## Cấu trúc thư mục

```
docs/                       Web tĩnh (GitHub Pages / Firebase Hosting trỏ vào đây)
  index.html
  assets/css/style.css      Giao diện (màu, cỡ chữ khai báo ở :root)
  assets/js/config.js       ← chỉ cần sửa file này: firebaseConfig
  assets/js/firebase.js     Khởi tạo Firebase
  assets/js/data.js         Đăng nhập, đọc/ghi Firestore, tính lại số liệu, xuất Excel
  assets/js/logic.js        Phép tính điểm / xếp loại (thuần JS, có test)
  assets/js/seed.js         Danh mục lỗi, điểm cộng, cấu hình mặc định
  assets/js/app.js          Khung trang, định tuyến, đăng nhập, khởi tạo, đổi mật khẩu
  assets/js/v-*.js          Các màn hình: bảng lớp, chi tiết, sổ thi đua, quản trị
firestore.rules             Quy tắc bảo mật (BẮT BUỘC dán vào Firebase Console)
firebase.json               Cấu hình Firebase CLI / Hosting
tai-lieu/                   Hướng dẫn cho GVCN, quy tắc mặc định, câu hỏi còn mở
tests/                      logic.test.mjs + harness chạy thử với Firebase giả
```
