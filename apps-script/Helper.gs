/**
 * Helper.gs — Hàm dùng chung: đọc/ghi sheet, cấu hình, log, tiện ích ngày tháng.
 */

/** Đọc cả sheet thành mảng object, key = tên cột ở dòng 1. Có cache 30 giây. */
function docBang(tenSheet) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tenSheet);
  if (!sh) throw new Error('Thiếu sheet: ' + tenSheet);
  const n = sh.getLastRow() - 1;
  if (n <= 0) return [];
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return sh.getRange(2, 1, n, head.length).getValues().map(function (row) {
    const o = {};
    head.forEach(function (h, i) { if (h) o[h] = row[i]; });
    return o;
  });
}

/** Ghi đè toàn bộ dữ liệu (giữ dòng tiêu đề). */
function ghiDeBang(tenSheet, rows) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tenSheet);
  const soCot = SCHEMA[tenSheet].length;
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, soCot).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, soCot).setValues(rows);
}

function docCauHinh() {
  const o = {};
  docBang(SHEETS.CFG).forEach(function (r) { o[r.Khoa] = r.GiaTri; });
  return o;
}

function indexBy(arr, khoa) {
  const o = {};
  arr.forEach(function (r) { o[String(r[khoa])] = r; });
  return o;
}

function objToRow(schema, obj) {
  return schema.map(function (c) { return obj[c] !== undefined ? obj[c] : ''; });
}

/** Tìm tuần học chứa một ngày. Trả về {MaTuan, Thang, HocKy} hoặc null. */
function tuanCuaNgay(d) {
  const ngay = fmtNgay(d);
  const ds = docBang(SHEETS.TUAN);
  for (let i = 0; i < ds.length; i++) {
    if (fmtNgay(ds[i].TuNgay) <= ngay && ngay <= fmtNgay(ds[i].DenNgay)) {
      const t = Object.assign({}, ds[i]);
      t.Thang = thangTheoDoiTuan(t);
      t.HocKy = hocKyTheoThang(t.Thang);
      return t;
    }
  }
  return null;
}

/**
 * Tháng theo dõi của một tuần trong sổ lớp.
 * Tuần vắt tháng được tính theo tháng của ngày bắt đầu tuần; riêng tuần mở năm
 * học kiểu 31/8-6/9 vẫn thuộc tháng 9.
 */
function thangTheoDoiTuan(tuan) {
  const tu = ngayTu(tuan.TuNgay);
  const den = ngayTu(tuan.DenNgay);
  const thangTu = tu.getMonth() + 1;
  const thangDen = den.getMonth() + 1;
  if (thangTu === thangDen) return thangTu;
  return [6, 7, 8].indexOf(thangTu) >= 0 ? thangDen : thangTu;
}

function hocKyTheoThang(thang, cfg) {
  cfg = cfg || docCauHinh();
  const hk1 = String(cfg.ThangHK1 || '').split(',').map(Number);
  return hk1.indexOf(Number(thang)) >= 0 ? 'HK1' : 'HK2';
}

function thangCuaNhatKy(r, tuan) {
  const t = tuan && tuan[r.MaTuan];
  return t ? thangTheoDoiTuan(t) : Number(r.Thang);
}

/**
 * Đọc một giá trị ngày từ Sheet về Date.
 *
 * Google Sheets tự đổi ô kiểu "2026-09-05" thành Date, nên cùng một ô lúc thì là
 * chuỗi lúc thì là Date. Hàm này nhận cả hai. Đặt giờ 12h trưa để không bị lệch
 * ngày khi đổi múi giờ.
 */
function ngayTu(v) {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) throw new Error('Ngày không hợp lệ trong CauHinh');
    return new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12, 0, 0);
  }
  const s = String(v).trim().slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  throw new Error('Không đọc được ngày: "' + v + '". Cần dạng yyyy-MM-dd.');
}

function fmtNgay(d) {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return Utilities.formatDate(new Date(d), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

function ghiLog(nguoiDung, hanhDong, chiTiet) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.LOG);
    sh.appendRow([new Date(), nguoiDung || '', hanhDong, chiTiet || '']);
  } catch (e) { /* log lỗi thì bỏ qua, không làm hỏng request chính */ }
}
