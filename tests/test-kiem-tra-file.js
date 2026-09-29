/**
 * Kiểm tra sức khoẻ các file nguồn trước khi dán vào Apps Script.
 *
 * Có lần cả file Setup.gs bị bọc trong dấu backtick, biến toàn bộ code thành một
 * chuỗi. `node --check` vẫn báo hợp lệ (template literal là cú pháp đúng), nhưng
 * lên Apps Script thì SHEETS không tồn tại -> web sập.
 * Bộ này bắt đúng loại lỗi đó.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const GOC = path.join(__dirname, '..');
const APPS = path.join(GOC, 'apps-script');
const WEB = path.join(GOC, 'docs', 'assets', 'js');

let pass = 0, fail = 0;
function kt(ten, dung, chiTiet) {
  if (dung) { pass++; console.log('  ok   ' + ten); }
  else { fail++; console.log('  FAIL ' + ten + (chiTiet ? ' -> ' + chiTiet : '')); }
}

// ---------- 1. Không file nào bị bọc trong chuỗi ----------
console.log('=== File có bị bọc thành chuỗi không? ===');
const dsFile = fs.readdirSync(APPS).filter(f => f.endsWith('.gs')).map(f => path.join(APPS, f))
  .concat(fs.readdirSync(WEB).filter(f => f.endsWith('.js')).map(f => path.join(WEB, f)));

dsFile.forEach(f => {
  const s = fs.readFileSync(f, 'utf8').trim();
  const ten = path.basename(f);
  const boc = s.startsWith('`') || s.startsWith("'") || s.startsWith('"') ||
              s.endsWith('`;') || s.endsWith('`');
  kt(ten.padEnd(22) + ' không bị bọc backtick/nháy', !boc,
     boc ? 'bắt đầu bằng ' + JSON.stringify(s.slice(0, 3)) + ', kết thúc bằng ' + JSON.stringify(s.slice(-3)) : '');
});

// ---------- 2. Chạy thật các file .gs, kiểm tra hằng số có tồn tại ----------
console.log('\n=== Các hằng số và hàm có thực sự được định nghĩa không? ===');
const nguon = ['Setup.gs', 'Helper.gs', 'XepLoai.gs', 'Code.gs']
  .map(f => fs.readFileSync(path.join(APPS, f), 'utf8')).join('\n;\n');

// Giả lập các API của Apps Script vừa đủ để file nạp được
const gia = () => new Proxy(function () {}, { get: () => gia(), apply: () => gia() });
const sandbox = {
  SpreadsheetApp: gia(), Utilities: gia(), ContentService: gia(),
  LockService: gia(), PropertiesService: gia(), Logger: gia(),
  console: { log() {} }
};
vm.createContext(sandbox);

// const ở cấp cao nhất không gắn vào global, phải lôi ra bằng một đoạn phụ
const layHang = ';globalThis.__HANG = { SHEETS, SCHEMA, COT, BAC, NHAN, DS_LOI, DS_CONG, DS_CAUHINH };';

let napDuoc = true, loiNap = '';
try { vm.runInContext(nguon + layHang, sandbox, { timeout: 5000 }); }
catch (e) { napDuoc = false; loiNap = e.message; }
const HANG = sandbox.__HANG || {};
kt('4 file .gs nạp được cùng nhau', napDuoc, loiNap);

if (napDuoc) {
  [['SHEETS', 'object'], ['SCHEMA', 'object'], ['COT', 'object'],
   ['BAC', 'object'], ['NHAN', 'object'],
   ['DS_LOI', 'object'], ['DS_CONG', 'object'], ['DS_CAUHINH', 'object']
  ].forEach(([ten, loai]) => {
    kt(ten.padEnd(12) + ' được định nghĩa', typeof HANG[ten] === loai,
       'đang là ' + typeof HANG[ten]);
  });

  // Các hàm web gọi tới, thiếu cái nào là web sập
  ['doGet', 'doPost', 'xuLy', 'onOpen', 'khoiTaoDatabase',
   'apiThongTinLop', 'apiLichTuan', 'apiChiTietHS', 'apiBangLop',
   'apiTaoTuan', 'apiSuaTuan', 'apiXoaTuan', 'apiLuoiTuan', 'apiLuuLuoiTuan',
   'apiDangNhap', 'tinhLaiTatCa', 'luuXepLoai', 'chotThang',
   'ngayTu', 'fmtNgay', 'thangTheoDoiTuan', 'hocKyTheoThang', 'diemCot',
   'donLichSu', 'xoaHetTrangTuan', 'batDauNamHocMoi', 'apDungTaiKhoan'
  ].forEach(h => {
    kt('hàm ' + (h + '()').padEnd(24) + ' tồn tại', typeof sandbox[h] === 'function',
       'đang là ' + typeof sandbox[h]);
  });

  // Cấu trúc 6 cột của sổ thi đua
  const cot = Object.keys(HANG.COT || {});
  kt('COT đủ 6 cột của sổ giấy',
     cot.length === 6 && ['CONG','NHO_TRUONG','NHO_LOP','HB_TRUONG','HB_LOP','HK_YEU']
       .every(k => cot.includes(k)), cot.join(','));

  // Mọi action trong xuLy phải có hàm xử lý
  const actions = [...nguon.matchAll(/case '([a-zA-Z]+)':\s*(?:canQuyen[^;]*;\s*)?return (api[A-Za-z]+|\{)/g)]
    .map(m => m[2]).filter(x => x.startsWith('api'));
  const thieu = [...new Set(actions)].filter(a => typeof sandbox[a] !== 'function');
  kt('mọi action trong xuLy() đều có hàm', thieu.length === 0, 'thiếu: ' + thieu.join(', '));
}

console.log('\n' + pass + ' đạt, ' + fail + ' lỗi');
process.exit(fail ? 1 : 0);
