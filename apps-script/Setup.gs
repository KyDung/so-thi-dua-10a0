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
  KY: 'XepLoaiKy',
  TK: 'TaiKhoan',
  CFG: 'CauHinh',
  LOG: 'Log'
};

const SCHEMA = {
  HocSinh: ['MaHS', 'HoTen', 'To', 'ChucVu', 'TrangThai', 'GhiChu'],
  DanhMucLoi: ['MaLoi', 'TenLoi', 'Nhom', 'PhamVi', 'DiemTru', 'NguongHocKy', 'HienThi', 'GhiChu'],
  DanhMucCong: ['MaCong', 'TenCong', 'DiemCong', 'CanMon', 'TranTuan', 'HienThi'],
  TuanHoc: ['MaTuan', 'SoTuan', 'TuNgay', 'DenNgay', 'Thang', 'HocKy', 'GhiChu', 'NguoiTao', 'ThoiGianTao'],
  NhatKy: ['Id', 'MaHS', 'Ngay', 'MaTuan', 'Thang', 'HocKy', 'Loai', 'Ma', 'Diem', 'MoTa', 'NguoiNhap', 'ThoiGian', 'TrangThai'],
  XepLoaiThang: ['MaHS', 'Thang', 'HocKy', 'SoLoiNho', 'SoLanGhiSo', 'SoLanHaBac', 'LoiNhoTonKho', 'DiemThiDua', 'XepLoai', 'DeXuat', 'NguoiNhap', 'DaChot', 'NguoiChot', 'ThoiGianChot', 'GhiChu'],
  XepLoaiKy: ['MaHS', 'Ky', 'XepLoai', 'DeXuat', 'DaDuyet', 'GhiChu'],
  TaiKhoan: ['TenDangNhap', 'HoTen', 'MatKhauMoi', 'MatKhauHash', 'VaiTro', 'ToPhuTrach', 'TrangThai', 'GhiChu'],
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

// Nhóm: NHO | HA_BAC | CHUA_DAT   ·   Phạm vi: TRUONG | LOP
// NguongHocKy > 0 nghĩa là: lần vi phạm thứ N trở đi trong học kỳ mới bị hạ bậc.
const DS_LOI = [
  // --- 15 lỗi sinh hoạt dưới cờ (sheet SHTT của file gốc) ---
  ['SH01', 'Sai đồng phục, thiếu cavat, tóc không đúng quy định, không đeo thẻ', 'NHO', 'TRUONG', -2, 2, true, 'Lần 2 trở đi trong HK thì hạ 1 bậc (QĐ I.3)'],
  ['SH02', 'Bị nhắc nhở trước cờ, tại hội nghị', 'NHO', 'TRUONG', -2, 0, true, ''],
  ['SH03', 'Chỗ tập trung có rác', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH04', 'Tập trung chậm', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH05', 'Tự ý dời hàng', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH06', 'Lấy ghế muộn', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH07', 'Hàng ngũ lộn xộn, ngồi không đúng vị trí', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH08', 'Không hát quốc ca', 'NHO', 'TRUONG', -2, 0, true, ''],
  ['SH09', 'Nói chuyện gây mất trật tự', 'NHO', 'TRUONG', -2, 0, true, ''],
  ['SH10', 'Làm việc riêng, không chú ý', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH11', 'Không dồn hết ghế', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH12', 'Không tắt điện hội trường', 'NHO', 'LOP', -1, 0, true, ''],
  ['SH13', 'Thành viên đội thi đua trực tuần đi muộn', 'NHO', 'TRUONG', -2, 0, true, ''],
  ['SH14', 'Cán bộ lớp nộp biên bản muộn', 'NHO', 'TRUONG', -2, 0, true, ''],
  ['SH15', 'Cán bộ lớp không nộp biên bản', 'HA_BAC', 'TRUONG', -6, 0, true, 'Tự xếp - cần cô duyệt (Q10)'],

  // --- Lỗi nề nếp hằng ngày (tự bổ sung, xem câu hỏi Q11) ---
  ['NN01', 'Đi học muộn', 'NHO', 'LOP', -1, 0, true, 'Tự bổ sung'],
  ['NN02', 'Không làm bài tập / không chuẩn bị bài', 'NHO', 'LOP', -1, 0, true, 'Tự bổ sung'],
  ['NN03', 'Trực nhật không sạch / bỏ trực nhật', 'NHO', 'LOP', -1, 0, true, 'Tự bổ sung'],
  ['NN04', 'Mất trật tự trong giờ học', 'NHO', 'LOP', -1, 0, true, 'Tự bổ sung'],
  ['NN05', 'Bị ghi tên vào sổ đầu bài', 'NHO', 'TRUONG', -2, 0, true, 'Tính trực tiếp 1 lần ghi sổ'],

  // --- Lỗi HẠ 1 BẬC (QĐ mục I.3) ---
  ['HB01', 'Nghỉ học không phép', 'HA_BAC', 'TRUONG', -6, 0, true, ''],
  ['HB02', 'Trốn học, bỏ tiết', 'HA_BAC', 'TRUONG', -6, 0, true, ''],
  ['HB03', 'Không tham gia hoạt động giáo dục do Trường, Đoàn TN tổ chức', 'HA_BAC', 'TRUONG', -6, 0, true, ''],
  ['HB04', 'Không đội mũ bảo hiểm khi đi xe máy / xe đạp điện', 'HA_BAC', 'TRUONG', -6, 0, true, ''],
  ['HB05', 'Đi xe máy >50cc khi chưa đủ tuổi / chưa có bằng lái', 'HA_BAC', 'TRUONG', -6, 0, true, ''],
  ['HB06', 'Bị phê bình vì thiếu nghiêm túc, gây rối hoạt động tập thể', 'HA_BAC', 'TRUONG', -6, 0, true, ''],
  ['HB07', 'Sử dụng điện thoại trong hoạt động giáo dục', 'HA_BAC', 'TRUONG', -6, 0, true, ''],
  ['HB08', 'Không nộp điện thoại vào tủ lớp trước giờ học 5 phút', 'HA_BAC', 'LOP', -2, 0, true, ''],
  ['HB09', 'Chơi game online không lành mạnh, dùng Internet mục đích xấu', 'HA_BAC', 'TRUONG', -6, 0, true, ''],

  // --- Lỗi CHƯA ĐẠT (QĐ mục I.4) ---
  ['CD01', 'Điều khiển xe máy khi chưa đủ điều kiện / vi phạm Luật GTĐB bị thông báo', 'CHUA_DAT', 'TRUONG', -12, 0, true, ''],
  ['CD02', 'Sai phạm nghiêm trọng hoặc lặp lại nhiều lần dù đã được giáo dục', 'CHUA_DAT', 'TRUONG', -12, 0, true, ''],
  ['CD03', 'Vô lễ, xúc phạm nhân phẩm, danh dự, thân thể GV/NV nhà trường', 'CHUA_DAT', 'TRUONG', -12, 0, true, ''],
  ['CD04', 'Gian lận trong học tập, kiểm tra, thi', 'CHUA_DAT', 'TRUONG', -12, 0, true, ''],
  ['CD05', 'Xúc phạm danh dự bạn; đánh nhau, gây rối trật tự trị an', 'CHUA_DAT', 'TRUONG', -12, 0, true, ''],
  ['CD06', 'Đánh bạc, ma túy, vũ khí, chất nổ, văn hóa phẩm đồi trụy, tệ nạn xã hội', 'CHUA_DAT', 'TRUONG', -12, 0, true, '']
];

const DS_CONG = [
  ['DT08', 'Hoa điểm tốt - điểm 8', 1, true, 0, true],
  ['DT09', 'Hoa điểm tốt - điểm 9', 2, true, 0, true],
  ['DT10', 'Hoa điểm tốt - điểm 10', 3, true, 0, true],
  ['DTXS', 'Điểm tốt xuất sắc (★)', 3, true, 0, true],
  ['PB01', 'Phát biểu xây dựng bài', 1, true, 3, true],
  ['GL01', 'Giúp việc lớp / làm thêm nhiệm vụ', 1, false, 3, true],
  ['TT01', 'Được tuyên dương trước lớp / trước trường', 3, false, 0, true],
  ['GT01', 'Đạt giải thi HSG, NCKH, TDTT, văn nghệ', 5, false, 0, true]
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
  ['DiemCoSan', '5', 'Điểm có sẵn mỗi tuần (dòng "ĐIỂM CÓ SẴN" trong sổ)'],

  // Điểm của từng cột trong sổ thi đua tuần. Mỗi mục ghi trong ô = 1 lượt.
  ['Diem_CONG', '1', 'ĐIỂM CỘNG - mỗi mục'],
  ['Diem_NHO_TRUONG', '-2', 'Lỗi nhỏ - lỗi trường'],
  ['Diem_NHO_LOP', '-1', 'Lỗi nhỏ - lỗi lớp'],
  ['Diem_HB_TRUONG', '-6', 'Lỗi hạ 1 bậc HK - lỗi trường'],
  ['Diem_HB_LOP', '-2', 'Lỗi hạ 1 bậc HK - lỗi lớp'],
  ['Diem_HK_YEU', '-12', 'Lỗi HK yếu'],

  ['TuDongXepLoai', 'FALSE', 'FALSE = người nhập tự chọn xếp loại. TRUE = web tự tính theo quy chế.'],
  ['DungDiemDeXepLoai', 'FALSE', 'Chỉ dùng khi TuDongXepLoai = TRUE'],
  ['NguongDiem_Tot', '0', 'Chỉ dùng khi DungDiemDeXepLoai = TRUE'],
  ['NguongDiem_Kha', '-10', 'Chỉ dùng khi DungDiemDeXepLoai = TRUE'],
  ['NguongDiem_Dat', '-20', 'Chỉ dùng khi DungDiemDeXepLoai = TRUE'],
  ['CongKhaiBangLop', 'TRUE', 'Ai cũng xem được bảng lớp - cô đã chốt: không cần bảo mật'],
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
    .addSeparator()
    .addItem('👤 Áp dụng tài khoản (sau khi thêm/đổi mật khẩu)', 'apDungTaiKhoan')
    .addItem('👤 Xem danh sách tài khoản', 'xemTaiKhoan')
    .addSeparator()
    .addItem('📅 Bắt đầu năm học mới', 'batDauNamHocMoi')
    .addToUi();
}

function khoiTaoDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Ho_Chi_Minh');

  Object.keys(SCHEMA).forEach(function (ten) {
    let sh = ss.getSheetByName(ten);
    if (!sh) sh = ss.insertSheet(ten);
    if (sh.getLastRow() === 0) {
      const head = SCHEMA[ten];
      sh.getRange(1, 1, 1, head.length).setValues([head])
        .setFontWeight('bold').setBackground('#1f3864').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  });

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
    'Đã tạo xong cấu trúc database.\n\n' +
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
    ['gvcn', 'Giáo viên chủ nhiệm', '', hashMK('gvcn@2026'), 'GVCN', '', 'HOAT_DONG', 'Mật khẩu ban đầu: gvcn@2026 — nên đổi ngay'],
    ['loptruong', 'Lớp trưởng', '', hashMK('lt@2026'), 'LOP_TRUONG', '', 'HOAT_DONG', 'Mật khẩu ban đầu: lt@2026'],
    ['totruong1', 'Tổ trưởng tổ 1', '', hashMK('tt1@2026'), 'TO_TRUONG', 'Tổ 1', 'HOAT_DONG', 'Mật khẩu ban đầu: tt1@2026']
  ]);
  trangTriTaiKhoan(sh);
}

/** Ô chọn sẵn cho cột Vai trò / Trạng thái, và hướng dẫn ngay trên sheet. */
function trangTriTaiKhoan(sh) {
  const head = SCHEMA.TaiKhoan;
  const cVaiTro = head.indexOf('VaiTro') + 1;
  const cTT = head.indexOf('TrangThai') + 1;
  const cMkMoi = head.indexOf('MatKhauMoi') + 1;
  const cHash = head.indexOf('MatKhauHash') + 1;

  const dsVaiTro = SpreadsheetApp.newDataValidation()
    .requireValueInList(['GVCN', 'LOP_TRUONG', 'TO_TRUONG'], true).build();
  const dsTT = SpreadsheetApp.newDataValidation()
    .requireValueInList(['HOAT_DONG', 'KHOA'], true).build();

  sh.getRange(2, cVaiTro, 200, 1).setDataValidation(dsVaiTro);
  sh.getRange(2, cTT, 200, 1).setDataValidation(dsTT);

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

function hashMK(mk) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, mk + '|thidua10A0', Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

function fmt(d) {
  return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}
