/**
 * seed.js — Dữ liệu khởi tạo: danh mục lỗi, điểm cộng, cấu hình mặc định.
 * Lấy nguyên từ "huong-dan-thi-đua-cá-nhân-2023-2024.docx". Chỉ dùng một lần khi khởi tạo;
 * sau đó GVCN sửa ngay trên web (Quản trị → Cấu hình / Danh mục).
 *
 * Nhóm lỗi:  NHO | HA_BAC (hạ 1 bậc) | CHUA_DAT (xếp Chưa đạt tháng đó)
 * nhanDoiTuLan2: lần vi phạm thứ 2 trở đi trong tuần thì nhân đôi mức trừ
 * nguongHocKy > 0: lần thứ N trở đi trong học kỳ mới bị hạ bậc
 * ghiSoDauBai: có tính là 1 lần bị ghi tên sổ đầu bài không
 * diem của lỗi là số ÂM (điểm trừ), của điểm cộng là số DƯƠNG.
 */

export const DS_LOI = [
  {"ma":"CC01","ten":"Nghỉ học có phép vì việc riêng","nhomCha":"Chuyên cần","nhom":"NHO","diem":-1,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Ốm đau, tai nạn, việc hiếu có giấy phép: không trừ"},
  {"ma":"CC02","ten":"Nghỉ học không phép","nhomCha":"Chuyên cần","nhom":"HA_BAC","diem":-5,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"CC03","ten":"Bỏ tiết / nghỉ học không được GV đồng ý","nhomCha":"Chuyên cần","nhom":"HA_BAC","diem":-5,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"RV01","ten":"Đi học muộn (sau chuông đầu giờ / bị ghi sổ cờ đỏ)","nhomCha":"Ra vào lớp","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"RV02","ten":"Vào lớp muộn tiết học","nhomCha":"Ra vào lớp","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":"Muộn quá nửa tiết thì tính như bỏ tiết"},
  {"ma":"RV03","ten":"Ra khỏi khu vực trường khi đang học mà không được phép","nhomCha":"Ra vào lớp","nhom":"NHO","diem":-5,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"TP01","ten":"Không đeo phù hiệu / thẻ học sinh","nhomCha":"Trang phục","nhom":"NHO","diem":-2,"nhanDoiTuLan2":true,"nguongHocKy":2,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Lần 2 trong học kỳ thì hạ 1 bậc HK"},
  {"ma":"TP02","ten":"Không mặc đồng phục đúng quy định, không đi giày/dép quai hậu","nhomCha":"Trang phục","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":2,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"TP03","ten":"Đầu tóc không gọn gàng, tóc nhuộm","nhomCha":"Trang phục","nhom":"NHO","diem":-5,"nhanDoiTuLan2":true,"nguongHocKy":2,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"VS01","ten":"Viết vẽ bậy lên bàn, lên tường","nhomCha":"Vệ sinh - của công","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"VS02","ten":"Phá bình nước, làm hỏng bàn ghế","nhomCha":"Vệ sinh - của công","nhom":"NHO","diem":-5,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"VS03","ten":"Trực nhật muộn hoặc không sạch sẽ","nhomCha":"Vệ sinh - của công","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"VS04","ten":"Xả rác không đúng nơi quy định, ăn quà trong lớp","nhomCha":"Vệ sinh - của công","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"VS05","ten":"Làm hỏng cơ sở vật chất của trường và lớp","nhomCha":"Vệ sinh - của công","nhom":"NHO","diem":-10,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Đền gấp 5 lần giá trị"},
  {"ma":"XE01","ten":"Xếp xe lộn xộn, không cùng chiều, để sai vị trí","nhomCha":"Xe - giao thông","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"XE02","ten":"Xe không khoá hoặc quên chìa khoá xe","nhomCha":"Xe - giao thông","nhom":"NHO","diem":-2,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"XE03","ten":"Đi xe trong khu vực cấm đi xe của trường","nhomCha":"Xe - giao thông","nhom":"NHO","diem":-3,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"XE04","ten":"Gửi xe ngoài nhà trường","nhomCha":"Xe - giao thông","nhom":"NHO","diem":-5,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"XE05","ten":"Không đội mũ bảo hiểm khi đi xe máy / xe đạp điện","nhomCha":"Xe - giao thông","nhom":"CHUA_DAT","diem":-20,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Xếp loại Chưa đạt tháng đó"},
  {"ma":"VP01","ten":"Nói tục, chửi bậy (kể cả trên mạng xã hội), đánh nhau, hút thuốc, chơi bài","nhomCha":"Vi phạm khác","nhom":"HA_BAC","diem":-10,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"VP02","ten":"Thái độ thiếu tôn trọng lớp trực tuần","nhomCha":"Vi phạm khác","nhom":"NHO","diem":-10,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"VP03","ten":"Vô lễ với cán bộ, giáo viên, nhân viên","nhomCha":"Vi phạm khác","nhom":"HA_BAC","diem":-10,"nhanDoiTuLan2":true,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"CB01","ten":"Không học bài, không làm bài tập ở nhà","nhomCha":"Chuẩn bị bài","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"CB02","ten":"Không soạn bài đầy đủ trước khi đến lớp","nhomCha":"Chuẩn bị bài","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"CB03","ten":"Thiếu sách vở, dụng cụ học tập","nhomCha":"Chuẩn bị bài","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"DK01","ten":"Điểm kiểm tra 0 - 1","nhomCha":"Điểm kém","nhom":"NHO","diem":-3,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"DK02","ten":"Điểm kiểm tra 2 - 3","nhomCha":"Điểm kém","nhom":"NHO","diem":-2,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"DK03","ten":"Điểm kiểm tra 4 - dưới 5","nhomCha":"Điểm kém","nhom":"NHO","diem":-1,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"SH01","ten":"Xếp hàng chậm, muộn","nhomCha":"Chào cờ - SHTT","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"SH02","ten":"Ngồi không đúng vị trí lớp","nhomCha":"Chào cờ - SHTT","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"SH03","ten":"Không nghiêm túc, làm việc riêng, nói chuyện riêng","nhomCha":"Chào cờ - SHTT","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Tài liệu không ghi rõ mức trừ - tạm để -5"},
  {"ma":"SH04","ten":"Dùng điện thoại khi chưa được thầy cô cho phép","nhomCha":"Chào cờ - SHTT","nhom":"NHO","diem":-10,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"GH01","ten":"Bị ghi tên trong sổ đầu bài (mất trật tự, làm việc riêng, không ghi bài)","nhomCha":"Giờ học","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":true,"canMon":true,"hienThi":true,"ghiChu":"Tính 1 lần ghi sổ đầu bài"},
  {"ma":"GH02","ten":"Không để điện thoại vào tủ, hoặc bị phát hiện dùng điện thoại trong giờ","nhomCha":"Giờ học","nhom":"HA_BAC","diem":-10,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"GH03","ten":"Mang sách báo, máy nghe nhạc không phục vụ việc học","nhomCha":"Giờ học","nhom":"HA_BAC","diem":-10,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":"Thu tang vật"},
  {"ma":"GH04","ten":"Ngồi sai sơ đồ lớp khi chưa được GV bộ môn đồng ý","nhomCha":"Giờ học","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"GH05","ten":"Trao đổi bài trong giờ kiểm tra","nhomCha":"Giờ học","nhom":"NHO","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":""},
  {"ma":"GH06","ten":"Mang, dùng tài liệu hoặc điện thoại trong giờ kiểm tra","nhomCha":"Giờ học","nhom":"CHUA_DAT","diem":-10,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":true,"hienThi":true,"ghiChu":"Thu tang vật, mời CMHS"},
  {"ma":"TT01","ten":"Không hoàn thành nhiệm vụ (nộp giấy tờ, bài dự thi muộn...)","nhomCha":"Hoạt động tập thể","nhom":"NHO","diem":-2,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"TT02","ten":"Bỏ không tham gia hoạt động được lớp / Đoàn / trường phân công","nhomCha":"Hoạt động tập thể","nhom":"HA_BAC","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":""},
  {"ma":"TT03","ten":"Lao động: đi muộn, không chăm chỉ","nhomCha":"Hoạt động tập thể","nhom":"NHO","diem":-3,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Phạt lao động thêm cuối buổi"},
  {"ma":"TT04","ten":"Lao động: không mang dụng cụ","nhomCha":"Hoạt động tập thể","nhom":"NHO","diem":-3,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Phạt lao động thêm cuối buổi"},
  {"ma":"TT05","ten":"Bỏ lao động","nhomCha":"Hoạt động tập thể","nhom":"HA_BAC","diem":-5,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Phạt lao động 3 buổi"},
  {"ma":"KHAC","ten":"Lỗi khác (tự ghi nội dung và điểm trừ)","nhomCha":"Khác","nhom":"NHO","diem":0,"nhanDoiTuLan2":false,"nguongHocKy":0,"ghiSoDauBai":false,"canMon":false,"hienThi":true,"ghiChu":"Dùng khi lỗi không có trong danh sách - người nhập tự gõ nội dung và điểm"}
];

export const DS_CONG = [
  {"ma":"DT10","ten":"Điểm tốt: đạt 10","nhomCha":"Điểm tốt","diem":3,"canMon":true,"tranTuan":0,"hienThi":true,"ghiChu":""},
  {"ma":"DT09","ten":"Điểm tốt: từ 9 đến 9.75","nhomCha":"Điểm tốt","diem":2,"canMon":true,"tranTuan":0,"hienThi":true,"ghiChu":""},
  {"ma":"DT08","ten":"Điểm tốt: từ 8 đến 8.75","nhomCha":"Điểm tốt","diem":1,"canMon":true,"tranTuan":0,"hienThi":true,"ghiChu":""},
  {"ma":"PB01","ten":"Phát biểu nhiệt tình (1-3 lần trong 1 tiết)","nhomCha":"Nhiệt tình - trách nhiệm","diem":1,"canMon":true,"tranTuan":0,"hienThi":true,"ghiChu":""},
  {"ma":"HT01","ten":"Hỗ trợ công việc lớp, hoàn thành tốt nhiệm vụ, giúp bạn vượt khó","nhomCha":"Nhiệt tình - trách nhiệm","diem":3,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng vào điểm trung bình cuối tháng"},
  {"ma":"DO01","ten":"Việc tốt được Đoàn trường biểu dương, khen thưởng","nhomCha":"Hoạt động Đoàn","diem":5,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng cuối tháng"},
  {"ma":"DO02","ten":"Sáng tạo, đạt giải thưởng, lập thành tích đặc biệt","nhomCha":"Hoạt động Đoàn","diem":5,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng cuối tháng"},
  {"ma":"DO03","ten":"Tham gia công việc chung của Đoàn","nhomCha":"Hoạt động Đoàn","diem":3,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng cuối tháng"},
  {"ma":"DO04","ten":"Tham gia văn nghệ","nhomCha":"Hoạt động Đoàn","diem":5,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng cuối tháng"},
  {"ma":"DO05","ten":"Đại diện lớp tham gia công tác Đoàn","nhomCha":"Hoạt động Đoàn","diem":5,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng cuối tháng"},
  {"ma":"TD01","ten":"Lớp đứng top 3 xếp loại thi đua tuần của khối","nhomCha":"Thành tích tập thể","diem":3,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng cho cả lớp, mỗi tuần"},
  {"ma":"TD02","ten":"Lớp đạt thành tích cao kỳ thi đua 20/11, 26/3 (top 5)","nhomCha":"Thành tích tập thể","diem":5,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng cho cả lớp"},
  {"ma":"CB_LT","ten":"Cán bộ lớp: lớp trưởng, bí thư","nhomCha":"Cán bộ lớp","diem":7,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng theo tháng"},
  {"ma":"CB_PHO","ten":"Cán bộ lớp: lớp phó, tổ trưởng, phó bí thư, uỷ viên BCH, thư ký","nhomCha":"Cán bộ lớp","diem":5,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Cộng theo tháng, 3-5đ tuỳ mức độ"},
  {"ma":"CONG_KHAC","ten":"Điểm cộng khác (tự ghi nội dung và số điểm)","nhomCha":"Khác","diem":0,"canMon":false,"tranTuan":0,"hienThi":true,"ghiChu":"Dùng cho trường hợp ngoài danh sách"}
];

/** Cấu hình mặc định (khoá giữ nguyên tên như sheet CauHinh cũ, giá trị có kiểu thật). */
export const CAU_HINH_MAC_DINH = {
  NamHoc: '2026-2027',
  Lop: '10A0-K67',
  Truong: 'THPT Xuân Đỉnh',
  DiemXuatPhatTuan: 100,      // Mỗi HS bắt đầu tuần với bao nhiêu điểm
  NguongTuan_Tot: 100,        // Từ bao nhiêu điểm trở lên và KHÔNG có lỗi nào thì xếp Tốt
  NguongTuan_Kha: 80,         // Từ bao nhiêu điểm trở lên thì xếp Khá
  NguongTuan_Dat: 50,         // Từ bao nhiêu điểm trở lên thì xếp Đạt, dưới mức này là Chưa đạt
  NhanDoiTuLan2: true,        // Lỗi nề nếp tái phạm trong cùng tuần thì nhân đôi mức trừ
  GhiSo_KhongDuocTot: 3,      // Từ N lần ghi sổ đầu bài trở lên thì không được TỐT
  GhiSo_KhongDuocKha: 5,      // Từ N lần ghi sổ đầu bài trở lên thì không được KHÁ
  TuDongXepLoai: true,        // true = chưa ai chọn tay thì web lấy theo gợi ý
  SoNgayDuocSua: 7,           // Cán bộ lớp xoá được bản ghi trong N ngày
  ThangHK1: [9, 10, 11, 12, 1],
  ThangHK2: [2, 3, 4, 5],
  HauToTenDangNhap: 'a0k67',  // Tên đăng nhập phụ huynh = họ tên không dấu + hậu tố này
  MatKhauMacDinhHau: '1'      // Mật khẩu ban đầu của phụ huynh = họ tên không dấu + ký tự này
};

/** Mô tả từng khoá cấu hình để dựng form sửa trên web. */
export const MO_TA_CAU_HINH = [
  { k: 'Truong', nhan: 'Tên trường', kieu: 'chu' },
  { k: 'Lop', nhan: 'Tên lớp', kieu: 'chu' },
  { k: 'NamHoc', nhan: 'Năm học', kieu: 'chu', goiY: '2026-2027' },
  { k: 'DiemXuatPhatTuan', nhan: 'Điểm đầu mỗi tuần', kieu: 'so' },
  { k: 'NguongTuan_Tot', nhan: 'Ngưỡng điểm xếp TỐT (và không lỗi)', kieu: 'so' },
  { k: 'NguongTuan_Kha', nhan: 'Ngưỡng điểm xếp KHÁ', kieu: 'so' },
  { k: 'NguongTuan_Dat', nhan: 'Ngưỡng điểm xếp ĐẠT', kieu: 'so' },
  { k: 'NhanDoiTuLan2', nhan: 'Tái phạm trong tuần thì trừ gấp đôi', kieu: 'bool' },
  { k: 'GhiSo_KhongDuocTot', nhan: 'Từ N lần ghi sổ đầu bài: không được TỐT', kieu: 'so' },
  { k: 'GhiSo_KhongDuocKha', nhan: 'Từ N lần ghi sổ đầu bài: không được KHÁ', kieu: 'so' },
  { k: 'TuDongXepLoai', nhan: 'Tự lấy xếp loại theo gợi ý khi chưa ai chọn', kieu: 'bool' },
  { k: 'SoNgayDuocSua', nhan: 'Số ngày cán bộ lớp được xoá mục đã ghi', kieu: 'so' },
  { k: 'ThangHK1', nhan: 'Các tháng học kỳ I (cách nhau dấu phẩy)', kieu: 'dsso' },
  { k: 'ThangHK2', nhan: 'Các tháng học kỳ II (cách nhau dấu phẩy)', kieu: 'dsso' },
  { k: 'HauToTenDangNhap', nhan: 'Hậu tố tên đăng nhập phụ huynh', kieu: 'chu' },
  { k: 'MatKhauMacDinhHau', nhan: 'Ký tự cuối mật khẩu ban đầu của phụ huynh', kieu: 'chu' }
];
