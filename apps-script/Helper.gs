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
    if (fmtNgay(ds[i].TuNgay) <= ngay && ngay <= fmtNgay(ds[i].DenNgay)) return ds[i];
  }
  return null;
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
