// Kiểm thử phần tính điểm / xếp loại / tuần (docs/assets/js/logic.js) bằng dữ liệu thật của seed.js.
// Chạy: node tests/logic.test.mjs     (không cần mạng, không cần Firebase)
import * as L from '../docs/assets/js/logic.js';
import { DS_LOI, DS_CONG, CAU_HINH_MAC_DINH } from '../docs/assets/js/seed.js';

let pass = 0, fail = 0;
const eq = (ten, got, mong) => {
  if (JSON.stringify(got) === JSON.stringify(mong)) { pass++; console.log('  ok   ' + ten.padEnd(58) + '= ' + JSON.stringify(got)); }
  else { fail++; console.log('  FAIL ' + ten.padEnd(58) + '= ' + JSON.stringify(got) + ' (mong ' + JSON.stringify(mong) + ')'); }
};
const chan = (ten, fn, chua) => {
  try { fn(); fail++; console.log('  FAIL ' + ten + ' -> lẽ ra phải báo lỗi'); }
  catch (e) {
    if (!chua || e.message.includes(chua)) { pass++; console.log('  ok   ' + ten); }
    else { fail++; console.log('  FAIL ' + ten + ' -> báo sai: ' + e.message); }
  }
};

const cfg = Object.assign({}, CAU_HINH_MAC_DINH);
const dmLoi = {}, dmCong = {};
DS_LOI.forEach(r => { dmLoi[r.ma] = r; });
DS_CONG.forEach(r => { dmCong[r.ma] = r; });
const T = (so, tu, den) => ({ maTuan: 'T' + tu, soTuan: so, tuNgay: tu, denNgay: den });
const TUAN = [T(1, '2026-08-31', '2026-09-06'), T(2, '2026-09-07', '2026-09-13'), T(3, '2026-09-14', '2026-09-20'), T(4, '2026-09-21', '2026-09-27')];

const nkLoi = (ma, i = 0) => ({ maTuan: TUAN[i].maTuan, loai: 'LOI', ma, diem: dmLoi[ma].diem });
const nkCong = (ma, i = 0) => ({ maTuan: TUAN[i].maTuan, loai: 'CONG', ma, diem: dmCong[ma].diem });

/** Một tuần với các mã cho trước (mã nằm trong dmCong là điểm cộng). */
function tuan1(maList, c = cfg) {
  const nk = maList.map(ma => dmCong[ma] ? nkCong(ma) : nkLoi(ma));
  return L.tinhHocSinh(nk, [TUAN[0]], c, dmLoi, dmCong).tuan[0];
}
/** Tháng 9 của một học sinh có nhật ký cho trước, rải trên các tuần. */
const thang9 = (nk, soTuan = 4, c = cfg) => L.tinhHocSinh(nk, TUAN.slice(0, soTuan), c, dmLoi, dmCong).thang[9];

console.log('=== Seed ===');
eq('Số lỗi / điểm cộng trong danh mục', [DS_LOI.length, DS_CONG.length], [44, 15]);
eq('Mọi lỗi có điểm âm (trừ mục KHAC = 0)', DS_LOI.every(r => r.diem < 0 || r.ma === 'KHAC'), true);

console.log('\n=== Xếp loại TUẦN theo ngưỡng điểm ===');
let r = tuan1([]);
eq('Không vi phạm gì', [r.cuoi, r.xepLoai], [100, 'TOT']);
r = tuan1(['DT10', 'PB01']);
eq('Chỉ có điểm cộng: 100+3+1', [r.cuoi, r.xepLoai], [104, 'TOT']);
r = tuan1(['RV01', 'DT10', 'DT10']);
eq('Đi học muộn -3, hai điểm 10 +6 -> có lỗi nên KHÔNG Tốt', [r.cuoi, r.xepLoai], [103, 'KHA']);
r = tuan1(['RV01']);
eq('Chỉ đi học muộn: 100-3', [r.cuoi, r.xepLoai], [97, 'KHA']);
r = tuan1(['CC02', 'CC02', 'GH01']);
eq('Nghỉ ko phép x2 (nhân đôi lần 2) + ghi sổ', r.cuoi, 100 - 5 - 10 - 5);
r = tuan1(['GH02', 'GH01', 'RV01', 'RV01', 'CC02']);
eq('Nhiều lỗi: 100-10-5-3-6-5 -> ĐẠT', [r.cuoi, r.xepLoai], [71, 'DAT']);
r = tuan1(['XE05']);
eq('Không đội mũ bảo hiểm: dù 80đ vẫn CHƯA ĐẠT', [r.cuoi, r.xepLoai], [80, 'CHUA_DAT']);
r = tuan1(['GH06', 'DT10', 'DT10', 'DT10', 'DT10']);
eq('Gian lận thi + 4 điểm 10 = 102đ vẫn CHƯA ĐẠT', [r.cuoi, r.xepLoai], [102, 'CHUA_DAT']);

console.log('\n=== Nhân đôi từ lần 2 trong tuần ===');
eq('Muộn 1 lần: -3', 100 - tuan1(['RV01']).cuoi, 3);
eq('Muộn 2 lần: -3 -6', 100 - tuan1(['RV01', 'RV01']).cuoi, 9);
eq('Muộn 3 lần: -3 -6 -6', 100 - tuan1(['RV01', 'RV01', 'RV01']).cuoi, 15);
eq('Lỗi không nhân đôi (GH01): -5 -5', 100 - tuan1(['GH01', 'GH01']).cuoi, 10);
eq('Tắt NhanDoiTuLan2 trong cấu hình', 100 - tuan1(['RV01', 'RV01'], Object.assign({}, cfg, { NhanDoiTuLan2: false })).cuoi, 6);

console.log('\n=== Mục "khác" gõ tay: lấy điểm đã lưu, không lấy danh mục ===');
{
  const nk = [{ maTuan: TUAN[0].maTuan, loai: 'LOI', ma: 'KHAC', diem: -7 }, { maTuan: TUAN[0].maTuan, loai: 'CONG', ma: 'CONG_KHAC', diem: 4 }];
  const t = L.tinhHocSinh(nk, [TUAN[0]], cfg, dmLoi, dmCong).tuan[0];
  eq('-7 và +4 -> 97', [t.tru, t.cong, t.cuoi], [-7, 4, 97]);
}

console.log('\n=== Ngưỡng học kỳ: không đeo thẻ lần 2 trong HK mới hạ bậc ===');
{
  const k = L.tinhHocSinh([nkLoi('TP01', 0), nkLoi('TP01', 1)], TUAN, cfg, dmLoi, dmCong);
  eq('Tuần 1: chưa hạ bậc', k.tuan[0].haBac, 0);
  eq('Tuần 2: lần 2 trong kỳ -> hạ 1 bậc', k.tuan[1].haBac, 1);
}

console.log('\n=== Xếp loại THÁNG ===');
{
  let m = thang9([]);
  eq('4 tuần không lỗi', [m.diemThiDua, m.deXuat], [100, 'TOT']);

  // tuần 1: -3 ; tuần 2: -5 ; tuần 3: không lỗi ; tuần 4: -10  => cuối tuần 97, 95, 100, 90  (TB 95.5)
  m = thang9([nkLoi('RV01', 0), nkLoi('GH01', 1), nkLoi('GH02', 3)]);
  eq('TB (97+95+100+90)/4 = 95.5', m.diemThiDua, 95.5);
  eq('  GH02 là lỗi hạ bậc: KHÁ hạ 1 bậc -> ĐẠT', [m.soLanHaBac, m.deXuat], [1, 'DAT']);

  // Ghi sổ đầu bài: GH01 (-5, tính 1 lần). Ngưỡng điểm hạ thấp để chỉ xét ảnh hưởng của trần ghi sổ
  const nhe = Object.assign({}, cfg, { NhanDoiTuLan2: false, NguongTuan_Kha: 0 });
  const ghi = n => thang9(Array.from({ length: n }, (_, i) => nkLoi('GH01', i % 4)), 4, nhe);
  eq('Ghi sổ 2 lần: tháng có lỗi nên tối đa KHÁ', ghi(2).deXuat, 'KHA');
  eq('Ghi sổ 3 lần -> trần KHÁ', ghi(3).deXuat, 'KHA');
  eq('Ghi sổ 5 lần -> trần ĐẠT', ghi(5).deXuat, 'DAT');
  eq('Đếm số lần ghi sổ', ghi(5).soLanGhiSo, 5);

  eq('Có lỗi Chưa đạt -> tháng CHƯA ĐẠT', thang9([nkLoi('XE05', 0)]).deXuat, 'CHUA_DAT');
  eq('Tuần không có trang -> không có tháng', Object.keys(L.tinhHocSinh([], [], cfg, dmLoi, dmCong).thang), []);
}

console.log('\n=== Xếp loại học kỳ (HK1 = T9,10,11,12,1) ===');
const hk = (ten, ds, mong) => eq(ten, L.xepLoaiMotKy(ds), mong);
hk('Tốt cả 5 tháng', ['TOT', 'TOT', 'TOT', 'TOT', 'TOT'], 'TOT');
hk('1 tháng Đạt ở T9 (2 tháng đầu)', ['DAT', 'TOT', 'TOT', 'TOT', 'TOT'], 'TOT');
hk('1 tháng Đạt ở T12 (cuối kỳ)', ['TOT', 'TOT', 'TOT', 'DAT', 'TOT'], 'KHA');
hk('Toàn Khá', ['KHA', 'KHA', 'KHA', 'KHA', 'KHA'], 'KHA');
hk('Khá + Tốt lẫn lộn', ['KHA', 'TOT', 'KHA', 'TOT', 'KHA'], 'KHA');
hk('1 CĐ ở T10 (đầu kỳ)', ['TOT', 'CHUA_DAT', 'TOT', 'TOT', 'TOT'], 'KHA');
hk('1 CĐ ở T1 (cuối kỳ)', ['TOT', 'TOT', 'TOT', 'TOT', 'CHUA_DAT'], 'DAT');
hk('2 CĐ', ['CHUA_DAT', 'CHUA_DAT', 'TOT', 'TOT', 'TOT'], 'DAT');
hk('Toàn CĐ', ['CHUA_DAT', 'CHUA_DAT', 'CHUA_DAT', 'CHUA_DAT', 'CHUA_DAT'], 'CHUA_DAT');
hk('Tiến bộ dần', ['DAT', 'DAT', 'KHA', 'TOT', 'TOT'], 'KHA');
hk('Chưa có dữ liệu', [null, null, null, null, null], null);
hk('Mới có T9', ['TOT', null, null, null, null], 'TOT');
{
  const ky = L.xepLoaiKyHS({ 9: { xepLoai: 'TOT' }, 10: { xepLoai: '', deXuat: 'KHA' }, 2: { xepLoai: 'KHA' } }, cfg, null);
  eq('Tháng chưa chọn tay lấy theo gợi ý (TuDongXepLoai)', ky.HK1.xepLoai, 'KHA');
  eq('Cả năm = thấp hơn giữa hai kỳ', ky.CA_NAM.xepLoai, 'KHA');
  const ky2 = L.xepLoaiKyHS({ 9: { xepLoai: 'TOT' } }, Object.assign({}, cfg, { TuDongXepLoai: false }), { CA_NAM: { xepLoai: 'DAT', daDuyet: true } });
  eq('GVCN đã duyệt tay cả năm thì giữ nguyên', ky2.CA_NAM, { xepLoai: 'DAT', deXuat: '', daDuyet: true, ghiChu: '' });
  eq('Tắt tự động: tháng chưa chọn tay thì để trống', L.xepLoaiHieuLuc({ xepLoai: '', deXuat: 'KHA' }, { TuDongXepLoai: false }), '');
  eq('Chọn tay luôn thắng gợi ý', L.xepLoaiHieuLuc({ xepLoai: 'DAT', deXuat: 'TOT' }, cfg), 'DAT');
}
eq('Hạ bậc không xuống dưới CHƯA ĐẠT', L.haBac('TOT', 9), 'CHUA_DAT');
eq('Thấp hơn(TOT, KHA)', L.thapHon('TOT', 'KHA'), 'KHA');

console.log('\n=== Tháng theo dõi của tuần vắt tháng ===');
eq('31/8 - 6/9  (vắt 8 sang 9) -> 9', L.thangTheoDoiTuan({ tuNgay: '2026-08-31', denNgay: '2026-09-06' }), 9);
eq('28/9 - 4/10 (vắt 9 sang 10) -> 9', L.thangTheoDoiTuan({ tuNgay: '2026-09-28', denNgay: '2026-10-04' }), 9);
eq('5/10 - 11/10 (trong tháng) -> 10', L.thangTheoDoiTuan({ tuNgay: '2026-10-05', denNgay: '2026-10-11' }), 10);
eq('HK của tháng 1 / 2', [L.hocKyTheoThang(1, cfg), L.hocKyTheoThang(2, cfg)], ['HK1', 'HK2']);

console.log('\n=== Khoảng ngày của tháng dương lịch ===');
eq('Tháng 9/2026 có 30 ngày', L.khoangThang(9, '2026-2027'), { tu: '2026-09-01', den: '2026-09-30', nam: 2026, soNgay: 30 });
eq('Tháng 10 có 31 ngày', L.khoangThang(10, '2026-2027').den, '2026-10-31');
eq('Tháng 2/2027 có 28 ngày', L.khoangThang(2, '2026-2027').den, '2027-02-28');
eq('Tháng 2/2028 (năm nhuận) có 29 ngày', L.khoangThang(2, '2027-2028').den, '2028-02-29');
eq('Tháng 1 thuộc năm sau', L.khoangThang(1, '2026-2027').tu, '2027-01-01');
eq('Tháng 12 thuộc năm đầu', L.khoangThang(12, '2026-2027').den, '2026-12-31');

console.log('\n=== Tạo trang tuần ===');
{
  const ds = [];
  const them = t => { const h = L.kiemTraTuan(t, ds); ds.push({ maTuan: 'T' + h.tuNgay, ...h }); return h; };
  them({ soTuan: 1, tuNgay: '2026-08-31', denNgay: '2026-09-06' });
  them({ soTuan: 2, tuNgay: '2026-09-07', denNgay: '2026-09-13' });
  them({ soTuan: 22, tuNgay: '2027-01-25', denNgay: '2027-01-31' });
  them({ soTuan: 23, tuNgay: '2027-02-15', denNgay: '2027-02-21' });
  eq('Bỏ qua tuần nghỉ Tết: số tuần vẫn liền mạch', ds.map(t => t.soTuan).slice(-2), [22, 23]);
  chan('Trùng số tuần', () => L.kiemTraTuan({ soTuan: 2, tuNgay: '2026-10-05', denNgay: '2026-10-11' }, ds), 'Tuần 2');
  chan('Trùng ngày bắt đầu', () => L.kiemTraTuan({ soTuan: 30, tuNgay: '2026-09-07', denNgay: '2026-09-13' }, ds), 'bắt đầu từ ngày');
  chan('Chồng ngày tuần khác', () => L.kiemTraTuan({ soTuan: 31, tuNgay: '2026-09-09', denNgay: '2026-09-15' }, ds), 'trùng với Tuần');
  chan('Ngày kết thúc trước ngày bắt đầu', () => L.kiemTraTuan({ soTuan: 32, tuNgay: '2026-11-10', denNgay: '2026-11-03' }, ds), 'phải sau');
  chan('Khoảng quá dài', () => L.kiemTraTuan({ soTuan: 33, tuNgay: '2026-11-02', denNgay: '2026-11-30' }, ds), 'không quá 14 ngày');
  chan('Số tuần = 0', () => L.kiemTraTuan({ soTuan: 0, tuNgay: '2026-12-07', denNgay: '2026-12-13' }, ds), 'từ 1 đến 60');
  chan('Ngày không tồn tại', () => L.kiemTraTuan({ soTuan: 40, tuNgay: '2026-02-30', denNgay: '2026-03-05' }, ds), 'không tồn tại');
  eq('Sửa chính trang đó không tự va chạm với nó', L.kiemTraTuan({ soTuan: 2, tuNgay: '2026-09-07', denNgay: '2026-09-13' }, ds, 'T2026-09-07').soTuan, 2);
  eq('Gợi ý tuần mới nối tiếp tuần cuối', L.goiYTuanMoi(ds), { soTuan: 24, tuNgay: '2027-02-22', denNgay: '2027-02-28' });
  eq('Gợi ý khi chưa có trang nào (29/9 -> tuần bắt đầu 28/9)', L.goiYTuanMoi([], '2026-09-29'),
    { soTuan: 1, tuNgay: '2026-09-28', denNgay: '2026-10-04' });
}

console.log('\n=== Trang tuần mở mặc định ===');
{
  eq('Hôm nay nằm trong tuần 3', L.tuanMacDinh(TUAN, '2026-09-16').soTuan, 3);
  eq('Hôm nay là ngày cuối tuần 4', L.tuanMacDinh(TUAN, '2026-09-27').soTuan, 4);
  eq('Sau tuần cuối (chưa tạo trang mới) -> tuần 4', L.tuanMacDinh(TUAN, '2026-10-02').soTuan, 4);
  eq('Trước khai giảng -> tuần 1', L.tuanMacDinh(TUAN, '2026-08-20').soTuan, 1);
  const b = []; let d = '2026-08-31';
  for (let i = 1; i <= 39; i++) { b.push(T(i, d, L.congNgay(d, 6))); d = L.congNgay(d, 7); }
  eq('39 trang tạo sẵn, hôm nay 30/9 -> tuần 5 (không nhảy sang tháng 5)', L.tuanMacDinh(b, '2026-09-30').soTuan, 5);
  eq('Chưa có trang nào', L.tuanMacDinh([], '2026-09-30'), null);
}

console.log('\n=== Nhập nhật ký ===');
{
  const dm = { ma: 'RV01', ten: 'Đi học muộn', diem: -3, canMon: false };
  const ok = L.dungNhatKy({ maHS: 'A_01', ngay: '2026-09-08', loai: 'LOI', ma: 'RV01' }, dm, TUAN, cfg);
  eq('Lỗi thường: điểm từ danh mục, đúng tuần/tháng/kỳ', [ok.diem, ok.maTuan, ok.thang, ok.hocKy], [-3, 'T2026-09-07', 9, 'HK1']);
  chan('Ngày ngoài mọi trang tuần', () => L.dungNhatKy({ maHS: 'A_01', ngay: '2026-12-01', loai: 'LOI', ma: 'RV01' }, dm, TUAN, cfg), 'không nằm trong trang tuần');
  chan('Lỗi cần môn mà thiếu môn', () => L.dungNhatKy({ maHS: 'A_01', ngay: '2026-09-08', loai: 'LOI', ma: 'CB01' }, { ma: 'CB01', ten: 'Không học bài', diem: -5, canMon: true }, TUAN, cfg), 'cần ghi rõ môn');
  chan('Mục "khác" thiếu nội dung', () => L.dungNhatKy({ maHS: 'A_01', ngay: '2026-09-08', loai: 'LOI', ma: 'KHAC', diem: 5 }, { ma: 'KHAC', ten: 'Khác', diem: 0 }, TUAN, cfg), 'ghi rõ nội dung');
  eq('Mục "khác" lỗi: điểm luôn âm', L.dungNhatKy({ maHS: 'A_01', ngay: '2026-09-08', loai: 'LOI', ma: 'KHAC', diem: 5, ghiChu: 'x' }, { ma: 'KHAC', ten: 'Khác', diem: 0 }, TUAN, cfg).diem, -5);
  eq('Mục "khác" cộng: điểm luôn dương', L.dungNhatKy({ maHS: 'A_01', ngay: '2026-09-08', loai: 'CONG', ma: 'CONG_KHAC', diem: -4, ghiChu: 'x' }, { ma: 'CONG_KHAC', ten: 'Khác', diem: 0 }, TUAN, cfg).diem, 4);
  eq('Tên mục "khác" lấy nội dung tự gõ', L.tenMuc({ ma: 'KHAC', moTa: 'Cãi nhau' }, { ten: 'Lỗi khác' }), 'Cãi nhau');
}

console.log('\n=== Tên đăng nhập & email giả ===');
eq('Bỏ dấu tiếng Việt', L.khongDau('NGUYỄN HOÀNG ANH'), 'nguyenhoanganh');
eq('Chữ Đ', L.khongDau('Đặng Đình Đức'), 'dangdinhduc');
eq('Ký tự tổ hợp (NFD) vẫn đúng', L.khongDau('Nguyễn'.normalize('NFD')), 'nguyen');
eq('Email giả từ tên đăng nhập', L.emailTuTenDangNhap('GVCN'), 'gvcn@so-thi-dua.local');
eq('Email phiên bản 2 (sau khi cấp lại MK)', L.emailTuTenDangNhap('abc', 2), 'abc.2@so-thi-dua.local');
chan('Tên đăng nhập có dấu cách bị từ chối', () => L.chuanTenDangNhap('an binh'), 'chữ thường');

console.log('\n=== Môn học ===');
eq('Môn viết tắt về tên chuẩn', ['văn', 'Anh', 'lí', 'Hoá', 'GDCD', 'thể dục', 'GDQP', 'địa'].map(L.chuanMon),
  ['Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Giáo dục kinh tế và pháp luật', 'Giáo dục thể chất', 'Giáo dục quốc phòng và an ninh', 'Địa lí']);
eq('Môn đã chuẩn giữ nguyên', L.chuanMon('Mĩ thuật'), 'Mĩ thuật');
eq('Môn mở rộng của trường giữ nguyên', L.chuanMon('  Tiếng   Nhật '), 'Tiếng Nhật');
eq('Chuỗi rỗng', L.chuanMon(''), '');
eq('Bắt buộc 8, lựa chọn 9', [L.DS_MON.batBuoc.length, L.DS_MON.luaChon.length], [8, 9]);
eq('Môn khác theo cấu hình, bỏ trùng và bỏ môn đã có sẵn', L.danhSachMon({ MonKhac: ['tiếng nhật', 'Tiếng Nhật', 'Toán'] }).khac, ['Tiếng nhật']);
eq('Thứ tự: Toán trước Vật lí trước Tiếng Nhật', [L.thuTuMon('Toán', {}) < L.thuTuMon('Vật lí', {}), L.thuTuMon('Vật lí', {}) < L.thuTuMon('Tiếng nhật', { MonKhac: ['Tiếng Nhật'] })], [true, true]);

console.log('\n' + pass + ' đạt, ' + fail + ' lỗi');
process.exit(fail ? 1 : 0);
