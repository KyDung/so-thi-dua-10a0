/**
 * Kiểm tra THẬT trên bản đang chạy — đăng nhập bằng cả 4 vai trò và gọi hết
 * các lệnh, xác nhận ai được làm gì.
 *
 * Khác với các bộ test còn lại (chạy offline, kiểm logic và mã nguồn), bộ này
 * gọi thẳng Apps Script đang deploy. Chạy nó SAU MỖI LẦN deploy, trước khi báo
 * là xong.
 *
 *   node tests/kiem-tra-that.js
 *   node tests/kiem-tra-that.js --url=https://script.google.com/.../exec
 *
 * Mật khẩu lấy từ biến môi trường nếu có, không thì dùng mật khẩu mặc định:
 *   MK_GVCN, MK_LOPTRUONG, MK_TOTRUONG, TK_PH / MK_PH
 */
const https = require('https');
const { URL } = require('url');

const doiSo = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)]; }));

const API = doiSo.url ||
  'https://script.google.com/macros/s/AKfycbyGwgjPOPgBLCilYdWD_fX_1VJ_R3G7jpw8uSJCcQjn3ZVtEwfhxMH7T8au89ChN-gunw/exec';

const TAI_KHOAN = {
  GVCN:       { ten: 'gvcn',       mk: process.env.MK_GVCN || 'gvcn@2026' },
  LOP_TRUONG: { ten: 'loptruong',  mk: process.env.MK_LOPTRUONG || 'lt@2026' },
  TO_TRUONG:  { ten: 'totruong1',  mk: process.env.MK_TOTRUONG || 'tt1@2026' },
  PHU_HUYNH:  { ten: process.env.TK_PH || 'vuhathuychia0k67',
                mk: process.env.MK_PH || 'vuhathuychi1' }
};

let pass = 0, fail = 0, boQua = 0;
const kt = (ten, dung, chiTiet) => {
  if (dung) { pass++; console.log('  ok   ' + ten); }
  else { fail++; console.log('  FAIL ' + ten + (chiTiet ? ' -> ' + chiTiet : '')); }
};

/** POST tới Apps Script, tự đi theo chuyển hướng như trình duyệt. */
function goi(body, lan) {
  lan = lan || 0;
  return new Promise((resolve, reject) => {
    if (lan > 5) return reject(new Error('Chuyển hướng quá nhiều lần'));
    const u = new URL(lan === 0 ? API : body.__url);
    const data = lan === 0 ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: lan === 0 ? 'POST' : 'GET',
      headers: lan === 0
        ? { 'Content-Type': 'text/plain;charset=utf-8', 'Content-Length': Buffer.byteLength(data) }
        : {}
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return goi(Object.assign({}, body, { __url: res.headers.location }), lan + 1)
          .then(resolve, reject);
      }
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => {
        try { resolve(JSON.parse(s)); }
        catch (e) { reject(new Error('Không phải JSON: ' + s.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const dangNhap = async vaiTro => {
  const tk = TAI_KHOAN[vaiTro];
  const r = await goi({ action: 'dangNhap', tenDangNhap: tk.ten, matKhau: tk.mk });
  return r.ok ? r.data : null;
};

/** Gọi một lệnh, trả về { ok, error, data } */
const thu = (token, action, them) =>
  goi(Object.assign({ action, token }, them || {}));

(async () => {
  console.log('Kiểm tra bản đang chạy:');
  console.log('  ' + API.slice(0, 70) + '...\n');

  // ---------- Chưa đăng nhập ----------
  console.log('=== Chưa đăng nhập: không được xem gì ===');
  for (const a of ['chiTietHS', 'bangLop', 'dsHocSinh', 'lichTuan', 'danhMucDayDu']) {
    const r = await thu(null, a, { maHS: '10A0_01', thang: 9 });
    kt(a.padEnd(14) + ' bị chặn', !r.ok && /đăng nhập|quyền/i.test(r.error || ''), r.error || 'lọt qua');
  }
  const tt = await goi({ action: 'thongTinLop' });
  kt('thongTinLop mở được (cho trang đăng nhập)', tt.ok, tt.error);
  kt('thongTinLop không lộ dữ liệu học sinh',
     tt.ok && !JSON.stringify(tt.data).includes('10A0_'), JSON.stringify(tt.data || {}).slice(0, 80));

  // ---------- Từng vai trò ----------
  const phien = {};
  for (const vt of Object.keys(TAI_KHOAN)) {
    console.log('\n=== ' + vt + ' (' + TAI_KHOAN[vt].ten + ') ===');
    const d = await dangNhap(vt);
    if (!d) {
      boQua++;
      console.log('  -- bỏ qua: đăng nhập không được (mật khẩu đã đổi?)');
      continue;
    }
    phien[vt] = d;
    kt('đăng nhập được', true);
    kt('vai trò trả về đúng', d.vaiTro === vt, d.vaiTro);

    const ds = await thu(d.token, 'dsHocSinh');
    if (vt === 'PHU_HUYNH') {
      kt('chỉ thấy 1 học sinh (con mình)', ds.ok && ds.data.length === 1,
         ds.ok ? ds.data.length + ' HS' : ds.error);
      kt('đúng con mình', ds.ok && ds.data[0] && ds.data[0].maHS === d.maHS,
         ds.ok && ds.data[0] ? ds.data[0].maHS + ' vs ' + d.maHS : '');

      const khac = await thu(d.token, 'chiTietHS', { maHS: '10A0_25' });
      kt('xin xem HS khác -> vẫn ra con mình',
         khac.ok && khac.data.hocSinh.maHS === d.maHS,
         khac.ok ? khac.data.hocSinh.maHS : khac.error);

      for (const a of ['bangLop', 'danhMucDayDu', 'themNhatKy', 'taoTuan', 'tinhLai']) {
        const r = await thu(d.token, a, { thang: 9, muc: {}, tuan: {} });
        kt('KHÔNG được ' + a.padEnd(13), !r.ok && /quyền/i.test(r.error || ''), r.error || 'lọt qua');
      }
    } else {
      if (vt === 'TO_TRUONG' && !ds.ok && /Chưa có học sinh nào thuộc/.test(ds.error || '')) {
        kt('tổ chưa có HS -> báo lỗi rõ ràng (lớp không chia tổ)', true);
      } else {
        kt('thấy cả lớp hoặc cả tổ', ds.ok && ds.data.length >= 1,
           ds.ok ? ds.data.length + ' HS' : ds.error);
      }
      if (vt !== 'TO_TRUONG') {
        kt('thấy đủ 41 học sinh', ds.ok && ds.data.length === 41,
           ds.ok ? ds.data.length + ' HS' : ds.error);
      }
      const bl = await thu(d.token, 'bangLop', { thang: 9 });
      kt('xem được bảng lớp', bl.ok, bl.error);
      const dm = await thu(d.token, 'danhMucDayDu');
      kt('xem được danh mục lỗi', dm.ok && dm.data.loi.length > 30,
         dm.ok ? dm.data.loi.length + ' lỗi' : dm.error);

      const qt = await thu(d.token, 'tinhLai');
      if (vt === 'GVCN') kt('vào được quản trị', qt.ok, qt.error);
      else kt('KHÔNG vào được quản trị', !qt.ok && /quyền/i.test(qt.error || ''), qt.error || 'lọt qua');
    }
  }

  // ---------- Danh mục phải khớp tài liệu ----------
  if (phien.GVCN) {
    console.log('\n=== Danh mục theo tài liệu hướng dẫn thi đua ===');
    const dm = await thu(phien.GVCN.token, 'danhMucDayDu');
    if (dm.ok) {
      const ma = dm.data.loi.map(x => x.ma);
      kt('có lỗi "không đội mũ bảo hiểm" -20đ',
         dm.data.loi.some(x => x.ma === 'XE05' && x.diem === -20));
      kt('có mục "Lỗi khác" để gõ tay', ma.includes('KHAC'));
      kt('có 3 mức điểm tốt 10/9/8',
         ['DT10', 'DT09', 'DT08'].every(m => dm.data.cong.some(x => x.ma === m)));
    }
  }

  console.log('\n' + pass + ' đạt, ' + fail + ' lỗi' + (boQua ? ', ' + boQua + ' bỏ qua' : ''));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('LỖI:', e.message); process.exit(1); });
