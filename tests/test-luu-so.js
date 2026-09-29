// Chạy trực tiếp mã Apps Script với Google Sheet giả lập, không chạm dữ liệu thật.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let dem = 0;
function moi() {
  const tables = {};
  let id = 0, locked = false;
  function sheet(name) {
    return {
      getLastRow: () => tables[name].length,
      getLastColumn: () => tables[name][0].length,
      getRange(row, col, nr = 1, nc = 1) {
        return {
          getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => tables[name][row - 1 + i]?.[col - 1 + j] ?? '')),
          setValues(values) {
            assert.equal(values.length, nr);
            values.forEach((r, i) => {
              assert.equal(r.length, nc);
              const dst = tables[name][row - 1 + i] ||= [];
              r.forEach((v, j) => { dst[col - 1 + j] = v; });
            });
          },
          clearContent() {
            for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) tables[name][row - 1 + i][col - 1 + j] = '';
          }
        };
      },
      appendRow: r => tables[name].push(r)
    };
  }
  const props = {};
  const ctx = vm.createContext({
    console, Date,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: sheet }) },
    LockService: { getScriptLock: () => ({
      waitLock() { assert.equal(locked, false, 'Không được lấy khóa lồng nhau'); locked = true; },
      releaseLock() { assert.equal(locked, true); locked = false; }
    }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; } }) },
    Utilities: { getUuid: () => 'test-' + (++id), formatDate: d => d.toISOString().slice(0, 10),
      base64DecodeWebSafe: s => Buffer.from(s, 'base64url'),
      newBlob: b => ({ getDataAsString: () => b.toString() }),
      computeHmacSha256Signature: (s, secret) => [...require('node:crypto').createHmac('sha256', secret).update(s).digest()] }
  });
  ['Setup.gs', 'Helper.gs', 'XepLoai.gs', 'Code.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script', f), 'utf8'), ctx));
  const schema = vm.runInContext('SCHEMA', ctx);
  Object.entries(schema).forEach(([k, h]) => { tables[k] = [Array.from(h)]; });
  const add = (name, o) => tables[name].push(Array.from(schema[name], k => o[k] ?? ''));
  [['ThangHK1', '9,10'], ['ThangHK2', '1,2'], ['CongDonLoiNho', 'TRUE'], ['NguongLoiNho', 3]].forEach(([Khoa, GiaTri]) => add('CauHinh', { Khoa, GiaTri }));
  ['A', 'B'].forEach((MaHS, i) => add('HocSinh', { MaHS, HoTen: 'Học sinh thử ' + MaHS, To: 'Tổ ' + (i + 1), TrangThai: 'DANG_HOC' }));
  add('TuanHoc', { MaTuan: 'T1', SoTuan: 1, TuNgay: '2026-09-07', DenNgay: '2026-09-13', Thang: 9, HocKy: 'HK1' });
  add('TuanHoc', { MaTuan: 'T2', SoTuan: 2, TuNgay: '2026-10-05', DenNgay: '2026-10-11', Thang: 10, HocKy: 'HK1' });
  add('TuanHoc', { MaTuan: 'T3', SoTuan: 3, TuNgay: '2026-09-28', DenNgay: '2026-10-04', Thang: 10, HocKy: 'HK1' });
  return { ctx, tables, add };
}
const lt = { ten: 'test', vaiTro: 'LOP_TRUONG' };
const gv = { ten: 'teacher', vaiTro: 'GVCN' };
function row(ctx, ma = 'A', tuan = 'T1') {
  return JSON.parse(JSON.stringify(ctx.apiLuoiTuan(lt, tuan).dong.find(r => r.maHS === ma)));
}
function test(name, f) { f(); dem++; console.log('ok ' + name); }

test('Lưu đúng điểm, giữ học sinh khác, từ chối bản cũ và cho phép xóa ô', () => {
  const { ctx } = moi();
  const a = row(ctx), b = row(ctx, 'B'), cu = row(ctx);
  a.o.CONG = 'Toán, Văn'; a.o.NHO_LOP = 'Quên vở';
  const r = ctx.apiLuuLuoiTuan(lt, 'T1', [a]);
  assert.equal(r.canhBao, '');
  assert.equal(row(ctx).tong, 1);
  assert.equal(ctx.apiBangLop(9)[0].diemThiDua, 1);
  b.o.CONG = 'Anh'; ctx.apiLuuLuoiTuan(lt, 'T1', [b]);
  assert.equal(row(ctx).tong, 1);
  assert.throws(() => ctx.apiLuuLuoiTuan(lt, 'T1', [cu]), /phiên khác/);
  const clear = row(ctx); Object.keys(clear.o).forEach(k => { clear.o[k] = ''; });
  ctx.apiLuuLuoiTuan(lt, 'T1', [clear]);
  assert.equal(row(ctx).tong, 0);
  assert.equal(row(ctx, 'B').tong, 1);
});
test('Kiểm tra cả lô trước khi ghi; chặn thiếu cột và dòng trùng', () => {
  const { ctx, tables } = moi();
  const a = row(ctx); a.o.CONG = 'Toán';
  const b = row(ctx, 'B'); delete b.o.NHO_LOP;
  const before = JSON.stringify(tables);
  assert.throws(() => ctx.apiLuuLuoiTuan(lt, 'T1', [a, b]), /Thiếu nội dung/);
  assert.equal(JSON.stringify(tables), before);
  assert.throws(() => ctx.apiLuuLuoiTuan(lt, 'T1', [a, a]), /Trùng học sinh/);
  delete a.phienBan;
  assert.throws(() => ctx.apiLuuLuoiTuan(lt, 'T1', [a]), /tải lại trang/);
});
test('Tổ trưởng phải có tổ, chỉ được sửa và xóa trong tổ', () => {
  const { ctx } = moi();
  const tt = { ten: 'tt', vaiTro: 'TO_TRUONG', to: 'Tổ 1' };
  assert.throws(() => ctx.apiLuoiTuan({ vaiTro: 'TO_TRUONG' }, 'T1'), /chưa được phân tổ/);
  const b = row(ctx, 'B'); b.o.CONG = 'Anh';
  assert.throws(() => ctx.apiLuuLuoiTuan(tt, 'T1', [b]), /chỉ được ghi/);
  ctx.apiLuuLuoiTuan(lt, 'T1', [b]);
  const id = ctx.docBang('NhatKy')[0].Id;
  assert.throws(() => ctx.apiXoaNhatKy(tt, id), /chỉ được ghi/);
});
test('Chốt tháng giữ điểm và chuyển đúng lỗi dư sang tháng sau', () => {
  const { ctx } = moi();
  const a = row(ctx); a.o.NHO_LOP = 'Lỗi thử 1, Lỗi thử 2';
  ctx.apiLuuLuoiTuan(lt, 'T1', [a]);
  ctx.chotThang(9, 'teacher');
  assert.throws(() => ctx.apiLuuLuoiTuan(gv, 'T1', [row(ctx)]), /đã chốt/);
  assert.throws(() => ctx.apiXoaNhatKy(gv, ctx.docBang('NhatKy')[0].Id), /đã chốt/);
  const next = row(ctx, 'A', 'T2'); next.o.NHO_LOP = 'Lỗi thử 3';
  ctx.apiLuuLuoiTuan(lt, 'T2', [next]);
  assert.equal(ctx.apiBangLop(10)[0].soLanGhiSo, 1);
  assert.equal(ctx.apiBangLop(9)[0].diemThiDua, -2);
});
test('Lưu thành công nhưng tổng hợp lỗi vẫn trả trạng thái rõ ràng', () => {
  const { ctx } = moi();
  ctx.tinhLaiDuLieu = () => { throw new Error('quota'); };
  const a = row(ctx); a.o.CONG = 'Toán';
  const r = ctx.apiLuuLuoiTuan(lt, 'T1', [a]);
  assert.match(r.canhBao, /Đã lưu sổ tuần/);
  assert.equal(r.phienBan.A, row(ctx).phienBan);
  assert.equal(row(ctx).tong, 1);
});
test('Chi tiết trả khoảng tuần; khóa ký tự sinh và giữ ổn định', () => {
  const { ctx } = moi();
  const a = row(ctx); a.o.CONG = 'Toán'; ctx.apiLuuLuoiTuan(lt, 'T1', [a]);
  const d = ctx.apiChiTietHS('A').chiTiet[0];
  assert.equal(d.soTuan, 1); assert.equal(d.denNgay, '2026-09-13');
  assert.equal(ctx.kyChuoi('test'), ctx.kyChuoi('test'));
});
test('Tuần vắt sang tháng sau vẫn theo tháng bắt đầu tuần', () => {
  const { ctx } = moi();
  const a = row(ctx, 'A', 'T3'); a.o.NHO_LOP = 'MTT';
  assert.equal(ctx.apiLuoiTuan(lt, 'T3').tuan.thang, 9);
  ctx.apiLuuLuoiTuan(lt, 'T3', [a]);
  assert.equal(ctx.apiBangLop(9)[0].diemThiDua, -1);
  assert.equal(ctx.apiBangLop(10)[0].diemThiDua, 0);
  const ct = ctx.apiChiTietHS('A');
  assert.equal(ct.chiTiet[0].thang, 9);
  assert.ok(ct.tuan.some(t => t.maTuan === 'T3' && t.thang === 9));
});
test('Phiên dùng quyền hiện tại, chặn tài khoản khóa và hạn phiên không hợp lệ', () => {
  const { ctx, add, tables } = moi();
  add('TaiKhoan', { TenDangNhap: 'test', VaiTro: 'TO_TRUONG', ToPhuTrach: 'Tổ 2', TrangThai: 'HOAT_DONG' });
  const token = payload => {
    const s = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return s + '.' + ctx.kyChuoi(s);
  };
  const valid = token({ ten: 'test', vaiTro: 'GVCN', hetHan: Date.now() + 60000 });
  assert.equal(ctx.giaiToken(valid).vaiTro, 'TO_TRUONG');
  assert.equal(ctx.giaiToken(valid).to, 'Tổ 2');
  assert.throws(() => ctx.giaiToken(token({ ten: 'test' })), /hết hạn/);
  tables.TaiKhoan[1][tables.TaiKhoan[0].indexOf('TrangThai')] = 'KHOA';
  assert.throws(() => ctx.giaiToken(valid), /ngừng hoạt động/);
});
console.log(dem + ' nhóm kiểm thử mã thực tế đạt.');
