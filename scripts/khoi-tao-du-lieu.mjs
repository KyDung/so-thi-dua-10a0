// Khởi tạo hàng loạt trên Firebase thật: GVCN + cán bộ lớp + học sinh + tài khoản phụ huynh.
//   npm i --no-save firebase
//   node scripts/khoi-tao-du-lieu.mjs
// Đọc danh sách tên ở du-lieu-goc/danh-sach-hoc-sinh.txt (mỗi dòng một tên) và ghi tài khoản ra
// du-lieu-goc/tai-khoan.csv (+ tai-khoan.json để chạy lại tiếp được). Cả thư mục du-lieu-goc/ đã nằm trong .gitignore.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import * as L from '../docs/assets/js/logic.js';
import { DS_LOI, DS_CONG, CAU_HINH_MAC_DINH } from '../docs/assets/js/seed.js';
import { FIREBASE_CONFIG } from '../docs/assets/js/config.js';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'du-lieu-goc');
const FILE_DS = path.join(goc, 'danh-sach-hoc-sinh.txt');
const FILE_JSON = path.join(goc, 'tai-khoan.json');
const FILE_CSV = path.join(goc, 'tai-khoan.csv');

const ten = fs.readFileSync(FILE_DS, 'utf8').split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
const cfg = Object.assign({}, CAU_HINH_MAC_DINH);
const nghi = ms => new Promise(r => setTimeout(r, ms));

// Mật khẩu ngẫu nhiên, bỏ ký tự dễ nhầm (0/O, 1/l/I)
const matKhauNgauNhien = () => Array.from(crypto.randomBytes(10), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

const trangThai = fs.existsSync(FILE_JSON) ? JSON.parse(fs.readFileSync(FILE_JSON, 'utf8')) : { canBo: null, phuHuynh: [] };
const luuTrangThai = () => fs.writeFileSync(FILE_JSON, JSON.stringify(trangThai, null, 1));

const app = initializeApp(FIREBASE_CONFIG, 'goc');
const auth = getAuth(app), db = getFirestore(app);
const authPhu = getAuth(initializeApp(FIREBASE_CONFIG, 'phu'));

async function taoAuth(a, email, mk) {
  for (let lan = 0; ; lan++) {
    try { return (await createUserWithEmailAndPassword(a, email, mk)).user; }
    catch (e) {
      if (e.code === 'auth/too-many-requests' && lan < 6) { console.log('  Firebase tạm chặn, chờ 40 giây…'); await nghi(40000); continue; }
      throw e;
    }
  }
}

// ---------- 1. GVCN + cán bộ lớp + khởi tạo hệ thống ----------
const CAN_BO = [
  { tenDangNhap: 'gvcn', hoTen: 'Giáo viên chủ nhiệm', vaiTro: 'GVCN' },
  { tenDangNhap: 'loptruong', hoTen: 'Lớp trưởng', vaiTro: 'LOP_TRUONG' },
  { tenDangNhap: 'lopho', hoTen: 'Lớp phó', vaiTro: 'LOP_TRUONG' },
  { tenDangNhap: 'thuky', hoTen: 'Thư ký', vaiTro: 'LOP_TRUONG' }
];

const daKhoiTao = (await getDoc(doc(db, 'heThong', 'khoiTao'))).exists();
if (!trangThai.canBo) {
  if (daKhoiTao) {
    console.error('Firebase đã được khởi tạo từ trước nhưng không có file du-lieu-goc/tai-khoan.json. Không thể tiếp tục an toàn.');
    process.exit(1);
  }
  trangThai.canBo = CAN_BO.map(c => Object.assign({ matKhau: matKhauNgauNhien() }, c));
  luuTrangThai();   // lưu mật khẩu TRƯỚC khi tạo, lỡ đứt giữa chừng vẫn còn
}
const gv = trangThai.canBo.find(c => c.vaiTro === 'GVCN');
const emailGV = L.emailTuTenDangNhap(gv.tenDangNhap);

if (!daKhoiTao) {
  console.log('Khởi tạo hệ thống + tài khoản GVCN…');
  let user;
  try { user = await taoAuth(auth, emailGV, gv.matKhau); }
  catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw e;
    user = (await signInWithEmailAndPassword(auth, emailGV, gv.matKhau)).user;
  }
  const lo = writeBatch(db);
  DS_LOI.forEach((r, i) => lo.set(doc(db, 'danhMucLoi', r.ma), Object.assign({ thuTu: i }, r)));
  DS_CONG.forEach((r, i) => lo.set(doc(db, 'danhMucCong', r.ma), Object.assign({ thuTu: i }, r)));
  lo.set(doc(db, 'cauHinh', 'main'), cfg);
  lo.set(doc(db, 'dangNhap', gv.tenDangNhap), { email: emailGV });
  lo.set(doc(db, 'taiKhoan', user.uid), {
    tenDangNhap: gv.tenDangNhap, hoTen: gv.hoTen, vaiTro: 'GVCN', maHS: '', toPhuTrach: '',
    lanDau: false, trangThai: 'HOAT_DONG', email: emailGV, phienBanEmail: 0
  });
  lo.set(doc(db, 'heThong', 'khoiTao'), { thoiGian: serverTimestamp(), boi: gv.tenDangNhap });
  await lo.commit();
} else {
  await signInWithEmailAndPassword(auth, emailGV, gv.matKhau);
}
console.log('Đã đăng nhập GVCN.');

async function taoTaiKhoan(t) {
  if ((await getDoc(doc(db, 'dangNhap', t.tenDangNhap))).exists()) return false;
  const email = L.emailTuTenDangNhap(t.tenDangNhap);
  const u = await taoAuth(authPhu, email, t.matKhau);
  await signOut(authPhu);
  const lo = writeBatch(db);
  lo.set(doc(db, 'dangNhap', t.tenDangNhap), { email });
  lo.set(doc(db, 'taiKhoan', u.uid), {
    tenDangNhap: t.tenDangNhap, hoTen: t.hoTen, vaiTro: t.vaiTro, maHS: t.maHS || '', toPhuTrach: '',
    lanDau: !!t.lanDau, trangThai: 'HOAT_DONG', email, phienBanEmail: 0
  });
  await lo.commit();
  return true;
}

for (const c of trangThai.canBo.filter(c => c.vaiTro !== 'GVCN')) {
  if (await taoTaiKhoan({ ...c, lanDau: false })) console.log('  + ' + c.tenDangNhap);
}

// ---------- 2. Học sinh ----------
const lop = String(cfg.Lop).split('-')[0];
const maHSTheoThuTu = i => lop + '_' + String(i + 1).padStart(2, '0');
if (!(await getDoc(doc(db, 'hocSinh', maHSTheoThuTu(0)))).exists()) {
  console.log('Thêm ' + ten.length + ' học sinh…');
  const lo = writeBatch(db);
  ten.forEach((t, i) => lo.set(doc(db, 'hocSinh', maHSTheoThuTu(i)), { hoTen: t, to: '', chucVu: '', trangThai: 'DANG_HOC', ghiChu: '' }));
  await lo.commit();
}

// ---------- 3. Tài khoản phụ huynh ----------
if (!trangThai.phuHuynh.length) {
  const dung = {};
  trangThai.phuHuynh = ten.map((t, i) => {
    const goc0 = L.khongDau(t);
    let u = goc0 + cfg.HauToTenDangNhap, n = 1;
    while (dung[u]) { n++; u = goc0 + n + cfg.HauToTenDangNhap; }
    dung[u] = true;
    return { tenDangNhap: u, hoTen: 'PH ' + t, hocSinh: t, maHS: maHSTheoThuTu(i), vaiTro: 'PHU_HUYNH', matKhau: goc0 + cfg.MatKhauMacDinhHau, lanDau: true };
  });
  luuTrangThai();
}
let soTao = 0;
for (const p of trangThai.phuHuynh) {
  if (await taoTaiKhoan(p)) { soTao++; console.log('  + ' + p.tenDangNhap + ' (' + soTao + ')'); await nghi(250); }
}

// ---------- 4. Ghi file tài khoản ----------
const dong = [['Vai trò', 'Họ tên / học sinh', 'Tên đăng nhập', 'Mật khẩu ban đầu', 'Ghi chú']];
trangThai.canBo.forEach(c => dong.push([c.vaiTro === 'GVCN' ? 'GVCN' : 'Cán bộ lớp', c.hoTen, c.tenDangNhap, c.matKhau, 'Nên đổi mật khẩu sau khi đăng nhập']));
trangThai.phuHuynh.forEach(p => dong.push(['Phụ huynh', p.hocSinh, p.tenDangNhap, p.matKhau, 'Web bắt đổi mật khẩu ở lần đăng nhập đầu']));
fs.writeFileSync(FILE_CSV, '﻿' + dong.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n');
console.log('\nXong. ' + trangThai.phuHuynh.length + ' phụ huynh + ' + trangThai.canBo.length + ' tài khoản quản lý.');
console.log('File tài khoản: ' + FILE_CSV);
process.exit(0);
