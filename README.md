# Sổ điện tử theo dõi thi đua – hạnh kiểm lớp 10A0-K67

🔗 **Web đang chạy: https://kydung.github.io/so-thi-dua-10a0/**

Web tĩnh trên GitHub Pages + Google Apps Script làm backend + Google Sheet làm database.
Chi phí: **0 đồng**, không cần máy chủ.

Mục đích: cán bộ lớp **chép lại lỗi và điểm cộng/trừ từ sổ chính** để phụ huynh
tiện theo dõi. Khi có chênh lệch, đối chiếu sổ chính. Xếp loại nhập theo kết quả
đã thống nhất với GVCN; các phép tính và gợi ý trên web chỉ hỗ trợ theo dõi.

### Cập nhật bản sửa ngày 29/09/2026

1. Thay nội dung **Code.gs** và **XepLoai.gs** trong dự án Apps Script hiện có.
2. Triển khai → Quản lý các bản triển khai → sửa → **Phiên bản mới**. Giữ URL `/exec` cũ.
3. Cập nhật thư mục `docs/` lên GitHub Pages, sau đó tải lại trang và đăng nhập lại.

Không chạy lại khởi tạo database hoặc bắt đầu năm học mới. Không cần đổi cấu trúc Sheet.
Bản này thêm kiểm tra phiên bản từng dòng để tránh ghi đè khi nhiều người nhập;
cần cập nhật backend trước frontend. Các kiểm thử dùng dữ liệu giả, chưa ghi thử trên Sheet thật.

```
GitHub Pages (docs/)  ──JSONP / POST──►  Apps Script  ──►  Google Sheet
 Phụ huynh, học sinh xem                  doGet/doPost        10 sheet dữ liệu
 Cán bộ lớp chấm hằng ngày
 GVCN duyệt, chốt tháng, xuất Excel
```

---

## Cài đặt bản thật

### Bước 1 — Tạo Google Sheet và dán code

1. Tạo một Google Sheet mới, đặt tên `DB-ThiDua-10A0`.
2. `Tiện ích mở rộng` → `Apps Script`.
3. Xóa file `Code.gs` mặc định. Tạo 4 file và dán nội dung tương ứng từ thư mục
   [apps-script/](apps-script/):
   - `Setup.gs`
   - `Helper.gs`
   - `XepLoai.gs`
   - `Code.gs`
4. Bấm **Lưu**, rồi tải lại trang Google Sheet.

### Bước 2 — Khởi tạo database và nhập danh sách lớp

Trên thanh menu của Sheet sẽ xuất hiện mục **⚙️ Thi đua** → bấm **Khởi tạo database**.

Lần đầu Google sẽ hỏi cấp quyền: chọn tài khoản → `Nâng cao` → `Chuyển đến ... (không an toàn)`
→ `Cho phép`. (Cảnh báo này là bình thường với script tự viết, chưa qua kiểm duyệt của Google.)

Xong sẽ có 10 sheet với đầy đủ danh mục lỗi, danh mục điểm cộng và lịch tuần.

Tiếp theo, nhập danh sách lớp:

1. Mở sheet `HocSinh`, dán họ tên vào **cột B (HoTen)**, mỗi bạn một dòng.
   (Copy cột "Họ tên" từ file Excel của trường là nhanh nhất.)
2. Menu **⚙️ Thi đua** → **Sinh mã học sinh**. Hệ thống tự điền mã học sinh và tổ tạm.

> Danh sách học sinh **cố ý không có trong code**. Xem mục
> [Quyền riêng tư](#-quyền-riêng-tư-đọc-trước-khi-push) bên dưới.

### Bước 3 — Sửa lại dữ liệu cho đúng thực tế

| Sheet | Việc cần làm |
|---|---|
| `HocSinh` | Điền cột **ChucVu** (lớp trưởng / tổ trưởng). Cột **To** để trống cũng được — chỉ cần nếu lớp có thi đua theo tổ. |
| `TaiKhoan` | Đổi mật khẩu mặc định — xem bước 3b |
| `CauHinh` | Chỉnh các ngưỡng sau khi hỏi cô (xem [tai-lieu/CAU-HOI-CHO-CO.md](tai-lieu/CAU-HOI-CHO-CO.md)) |
| `DanhMucLoi` | Thêm/bớt lỗi, sửa điểm trừ và nhóm lỗi |

**3b. Đổi mật khẩu / thêm tài khoản**: vào sheet `TaiKhoan`, gõ mật khẩu thường vào cột
**`MatKhauMoi`**, rồi bấm menu **⚙️ Thi đua → 👤 Áp dụng tài khoản**. Script tự mã hoá và
xoá ô mật khẩu thường đi. Không phải đụng vào cột `MatKhauHash`.

Tài khoản có sẵn: `gvcn` / `gvcn@2026` · `loptruong` / `lt@2026` · `totruong1` / `tt1@2026`.
**Đổi mật khẩu `gvcn` ngay.**

**3c. Khóa bí mật cho token**: script tự sinh `SECRET` ngẫu nhiên khi chưa có.
Nếu đã đặt khóa riêng trong Thuộc tính tập lệnh thì script giữ nguyên.

### Bước 4 — Deploy Apps Script

`Triển khai` → `Tùy chọn triển khai mới` → chọn loại **Ứng dụng web**:

- **Thực thi với tư cách**: Tôi
- **Ai có quyền truy cập**: **Bất kỳ ai**

Bấm Triển khai, copy URL dạng `https://script.google.com/macros/s/AKfycb.../exec`.

> Mỗi lần sửa code phải **Triển khai → Quản lý các bản triển khai → sửa → Phiên bản mới**,
> nếu không URL vẫn chạy code cũ.

### Bước 5 — GitHub Pages ✅ ĐÃ XONG

Web đang chạy tại **https://kydung.github.io/so-thi-dua-10a0/**

Repo: https://github.com/KyDung/so-thi-dua-10a0 (công khai, Pages lấy từ nhánh `main` thư mục `/docs`)

Từ giờ mỗi lần `git push` là web tự cập nhật sau 1–2 phút.

### Bước 6 — Nối web với backend

Mở [docs/assets/js/config.js](docs/assets/js/config.js), sửa đúng 1 dòng:

```javascript
API_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
```

rồi chạy:

```bash
git add docs/assets/js/config.js
git commit -m "Nối web với Apps Script"
git push
```

Commit và push. Sau 1–2 phút GitHub Pages cập nhật, web bắt đầu chạy với dữ liệu thật.

> Trước khi dán URL, web sẽ hiện dải đỏ *"Chưa kết nối máy chủ dữ liệu"* — đúng như vậy,
> chưa có gì sai.

### Bước 7 — Gửi link cho lớp

Gửi link `https://<tên-tài-khoản>.github.io/<tên-repo>/` vào nhóm lớp / nhóm phụ huynh.
Ai mở cũng xem được, không cần tài khoản.

---

## Dùng hằng ngày

> Hướng dẫn đầy đủ cho cô chủ nhiệm (quản lý tài khoản, sang năm học mới, xử lý sự cố):
> [tai-lieu/HUONG-DAN-CHO-CO.md](tai-lieu/HUONG-DAN-CHO-CO.md)

**Phụ huynh, học sinh** → mở link là xem được ngay, **không cần đăng nhập, không cần mã gì**:
- Tab *Bảng lớp*: xếp loại cả lớp theo từng tháng, chọn tháng ở góc phải
- Bấm vào tên bất kỳ → xem chi tiết từng lượt vi phạm / điểm cộng theo tuần, lọc theo tháng
- Tab *Xếp hạng thi đua*: bảng điểm thi đua giữa các bạn

**Tổ trưởng / lớp trưởng chép sổ** → nút *Cán bộ lớp* → đăng nhập → tab *Sổ thi đua*
→ chọn tuần → gõ nội dung vào cột tương ứng → **Lưu thay đổi**.
Ví dụ `10 Toán, 9 Văn` trong cột điểm cộng là 2 lượt được cộng. Mỗi mục tính một lượt;
ngăn các mục bằng dấu phẩy hoặc chấm phẩy. Xóa nội dung ô rồi lưu để sửa phần chép sai.
Web chỉ lưu những dòng đã thay đổi. Nếu người khác vừa sửa cùng học sinh, web báo xung đột;
sao chép phần đang nhập rồi tải lại tuần để đối chiếu. Khi mất mạng, nội dung vẫn nằm trên
màn hình; kiểm tra lại dữ liệu nếu chưa biết lần lưu trước đã tới máy chủ hay chưa.
Nhật ký theo tuần không xác định ngày xảy ra từng lỗi. Muốn ghi rõ ngày, thêm ngày vào nội dung mục.

**Xếp loại cuối tháng** → lớp trưởng hoặc GVCN vào tab *Bảng lớp*, chọn xếp loại cho từng
bạn ở ô thả xuống rồi bấm **Lưu xếp loại**. Có nút *Điền theo gợi ý* để điền nhanh rồi sửa lại.

**GVCN** → tab *Quản trị* để chốt tháng và tạo Google Sheet tổng hợp, sau đó tải xuống Excel.
Đối chiếu mẫu của trường trước khi dùng để nộp.

---

## Cách xếp loại được tính

Chi tiết đầy đủ: [tai-lieu/QUY-TAC-MAC-DINH.md](tai-lieu/QUY-TAC-MAC-DINH.md)

**Mặc định: web KHÔNG tự xếp loại.** Giống sổ giấy — cán bộ lớp / GVCN tự chọn
TỐT / KHÁ / ĐẠT / CHƯA ĐẠT cho từng bạn trong tab *Bảng lớp*.

Web làm phần máy làm tốt hơn người: tự cộng điểm thi đua, đếm số lần bị ghi sổ đầu bài,
đếm số lỗi hạ bậc — hiện ngay cạnh ô chọn để người nhập có căn cứ.

Ngoài ra có một **cột "Gợi ý"**: máy tính sẵn theo quy chế của trường, kèm nút
*Điền theo gợi ý* để điền nhanh cả lớp rồi sửa lại những bạn cần. Chỉ là gợi ý, không bắt buộc.

<details><summary>Công thức gợi ý (và cũng là công thức khi bật chế độ tự động)</summary>

```
Bắt đầu tháng: TỐT
  ├─ có lỗi nghiêm trọng           → CHƯA ĐẠT
  ├─ mỗi lỗi hạ bậc                → hạ 1 bậc
  └─ trần theo số lần ghi sổ đầu bài: ≥3 lần → không quá KHÁ · ≥5 lần → không quá ĐẠT
Kết quả = mức thấp hơn giữa hai nhánh
```

Cứ 3 lỗi nhỏ tính 1 lần ghi sổ đầu bài; số lỗi lẻ chuyển sang tháng sau.

**Bật tự động**: đổi `TuDongXepLoai` thành `TRUE` trong sheet `CauHinh`.
</details>

---

## ⚠️ Những chỗ đang dùng giá trị tự đặt

Hai file gốc không đủ thông tin cho mọi thứ. **14 điểm cần hỏi cô** đã được ghi lại trong
[tai-lieu/CAU-HOI-CHO-CO.md](tai-lieu/CAU-HOI-CHO-CO.md), kèm sẵn phương án đề xuất.

Ba điểm quan trọng nhất:
1. Cơ chế cộng dồn lỗi sang tháng sau (mặc định: 3 lỗi nhỏ = 1 lần ghi sổ)
2. Điểm thi đua có ảnh hưởng xếp loại không (mặc định: **không**)
3. Danh sách tổ và tổ trưởng (mặc định: chia tạm 4 tổ theo A→Z — **chắc chắn sai**)

Mọi giá trị này nằm trong sheet `CauHinh` và `DanhMucLoi`, **sửa trên Sheet là web đổi ngay,
không cần sửa code**.

---

## Kiểm thử

```bash
node tests/test-xep-loai-ky.js     # 12 tình huống xếp loại học kỳ theo quy định mục II
node tests/test-cong-don-loi.js    # cộng dồn lỗi nhỏ qua các tháng, trần ghi sổ
node tests/test-luoi-thi-dua.js    # đối chiếu điểm các cột
node tests/test-luu-so.js          # chạy mã backend thật với Sheet giả: lưu, xung đột, phân quyền, chốt tháng
```

---

## 🔒 Quyền riêng tư (đọc trước khi push)

**GitHub Pages miễn phí chỉ chạy trên repo công khai.** Mọi file trong repo đều đọc được
từ Internet, kể cả khi không ai link tới.

Vì vậy dự án được sắp xếp như sau:

| Thứ | Ở đâu | Lên GitHub? |
|---|---|---|
| Mã nguồn web, danh mục lỗi, quy tắc | repo | ✅ có |
| Dữ liệu giả phục vụ kiểm thử | `tests/` | ✅ có |
| **Tên thật học sinh** | chỉ trong Google Sheet | ❌ không |
| **File Excel gốc, ảnh sổ theo dõi** | `du-lieu-goc/` | ❌ không (đã có trong `.gitignore`) |

> Lưu ý: bản thân **trang web thì công khai có chủ đích** — cô đã chốt là ai cũng xem được
> để phụ huynh tiện theo dõi. Mục này nói về việc không đẩy *file nguồn* chứa dữ liệu lớp
> lên repo, vì repo còn lộ ra cả lịch sử chỉnh sửa.

Kiểm tra trước khi push lần đầu:

```bash
git status --short          # không được thấy du-lieu-goc/ hay file .xlsx
grep -ri "tên-một-học-sinh-thật" docs/ apps-script/    # phải không ra kết quả nào
```

Nếu lỡ push tên thật lên rồi: xóa commit khỏi lịch sử (`git push --force` sau khi sửa).
Lưu ý GitHub vẫn giữ commit cũ một thời gian, nên tốt nhất là đừng push nhầm ngay từ đầu.

Muốn repo riêng tư mà vẫn có Pages thì cần GitHub Pro (có bản miễn phí cho học sinh,
sinh viên qua GitHub Student Developer Pack).

---

## Giới hạn cần biết

- **Apps Script không phải database thật**: khoảng 30 request đồng thời, 20.000 dòng ghi/ngày,
  mỗi lần chạy tối đa 6 phút. Với một lớp 41 học sinh thì thừa sức. Mở rộng ra cả khối/trường
  thì phải chuyển sang Firebase hoặc Supabase.
- **Web App deploy ở chế độ "Bất kỳ ai"** nghĩa là ai có URL đều gọi được API để *đọc*.
  Việc *ghi* (nhập điểm, chốt tháng) vẫn phải có tài khoản.
- **Trang web công khai hoàn toàn**: ai có link đều xem được tên và kết quả rèn luyện của cả
  lớp. Đây là lựa chọn có chủ đích để phụ huynh tiện theo dõi. Nếu sau này cần kín hơn
  (mỗi phụ huynh chỉ xem con mình) thì thêm lớp đăng nhập sau — cấu trúc hiện tại đã sẵn sàng.
- **Không xóa cứng**: mọi thao tác sửa/xóa đều ghi vào sheet `Log` và bản ghi chỉ đổi trạng
  thái, vì điểm rèn luyện ảnh hưởng học bạ nên phải truy vết được.
- **Múi giờ** `Asia/Ho_Chi_Minh`. Sheet được set sẵn khi khởi tạo.

---

## Cấu trúc thư mục

```
docs/                     Web tĩnh (GitHub Pages trỏ vào đây)
  index.html
  assets/css/style.css
  assets/js/config.js     ← chỉ cần sửa file này sau khi deploy
  assets/js/api.js        Gọi Apps Script (JSONP cho GET, text/plain cho POST)
  assets/js/app.js        Các màn hình
apps-script/              Dán vào Apps Script của Google Sheet
  Setup.gs                Khởi tạo 10 sheet, danh mục lỗi, quản lý tài khoản, năm học mới
  Helper.gs               Đọc/ghi sheet, cấu hình, log
  XepLoai.gs              Engine tính xếp loại tháng / học kỳ / cả năm
  Code.gs                 API, đăng nhập, phân quyền, xuất Excel
tai-lieu/
  HUONG-DAN-CHO-CO.md     Quản lý tài khoản, dữ liệu, năm học mới — viết cho GVCN
  QUY-TAC-MAC-DINH.md     Toàn bộ quy tắc đang áp dụng và lý do
  CAU-HOI-CHO-CO.md       Những thứ còn cần hỏi (không còn câu nào chặn)
tests/                    Kiểm thử logic xếp loại bằng Node
du-lieu-goc/              2 file gốc cô gửi
```
