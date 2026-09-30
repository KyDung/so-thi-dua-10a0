/**
 * Setup.gs — Khởi tạo Google Sheet làm database.
 * Chạy MỘT LẦN: mở menu "⚙️ Thi đua" → "Khởi tạo database".
 */

const SHEETS = {
  HS: 'HocSinh',
  LOI: 'DanhMucLoi',
  CONG: 'DanhMucCong',
  TUAN: 'TuanHoc',
  NHATKY: 'NhatKy',
  THANG: 'XepLoaiThang',
  TUANXL: 'XepLoaiTuan',
  KY: 'XepLoaiKy',
  TK: 'TaiKhoan',
  CFG: 'CauHinh',
  LOG: 'Log'
};

const SCHEMA = {
  HocSinh: ['MaHS', 'HoTen', 'To', 'ChucVu', 'TrangThai', 'GhiChu'],
  DanhMucLoi: ['MaLoi', 'TenLoi', 'NhomCha', 'Nhom', 'DiemTru', 'NhanDoiTuLan2', 'NguongHocKy', 'GhiSoDauBai', 'CanMon', 'HienThi', 'GhiChu'],
  DanhMucCong: ['MaCong', 'TenCong', 'NhomCha', 'DiemCong', 'CanMon', 'TranTuan', 'HienThi', 'GhiChu'],
  TuanHoc: ['MaTuan', 'SoTuan', 'TuNgay', 'DenNgay', 'Thang', 'HocKy', 'GhiChu', 'NguoiTao', 'ThoiGianTao'],
  NhatKy: ['Id', 'MaHS', 'Ngay', 'MaTuan', 'Thang', 'HocKy', 'Loai', 'Ma', 'Mon', 'Diem', 'MoTa', 'NguoiNhap', 'ThoiGian', 'TrangThai'],
  XepLoaiThang: ['MaHS', 'Thang', 'HocKy', 'SoLoiNho', 'SoLanGhiSo', 'SoLanHaBac', 'LoiNhoTonKho', 'DiemThiDua', 'XepLoai', 'DeXuat', 'NguoiNhap', 'DaChot', 'NguoiChot', 'ThoiGianChot', 'GhiChu'],
  XepLoaiTuan: ['MaHS', 'MaTuan', 'SoTuan', 'Thang', 'DiemBatDau', 'DiemCong', 'DiemTru', 'DiemCuoi', 'SoLoi', 'SoLanGhiSo', 'SoLanHaBac', 'CoLoiChuaDat', 'XepLoai'],
  XepLoaiKy: ['MaHS', 'Ky', 'XepLoai', 'DeXuat', 'DaDuyet', 'GhiChu'],
  TaiKhoan: ['TenDangNhap', 'HoTen', 'MatKhauMoi', 'MatKhauHash', 'VaiTro', 'MaHS', 'ToPhuTrach', 'LanDau', 'TrangThai', 'GhiChu'],
  CauHinh: ['Khoa', 'GiaTri', 'MoTa'],
  Log: ['ThoiGian', 'NguoiDung', 'HanhDong', 'ChiTiet']
};

/**
 * KHÔNG để danh sách học sinh thật trong file code này.
 *
 * GitHub Pages miễn phí chỉ chạy trên repo CÔNG KHAI, nên mọi thứ trong repo đều
 * đọc được từ Internet. Tên học sinh là dữ liệu cá nhân -> chỉ được nằm trong
 * Google Sheet riêng tư.
 *
 * Cách nhập danh sách: xem hàm sinhMaHS() ở cuối file.
 */

// Danh mục lỗi lấy nguyên từ "huong-dan-thi-đua-cá-nhân-2023-2024.docx".
// Nhóm:    NHO | HA_BAC (hạ 1 bậc HK) | CHUA_DAT (xếp Chưa đạt tháng đó)
// NhanDoiTuLan2: lần vi phạm thứ 2 trở đi trong tuần thì nhân đôi mức trừ (mục I của tài liệu)
// NguongHocKy > 0: lần thứ N trở đi trong học kỳ mới bị hạ bậc
// GhiSoDauBai: có tính là 1 lần bị ghi tên sổ đầu bài không
const DS_LOI = [
  // ===== I.1 Chuyên cần =====
  ['CC01', 'Nghỉ học có phép vì việc riêng', 'Chuyên cần', 'NHO', -1, true, 0, false, false, true, 'Ốm đau, tai nạn, việc hiếu có giấy phép: không trừ'],
  ['CC02', 'Nghỉ học không phép', 'Chuyên cần', 'HA_BAC', -5, true, 0, false, false, true, ''],
  ['CC03', 'Bỏ tiết / nghỉ học không được GV đồng ý', 'Chuyên cần', 'HA_BAC', -5, true, 0, false, true, true, ''],

  // ===== I.2 Ra vào lớp =====
  ['RV01', 'Đi học muộn (sau chuông đầu giờ / bị ghi sổ cờ đỏ)', 'Ra vào lớp', 'NHO', -3, true, 0, false, false, true, ''],
  ['RV02', 'Vào lớp muộn tiết học', 'Ra vào lớp', 'NHO', -3, true, 0, false, true, true, 'Muộn quá nửa tiết thì tính như bỏ tiết'],
  ['RV03', 'Ra khỏi khu vực trường khi đang học mà không được phép', 'Ra vào lớp', 'NHO', -5, true, 0, false, false, true, ''],

  // ===== I.3 Trang phục =====
  ['TP01', 'Không đeo phù hiệu / thẻ học sinh', 'Trang phục', 'NHO', -2, true, 2, false, false, true, 'Lần 2 trong học kỳ thì hạ 1 bậc HK'],
  ['TP02', 'Không mặc đồng phục đúng quy định, không đi giày/dép quai hậu', 'Trang phục', 'NHO', -3, true, 2, false, false, true, ''],
  ['TP03', 'Đầu tóc không gọn gàng, tóc nhuộm', 'Trang phục', 'NHO', -5, true, 2, false, false, true, ''],

  // ===== I.4 Của công, trực nhật, vệ sinh =====
  ['VS01', 'Viết vẽ bậy lên bàn, lên tường', 'Vệ sinh - của công', 'NHO', -3, true, 0, false, false, true, ''],
  ['VS02', 'Phá bình nước, làm hỏng bàn ghế', 'Vệ sinh - của công', 'NHO', -5, true, 0, false, false, true, ''],
  ['VS03', 'Trực nhật muộn hoặc không sạch sẽ', 'Vệ sinh - của công', 'NHO', -3, true, 0, false, false, true, ''],
  ['VS04', 'Xả rác không đúng nơi quy định, ăn quà trong lớp', 'Vệ sinh - của công', 'NHO', -3, true, 0, false, false, true, ''],
  ['VS05', 'Làm hỏng cơ sở vật chất của trường và lớp', 'Vệ sinh - của công', 'NHO', -10, true, 0, false, false, true, 'Đền gấp 5 lần giá trị'],

  // ===== I.5 Xe và giao thông =====
  ['XE01', 'Xếp xe lộn xộn, không cùng chiều, để sai vị trí', 'Xe - giao thông', 'NHO', -3, true, 0, false, false, true, ''],
  ['XE02', 'Xe không khoá hoặc quên chìa khoá xe', 'Xe - giao thông', 'NHO', -2, true, 0, false, false, true, ''],
  ['XE03', 'Đi xe trong khu vực cấm đi xe của trường', 'Xe - giao thông', 'NHO', -3, true, 0, false, false, true, ''],
  ['XE04', 'Gửi xe ngoài nhà trường', 'Xe - giao thông', 'NHO', -5, true, 0, false, false, true, ''],
  ['XE05', 'Không đội mũ bảo hiểm khi đi xe máy / xe đạp điện', 'Xe - giao thông', 'CHUA_DAT', -20, false, 0, false, false, true, 'Xếp loại Chưa đạt tháng đó'],

  // ===== I.6 Vi phạm khác =====
  ['VP01', 'Nói tục, chửi bậy (kể cả trên mạng xã hội), đánh nhau, hút thuốc, chơi bài', 'Vi phạm khác', 'HA_BAC', -10, true, 0, false, false, true, ''],
  ['VP02', 'Thái độ thiếu tôn trọng lớp trực tuần', 'Vi phạm khác', 'NHO', -10, true, 0, false, false, true, ''],
  ['VP03', 'Vô lễ với cán bộ, giáo viên, nhân viên', 'Vi phạm khác', 'HA_BAC', -10, true, 0, false, false, true, ''],

  // ===== II.1 Chuẩn bị bài =====
  ['CB01', 'Không học bài, không làm bài tập ở nhà', 'Chuẩn bị bài', 'NHO', -5, false, 0, false, true, true, ''],
  ['CB02', 'Không soạn bài đầy đủ trước khi đến lớp', 'Chuẩn bị bài', 'NHO', -5, false, 0, false, true, true, ''],
  ['CB03', 'Thiếu sách vở, dụng cụ học tập', 'Chuẩn bị bài', 'NHO', -5, false, 0, false, true, true, ''],

  // ===== II.2 Điểm kém trên lớp =====
  ['DK01', 'Điểm kiểm tra 0 - 1', 'Điểm kém', 'NHO', -3, false, 0, false, true, true, ''],
  ['DK02', 'Điểm kiểm tra 2 - 3', 'Điểm kém', 'NHO', -2, false, 0, false, true, true, ''],
  ['DK03', 'Điểm kiểm tra 4 - dưới 5', 'Điểm kém', 'NHO', -1, false, 0, false, true, true, ''],

  // ===== II.3.1 Chào cờ, sinh hoạt tập thể =====
  ['SH01', 'Xếp hàng chậm, muộn', 'Chào cờ - SHTT', 'NHO', -5, false, 0, false, false, true, ''],
  ['SH02', 'Ngồi không đúng vị trí lớp', 'Chào cờ - SHTT', 'NHO', -5, false, 0, false, false, true, ''],
  ['SH03', 'Không nghiêm túc, làm việc riêng, nói chuyện riêng', 'Chào cờ - SHTT', 'NHO', -5, false, 0, false, false, true, 'Tài liệu không ghi rõ mức trừ - tạm để -5'],
  ['SH04', 'Dùng điện thoại khi chưa được thầy cô cho phép', 'Chào cờ - SHTT', 'NHO', -10, false, 0, false, false, true, ''],

  // ===== II.3.2 Giờ học chính khoá =====
  ['GH01', 'Bị ghi tên trong sổ đầu bài (mất trật tự, làm việc riêng, không ghi bài)', 'Giờ học', 'NHO', -5, false, 0, true, true, true, 'Tính 1 lần ghi sổ đầu bài'],
  ['GH02', 'Không để điện thoại vào tủ, hoặc bị phát hiện dùng điện thoại trong giờ', 'Giờ học', 'HA_BAC', -10, false, 0, false, true, true, ''],
  ['GH03', 'Mang sách báo, máy nghe nhạc không phục vụ việc học', 'Giờ học', 'HA_BAC', -10, false, 0, false, true, true, 'Thu tang vật'],
  ['GH04', 'Ngồi sai sơ đồ lớp khi chưa được GV bộ môn đồng ý', 'Giờ học', 'NHO', -5, false, 0, false, true, true, ''],
  ['GH05', 'Trao đổi bài trong giờ kiểm tra', 'Giờ học', 'NHO', -5, false, 0, false, true, true, ''],
  ['GH06', 'Mang, dùng tài liệu hoặc điện thoại trong giờ kiểm tra', 'Giờ học', 'CHUA_DAT', -10, false, 0, false, true, true, 'Thu tang vật, mời CMHS'],

  // ===== III Hoạt động tập thể =====
  ['TT01', 'Không hoàn thành nhiệm vụ (nộp giấy tờ, bài dự thi muộn...)', 'Hoạt động tập thể', 'NHO', -2, false, 0, false, false, true, ''],
  ['TT02', 'Bỏ không tham gia hoạt động được lớp / Đoàn / trường phân công', 'Hoạt động tập thể', 'HA_BAC', -5, false, 0, false, false, true, ''],
  ['TT03', 'Lao động: đi muộn, không chăm chỉ', 'Hoạt động tập thể', 'NHO', -3, false, 0, false, false, true, 'Phạt lao động thêm cuối buổi'],
  ['TT04', 'Lao động: không mang dụng cụ', 'Hoạt động tập thể', 'NHO', -3, false, 0, false, false, true, 'Phạt lao động thêm cuối buổi'],
  ['TT05', 'Bỏ lao động', 'Hoạt động tập thể', 'HA_BAC', -5, false, 0, false, false, true, 'Phạt lao động 3 buổi'],

  // ===== Trường hợp ngoài dự kiến =====
  ['KHAC', 'Lỗi khác (tự ghi nội dung và điểm trừ)', 'Khác', 'NHO', 0, false, 0, false, false, true, 'Dùng khi lỗi không có trong danh sách - người nhập tự gõ nội dung và điểm']
];

// Điểm thưởng - mục B của tài liệu. Không giới hạn số lần.
// Cột: Mã | Tên | NhómCha | ĐiểmCộng | CầnMôn | TrầnTuần (0 = không giới hạn) | HiệnThị | GhiChú
const DS_CONG = [
  ['DT10', 'Điểm tốt: đạt 10', 'Điểm tốt', 3, true, 0, true, ''],
  ['DT09', 'Điểm tốt: từ 9 đến 9.75', 'Điểm tốt', 2, true, 0, true, ''],
  ['DT08', 'Điểm tốt: từ 8 đến 8.75', 'Điểm tốt', 1, true, 0, true, ''],

  ['PB01', 'Phát biểu nhiệt tình (1-3 lần trong 1 tiết)', 'Nhiệt tình - trách nhiệm', 1, true, 0, true, ''],
  ['HT01', 'Hỗ trợ công việc lớp, hoàn thành tốt nhiệm vụ, giúp bạn vượt khó', 'Nhiệt tình - trách nhiệm', 3, false, 0, true, 'Cộng vào điểm trung bình cuối tháng'],

  ['DO01', 'Việc tốt được Đoàn trường biểu dương, khen thưởng', 'Hoạt động Đoàn', 5, false, 0, true, 'Cộng cuối tháng'],
  ['DO02', 'Sáng tạo, đạt giải thưởng, lập thành tích đặc biệt', 'Hoạt động Đoàn', 5, false, 0, true, 'Cộng cuối tháng'],
  ['DO03', 'Tham gia công việc chung của Đoàn', 'Hoạt động Đoàn', 3, false, 0, true, 'Cộng cuối tháng'],
  ['DO04', 'Tham gia văn nghệ', 'Hoạt động Đoàn', 5, false, 0, true, 'Cộng cuối tháng'],
  ['DO05', 'Đại diện lớp tham gia công tác Đoàn', 'Hoạt động Đoàn', 5, false, 0, true, 'Cộng cuối tháng'],

  ['TD01', 'Lớp đứng top 3 xếp loại thi đua tuần của khối', 'Thành tích tập thể', 3, false, 0, true, 'Cộng cho cả lớp, mỗi tuần'],
  ['TD02', 'Lớp đạt thành tích cao kỳ thi đua 20/11, 26/3 (top 5)', 'Thành tích tập thể', 5, false, 0, true, 'Cộng cho cả lớp'],

  ['CB_LT', 'Cán bộ lớp: lớp trưởng, bí thư', 'Cán bộ lớp', 7, false, 0, true, 'Cộng theo tháng'],
  ['CB_PHO', 'Cán bộ lớp: lớp phó, tổ trưởng, phó bí thư, uỷ viên BCH, thư ký', 'Cán bộ lớp', 5, false, 0, true, 'Cộng theo tháng, 3-5đ tuỳ mức độ'],

  ['CONG_KHAC', 'Điểm cộng khác (tự ghi nội dung và số điểm)', 'Khác', 0, false, 0, true, 'Dùng cho trường hợp ngoài danh sách']
];

const DS_CAUHINH = [
  ['NamHoc', '2026-2027', 'Năm học hiện tại'],
  ['Lop', '10A0-K67', 'Tên lớp'],
  ['Truong', 'THPT Xuân Đỉnh', 'Tên trường'],
  ['NguongLoiNho', '3', 'Bao nhiêu lỗi nhỏ = 1 lần bị ghi sổ đầu bài (Q1)'],
  ['CongDonLoiNho', 'TRUE', 'Lỗi nhỏ lẻ có chuyển sang tháng sau không (Q1)'],
  ['ResetViDauHocKy', 'TRUE', 'Xóa ví lỗi nhỏ lẻ khi sang học kỳ mới (Q1)'],
  ['GhiSo_KhongDuocTot', '3', 'Từ N lần ghi sổ đầu bài trở lên thì không được TỐT'],
  ['GhiSo_KhongDuocKha', '5', 'Từ N lần ghi sổ đầu bài trở lên thì không được KHÁ'],
  ['DiemXuatPhatTuan', '100', 'Mỗi HS bắt đầu tuần với bao nhiêu điểm (tài liệu: 100đ/tuần)'],
  ['NguongTuan_Tot', '100', 'Từ bao nhiêu điểm trở lên và KHÔNG có lỗi nào thì xếp Tốt'],
  ['NguongTuan_Kha', '80', 'Từ bao nhiêu điểm trở lên thì xếp Khá'],
  ['NguongTuan_Dat', '50', 'Từ bao nhiêu điểm trở lên thì xếp Đạt, dưới mức này là Chưa đạt'],
  ['NhanDoiTuLan2', 'TRUE', 'Lỗi nề nếp tái phạm trong cùng tuần thì nhân đôi mức trừ'],
  ['MatKhauMacDinhHau', '1', 'Mật khẩu mặc định của phụ huynh = họ tên không dấu + ký tự này'],
  ['HauToTenDangNhap', 'a0k67', 'Tên đăng nhập phụ huynh = họ tên không dấu + hậu tố này'],


  ['TuDongXepLoai', 'TRUE', 'TRUE = web tự tính xếp loại từ điểm (theo tài liệu hướng dẫn thi đua)'],
  ['BatBuocDangNhap', 'TRUE', 'TRUE = phải đăng nhập mới xem được. Phụ huynh chỉ thấy con mình.'],
  ['SoNgayDuocSua', '7', 'Cán bộ lớp sửa được bản ghi trong N ngày (Q7)'],
  ['ThangHK1', '9,10,11,12,1', 'Các tháng thuộc học kỳ I (Q8)'],
  ['ThangHK2', '2,3,4,5', 'Các tháng thuộc học kỳ II (Q8)'],
  ['NgayBatDauNamHoc', '2026-09-05', 'Dùng để sinh lịch tuần (Q14)'],
  ['SoTo', '0', 'Số tổ - để 0 nếu lớp không thi đua theo tổ']
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Thi đua')
    .addItem('Khởi tạo database', 'khoiTaoDatabase')
    .addItem('Sinh mã học sinh', 'sinhMaHS')
    .addItem('Tính lại số liệu tất cả các tháng', 'tinhLaiTatCa')
    .addItem('🗑 Xoá hết trang tuần', 'xoaHetTrangTuan')
    .addItem('🧹 Dọn lịch sử sửa đổi', 'donLichSu')
    .addSeparator()
    .addItem('👤 Áp dụng tài khoản (sau khi thêm/đổi mật khẩu)', 'apDungTaiKhoan')
    .addItem('👤 Xem danh sách tài khoản', 'xemTaiKhoan')
    .addItem('👪 Tạo tài khoản phụ huynh (41 HS)', 'taoTaiKhoanPhuHuynh')
    .addItem('👪 In tài khoản phụ huynh để phát', 'inTaiKhoanPhuHuynh')
    .addItem('👪 Xoá hết tài khoản phụ huynh', 'xoaTaiKhoanPhuHuynh')
    .addSeparator()
    .addItem('📅 Bắt đầu năm học mới', 'batDauNamHocMoi')
    .addToUi();
}

function khoiTaoDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');

  const doiCauTruc = capNhatCauTruc(ss);

  // Ép cột giá trị/ngày về dạng văn bản, nếu không Sheets tự đổi "2026-09-05"
  // thành kiểu Ngày và code đọc ra sai.
  ss.getSheetByName(SHEETS.CFG).getRange('B2:B200').setNumberFormat('@');
  ss.getSheetByName(SHEETS.TUAN).getRange('C2:D200').setNumberFormat('@');
  ss.getSheetByName(SHEETS.NHATKY).getRange('C2:C5000').setNumberFormat('@');

  seed(ss, SHEETS.CFG, DS_CAUHINH, 'Khoa');
  seed(ss, SHEETS.LOI, DS_LOI, 'MaLoi');
  seed(ss, SHEETS.CONG, DS_CONG, 'MaCong');
  seedTaiKhoan(ss);
  trangTriTaiKhoan(ss.getSheetByName(SHEETS.TK));

  SpreadsheetApp.getUi().alert(
    'Đã tạo xong cấu trúc database.\n' +
    (doiCauTruc.length ? '\nĐÃ CẬP NHẬT CẤU TRÚC:\n  ' + doiCauTruc.join('\n  ') + '\n' : '') +
    '\n' +
    'CÁC BƯỚC TIẾP THEO:\n\n' +
    '1. Mở sheet "HocSinh", dán danh sách họ tên vào cột B (HoTen), mỗi bạn 1 dòng.\n' +
    '   (Copy cột "Họ tên" từ file Excel của trường là nhanh nhất.)\n\n' +
    '2. Menu ⚙️ Thi đua → "Sinh mã học sinh" để tự điền mã và tổ tạm.\n\n' +
    '3. Sửa lại cột "To" và "ChucVu" cho đúng thực tế (câu hỏi Q3).\n\n' +
    '4. Sheet TaiKhoan: gõ mật khẩu mới vào cột "MatKhauMoi", rồi bấm\n' +
    '   menu ⚙️ Thi đua → "Áp dụng tài khoản".\n' +
    '   Mật khẩu ban đầu: gvcn / gvcn@2026\n\n' +
    '5. Triển khai → Ứng dụng web → Quyền truy cập "Bất kỳ ai".\n\n' +
    'Lịch tuần KHÔNG sinh tự động nữa: cán bộ lớp vào web, tab "Sổ thi đua",\n' +
    'bấm "Tạo trang tuần mới" và điền tuần mấy, từ ngày đến ngày — giống như\n' +
    'mở một trang mới trong sổ giấy. Tuần nghỉ Tết thì chỉ việc không tạo trang.'
  );
}

/**
 * Tạo sheet còn thiếu và cập nhật cấu trúc cột cho khớp SCHEMA.
 *
 * Khi thêm / bớt / đổi thứ tự cột, dữ liệu cũ phải được xếp lại theo TÊN CỘT
 * chứ không theo vị trí. Trước đây chỉ ghi tiêu đề khi sheet trống, nên sheet
 * đã có dữ liệu thì giữ nguyên tiêu đề cũ -> ghi dữ liệu mới vào là lệch cột.
 *
 * Trả về danh sách mô tả những gì đã đổi, để báo lại cho người dùng.
 */
function capNhatCauTruc(ss) {
  const doi = [];

  Object.keys(SCHEMA).forEach(function (ten) {
    const head = SCHEMA[ten];
    let sh = ss.getSheetByName(ten);

    if (!sh) {
      sh = ss.insertSheet(ten);
      datTieuDe(sh, head);
      doi.push(ten + ': tạo mới');
      return;
    }

    const soCotCu = Math.max(sh.getLastColumn(), 1);
    const headCu = sh.getRange(1, 1, 1, soCotCu).getValues()[0]
      .map(function (x) { return String(x).trim(); });

    // Đã khớp thì thôi
    if (headCu.length === head.length && head.every(function (c, i) { return headCu[i] === c; })) {
      return;
    }

    const soDong = sh.getLastRow() - 1;
    const cu = soDong > 0 ? sh.getRange(2, 1, soDong, soCotCu).getValues() : [];

    // Xếp lại từng dòng theo TÊN cột, cột mới thì để trống
    const moi = cu.map(function (r) {
      const o = {};
      headCu.forEach(function (c, i) { if (c) o[c] = r[i]; });
      return head.map(function (c) { return o[c] !== undefined ? o[c] : ''; });
    }).filter(function (r) {
      return r.some(function (x) { return String(x).trim() !== ''; });   // bỏ dòng rỗng
    });

    sh.clear();
    datTieuDe(sh, head);
    if (moi.length) sh.getRange(2, 1, moi.length, head.length).setValues(moi);

    const themCot = head.filter(function (c) { return headCu.indexOf(c) < 0; });
    const botCot = headCu.filter(function (c) { return c && head.indexOf(c) < 0; });
    doi.push(ten + ': ' + moi.length + ' dòng' +
      (themCot.length ? ', thêm cột ' + themCot.join(', ') : '') +
      (botCot.length ? ', bỏ cột ' + botCot.join(', ') : ''));
  });

  if (doi.length) ghiLog('HE_THONG', 'CAP_NHAT_CAU_TRUC', doi.join(' | '));
  return doi;
}

function datTieuDe(sh, head) {
  sh.getRange(1, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

/**
 * Xoá hết tài khoản phụ huynh để tạo lại từ đầu.
 * Dùng khi danh sách lớp đổi, hoặc khi tài khoản bị lỗi cần làm lại.
 */
function xoaTaiKhoanPhuHuynh() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TK);
  const head = SCHEMA.TaiKhoan;
  const n = sh.getLastRow() - 1;
  if (n <= 0) { ui.alert('Sheet TaiKhoan đang trống.'); return; }

  const iVaiTro = head.indexOf('VaiTro');
  const vals = sh.getRange(2, 1, n, head.length).getValues();
  const giuLai = vals.filter(function (r) {
    return String(r[0]).trim() && r[iVaiTro] !== 'PHU_HUYNH';
  });
  const soXoa = n - giuLai.length;
  if (!soXoa) { ui.alert('Không có tài khoản phụ huynh nào để xoá.'); return; }

  if (ui.alert('Xoá tài khoản phụ huynh',
    'Xoá ' + soXoa + ' tài khoản phụ huynh?\n\n' +
    'Giữ lại ' + giuLai.length + ' tài khoản cán bộ lớp / GVCN.\n' +
    'Sau đó bấm "Tạo tài khoản phụ huynh" để tạo lại.',
    ui.ButtonSet.YES_NO) !== ui.Button.YES) return;

  sh.getRange(2, 1, n, head.length).clearContent();
  if (giuLai.length) sh.getRange(2, 1, giuLai.length, head.length).setValues(giuLai);
  trangTriTaiKhoan(sh);
  ghiLog('GVCN', 'XOA_TK_PHU_HUYNH', soXoa + ' tài khoản');
  ui.alert('Đã xoá ' + soXoa + ' tài khoản phụ huynh. Giờ bấm "Tạo tài khoản phụ huynh" để tạo lại.');
}

/**
 * Điền MaHS và Tổ tạm cho những dòng đã có họ tên nhưng chưa có mã.
 * Chạy lại được nhiều lần: dòng nào đã có mã thì giữ nguyên.
 */
function sinhMaHS() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.HS);
  const head = SCHEMA.HocSinh;
  const n = sh.getLastRow() - 1;
  if (n <= 0) {
    SpreadsheetApp.getUi().alert('Sheet HocSinh chưa có tên nào. Dán danh sách vào cột B trước đã.');
    return;
  }
  const cfg = docCauHinh();
  const lop = String(cfg.Lop).split('-')[0];

  const vals = sh.getRange(2, 1, n, head.length).getValues();
  const iMa = head.indexOf('MaHS'), iTen = head.indexOf('HoTen'), iTo = head.indexOf('To');
  const iTT = head.indexOf('TrangThai');

  let dem = 0;
  vals.forEach(function (r, i) {
    if (!String(r[iTen]).trim()) return;
    if (!r[iMa]) { r[iMa] = lop + '_' + String(i + 1).padStart(2, '0'); dem++; }
    if (!r[iTT]) r[iTT] = 'DANG_HOC';
  });
  sh.getRange(2, 1, n, head.length).setValues(vals);
  SpreadsheetApp.getUi().alert('Đã sinh mã cho ' + dem + ' học sinh.\n\n' +
    'Lưu ý: cột "To" đang chia tạm theo thứ tự danh sách, nhớ sửa lại cho đúng.');
}

function seed(ss, tenSheet, duLieu, cotKhoa) {
  const sh = ss.getSheetByName(tenSheet);
  const head = SCHEMA[tenSheet];
  const iKey = head.indexOf(cotKhoa);
  const daCo = {};
  if (sh.getLastRow() > 1) {
    sh.getRange(2, iKey + 1, sh.getLastRow() - 1, 1).getValues()
      .forEach(function (r) { daCo[String(r[0])] = true; });
  }
  const them = duLieu.filter(function (r) { return !daCo[String(r[iKey])]; });
  if (them.length) sh.getRange(sh.getLastRow() + 1, 1, them.length, head.length).setValues(them);
}

function seedTaiKhoan(ss) {
  const sh = ss.getSheetByName(SHEETS.TK);
  if (sh.getLastRow() > 1) return;
  sh.getRange(2, 1, 3, SCHEMA.TaiKhoan.length).setValues([
    ['gvcn', 'Giáo viên chủ nhiệm', '', hashMK('gvcn@2026'), 'GVCN', '', '', false, 'HOAT_DONG', 'Mật khẩu ban đầu: gvcn@2026 — nên đổi ngay'],
    ['loptruong', 'Lớp trưởng', '', hashMK('lt@2026'), 'LOP_TRUONG', '', '', false, 'HOAT_DONG', 'Mật khẩu ban đầu: lt@2026'],
    ['totruong1', 'Tổ trưởng tổ 1', '', hashMK('tt1@2026'), 'TO_TRUONG', '', 'Tổ 1', false, 'HOAT_DONG', 'Mật khẩu ban đầu: tt1@2026']
  ]);
  trangTriTaiKhoan(sh);
}

/**
 * Tạo tài khoản phụ huynh cho từng học sinh trong sheet HocSinh.
 *
 *   Tên đăng nhập : họ tên không dấu + hậu tố  ->  nguyenhoanganha0k67
 *   Mật khẩu ban đầu: họ tên không dấu + "1"   ->  nguyenhoanganh1
 *
 * Lần đầu đăng nhập, web bắt phụ huynh đổi mật khẩu (cột LanDau = TRUE).
 * Sau này muốn cấp lại mật khẩu mặc định cho ai thì chỉ cần đổi ô LanDau
 * của người đó thành TRUE rồi chạy lại hàm này.
 *
 * Chạy lại nhiều lần được: học sinh nào đã có tài khoản thì bỏ qua.
 */
function taoTaiKhoanPhuHuynh() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = docCauHinh();
  const hauTo = String(cfg.HauToTenDangNhap || 'a0k67');
  const hauMK = String(cfg.MatKhauMacDinhHau || '1');

  const hs = docBang(SHEETS.HS).filter(function (r) {
    return r.MaHS && r.TrangThai === 'DANG_HOC';
  });
  if (!hs.length) { ui.alert('Sheet HocSinh chưa có học sinh nào.'); return; }

  const sh = ss.getSheetByName(SHEETS.TK);
  const head = SCHEMA.TaiKhoan;
  const daCo = {}, daCoTen = {};
  docBang(SHEETS.TK).forEach(function (r) {
    if (r.MaHS) daCo[r.MaHS] = true;
    if (r.TenDangNhap) daCoTen[String(r.TenDangNhap).toLowerCase()] = true;
  });

  const them = [], trung = [];
  hs.forEach(function (h) {
    if (daCo[h.MaHS]) return;
    const goc = khongDau(h.HoTen);
    if (!goc) return;

    // Hai học sinh trùng họ tên -> thêm số vào cuối cho khác nhau
    let ten = goc + hauTo, dem = 1;
    while (daCoTen[ten]) { dem++; ten = goc + dem + hauTo; }
    daCoTen[ten] = true;

    them.push([
      ten, 'PH ' + h.HoTen, '', hashMK(goc + hauMK), 'PHU_HUYNH',
      h.MaHS, '', true, 'HOAT_DONG', 'Mật khẩu ban đầu: ' + goc + hauMK
    ]);
    if (dem > 1) trung.push(h.HoTen + ' -> ' + ten);
  });

  if (!them.length) {
    ui.alert('Không có gì thêm', 'Tất cả học sinh đều đã có tài khoản phụ huynh.', ui.ButtonSet.OK);
    return;
  }
  sh.getRange(sh.getLastRow() + 1, 1, them.length, head.length).setValues(them);
  trangTriTaiKhoan(sh);
  ghiLog('GVCN', 'TAO_TK_PHU_HUYNH', them.length + ' tài khoản');

  ui.alert('Đã tạo ' + them.length + ' tài khoản phụ huynh',
    'Tên đăng nhập: họ tên không dấu + "' + hauTo + '"\n' +
    'Mật khẩu ban đầu: họ tên không dấu + "' + hauMK + '"\n\n' +
    'Ví dụ: NGUYỄN HOÀNG ANH\n' +
    '  đăng nhập: nguyenhoanganh' + hauTo + '\n' +
    '  mật khẩu : nguyenhoanganh' + hauMK + '\n\n' +
    'Lần đầu đăng nhập web sẽ bắt phụ huynh đổi mật khẩu.\n' +
    'Muốn cấp lại mật khẩu mặc định cho ai: đổi ô LanDau của người đó thành TRUE\n' +
    'rồi chạy lại menu này.' +
    (trung.length ? '\n\nTrùng họ tên, đã thêm số phân biệt:\n  ' + trung.join('\n  ') : ''),
    ui.ButtonSet.OK);
}

/** In danh sách tài khoản phụ huynh kèm mật khẩu mặc định để phát cho lớp. */
function inTaiKhoanPhuHuynh() {
  const cfg = docCauHinh();
  const hauMK = String(cfg.MatKhauMacDinhHau || '1');
  const hs = indexBy(docBang(SHEETS.HS), 'MaHS');
  const tk = docBang(SHEETS.TK).filter(function (r) { return r.VaiTro === 'PHU_HUYNH' && r.MaHS; });
  if (!tk.length) { SpreadsheetApp.getUi().alert('Chưa có tài khoản phụ huynh nào.'); return; }

  let out = 'HỌ TÊN HỌC SINH\tTÊN ĐĂNG NHẬP\tMẬT KHẨU\tĐÃ ĐỔI MK CHƯA\n';
  tk.forEach(function (r) {
    const h = hs[r.MaHS];
    const mk = laDung(r.LanDau) ? (khongDau(h ? h.HoTen : '') + hauMK) : '(phụ huynh đã đổi)';
    out += (h ? h.HoTen : r.MaHS) + '\t' + r.TenDangNhap + '\t' + mk + '\t' +
      (laDung(r.LanDau) ? 'chưa' : 'rồi') + '\n';
  });
  SpreadsheetApp.getUi().alert('Tài khoản phụ huynh', out, SpreadsheetApp.getUi().ButtonSet.OK);
}

/** Ô chọn sẵn cho cột Vai trò / Trạng thái, và hướng dẫn ngay trên sheet. */
function trangTriTaiKhoan(sh) {
  const head = SCHEMA.TaiKhoan;
  const cVaiTro = head.indexOf('VaiTro') + 1;
  const cTT = head.indexOf('TrangThai') + 1;
  const cMkMoi = head.indexOf('MatKhauMoi') + 1;
  const cHash = head.indexOf('MatKhauHash') + 1;

  const dsVaiTro = SpreadsheetApp.newDataValidation()
    .requireValueInList(['GVCN', 'LOP_TRUONG', 'TO_TRUONG', 'PHU_HUYNH'], true).build();
  const dsTT = SpreadsheetApp.newDataValidation()
    .requireValueInList(['HOAT_DONG', 'KHOA'], true).build();

  sh.getRange(2, cVaiTro, 200, 1).setDataValidation(dsVaiTro);
  sh.getRange(2, cTT, 200, 1).setDataValidation(dsTT);
  const cLanDau = head.indexOf('LanDau') + 1;
  sh.getRange(2, cLanDau, 200, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sh.getRange(1, cLanDau).setNote(
    'Tích = phụ huynh chưa đổi mật khẩu, lần đăng nhập tới web sẽ bắt đổi.\n' +
    'Muốn cấp lại mật khẩu mặc định cho ai: tích ô này rồi chạy\n' +
    'menu ⚙️ Thi đua → "Tạo tài khoản phụ huynh".');

  sh.getRange(1, cMkMoi).setNote(
    'Gõ mật khẩu thường vào cột này rồi bấm menu ⚙️ Thi đua → "Áp dụng tài khoản".\n' +
    'Script sẽ mã hoá và tự xoá ô này đi.');
  sh.getRange(1, cHash).setNote('Ô này do script ghi, KHÔNG sửa tay.');
  sh.getRange(1, cHash, 300, 1).setBackground('#f0f0f0');
  sh.setColumnWidth(head.indexOf('GhiChu') + 1, 280);
}

/**
 * Áp dụng thay đổi tài khoản:
 *  - Dòng nào có MatKhauMoi  -> mã hoá vào MatKhauHash rồi xoá ô MatKhauMoi
 *  - Dòng mới chưa có mật khẩu -> báo để cô điền
 *  - Xoá tài khoản: xoá cả dòng, hoặc đặt TrangThai = KHOA
 */
function apDungTaiKhoan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.TK);
  const head = SCHEMA.TaiKhoan;
  const n = sh.getLastRow() - 1;
  if (n <= 0) { SpreadsheetApp.getUi().alert('Sheet TaiKhoan chưa có dòng nào.'); return; }

  const iTen = head.indexOf('TenDangNhap'), iMkMoi = head.indexOf('MatKhauMoi');
  const iHash = head.indexOf('MatKhauHash'), iVaiTro = head.indexOf('VaiTro');
  const iTT = head.indexOf('TrangThai');

  const vals = sh.getRange(2, 1, n, head.length).getValues();
  const doiMK = [], thieuMK = [], trung = {}, loi = [];

  vals.forEach(function (r, i) {
    const ten = String(r[iTen]).trim();
    if (!ten) return;

    if (trung[ten.toLowerCase()]) loi.push('Dòng ' + (i + 2) + ': trùng tên đăng nhập "' + ten + '"');
    trung[ten.toLowerCase()] = true;

    if (!r[iVaiTro]) r[iVaiTro] = 'TO_TRUONG';
    if (!r[iTT]) r[iTT] = 'HOAT_DONG';

    const mkMoi = String(r[iMkMoi]).trim();
    if (mkMoi) {
      if (mkMoi.length < 4) { loi.push('Dòng ' + (i + 2) + ': mật khẩu quá ngắn (cần từ 4 ký tự)'); return; }
      r[iHash] = hashMK(mkMoi);
      r[iMkMoi] = '';
      doiMK.push(ten);
    } else if (!r[iHash]) {
      thieuMK.push('Dòng ' + (i + 2) + ': "' + ten + '"');
    }
  });

  sh.getRange(2, 1, n, head.length).setValues(vals);
  trangTriTaiKhoan(sh);

  let tb = '';
  if (doiMK.length) tb += '✅ Đã đặt mật khẩu cho: ' + doiMK.join(', ') + '\n\n';
  if (thieuMK.length) tb += '⚠️ Chưa có mật khẩu (điền vào cột "MatKhauMoi" rồi chạy lại):\n  ' + thieuMK.join('\n  ') + '\n\n';
  if (loi.length) tb += '❌ Lỗi:\n  ' + loi.join('\n  ') + '\n\n';
  if (!tb) tb = 'Không có gì thay đổi. Mọi tài khoản đều đã có mật khẩu.';

  SpreadsheetApp.getUi().alert('Áp dụng tài khoản', tb, SpreadsheetApp.getUi().ButtonSet.OK);
  ghiLog('GVCN', 'CAP_NHAT_TAI_KHOAN', doiMK.join(', '));
}

/** Xem nhanh danh sách tài khoản đang có. */
function xemTaiKhoan() {
  const tk = docBang(SHEETS.TK);
  let out = 'TÊN ĐĂNG NHẬP\tHỌ TÊN\tVAI TRÒ\tTỔ\tTRẠNG THÁI\n';
  tk.forEach(function (r) {
    if (!r.TenDangNhap) return;
    out += r.TenDangNhap + '\t' + r.HoTen + '\t' + r.VaiTro + '\t' +
      (r.ToPhuTrach || '-') + '\t' + r.TrangThai + '\n';
  });
  out += '\nMật khẩu không xem lại được (đã mã hoá).\n' +
    'Muốn đổi: gõ mật khẩu mới vào cột "MatKhauMoi" rồi bấm "Áp dụng tài khoản".';
  SpreadsheetApp.getUi().alert('Tài khoản hiện có', out, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Bắt đầu năm học mới.
 *
 * KHÔNG tạo file mới. Chỉ sao lưu dữ liệu năm cũ sang một Google Sheet riêng để lưu trữ,
 * rồi dọn sạch nhật ký + xếp loại trong file hiện tại để dùng tiếp.
 * Danh mục lỗi, tài khoản, cấu hình đều giữ nguyên.
 */
function batDauNamHocMoi() {
  const ui = SpreadsheetApp.getUi();
  const cfg = docCauHinh();

  const tl = ui.prompt('Bắt đầu năm học mới',
    'Dữ liệu năm ' + cfg.NamHoc + ' sẽ được sao lưu ra file riêng, rồi xoá khỏi file này.\n\n' +
    'Giữ nguyên: danh sách lỗi, tài khoản, cấu hình.\n' +
    'Xoá: các trang tuần, nhật ký vi phạm, xếp loại tháng, xếp loại kỳ.\n\n' +
    'Gõ năm học mới (ví dụ 2027-2028) để xác nhận:',
    ui.ButtonSet.OK_CANCEL);
  if (tl.getSelectedButton() !== ui.Button.OK) return;

  const namMoi = tl.getResponseText().trim();
  if (!/^\d{4}-\d{4}$/.test(namMoi)) {
    ui.alert('Năm học phải có dạng 2027-2028. Đã huỷ, chưa xoá gì cả.');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sao lưu: copy cả file sang bản lưu trữ
  const banLuu = ss.copy('LUU TRU ' + cfg.Lop + ' ' + cfg.NamHoc);

  // 2. Dọn dữ liệu của năm cũ
  [SHEETS.NHATKY, SHEETS.THANG, SHEETS.KY, SHEETS.LOG, SHEETS.TUAN].forEach(function (ten) {
    const sh = ss.getSheetByName(ten);
    if (sh && sh.getLastRow() > 1) {
      sh.getRange(2, 1, sh.getLastRow() - 1, SCHEMA[ten].length).clearContent();
    }
  });

  // 3. Cập nhật năm học + sinh lại lịch tuần
  const shCfg = ss.getSheetByName(SHEETS.CFG);
  const vals = shCfg.getRange(2, 1, shCfg.getLastRow() - 1, 3).getValues();
  const namBatDau = namMoi.split('-')[0];
  vals.forEach(function (r) {
    if (r[0] === 'NamHoc') r[1] = namMoi;
    if (r[0] === 'NgayBatDauNamHoc') r[1] = namBatDau + '-09-05';
  });
  shCfg.getRange(2, 1, vals.length, 3).setValues(vals);

  ui.alert('Xong!',
    'Đã sao lưu năm ' + cfg.NamHoc + ' ra file:\n' + banLuu.getName() + '\n\n' +
    'File hiện tại giờ là năm ' + namMoi + ', dữ liệu đã dọn sạch.\n\n' +
    'Việc còn lại:\n' +
    '  1. Cập nhật sheet HocSinh nếu lớp có thay đổi danh sách.\n' +
    '  2. Vào web tab "Sổ thi đua" tạo trang tuần 1 của năm học mới.',
    ui.ButtonSet.OK);
}

/**
 * Xoá sạch sheet TuanHoc. Dùng khi muốn bỏ lịch tuần cũ (sinh tự động) để
 * bắt đầu lại bằng cách tự tạo từng trang tuần trên web.
 * Chặn lại nếu đã có dữ liệu ghi sổ, tránh mất dấu các mục đã nhập.
 */
function xoaHetTrangTuan() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEETS.TUAN);
  const n = sh.getLastRow() - 1;
  if (n <= 0) { ui.alert('Sheet TuanHoc đang trống, không có gì để xoá.'); return; }

  const coMuc = docBang(SHEETS.NHATKY).filter(function (r) {
    return r.TrangThai === 'HOAT_DONG';
  }).length;
  if (coMuc) {
    ui.alert('Không xoá được',
      'Đang có ' + coMuc + ' mục đã ghi trong sổ thi đua. Xoá trang tuần sẽ làm mất dấu '  +
      'các mục này.\n\nNếu vẫn muốn làm lại từ đầu, xoá dữ liệu trong sheet NhatKy trước.',
      ui.ButtonSet.OK);
    return;
  }

  const tl = ui.alert('Xoá hết trang tuần',
    'Xoá ' + n + ' trang tuần trong sheet TuanHoc?\n\n' +
    'Sau đó vào web tab \"Sổ thi đua\" bấm \"+ Trang tuần mới\" để tạo lại từng tuần.',
    ui.ButtonSet.YES_NO);
  if (tl !== ui.Button.YES) return;

  sh.getRange(2, 1, n, SCHEMA.TuanHoc.length).clearContent();
  ghiLog('GVCN', 'XOA_HET_TUAN', n + ' trang tuần');
  ui.alert('Đã xoá ' + n + ' trang tuần. Giờ vào web tạo trang tuần đầu tiên.');
}

/**
 * Dọn các dòng lịch sử trong NhatKy.
 *
 * Mỗi lần cán bộ lớp bấm Lưu, bản ghi cũ không bị xoá mà chuyển thành DA_THAY
 * (hoặc DA_XOA) để truy vết được. Dùng lâu thì các dòng này tích tụ, sheet phình
 * to và Apps Script chạy chậm dần. Hàm này xoá hẳn chúng đi.
 *
 * KHÔNG đụng vào dòng HOAT_DONG - tức là dữ liệu đang hiển thị trên web.
 */
function donLichSu() {
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.NHATKY);
  const head = SCHEMA.NhatKy;
  const n = sh.getLastRow() - 1;
  if (n <= 0) { ui.alert('Sheet NhatKy đang trống.'); return; }

  const iTT = head.indexOf('TrangThai');
  const vals = sh.getRange(2, 1, n, head.length).getValues();
  const giuLai = vals.filter(function (r) {
    return r[iTT] === 'HOAT_DONG' && r[head.indexOf('Id')];
  });
  const soXoa = n - giuLai.length;

  if (!soXoa) {
    ui.alert('Không có gì để dọn', 'Tất cả ' + giuLai.length + ' dòng đều đang có hiệu lực.',
      ui.ButtonSet.OK);
    return;
  }

  const tl = ui.alert('Dọn lịch sử sửa đổi',
    'Xoá hẳn ' + soXoa + ' dòng lịch sử (DA_THAY / DA_XOA)?\n\n' +
    'Giữ lại ' + giuLai.length + ' dòng đang có hiệu lực - dữ liệu trên web không đổi.\n\n' +
    'Sau khi dọn sẽ không tra được ai đã sửa gì trước đây nữa (sheet Log vẫn còn).',
    ui.ButtonSet.YES_NO);
  if (tl !== ui.Button.YES) return;

  sh.getRange(2, 1, n, head.length).clearContent();
  if (giuLai.length) {
    sh.getRange(2, 1, giuLai.length, head.length).setValues(giuLai);
  }
  ghiLog('GVCN', 'DON_LICH_SU', 'Xoá ' + soXoa + ' dòng, giữ ' + giuLai.length);
  ui.alert('Đã dọn ' + soXoa + ' dòng lịch sử. Còn ' + giuLai.length + ' dòng đang dùng.');
}

function hashMK(mk) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, mk + '|thidua10A0', Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

function fmt(d) {
  return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}
