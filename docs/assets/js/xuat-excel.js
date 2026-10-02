/**
 * xuat-excel.js — Dựng file Excel đúng bố cục mẫu của trường ("THEO_DOI_NOI_QUY_… HK1 – LỚP TRƯỞNG"):
 *   - Mỗi tháng một sheet (tên "9", "10"…): cột TT | Họ tên | Những lỗi vi phạm (Ngày: Lỗi vi phạm) |
 *     Kết quả T/K/Đ/CĐ | Ghi chú; dòng TỔNG; dòng ký tên.
 *   - Sheet HK1 / HK2: kết quả từng tháng + học kỳ (+ cả năm ở HK2).
 * Kích thước cột, cỡ chữ, phông Times New Roman, màu tiêu đề DDD9C3, đường kẻ, cố định 2 cột + 4 dòng
 * đầu, khổ A4 dọc… lấy theo đúng file mẫu. Dùng ExcelJS (nạp từ CDN khi cần).
 */
import { NHAN } from './logic.js';

const TNR = 'Times New Roman';
const VIEN = { style: 'thin', color: { argb: 'FF000000' } };
const VIEN_DU = { top: VIEN, left: VIEN, bottom: VIEN, right: VIEN };
const NEN_TIEU_DE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDD9C3' }, bgColor: { argb: 'FFDDD9C3' } };
const CAO_DONG = 23.3;

const hoa = function (s) { return String(s || '').toUpperCase(); };
const namHocMau = function (nam) { return String(nam || '').replace('-', ' - '); };

function datTrang(ws, ghim) {
  ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    margins: { left: 0.5, right: 0.25, top: 0.25, bottom: 0.25, header: 0, footer: 0 }, horizontalCentered: true };
  ws.views = [{ state: 'frozen', xSplit: ghim.x, ySplit: ghim.y, topLeftCell: 'C5', activeCell: 'C5' }];
}

/** Sheet một tháng, đúng mẫu. `d` = { thang, ds:[{hoTen, loi:[{ngay,ten,mon}], xepLoai, ghiChu}] } */
function sheetThang(wb, cfg, d) {
  const ws = wb.addWorksheet(String(d.thang), { properties: { tabColor: { argb: 'FF0000FF' }, defaultRowHeight: CAO_DONG } });
  datTrang(ws, { x: 2, y: 4 });
  [7.83, 32, 63, 19.58, 19].forEach(function (w, i) { ws.getColumn(i + 1).width = w; });

  // --- 3 dòng đầu ---
  ws.getRow(1).height = ws.getRow(2).height = ws.getRow(3).height = CAO_DONG;
  ws.mergeCells('A1:B1');
  Object.assign(ws.getCell('A1'), { value: 'TRƯỜNG ' + hoa(cfg.Truong) });
  ws.getCell('A1').font = { name: TNR, size: 14, underline: true };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell('C2').value = 'ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN THÁNG ' + d.thang + ' - LỚP: ' + cfg.Lop;
  ws.getCell('C3').value = 'NĂM HỌC ' + namHocMau(cfg.NamHoc);
  ['C2', 'C3'].forEach(function (a) {
    ws.getCell(a).font = { name: TNR, size: 14, bold: true };
    ws.getCell(a).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // --- tiêu đề bảng ---
  const dau = ['TT', 'Họ tên', 'NHỮNG LỖI VI PHẠM \r\n(Ngày: Lỗi vi phạm)', 'KẾT QUẢ\r\nT/K/Đ/CĐ', 'GHI CHÚ'];
  ws.getRow(4).height = 41.3;
  dau.forEach(function (t, i) {
    const c = ws.getRow(4).getCell(i + 1);
    c.value = t;
    c.font = { name: TNR, size: 14, bold: true };
    c.fill = NEN_TIEU_DE; c.border = VIEN_DU;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: i !== 0 && i !== 4 };
  });

  // --- từng học sinh ---
  const dem = { TOT: 0, KHA: 0, DAT: 0, CHUA_DAT: 0 };
  d.ds.forEach(function (h, i) {
    const r = ws.getRow(5 + i);
    const dongLoi = h.loi.map(function (l) {
      return Number(l.ngay.slice(8, 10)) + '/' + Number(l.ngay.slice(5, 7)) + ': ' + l.ten + (l.mon ? ' (' + l.mon + ')' : '');
    });
    r.height = Math.max(CAO_DONG, dongLoi.length * 13.5 + 8);
    const o = [i + 1, h.hoTen, dongLoi.join('\n'), NHAN[h.xepLoai] || '', h.ghiChu || ''];
    o.forEach(function (v, j) { r.getCell(j + 1).value = v; r.getCell(j + 1).border = VIEN_DU; });
    r.getCell(1).font = { name: TNR, size: 14 };
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(2).font = { name: TNR, size: 11 };
    r.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    r.getCell(3).font = { name: TNR, size: 10 };
    r.getCell(3).alignment = { vertical: 'middle', wrapText: true };
    r.getCell(4).font = { name: TNR, size: 14 };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).font = { name: TNR, size: 10 };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    if (dem[h.xepLoai] !== undefined) dem[h.xepLoai]++;
  });

  // --- dòng tổng + ký tên (liền sau danh sách như mẫu, ký tên cách một dòng) ---
  const hangTong = 5 + d.ds.length;
  ws.mergeCells('A' + hangTong + ':C' + hangTong);
  const tong = ws.getCell('A' + hangTong);
  tong.value = 'TỔNG: ' + d.ds.length + ' HS             TỐT: ' + dem.TOT + '               KHÁ:  ' + dem.KHA +
    '               ĐẠT:  ' + dem.DAT + '              CHƯA ĐẠT:   ' + dem.CHUA_DAT + '           ';
  tong.font = { name: TNR, size: 12 };
  tong.alignment = { horizontal: 'left', vertical: 'middle' };
  ['A', 'B', 'C'].forEach(function (c) { ws.getCell(c + hangTong).border = { top: VIEN, bottom: VIEN, left: c === 'A' ? VIEN : undefined }; });
  ['D', 'E'].forEach(function (c) { ws.getCell(c + hangTong).border = VIEN_DU; });
  ws.getRow(hangTong).height = CAO_DONG;

  const hangKy = hangTong + 2;
  ws.mergeCells('A' + hangKy + ':D' + hangKy);
  const ky = ws.getCell('A' + hangKy);
  ky.value = '  BAN GIÁM HIỆU                   KHỐI TRƯỞNG CHỦ NHIỆM                           GIÁO VIÊN CHỦ NHIỆM    ';
  ky.font = { name: TNR, size: 14, bold: true };
  ky.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(hangKy).height = CAO_DONG;
  return ws;
}

/** Sheet học kỳ: kết quả các tháng + xếp loại kỳ. `ky` = [{hoTen, thang:{t:{xepLoai}}, ky:{HK1,HK2,CA_NAM}}] */
function sheetKy(wb, cfg, ten, cacThang, ky) {
  const laHK2 = ten === 'HK2';
  const ws = wb.addWorksheet(ten, { properties: { tabColor: { argb: 'FF0000FF' }, defaultRowHeight: 14.3 } });
  datTrang(ws, { x: 2, y: 4 });
  const dauCot = ['TT', 'Họ tên'].concat(cacThang.map(function (t) { return 'Tháng ' + t; }));
  dauCot.push('HK I');
  if (laHK2) dauCot.push('HK II', 'CẢ NĂM');
  dauCot.push('GHI CHÚ');
  const soCot = dauCot.length;
  ws.getColumn(1).width = 4.41; ws.getColumn(2).width = 25;
  for (let i = 3; i <= soCot; i++) ws.getColumn(i).width = i <= 2 + cacThang.length ? 9.16 : 12;
  const cuoiCot = String.fromCharCode(64 + soCot);

  ws.mergeCells('A1:B1');
  ws.getCell('A1').value = 'TRƯỜNG ' + hoa(cfg.Truong);
  ws.getCell('A1').font = { name: TNR, size: 12, underline: true };
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells('A2:' + cuoiCot + '2');
  ws.getCell('A2').value = 'ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN LỚP: ' + cfg.Lop;
  ws.mergeCells('A3:' + cuoiCot + '3');
  ws.getCell('A3').value = (laHK2 ? 'HỌC KỲ II' : 'HỌC KỲ I') + ' - NĂM HỌC  ' + namHocMau(cfg.NamHoc);
  ['A2', 'A3'].forEach(function (a) {
    ws.getCell(a).font = { name: TNR, size: 12, bold: true };
    ws.getCell(a).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  dauCot.forEach(function (t, i) {
    const c = ws.getRow(4).getCell(i + 1);
    c.value = t; c.font = { name: TNR, size: 12, bold: true };
    c.fill = NEN_TIEU_DE; c.border = VIEN_DU;
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });
  const dem = { TOT: 0, KHA: 0, DAT: 0, CHUA_DAT: 0 };
  ky.forEach(function (h, i) {
    const r = ws.getRow(5 + i); r.height = 18;
    const o = [i + 1, h.hoTen];
    cacThang.forEach(function (t) { o.push(NHAN[(h.thang[t] || {}).xepLoai] || ''); });
    o.push(NHAN[h.ky.HK1.xepLoai] || '');
    if (laHK2) { o.push(NHAN[h.ky.HK2.xepLoai] || ''); o.push(NHAN[h.ky.CA_NAM.xepLoai] || ''); }
    o.push('');
    o.forEach(function (v, j) {
      const c = r.getCell(j + 1);
      c.value = v; c.border = VIEN_DU;
      c.font = { name: TNR, size: j === 1 ? 11 : 12 };
      c.alignment = { horizontal: j === 1 ? 'left' : 'center', vertical: 'middle' };
    });
    const xl = laHK2 ? h.ky.CA_NAM.xepLoai : h.ky.HK1.xepLoai;
    if (dem[xl] !== undefined) dem[xl]++;
  });
  const hang = 5 + ky.length;
  ws.mergeCells('A' + hang + ':B' + hang);
  ws.getCell('A' + hang).value = 'SỐ HỌC SINH: ' + ky.length;
  ws.mergeCells('C' + hang + ':' + cuoiCot + hang);
  ws.getCell('C' + hang).value = 'TỐT: ' + dem.TOT + '    KHÁ: ' + dem.KHA + '    ĐẠT: ' + dem.DAT + '    CHƯA ĐẠT: ' + dem.CHUA_DAT;
  for (let i = 1; i <= soCot; i++) { ws.getCell(String.fromCharCode(64 + i) + hang).border = { top: VIEN, bottom: VIEN }; }
  ws.getCell('A' + hang).font = { name: TNR, size: 12 }; ws.getCell('C' + hang).font = { name: TNR, size: 12 };
  ws.mergeCells('A' + (hang + 2) + ':' + cuoiCot + (hang + 2));
  ws.getCell('A' + (hang + 2)).value = ' BAN GIÁM HIỆU         KHỐI TRƯỞNG CHỦ NHIỆM       GIÁO VIÊN CHỦ NHIỆM';
  ws.getCell('A' + (hang + 2)).font = { name: TNR, size: 12, bold: true };
}

/**
 * Dựng workbook. ExcelJS truyền vào để chạy được cả trình duyệt (từ CDN) lẫn Node (khi kiểm thử).
 * opts: { cfg, thang:[{thang, ds}], ky: null | [...] }
 */
export function taoWorkbook(ExcelJS, opts) {
  const wb = new ExcelJS.Workbook();
  wb.creator = opts.cfg.Truong; wb.created = new Date();
  opts.thang.forEach(function (d) { sheetThang(wb, opts.cfg, d); });
  if (opts.ky) {
    sheetKy(wb, opts.cfg, 'HK1', opts.cfg.ThangHK1 || [], opts.ky);
    sheetKy(wb, opts.cfg, 'HK2', opts.cfg.ThangHK2 || [], opts.ky);
  }
  return wb;
}

function napExcelJS() {
  return new Promise(function (ok, hong) {
    if (window.ExcelJS) return ok(window.ExcelJS);
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload = function () { ok(window.ExcelJS); };
    s.onerror = function () { hong(new Error('Không tải được thư viện xuất Excel. Kiểm tra kết nối mạng.')); };
    document.head.appendChild(s);
  });
}

/** Dựng và tải file về máy. Trả về tên file. */
export async function xuatFile(opts) {
  const ExcelJS = await napExcelJS();
  const wb = taoWorkbook(ExcelJS, opts);
  const lop = String(opts.cfg.Lop).replace(/[^\w-]/g, '');
  const ten = opts.ky
    ? 'THEO_DOI_NOI_QUY_' + lop + '_CA_NAM_' + opts.homNay + '.xlsx'
    : 'DANH_GIA_RLTT_THANG_' + opts.thang[0].thang + '_' + lop + '.xlsx';
  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = ten;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  return ten;
}
