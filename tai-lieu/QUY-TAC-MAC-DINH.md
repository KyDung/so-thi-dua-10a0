# Quy tắc mặc định đang áp dụng trong hệ thống

> Đây là các quy tắc **tôi tự đặt** để web chạy được ngay. Tất cả đều sửa được trên web
> (*Quản trị → Cấu hình* và *Danh mục lỗi*) — **sửa xong bấm "Tính lại" là số liệu đổi theo,
> không cần sửa code**. Sau khi hỏi cô thì chỉnh lại các con số ở đây.

---

## 1. Hai thước đo chạy song song

Điểm mấu chốt: **xếp loại hạnh kiểm KHÔNG tính từ điểm thi đua**. Hai thứ tách rời:

| | Điểm thi đua | Xếp loại rèn luyện |
|---|---|---|
| Đơn vị | Điểm số (có thể âm) | TỐT / KHÁ / ĐẠT / CHƯA ĐẠT |
| Dùng cho | Xếp hạng thi đua theo tuần | Học bạ, nộp trường |
| Ai quyết định | Máy tự cộng từ nhật ký | **Người nhập tự chọn** |
| Chu kỳ | Tuần | Tháng → Học kỳ → Cả năm |
| Nguồn | Sổ tay tổ trưởng (ảnh chụp) | Quy định của trường (sheet `QUY ĐỊNH`) |

Lý do tách: quy định của trường xếp loại theo **loại lỗi** ("mỗi lần vi phạm lỗi X thì hạ 1
bậc"), không theo tổng điểm. Nếu ép quy đổi điểm → loại sẽ sai quy chế. Điểm chỉ để thi
đua giữa các tổ cho vui và tạo động lực.

---

## 2. Thang điểm thi đua (lấy đúng từ ảnh sổ tay)

### Điểm trừ

| Nhóm lỗi | Điểm |
|---|---|
| Lỗi nhỏ — lỗi trường | −2 |
| Lỗi nhỏ — lỗi lớp | −1 |
| Lỗi hạ 1 bậc HK — lỗi trường | −6 |
| Lỗi hạ 1 bậc HK — lỗi lớp | −2 |
| Lỗi HK yếu (chưa đạt) | −12 |

### Điểm cộng

| Loại | Điểm | Ghi chú |
|---|---|---|
| Hoa điểm tốt — điểm 8 | +1 | |
| Hoa điểm tốt — điểm 9 | +2 | |
| Hoa điểm tốt — điểm 10 | +3 | |
| Điểm tốt có dấu ★ | +3 | **Chưa rõ ★ nghĩa là gì** — xem câu hỏi Q4 |
| Phát biểu / giúp lớp | +1 | Cán bộ lớp tự chấm, tối đa 3đ/tuần/HS |
| Điểm khởi tạo mỗi tổ / tuần | +5 | Đúng dòng "ĐIỂM CÓ SẴN: 5" trong ảnh |

> **Giả định**: "Điểm có sẵn = 5" là điểm sàn mỗi tổ được cho đầu tuần. Trong ảnh: tổng HS
> = 8, có sẵn = 5, nhưng điểm tổng ghi 18 → lệch 5. Dòng viết tay "+5 (Anh - Tổ)" có vẻ là
> điểm thưởng tổ do môn Anh. Tôi tạm hiểu: **Điểm tổng = Tổng HS + Điểm có sẵn + Điểm
> thưởng tổ**. Xem câu hỏi Q6.

---

## 3. Quy tắc xếp loại THÁNG

> **Quan trọng**: mặc định `TuDongXepLoai = FALSE` — web **không tự xếp loại**.
> Cán bộ lớp / GVCN tự chọn, giống sổ giấy. Công thức dưới đây chỉ dùng để sinh
> **cột "Gợi ý"** cho người nhập tham khảo, và sẽ được áp dụng thật nếu đổi
> `TuDongXepLoai = TRUE`.

Mỗi HS bắt đầu tháng ở mức **TỐT**, rồi hạ dần:

```
1. Nếu có ≥1 lỗi nhóm CHUA_DAT          → CHƯA ĐẠT (dừng)
2. Hạ N bậc, với N = số lần vi phạm lỗi nhóm HA_BAC
   TỐT → KHÁ → ĐẠT → CHƯA ĐẠT
3. Trần theo số lần bị ghi sổ đầu bài trong tháng:
   ≥ 3 lần  → không được TỐT (trần = KHÁ)
   ≥ 5 lần  → không được KHÁ (trần = ĐẠT)
4. Kết quả = mức thấp hơn giữa (2) và (3)
```

**Lỗi nhỏ không trực tiếp hạ bậc.** Chúng chỉ trừ điểm thi đua và được cộng dồn (mục 4).

### Các lỗi HẠ 1 BẬC (từ mục I.3 của quy định)
- Nghỉ không phép / trốn học / bỏ tiết
- Không tham gia hoạt động do Trường, Đoàn TN tổ chức
- Vi phạm trang phục, tóc, không đeo thẻ HS — **lần thứ 2 trở đi trong học kỳ**
- Không đội mũ bảo hiểm; đi xe >50cc khi chưa đủ tuổi/chưa có bằng
- Bị phê bình vì thiếu nghiêm túc, gây rối hoạt động tập thể
- Dùng điện thoại trong giờ; không nộp ĐT vào tủ lớp trước giờ học 5 phút
- Chơi game online không lành mạnh, dùng Internet mục đích xấu

> **Lưu ý về lỗi trang phục**: đây là lỗi *đếm theo học kỳ* — lần 1 là lỗi nhỏ, lần 2 trở
> đi mới hạ bậc. Hệ thống đã cài cờ `NguongHocKy = 2` cho nhóm lỗi này và tự đếm xuyên
> tháng.

### Các lỗi CHƯA ĐẠT (từ mục I.4)
- Điều khiển xe máy khi chưa đủ điều kiện / vi phạm Luật GTĐB bị thông báo
- Sai phạm nghiêm trọng hoặc lặp lại nhiều lần dù đã được giáo dục
- Vô lễ, xúc phạm GV/NV nhà trường
- Gian lận trong học tập, kiểm tra, thi
- Xúc phạm danh dự bạn; đánh nhau, gây rối trật tự
- Đánh bạc, ma túy, vũ khí, chất nổ, văn hóa phẩm đồi trụy, tệ nạn xã hội

### 15 lỗi sinh hoạt dưới cờ (sheet `SHTT`) — tôi xếp mặc định như sau

| Lỗi | Nhóm | Điểm |
|---|---|---|
| Sai đồng phục, thiếu cavat | Nhỏ - trường (*có ngưỡng HK*) | −2 |
| Bị nhắc nhở trước cờ, tại hội nghị | Nhỏ - trường | −2 |
| Chỗ tập trung có rác | Nhỏ - lớp | −1 |
| Tập trung chậm | Nhỏ - lớp | −1 |
| Tự ý dời hàng | Nhỏ - lớp | −1 |
| Lấy ghế muộn | Nhỏ - lớp | −1 |
| Hàng ngũ lộn xộn, ngồi sai vị trí | Nhỏ - lớp | −1 |
| Không hát quốc ca | Nhỏ - trường | −2 |
| Nói chuyện gây mất trật tự | Nhỏ - trường | −2 |
| Làm việc riêng, không chú ý | Nhỏ - lớp | −1 |
| Không dồn hết ghế | Nhỏ - lớp | −1 |
| Tắt điện hội trường | Nhỏ - lớp | −1 |
| TV đội trực tuần đi muộn | Nhỏ - trường | −2 |
| CBL nộp biên bản muộn | Nhỏ - trường | −2 |
| CBL không nộp biên bản | Hạ bậc - trường | −6 |

---

## 4. Cộng dồn lỗi sang tháng sau

Quy định ghi: *"Số lỗi HS chưa bị trừ hạnh kiểm của tháng này sẽ bị tính vào tổng số lỗi
của tháng sau."*

Cách tôi hiểu và cài: bộ đếm **lỗi nhỏ** là một "ví" tích lũy xuyên tháng.
- `NguongLoiNho = 3`: cứ đủ 3 lỗi nhỏ thì tính **1 lần bị ghi sổ đầu bài**, ví trừ đi 3.
- Số lỗi nhỏ lẻ còn lại (0, 1 hoặc 2) **được chuyển sang tháng sau**, không mất đi.
- Ví dụ: T9 có 5 lỗi nhỏ → 1 lần ghi sổ, dư 2 chuyển sang T10. T10 có 4 lỗi nhỏ → tổng
  6 → 2 lần ghi sổ, dư 0.

Đây là **diễn giải của tôi**, mức rủi ro cao nhất trong toàn bộ hệ thống. Xem câu hỏi Q3.

---

## 5. Xếp loại HỌC KỲ (mục II của quy định)

Áp dụng nguyên văn, xét theo thứ tự TỐT → KHÁ → ĐẠT → CHƯA ĐẠT:

**TỐT** nếu một trong hai:
- Tốt tất cả các tháng, hoặc chỉ có đúng 1 tháng Đạt và tháng đó nằm trong **2 tháng đầu HK**
- Tốt ≥3 tháng, trong đó ≥1 tháng Tốt nằm ở **2 tháng cuối HK**, và không có tháng nào Đạt/Chưa đạt

**KHÁ** nếu một trong hai:
- Toàn Khá/Tốt, hoặc chỉ có 1 tháng Chưa đạt ở **2 tháng đầu HK**
- Khá/Tốt ≥3 tháng, trong đó ≥1 tháng Khá/Tốt ở **2 tháng cuối HK**, không có tháng Chưa đạt

**ĐẠT**: không đủ chuẩn Khá, nhưng có ≥3 tháng xếp Đạt trở lên và ít nhất 1 trong 2 tháng
cuối HK đạt từ Đạt trở lên.

**CHƯA ĐẠT**: không đủ chuẩn Đạt.

> HK I gồm T9, T10, T11, T12, T1 → "2 tháng đầu" = T9,T10; "2 tháng cuối" = T12,T1.
> HK II gồm T1..T5. **T1 nằm ở cả hai kỳ** trong file gốc — xem câu hỏi Q8.

---

## 6. Cả năm

Quy định phần III chỉ có ghi chú định tính (chiều hướng tiến bộ, HS giỏi, TDTT, hội đồng
kỷ luật), **không có công thức**. Vì vậy hệ thống:
- Tự đề xuất một mức = mức thấp hơn giữa HK I và HK II (quy tắc an toàn phổ biến)
- Đánh dấu ô là **"đề xuất"**, GVCN bắt buộc phải bấm duyệt mới thành chính thức
- Hiển thị kèm các tín hiệu định tính đã nhập (giải thưởng, đóng góp tập thể) để cô cân nhắc

---

## 7. Quyền truy cập (cô đã chốt: mở, chưa cần bảo mật)

| Ai | Làm được gì |
|---|---|
| **Bất kỳ ai có link** | Xem tất cả: bảng lớp từng tháng, chi tiết từng học sinh, xếp hạng thi đua. Không cần đăng nhập, không cần mã. |
| **Cán bộ lớp** (tài khoản) | Thêm: nhập điểm cho cả lớp, chọn xếp loại tháng. Mọi cán bộ lớp quyền ngang nhau. |
| **GVCN** (tài khoản) | Thêm: tính lại, chốt tháng, xuất Excel |

Đây là lựa chọn có chủ đích của cô — mục đích là để phụ huynh tiện theo dõi, không phải
giấu diếm. Vì vậy hệ thống bỏ hẳn cơ chế PIN cho từng học sinh.

**Cập nhật:** bản Firebase đã bắt buộc đăng nhập; phụ huynh chỉ đọc được dữ liệu của con mình
(do `firestore.rules` kiểm soát), không còn "công khai hoàn toàn" như bản cũ.

---

## 8. Các quyết định kỹ thuật khác tôi tự chốt

- **Mã HS**: `10A0_01` … `10A0_41` theo đúng thứ tự A→Z của file gốc. Cần mã vì trong lớp
  có vài cặp tên chỉ khác nhau ở họ — dùng tên làm khóa sẽ lẫn.
- **Chia tổ**: file gốc **không có cột tổ**. Tôi chia tạm 41 HS thành **4 tổ** (11/10/10/10)
  theo thứ tự danh sách. Chắc chắn sai so với thực tế → cần cô/lớp trưởng sửa lại.
  Tổ **không ảnh hưởng xếp loại hạnh kiểm**, chỉ dùng cho bảng thi đua. Để trống hết cột
  `To` thì phần xếp hạng tổ tự ẩn.
- **Không xóa cứng**: mọi bản ghi sửa/xóa đều chuyển trạng thái và ghi vào `nhatKyHeThong` (Quản trị → Nhật ký).
  Điểm hạnh kiểm ảnh hưởng học bạ nên phải truy vết được.
- **Chốt tháng**: sau khi GVCN bấm "Chốt", cán bộ lớp không sửa được tháng đó nữa.
- **Múi giờ**: `Asia/Ho_Chi_Minh`, ngày đổi lúc 00:00.
