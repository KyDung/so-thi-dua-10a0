# Những điều cần hỏi cô chủ nhiệm

> Web đã chạy được và **không còn câu nào chặn**. Danh sách dưới đây là mấy thứ nhỏ,
> hỏi được lúc nào cũng được.
>
> Mọi giá trị đều sửa được trên web (*Quản trị → Cấu hình / Danh mục lỗi*) —
> **không cần sửa code**, sửa xong bấm *Tính lại* ở tab Tổng quan.

---

## ✅ Đã chốt

| | Kết luận | Đã áp dụng |
|---|---|---|
| **Phạm vi** | Chỉ 1 lớp | Giữ kiến trúc 1 lớp |
| **Mục đích** | Sổ điện tử: cán bộ lớp cập nhật, GVCN và phụ huynh theo dõi | Trang chủ = bảng lớp theo tháng |
| **Bảo mật** | Chưa cần, ai cũng xem được | Bỏ hết PIN. Chỉ nhập mới cần đăng nhập |
| **Xếp loại** | **Cán bộ lớp / GVCN tự nhập**, web không tự tính | Ô chọn TỐT/KHÁ/ĐẠT/CHƯA ĐẠT trong bảng lớp |
| **Chia tổ** | Không bắt buộc | Tắt mặc định. Bảng xếp hạng tổ tự ẩn khi cột `To` trống |
| **Dữ liệu cũ** | Không cần nhập lại tháng 9 | Bắt đầu từ tháng nào dùng thì tính từ đó |

---

## Mấy thứ nhỏ, hỏi lúc nào cũng được

### Danh mục lỗi đã đủ chưa?

Em lập sẵn **34 mục** để cán bộ lớp chọn khi chấm:
- 15 lỗi sinh hoạt dưới cờ (lấy từ sheet `SHTT` của file trường)
- 9 lỗi hạ bậc + 6 lỗi nghiêm trọng (lấy từ sheet `QUY ĐỊNH`)
- 5 lỗi nề nếp hằng ngày em tự thêm: đi học muộn, không làm bài tập, trực nhật không sạch,
  mất trật tự, bị ghi sổ đầu bài

Nếu lớp còn mục nào khác (nợ quỹ lớp, vắng sinh hoạt Đoàn…) thì thêm trong *Quản trị → Danh mục lỗi → Thêm lỗi*.

### Điểm cộng / điểm trừ đã hợp lý chưa?

Em lấy đúng theo ảnh sổ tay: lỗi nhỏ trường −2, lỗi nhỏ lớp −1, lỗi hạ bậc trường −6,
lỗi hạ bậc lớp −2, lỗi nghiêm trọng −12. Điểm cộng: hoa điểm tốt 8/9/10 = +1/+2/+3.

Có hai chỗ trong ảnh em chưa rõ, nhưng **không ảnh hưởng gì đến hạnh kiểm**:
- Dấu `★` trong "Hoá ★" nghĩa là gì?
- "ĐIỂM CÓ SẴN: 5" — trong ảnh Tổng = 8, có sẵn = 5, nhưng Điểm tổng ghi 18 (lệch 5).
  Dòng viết tay "+5 (Anh - Tổ)" có vẻ là phần chênh này.

*Chỉ cần nếu lớp có thi đua theo tổ.*

### Ai được xếp loại?

Hiện tại: **cán bộ lớp và GVCN** được chọn xếp loại (mọi cán bộ lớp quyền ngang nhau)
và điểm cộng, không xếp loại được.

Nếu cô muốn chỉ mình cô xếp loại thì báo, em đổi một dòng là xong.

### Khi nào chốt tháng?

Sau khi cô bấm **Chốt tháng**, tháng đó khóa lại, cán bộ lớp không sửa được nữa.
Cô muốn chốt vào ngày mấy hàng tháng?

---

## Nếu sau này cô muốn web tự tính xếp loại

Phần tính tự động **đã viết sẵn và đã kiểm thử**, chỉ đang tắt. Bật bằng cách tích
*Tự lấy xếp loại theo gợi ý* trong *Quản trị → Cấu hình*.

Ngay cả khi đang tắt, web vẫn hiện một **cột "Gợi ý"** bên cạnh ô chọn — máy tính sẵn theo
quy chế của trường để cán bộ lớp tham khảo, kèm nút "Điền theo gợi ý" để điền nhanh cả lớp
rồi sửa lại những bạn cần. Không bắt buộc dùng.

Nếu bật tự động thì lúc đó mới cần hỏi cô: *"lỗi chưa bị trừ tháng này tính vào tháng sau"*
nghĩa là bao nhiêu lỗi nhỏ thì tính 1 lần ghi sổ đầu bài? (đang tạm để 3)
