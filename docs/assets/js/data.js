/**
 * data.js — Lớp dữ liệu: đăng nhập, đọc/ghi Firestore, tính lại số liệu.
 * Thay cho Apps Script (Code.gs / XepLoai.gs / Helper.gs). Ai được làm gì do
 * firestore.rules quyết định; các kiểm tra ở đây chỉ để báo lỗi dễ hiểu cho người dùng.
 *
 * Collection:
 *   cauHinh/main            cấu hình lớp (đọc công khai để trang đăng nhập có tiêu đề)
 *   danhMucLoi, danhMucCong danh mục lỗi / điểm cộng
 *   hocSinh                 danh sách lớp
 *   tuan                    các trang tuần
 *   nhatKy                  mỗi lượt vi phạm / điểm cộng là một dòng (xoá mềm)
 *   xepLoaiThang            {maHS}_{thang}: số liệu máy tính + xếp loại người nhập chọn + chốt
 *   taiKhoan/{uid}          hồ sơ + vai trò của người dùng Firebase Auth
 *   dangNhap/{tenDangNhap}  tên đăng nhập → email Auth (để đăng nhập bằng tên thay vì email)
 *   nhatKyHeThong           ai làm gì, khi nào
 *   heThong/khoiTao         có mặt = đã khởi tạo xong, khoá trang cài đặt lần đầu
 */
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where,
  writeBatch, serverTimestamp, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { auth, db, authPhu } from './firebase.js';
import { MAC_DINH } from './config.js';
import { DS_LOI, DS_CONG, CAU_HINH_MAC_DINH } from './seed.js';
import * as L from './logic.js';

export const VAI_TRO = {
  GVCN: 'Giáo viên chủ nhiệm', LOP_TRUONG: 'Lớp trưởng',
  TO_TRUONG: 'Tổ trưởng', PHU_HUYNH: 'Phụ huynh'
};

// ------------------------------------------------------------ Bộ nhớ tạm trong phiên
// Bắt buộc xoá mỗi khi ĐỔI TÀI KHOẢN, nếu không đăng nhập phụ huynh (danh sách 1 người)
// rồi vào lại bằng GVCN sẽ vẫn thấy đúng 1 học sinh.
const nho = { cfg: null, dm: null, tuan: null, hs: null };
export function xoaNhoTam() { nho.cfg = null; nho.dm = null; nho.tuan = null; nho.hs = null; }

let hoSo = null;           // hồ sơ người đang đăng nhập (taiKhoan/{uid})
export const nguoiDung = function () { return hoSo; };
export const vaiTro = function () { return hoSo ? hoSo.vaiTro : null; };
export const laNhanVien = function () {
  return !!hoSo && ['GVCN', 'LOP_TRUONG', 'TO_TRUONG'].indexOf(hoSo.vaiTro) >= 0;
};

function loiDe(e) {
  const ma = e && e.code || '';
  const bang = {
    'permission-denied': 'Không đủ quyền thực hiện thao tác này.',
    'unavailable': 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    'auth/network-request-failed': 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
    'auth/too-many-requests': 'Thử quá nhiều lần. Chờ vài phút rồi thử lại.',
    'auth/operation-not-allowed': 'Chưa bật đăng nhập Email/Mật khẩu trong Firebase (Authentication → Sign-in method).',
    'auth/weak-password': 'Mật khẩu quá yếu (cần từ 6 ký tự).',
    'auth/email-already-in-use': 'Tên đăng nhập này đã được dùng.'
  };
  return bang[ma] ? new Error(bang[ma]) : e;
}

async function boc(p) {
  try { return await p; } catch (e) { throw loiDe(e); }
}

// ------------------------------------------------------------ Khởi động / đăng nhập

export async function daKhoiTao() {
  return (await boc(getDoc(doc(db, 'heThong', 'khoiTao')))).exists();
}

/** Cấu hình lớp. Đọc công khai được nên dùng cả cho trang đăng nhập. */
export async function layCauHinh(lamMoi) {
  if (nho.cfg && !lamMoi) return nho.cfg;
  const s = await boc(getDoc(doc(db, 'cauHinh', 'main')));
  nho.cfg = Object.assign({}, CAU_HINH_MAC_DINH, s.exists() ? s.data() : {
    Truong: MAC_DINH.TEN_TRUONG, Lop: MAC_DINH.TEN_LOP, NamHoc: MAC_DINH.NAM_HOC
  });
  return nho.cfg;
}

async function napHoSo(user) {
  if (!user) { hoSo = null; return null; }
  const s = await boc(getDoc(doc(db, 'taiKhoan', user.uid)));
  const d = s.exists() ? s.data() : null;
  if (!d || d.trangThai !== 'HOAT_DONG') {
    await signOut(auth);
    hoSo = null;
    return null;
  }
  hoSo = Object.assign({ uid: user.uid }, d);
  return hoSo;
}

/** Gọi khi trạng thái đăng nhập thay đổi (kể cả lúc tải lại trang). */
export function theoDoiDangNhap(cb) {
  return onAuthStateChanged(auth, async function (user) {
    xoaNhoTam();
    try { cb(await napHoSo(user)); } catch (e) { cb(null, e); }
  });
}

export async function dangNhap(ten, mk) {
  let t;
  try { t = L.chuanTenDangNhap(ten); } catch (e) { throw new Error('Sai tên đăng nhập hoặc mật khẩu'); }
  const anh = await boc(getDoc(doc(db, 'dangNhap', t)));
  if (!anh.exists()) throw new Error('Sai tên đăng nhập hoặc mật khẩu');
  try {
    await signInWithEmailAndPassword(auth, anh.data().email, mk);
  } catch (e) {
    if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found',
      'auth/invalid-email'].indexOf(e.code) >= 0) {
      throw new Error('Sai tên đăng nhập hoặc mật khẩu');
    }
    throw loiDe(e);
  }
  const h = await napHoSo(auth.currentUser);
  if (!h) throw new Error('Tài khoản đã ngừng hoạt động hoặc chưa được cấp quyền. Nhờ cô chủ nhiệm kiểm tra.');
  xoaNhoTam();
  ghiLog('DANG_NHAP', h.vaiTro);
  return h;
}

export async function dangXuat() {
  await signOut(auth);
  hoSo = null; xoaNhoTam();
}

export async function doiMatKhau(mkCu, mkMoi) {
  if (!mkMoi || String(mkMoi).length < 6) throw new Error('Mật khẩu mới phải từ 6 ký tự trở lên');
  if (mkMoi === mkCu) throw new Error('Mật khẩu mới phải khác mật khẩu cũ');
  const u = auth.currentUser;
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, mkCu));
  } catch (e) {
    if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
      throw new Error('Mật khẩu cũ không đúng');
    }
    throw loiDe(e);
  }
  await boc(updatePassword(u, mkMoi));
  if (hoSo.lanDau) {
    await boc(updateDoc(doc(db, 'taiKhoan', u.uid), { lanDau: false }));
    hoSo.lanDau = false;
  }
  ghiLog('DOI_MAT_KHAU', '');
}

// ------------------------------------------------------------ Nhật ký hệ thống

export function ghiLog(hanhDong, chiTiet) {
  if (!hoSo) return;
  addDoc(collection(db, 'nhatKyHeThong'), {
    thoiGian: serverTimestamp(), nguoiDung: hoSo.tenDangNhap, hanhDong: hanhDong, chiTiet: chiTiet || ''
  }).catch(function () { /* log hỏng thì bỏ qua, không làm hỏng thao tác chính */ });
}

export async function xemNhatKyHeThong(n) {
  const s = await boc(getDocs(query(collection(db, 'nhatKyHeThong'), orderBy('thoiGian', 'desc'), limit(n || 100))));
  return s.docs.map(function (d) {
    const x = d.data();
    return { thoiGian: x.thoiGian ? x.thoiGian.toDate() : null, nguoiDung: x.nguoiDung, hanhDong: x.hanhDong, chiTiet: x.chiTiet };
  });
}

// ------------------------------------------------------------ Danh mục, lớp, tuần

export async function layDanhMuc(lamMoi) {
  if (nho.dm && !lamMoi) return nho.dm;
  const [a, b] = await Promise.all([
    boc(getDocs(collection(db, 'danhMucLoi'))), boc(getDocs(collection(db, 'danhMucCong')))
  ]);
  const xep = function (s) {
    return s.docs.map(function (d) { return d.data(); })
      .sort(function (x, y) { return (x.thuTu || 0) - (y.thuTu || 0); });
  };
  const loi = xep(a), cong = xep(b);
  const theoMa = function (ds) { const o = {}; ds.forEach(function (r) { o[r.ma] = r; }); return o; };
  nho.dm = { loi: loi, cong: cong, loiTheoMa: theoMa(loi), congTheoMa: theoMa(cong) };
  return nho.dm;
}

/** Danh mục để dựng ô chọn: chỉ các mục đang hiển thị. */
export async function danhMucHienThi() {
  const dm = await layDanhMuc();
  const hien = function (r) { return r.hienThi !== false; };
  return {
    loi: dm.loi.filter(hien).map(function (r) { return Object.assign({ tuNhap: r.ma === 'KHAC' }, r); }),
    cong: dm.cong.filter(hien).map(function (r) { return Object.assign({ tuNhap: r.ma === 'CONG_KHAC' }, r); })
  };
}

export async function layTuan(lamMoi) {
  if (nho.tuan && !lamMoi) return nho.tuan;
  const s = await boc(getDocs(collection(db, 'tuan')));
  nho.tuan = s.docs.map(function (d) {
    const t = Object.assign({ maTuan: d.id }, d.data());
    t.thang = L.thangTheoDoiTuan(t);
    return t;
  }).sort(function (a, b) { return a.tuNgay < b.tuNgay ? 1 : -1; });    // mới nhất trước
  return nho.tuan;
}

export async function layHocSinh(lamMoi) {
  if (nho.hs && !lamMoi) return nho.hs;
  let ds;
  if (hoSo.vaiTro === 'PHU_HUYNH') {
    if (!hoSo.maHS) throw new Error('Tài khoản chưa gắn với học sinh nào. Nhờ cô chủ nhiệm kiểm tra lại.');
    const s = await boc(getDoc(doc(db, 'hocSinh', hoSo.maHS)));
    ds = s.exists() ? [Object.assign({ maHS: s.id }, s.data())] : [];
  } else {
    const s = await boc(getDocs(collection(db, 'hocSinh')));
    ds = s.docs.map(function (d) { return Object.assign({ maHS: d.id }, d.data()); });
  }
  nho.hs = ds.sort(function (a, b) { return a.maHS < b.maHS ? -1 : 1; });
  return nho.hs;
}

/** Học sinh đang học mà người dùng này được ghi (tổ trưởng chỉ thấy tổ mình). */
export async function hocSinhDuocGhi() {
  const ds = (await layHocSinh()).filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  if (hoSo.vaiTro !== 'TO_TRUONG') return ds;
  if (!hoSo.toPhuTrach) {
    throw new Error('Tài khoản chưa được phân tổ. Nhờ GVCN điền tổ phụ trách trong Quản trị → Tài khoản.');
  }
  const kq = ds.filter(function (r) { return r.to === hoSo.toPhuTrach; });
  if (!kq.length) {
    throw new Error('Chưa có học sinh nào thuộc "' + hoSo.toPhuTrach + '". Nhờ cô chủ nhiệm điền tổ cho học sinh ' +
      '(Quản trị → Học sinh), hoặc xoá tổ phụ trách của tài khoản này nếu lớp không chia tổ.');
  }
  return kq;
}

export async function lopTomTat() {
  const cfg = await layCauHinh();
  return { truong: cfg.Truong, lop: cfg.Lop, namHoc: cfg.NamHoc };
}

// ------------------------------------------------------------ Trang tuần

function chiTuan(t) {
  return { soTuan: t.soTuan, tuNgay: t.tuNgay, denNgay: t.denNgay, thang: 0, hocKy: '', ghiChu: t.ghiChu };
}

export async function taoTuan(t) {
  const ds = await layTuan(true);
  const hopLe = L.kiemTraTuan(t, ds);
  const cfg = await layCauHinh();
  const thang = L.thangTheoDoiTuan(hopLe);
  const maTuan = 'T' + hopLe.tuNgay;
  await boc(setDoc(doc(db, 'tuan', maTuan), Object.assign(chiTuan(hopLe), {
    thang: thang, hocKy: L.hocKyTheoThang(thang, cfg),
    nguoiTao: hoSo.tenDangNhap, thoiGianTao: serverTimestamp()
  })));
  nho.tuan = null;
  ghiLog('TAO_TUAN', 'Tuần ' + hopLe.soTuan + ' (' + hopLe.tuNgay + ' -> ' + hopLe.denNgay + ')');
  return { maTuan: maTuan, thang: thang };
}

/** Sửa trang tuần. Đổi khoảng ngày có thể đổi tháng của các mục đã ghi nên phải tính lại. */
export async function suaTuan(maTuan, t) {
  const ds = await layTuan(true);
  if (!ds.some(function (r) { return r.maTuan === maTuan; })) throw new Error('Không tìm thấy trang tuần này');
  const hopLe = L.kiemTraTuan(t, ds, maTuan);
  const cfg = await layCauHinh();
  const thang = L.thangTheoDoiTuan(hopLe);

  const muc = await boc(getDocs(query(collection(db, 'nhatKy'), where('maTuan', '==', maTuan))));
  const dongChot = await thangDaChot(muc.docs.map(function (d) { return d.data(); }));
  if (dongChot.length) throw new Error('Tháng ' + dongChot[0] + ' đã chốt, không sửa được trang tuần này');

  await boc(updateDoc(doc(db, 'tuan', maTuan), {
    soTuan: hopLe.soTuan, tuNgay: hopLe.tuNgay, denNgay: hopLe.denNgay,
    thang: thang, hocKy: L.hocKyTheoThang(thang, cfg), ghiChu: hopLe.ghiChu
  }));
  nho.tuan = null;
  // Mỗi mục cập nhật làm rules phải đọc 1 tài liệu xếp loại tháng (kiểm tra đã chốt chưa), mà một lô ghi
  // chỉ được đọc tối đa ~20 tài liệu -> chia lô theo học sinh, mỗi lô vài bạn.
  const theoHS = {};
  muc.docs.forEach(function (d) { (theoHS[d.data().maHS] = theoHS[d.data().maHS] || []).push(d); });
  const dsMa = Object.keys(theoHS);
  for (let i = 0; i < dsMa.length; i += 6) {
    const lo = writeBatch(db);
    dsMa.slice(i, i + 6).forEach(function (ma) {
      theoHS[ma].forEach(function (d) { lo.update(d.ref, { thang: thang, hocKy: L.hocKyTheoThang(thang, cfg) }); });
    });
    await boc(lo.commit());
  }
  ghiLog('SUA_TUAN', maTuan + ' -> Tuần ' + hopLe.soTuan);
  const cacHS = {};
  muc.docs.forEach(function (d) { cacHS[d.data().maHS] = true; });
  await tinhLaiNhieu(Object.keys(cacHS));
}

/** Chỉ xoá được khi trang tuần chưa có mục nào còn hiệu lực. */
export async function xoaTuan(maTuan) {
  const muc = await boc(getDocs(query(collection(db, 'nhatKy'), where('maTuan', '==', maTuan))));
  if (muc.docs.some(function (d) { return d.data().trangThai === 'HOAT_DONG'; })) {
    throw new Error('Trang tuần này đã có dữ liệu. Xoá hết các mục đã ghi trước, sau đó mới xoá được trang.');
  }
  await boc(deleteDoc(doc(db, 'tuan', maTuan)));
  nho.tuan = null;
  ghiLog('XOA_TUAN', maTuan);
}

// ------------------------------------------------------------ Nhật ký từng học sinh

function chuanMuc(id, x) {
  return Object.assign({ id: id }, x, {
    thoiGian: x.thoiGian && x.thoiGian.toMillis ? x.thoiGian.toMillis() : (x.thoiGian || 0)
  });
}

async function nhatKyCuaHS(maHS, maTuan) {
  const dk = [where('maHS', '==', maHS)];
  if (maTuan) dk.push(where('maTuan', '==', maTuan));
  const s = await boc(getDocs(query(collection(db, 'nhatKy'), ...dk)));
  return s.docs.map(function (d) { return chuanMuc(d.id, d.data()); })
    .filter(function (r) { return r.trangThai === 'HOAT_DONG'; });
}

async function docThang(maHS, thang) {
  const s = await boc(getDoc(doc(db, 'xepLoaiThang', maHS + '_' + thang)));
  return s.exists() ? s.data() : null;
}

/** Trả về các tháng đã chốt trong số các dòng nhật ký đưa vào. */
async function thangDaChot(dongs) {
  const khoa = {};
  dongs.forEach(function (r) { khoa[r.maHS + '_' + r.thang] = true; });
  const kq = [];
  for (const k of Object.keys(khoa)) {
    const s = await boc(getDoc(doc(db, 'xepLoaiThang', k)));
    if (s.exists() && s.data().daChot) kq.push(s.data().thang);
  }
  return kq;
}

function dungDM(dm) {
  const loi = {}, cong = {};
  dm.loi.forEach(function (r) { loi[r.ma] = r; });
  dm.cong.forEach(function (r) { cong[r.ma] = r; });
  return { loi: loi, cong: cong };
}

/** Nhật ký theo NGÀY của một học sinh trong một tuần + tổng điểm tuần đó. */
export async function nhatKyHS(maHS, maTuan) {
  const hs = (await layHocSinh()).filter(function (r) { return r.maHS === maHS; })[0];
  if (!hs) throw new Error('Không tìm thấy học sinh');
  if (hoSo.vaiTro === 'TO_TRUONG' && hoSo.toPhuTrach && hs.to !== hoSo.toPhuTrach) {
    throw new Error('Bạn chỉ xem được học sinh trong ' + hoSo.toPhuTrach);
  }
  const dsTuan = await layTuan();
  const tuan = dsTuan.filter(function (r) { return r.maTuan === maTuan; })[0];
  if (!tuan) throw new Error('Không tìm thấy trang tuần này');

  const [dm, cfg, tatCa] = [await layDanhMuc(), await layCauHinh(), await nhatKyCuaHS(maHS)];
  const m = dungDM(dm);
  const dong = tatCa.filter(function (r) { return r.maTuan === maTuan; }).map(function (r) {
    const d = r.loai === 'CONG' ? m.cong[r.ma] : m.loi[r.ma];
    return {
      id: r.id, ngay: r.ngay, loai: r.loai, ma: r.ma, ten: L.tenMuc(r, d),
      nhomCha: d ? d.nhomCha : '', nhom: d && d.nhom || '', mon: r.mon || '',
      diem: L.soHoac(r.diem, 0), ghiChu: L.laMucTuGo(r) ? '' : (r.moTa || ''), nguoiNhap: r.nguoiNhap,
      thoiGian: r.thoiGian
    };
  }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : (a.ngay > b.ngay ? 1 : a.thoiGian - b.thoiGian); });

  const tinh = L.tinhHocSinh(tatCa, dsTuan, cfg, m.loi, m.cong);
  const tong = tinh.tuan.filter(function (r) { return r.maTuan === maTuan; })[0];
  const batDau = L.soHoac(cfg.DiemXuatPhatTuan, 100);
  return {
    hocSinh: hs, tuan: tuan, dong: dong,
    tong: tong ? {
      batDau: tong.batDau, cong: tong.cong, tru: tong.tru, cuoi: tong.cuoi, soLoi: tong.soLoi,
      xepLoai: tong.xepLoai, nhan: L.NHAN[tong.xepLoai] || ''
    } : { batDau: batDau, cong: 0, tru: 0, cuoi: batDau, soLoi: 0, xepLoai: '', nhan: '' }
  };
}

export async function themNhatKy(muc) {
  const dsHS = await layHocSinh();
  const h = dsHS.filter(function (r) { return r.maHS === muc.maHS; })[0];
  if (!h || h.trangThai !== 'DANG_HOC') throw new Error('Không có học sinh đang học ' + muc.maHS);
  if (hoSo.vaiTro === 'TO_TRUONG' && hoSo.toPhuTrach && h.to !== hoSo.toPhuTrach) {
    throw new Error('Bạn chỉ được ghi cho học sinh trong ' + hoSo.toPhuTrach);
  }
  const [dm, cfg, dsTuan] = [await layDanhMuc(), await layCauHinh(), await layTuan()];
  const bangDM = muc.loai === 'CONG' ? dm.congTheoMa : dm.loiTheoMa;
  const dong = L.dungNhatKy(muc, bangDM[muc.ma], dsTuan, cfg);

  const t = await docThang(muc.maHS, dong.thang);
  if (t && t.daChot) throw new Error('Tháng ' + dong.thang + ' đã chốt, không ghi thêm được');

  await boc(addDoc(collection(db, 'nhatKy'), Object.assign(dong, {
    nguoiNhap: hoSo.tenDangNhap, thoiGian: serverTimestamp(), trangThai: 'HOAT_DONG'
  })));
  ghiLog('THEM_NHAT_KY', muc.maHS + ' ' + dong.ngay + ' ' + muc.ma + ' (' + dong.diem + ')');
  await tinhLaiNhieu([muc.maHS]);
  return { diem: dong.diem, maTuan: dong.maTuan, thang: dong.thang };
}

/** Không xoá cứng — chỉ đổi trạng thái, giữ vết để truy được. */
export async function xoaNhatKy(id) {
  const ref = doc(db, 'nhatKy', id);
  const s = await boc(getDoc(ref));
  if (!s.exists()) throw new Error('Không tìm thấy bản ghi');
  const r = s.data();
  if (r.trangThai !== 'HOAT_DONG') throw new Error('Mục này đã được xoá rồi');
  const h = (await layHocSinh()).filter(function (x) { return x.maHS === r.maHS; })[0];
  if (hoSo.vaiTro === 'TO_TRUONG' && (!h || h.to !== hoSo.toPhuTrach)) {
    throw new Error('Bạn chỉ được ghi cho học sinh trong ' + hoSo.toPhuTrach);
  }
  const t = await docThang(r.maHS, r.thang);
  if (t && t.daChot) throw new Error('Tháng ' + r.thang + ' đã chốt, không sửa được');
  if (hoSo.vaiTro !== 'GVCN') {
    const cfg = await layCauHinh();
    const soNgay = Number(cfg.SoNgayDuocSua) || 7;
    const tg = r.thoiGian && r.thoiGian.toMillis ? r.thoiGian.toMillis() : 0;
    if (Date.now() - tg > soNgay * 86400000) throw new Error('Quá ' + soNgay + ' ngày, chỉ GVCN mới xoá được');
  }
  await boc(updateDoc(ref, { trangThai: 'DA_XOA' }));
  ghiLog('XOA_NHAT_KY', id + ' (người nhập: ' + r.nguoiNhap + ')');
  await tinhLaiNhieu([r.maHS]);
}

// ------------------------------------------------------------ Chi tiết một học sinh

export async function chiTietHS(maHS) {
  if (hoSo.vaiTro === 'PHU_HUYNH') {
    if (!hoSo.maHS) throw new Error('Tài khoản chưa gắn với học sinh nào. Nhờ cô chủ nhiệm kiểm tra lại.');
    maHS = hoSo.maHS;
  }
  const hs = (await layHocSinh()).filter(function (r) { return r.maHS === maHS; })[0];
  if (!hs) throw new Error('Không tìm thấy học sinh');

  const [dsTuan, dm, cfg] = [await layTuan(), await layDanhMuc(), await layCauHinh()];
  const m = dungDM(dm);
  const tuanTheoMa = {};
  dsTuan.forEach(function (t) { tuanTheoMa[t.maTuan] = t; });
  const [nk, thangSnap] = await Promise.all([
    nhatKyCuaHS(maHS),
    boc(getDocs(query(collection(db, 'xepLoaiThang'), where('maHS', '==', maHS))))
  ]);

  const chiTiet = nk.map(function (r) {
    const d = r.loai === 'CONG' ? m.cong[r.ma] : m.loi[r.ma];
    const t = tuanTheoMa[r.maTuan];
    return {
      ngay: r.ngay, thang: t ? t.thang : r.thang, maTuan: r.maTuan, loai: r.loai,
      soTuan: t ? t.soTuan : '', tuNgay: t ? t.tuNgay : '', denNgay: t ? t.denNgay : '',
      ten: L.tenMuc(r, d), cot: d ? d.nhomCha : '', nhom: d && d.nhom || '',
      mon: r.mon || '', ghiChu: L.laMucTuGo(r) ? '' : (r.moTa || ''), diem: Number(r.diem) || 0
    };
  }).sort(function (a, b) { return a.ngay < b.ngay ? 1 : -1; });

  const tinh = L.tinhHocSinh(nk, dsTuan, cfg, m.loi, m.cong);
  const snap = {};
  thangSnap.docs.forEach(function (d) { snap[d.data().thang] = d.data(); });

  // Số liệu tháng: đã chốt thì lấy bản chốt, chưa chốt thì tính trực tiếp để luôn mới nhất
  const thang = Object.keys(tinh.thang).map(function (k) {
    const live = tinh.thang[k], s = snap[k];
    const dung = s && s.daChot ? s : live;
    const xl = L.xepLoaiHieuLuc({ xepLoai: s && s.xepLoai, deXuat: live.deXuat }, cfg);
    return {
      thang: live.thang, hocKy: live.hocKy, xepLoai: xl, nhan: L.NHAN[xl] || '',
      diemThiDua: dung.diemThiDua, soLanGhiSo: dung.soLanGhiSo, soLanHaBac: dung.soLanHaBac,
      daChot: !!(s && s.daChot), ghiChu: s && s.ghiChu || ''
    };
  }).sort(function (a, b) { return L.THANG_HOC.indexOf(a.thang) - L.THANG_HOC.indexOf(b.thang); });

  const thangXL = {};
  thang.forEach(function (t) { thangXL[t.thang] = { xepLoai: t.xepLoai }; });
  const kyTinh = L.xepLoaiKyHS(thangXL, cfg, null);
  const ky = ['HK1', 'HK2', 'CA_NAM'].filter(function (k) { return kyTinh[k].xepLoai; }).map(function (k) {
    return { ky: k, xepLoai: kyTinh[k].xepLoai, nhan: L.NHAN[kyTinh[k].xepLoai], daDuyet: false };
  });

  return {
    hocSinh: hs,
    chiTiet: chiTiet,
    tuan: dsTuan.map(function (t) { return { maTuan: t.maTuan, soTuan: t.soTuan, thang: t.thang, tuNgay: t.tuNgay, denNgay: t.denNgay }; }),
    diemTuan: tinh.tuan, thang: thang, ky: ky
  };
}

// ------------------------------------------------------------ Bảng lớp

export async function bangLop(thang) {
  const cfg = await layCauHinh();
  const hs = (await layHocSinh()).filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  const s = await boc(getDocs(query(collection(db, 'xepLoaiThang'), where('thang', '==', Number(thang)))));
  const bang = {};
  s.docs.forEach(function (d) { bang[d.data().maHS] = d.data(); });
  return hs.map(function (h) {
    const r = bang[h.maHS];
    const xl = r ? L.xepLoaiHieuLuc(r, cfg) : '';
    return {
      maHS: h.maHS, hoTen: h.hoTen, to: h.to || '', chucVu: h.chucVu || '',
      coSoLieu: !!r && r.diemThiDua != null,
      xepLoai: xl, nhan: L.NHAN[xl] || '', thuCong: !!(r && r.xepLoai),
      deXuat: r && r.deXuat || '', nhanDeXuat: L.NHAN[r && r.deXuat] || '',
      diemThiDua: r ? r.diemThiDua : null, soLanGhiSo: r ? r.soLanGhiSo || 0 : 0,
      soLanHaBac: r ? r.soLanHaBac || 0 : 0, daChot: !!(r && r.daChot)
    };
  });
}

/** Điểm từng học sinh trong MỘT tuần (để xếp hạng theo tuần). Chỉ cán bộ lớp / GVCN. */
export async function bangTuan(maTuan) {
  const [dsTuan, dm, cfg] = [await layTuan(), await layDanhMuc(), await layCauHinh()];
  const tuan = dsTuan.filter(function (t) { return t.maTuan === maTuan; })[0];
  if (!tuan) throw new Error('Không tìm thấy trang tuần này');
  const m = dungDM(dm);
  const hs = (await layHocSinh()).filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  const s = await boc(getDocs(query(collection(db, 'nhatKy'), where('maTuan', '==', maTuan))));
  const theoHS = {};
  s.docs.forEach(function (d) {
    const r = chuanMuc(d.id, d.data());
    if (r.trangThai === 'HOAT_DONG') (theoHS[r.maHS] = theoHS[r.maHS] || []).push(r);
  });
  return {
    tuan: tuan,
    ds: hs.map(function (h) {
      const nk = theoHS[h.maHS] || [];
      const t = L.tinhHocSinh(nk, [tuan], cfg, m.loi, m.cong).tuan[0];
      return {
        maHS: h.maHS, hoTen: h.hoTen, to: h.to || '', coMuc: nk.length > 0,
        diem: t.cuoi, cong: t.cong, tru: t.tru, soLoi: t.soLoi, xepLoai: t.xepLoai
      };
    })
  };
}

/**
 * Tổng quan mọi lượt lỗi / điểm cộng trong một TUẦN (theo trang tuần) hoặc một THÁNG dương lịch
 * (từ ngày 1 đến ngày cuối tháng, 28/29/30/31 tuỳ tháng). Chỉ cán bộ lớp / GVCN.
 * p: { kieu: 'tuan', maTuan } | { kieu: 'thang', thang }
 */
export async function tongQuanLoi(p) {
  const [dm, cfg] = [await layDanhMuc(), await layCauHinh()];
  const m = dungDM(dm);
  let tu, den, q;
  if (p.kieu === 'tuan') {
    const tuan = (await layTuan()).filter(function (t) { return t.maTuan === p.maTuan; })[0];
    if (!tuan) throw new Error('Không tìm thấy trang tuần này');
    tu = tuan.tuNgay; den = tuan.denNgay;
    q = query(collection(db, 'nhatKy'), where('maTuan', '==', p.maTuan));
  } else {
    const k = L.khoangThang(p.thang, cfg.NamHoc);
    tu = k.tu; den = k.den;
    q = query(collection(db, 'nhatKy'), where('ngay', '>=', tu), where('ngay', '<=', den));
  }
  const hs = {};
  (await layHocSinh()).forEach(function (h) { hs[h.maHS] = h; });
  const s = await boc(getDocs(q));
  const muc = s.docs.map(function (d) { return chuanMuc(d.id, d.data()); })
    .filter(function (r) { return r.trangThai === 'HOAT_DONG' && hs[r.maHS] && hs[r.maHS].trangThai === 'DANG_HOC'; })
    .map(function (r) {
      const d = r.loai === 'CONG' ? m.cong[r.ma] : m.loi[r.ma];
      return {
        id: r.id, ngay: r.ngay, maHS: r.maHS, hoTen: hs[r.maHS].hoTen, to: hs[r.maHS].to || '', loai: r.loai, ma: r.ma,
        ten: L.tenMuc(r, d), nhomCha: d ? d.nhomCha : 'Khác', nhom: d && d.nhom || '',
        mon: r.mon || '', ghiChu: L.laMucTuGo(r) ? '' : (r.moTa || ''), diem: Number(r.diem) || 0, nguoiNhap: r.nguoiNhap
      };
    })
    .sort(function (a, b) { return a.ngay < b.ngay ? 1 : (a.ngay > b.ngay ? -1 : 0); });
  return { tu: tu, den: den, muc: muc, siSo: Object.keys(hs).filter(function (k) { return hs[k].trangThai === 'DANG_HOC'; }).length };
}

/** Lưu xếp loại do người nhập chọn. items: [{maHS, thang, xepLoai}] */
export async function luuXepLoai(items) {
  if (!items || !items.length) return 0;
  const cfg = await layCauHinh();
  const lo = writeBatch(db);
  for (const it of items) {
    if (it.xepLoai && L.BAC.indexOf(it.xepLoai) < 0) throw new Error('Xếp loại không hợp lệ: ' + it.xepLoai);
    const ref = doc(db, 'xepLoaiThang', it.maHS + '_' + it.thang);
    const cu = await boc(getDoc(ref));
    if (cu.exists() && cu.data().daChot) throw new Error('Tháng ' + it.thang + ' đã chốt, không sửa được');
    if (cu.exists()) {
      const cap = { nguoiNhap: hoSo.tenDangNhap };
      if (it.xepLoai !== undefined) cap.xepLoai = it.xepLoai || '';
      if (it.ghiChu !== undefined) cap.ghiChu = it.ghiChu;
      lo.update(ref, cap);
    } else {
      lo.set(ref, moiThang(it.maHS, Number(it.thang), cfg, { xepLoai: it.xepLoai || '', ghiChu: it.ghiChu || '', nguoiNhap: hoSo.tenDangNhap }));
    }
  }
  await boc(lo.commit());
  ghiLog('XEP_LOAI', items.length + ' học sinh, tháng ' + items[0].thang);
  return items.length;
}

function moiThang(maHS, thang, cfg, them) {
  return Object.assign({
    maHS: maHS, thang: thang, hocKy: L.hocKyTheoThang(thang, cfg),
    soLoi: 0, soLanGhiSo: 0, soLanHaBac: 0, diemThiDua: L.soHoac(cfg.DiemXuatPhatTuan, 100), deXuat: '',
    xepLoai: '', nguoiNhap: '', daChot: false, nguoiChot: '', ghiChu: ''
  }, them);
}

// ------------------------------------------------------------ Tính lại số liệu

/**
 * Tính lại số liệu tháng của các học sinh và ghi vào xepLoaiThang.
 * Chỉ ghi những tháng có thay đổi, bỏ qua tháng đã chốt. Không động tới xếp loại
 * người nhập đã chọn (cột xepLoai) và các cột chốt.
 */
async function tinhLaiNhieu(dsMaHS, trongBoNho) {
  if (!dsMaHS.length) return 0;
  const [dsTuan, dm, cfg] = [await layTuan(), await layDanhMuc(), await layCauHinh()];
  const m = dungDM(dm);
  let nkTheoHS = trongBoNho && trongBoNho.nk, thangTheoHS = trongBoNho && trongBoNho.thang;

  if (!nkTheoHS) {
    nkTheoHS = {}; thangTheoHS = {};
    for (const ma of dsMaHS) {
      nkTheoHS[ma] = await nhatKyCuaHS(ma);
      const s = await boc(getDocs(query(collection(db, 'xepLoaiThang'), where('maHS', '==', ma))));
      thangTheoHS[ma] = {};
      s.docs.forEach(function (d) { thangTheoHS[ma][d.data().thang] = d.data(); });
    }
  }

  let lo = writeBatch(db), soGhi = 0, tong = 0;
  const dayLo = async function () {
    if (soGhi) { await boc(lo.commit()); lo = writeBatch(db); soGhi = 0; }
  };
  for (const ma of dsMaHS) {
    const tinh = L.tinhHocSinh(nkTheoHS[ma] || [], dsTuan, cfg, m.loi, m.cong);
    const cu = thangTheoHS[ma] || {};
    for (const k of Object.keys(tinh.thang)) {
      const t = tinh.thang[k];
      const c = cu[k];
      if (c && c.daChot) continue;
      const ref = doc(db, 'xepLoaiThang', ma + '_' + k);
      const so = { hocKy: t.hocKy, soLoi: t.soLoi, soLanGhiSo: t.soLanGhiSo, soLanHaBac: t.soLanHaBac,
        diemThiDua: t.diemThiDua, deXuat: t.deXuat };
      if (!c) {
        lo.set(ref, moiThang(ma, t.thang, cfg, so));
      } else if (Object.keys(so).some(function (f) { return c[f] !== so[f]; })) {
        lo.update(ref, so);
      } else continue;
      tong++;
      if (++soGhi >= 400) await dayLo();
    }
    // Tháng cũ không còn tuần nào (vừa dời trang tuần sang tháng khác): xoá số liệu máy tính,
    // giữ nguyên xếp loại người nhập đã chọn. Dùng update (không delete) để tổ trưởng cũng chạy được.
    for (const k of Object.keys(cu)) {
      const c = cu[k];
      if (tinh.thang[k] || c.daChot || (c.diemThiDua === null && !c.deXuat)) continue;
      lo.update(doc(db, 'xepLoaiThang', ma + '_' + k),
        { soLoi: 0, soLanGhiSo: 0, soLanHaBac: 0, diemThiDua: null, deXuat: '' });
      tong++;
      if (++soGhi >= 400) await dayLo();
    }
  }
  await dayLo();
  return tong;
}

/** Tính lại số liệu cho cả lớp. Chỉ GVCN. */
export async function tinhLaiTatCa() {
  const hs = (await layHocSinh()).filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  const sNk = await boc(getDocs(collection(db, 'nhatKy')));
  const nk = {};
  hs.forEach(function (h) { nk[h.maHS] = []; });
  sNk.docs.forEach(function (d) {
    const r = chuanMuc(d.id, d.data());
    if (r.trangThai === 'HOAT_DONG' && nk[r.maHS]) nk[r.maHS].push(r);
  });
  const sT = await boc(getDocs(collection(db, 'xepLoaiThang')));
  const thang = {};
  hs.forEach(function (h) { thang[h.maHS] = {}; });
  sT.docs.forEach(function (d) { const x = d.data(); if (thang[x.maHS]) thang[x.maHS][x.thang] = x; });
  const n = await tinhLaiNhieu(hs.map(function (h) { return h.maHS; }), { nk: nk, thang: thang });
  ghiLog('TINH_LAI', n + ' dòng tháng');
  return n;
}

/** Chốt 1 tháng: khoá không cho cán bộ lớp sửa nữa. Tính lại trước để bản chốt là số mới nhất. */
export async function chotThang(thang, mo) {
  thang = Number(thang);
  if (!mo) {
    const co = (await layTuan(true)).some(function (t) { return t.thang === thang; });
    if (!co) throw new Error('Chưa có trang tuần nào thuộc tháng ' + thang + ', chưa có gì để chốt.');
    await tinhLaiTatCa();
  }
  const hs = (await layHocSinh()).filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  const cfg = await layCauHinh();
  const s = await boc(getDocs(query(collection(db, 'xepLoaiThang'), where('thang', '==', thang))));
  const co = {};
  s.docs.forEach(function (d) { co[d.data().maHS] = true; });

  let lo = writeBatch(db), n = 0, dem = 0;
  const cap = { daChot: !mo, nguoiChot: mo ? '' : hoSo.tenDangNhap, thoiGianChot: mo ? null : serverTimestamp() };
  for (const h of hs) {
    const ref = doc(db, 'xepLoaiThang', h.maHS + '_' + thang);
    if (co[h.maHS]) lo.update(ref, cap); else lo.set(ref, moiThang(h.maHS, thang, cfg, cap));
    dem++;
    if (++n >= 400) { await boc(lo.commit()); lo = writeBatch(db); n = 0; }
  }
  if (n) await boc(lo.commit());
  ghiLog(mo ? 'MO_CHOT_THANG' : 'CHOT_THANG', 'Tháng ' + thang + ', ' + dem + ' HS');
  return dem;
}

// ------------------------------------------------------------ Khởi tạo lần đầu

export async function khoiTaoHeThong(f) {
  const ten = L.chuanTenDangNhap(f.tenDangNhap);
  if (!f.matKhau || f.matKhau.length < 6) throw new Error('Mật khẩu phải từ 6 ký tự trở lên');
  if (await daKhoiTao()) throw new Error('Hệ thống đã được khởi tạo rồi. Hãy đăng nhập.');

  const email = L.emailTuTenDangNhap(ten);
  let user;
  try {
    user = (await createUserWithEmailAndPassword(auth, email, f.matKhau)).user;
  } catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw loiDe(e);
    // Lần trước tạo tài khoản xong nhưng chưa kịp ghi dữ liệu -> đăng nhập lại và làm tiếp
    try { user = (await signInWithEmailAndPassword(auth, email, f.matKhau)).user; }
    catch (e2) { throw new Error('Tên đăng nhập này đã tồn tại với mật khẩu khác. Dùng tên khác.'); }
  }

  const cfg = Object.assign({}, CAU_HINH_MAC_DINH, {
    Truong: f.truong.trim(), Lop: f.lop.trim(), NamHoc: f.namHoc.trim()
  });
  const lo = writeBatch(db);
  DS_LOI.forEach(function (r, i) { lo.set(doc(db, 'danhMucLoi', r.ma), Object.assign({ thuTu: i }, r)); });
  DS_CONG.forEach(function (r, i) { lo.set(doc(db, 'danhMucCong', r.ma), Object.assign({ thuTu: i }, r)); });
  lo.set(doc(db, 'cauHinh', 'main'), cfg);
  lo.set(doc(db, 'dangNhap', ten), { email: email });
  lo.set(doc(db, 'taiKhoan', user.uid), {
    tenDangNhap: ten, hoTen: f.hoTen.trim() || 'Giáo viên chủ nhiệm', vaiTro: 'GVCN',
    maHS: '', toPhuTrach: '', lanDau: false, trangThai: 'HOAT_DONG', email: email, phienBanEmail: 0
  });
  lo.set(doc(db, 'heThong', 'khoiTao'), { thoiGian: serverTimestamp(), boi: ten });
  await boc(lo.commit());
  return napHoSo(user);
}

// ------------------------------------------------------------ Quản trị: học sinh

/** Thêm học sinh từ danh sách tên dán vào (mỗi dòng một tên). Mã nối tiếp mã đang có. */
export async function themHocSinh(dsTen) {
  const cfg = await layCauHinh();
  const lop = String(cfg.Lop).split('-')[0];
  const cu = await layHocSinh(true);
  let max = 0;
  cu.forEach(function (r) {
    const n = Number(String(r.maHS).split('_').pop());
    if (n > max) max = n;
  });
  const lo = writeBatch(db);
  const them = [];
  dsTen.map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean).forEach(function (ten) {
    max++;
    const maHS = lop + '_' + String(max).padStart(2, '0');
    lo.set(doc(db, 'hocSinh', maHS), { hoTen: ten, to: '', chucVu: '', trangThai: 'DANG_HOC', ghiChu: '' });
    them.push(maHS);
  });
  if (!them.length) throw new Error('Chưa có tên nào để thêm');
  await boc(lo.commit());
  nho.hs = null;
  ghiLog('THEM_HOC_SINH', them.length + ' học sinh');
  return them.length;
}

export async function capNhatHocSinh(thayDoi) {
  const lo = writeBatch(db);
  Object.keys(thayDoi).forEach(function (ma) { lo.update(doc(db, 'hocSinh', ma), thayDoi[ma]); });
  await boc(lo.commit());
  nho.hs = null;
  ghiLog('SUA_HOC_SINH', Object.keys(thayDoi).length + ' học sinh');
}

// ------------------------------------------------------------ Quản trị: tài khoản

export async function dsTaiKhoan() {
  const s = await boc(getDocs(collection(db, 'taiKhoan')));
  return s.docs.map(function (d) { return Object.assign({ uid: d.id }, d.data()); })
    .sort(function (a, b) {
      const thu = ['GVCN', 'LOP_TRUONG', 'TO_TRUONG', 'PHU_HUYNH'];
      return thu.indexOf(a.vaiTro) - thu.indexOf(b.vaiTro) || (a.tenDangNhap < b.tenDangNhap ? -1 : 1);
    });
}

/** Tạo một tài khoản Auth bằng app phụ (GVCN không bị đăng xuất) rồi ghi hồ sơ. */
async function taoTaiKhoanAuth(t, phienBan) {
  const ten = L.chuanTenDangNhap(t.tenDangNhap);
  if (!t.matKhau || t.matKhau.length < 6) throw new Error('Mật khẩu phải từ 6 ký tự trở lên');
  const email = L.emailTuTenDangNhap(ten, phienBan);
  const ap = authPhu();
  let uid;
  try {
    uid = (await createUserWithEmailAndPassword(ap, email, t.matKhau)).user.uid;
  } catch (e) { throw loiDe(e); }
  await signOut(ap);
  return { ten: ten, email: email, uid: uid };
}

export async function taoTaiKhoan(t) {
  const ten = L.chuanTenDangNhap(t.tenDangNhap);
  if ((await getDoc(doc(db, 'dangNhap', ten))).exists()) throw new Error('Tên đăng nhập "' + ten + '" đã có người dùng');
  const a = await taoTaiKhoanAuth(t, 0);
  const lo = writeBatch(db);
  lo.set(doc(db, 'dangNhap', ten), { email: a.email });
  lo.set(doc(db, 'taiKhoan', a.uid), {
    tenDangNhap: ten, hoTen: t.hoTen, vaiTro: t.vaiTro, maHS: t.maHS || '', toPhuTrach: t.toPhuTrach || '',
    lanDau: t.lanDau !== false, trangThai: 'HOAT_DONG', email: a.email, phienBanEmail: 0
  });
  await boc(lo.commit());
  ghiLog('TAO_TAI_KHOAN', ten + ' (' + t.vaiTro + ')');
  return a;
}

/** Mật khẩu ban đầu của phụ huynh = họ tên không dấu + ký tự cấu hình. */
export function matKhauMacDinhPH(hoTen, cfg) {
  return L.khongDau(hoTen) + String(cfg.MatKhauMacDinhHau || '1');
}

/**
 * Tạo tài khoản phụ huynh cho từng học sinh chưa có. Chạy lại được nhiều lần:
 * học sinh nào đã có tài khoản thì bỏ qua. `tienDo(i, n)` để cập nhật thanh tiến độ.
 */
export async function taoTaiKhoanPhuHuynh(tienDo) {
  const cfg = await layCauHinh();
  const hauTo = String(cfg.HauToTenDangNhap || 'a0k67');
  const hs = (await layHocSinh(true)).filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  const tk = await dsTaiKhoan();
  const daCo = {}, daCoTen = {};
  tk.forEach(function (r) { if (r.maHS) daCo[r.maHS] = true; daCoTen[r.tenDangNhap] = true; });

  const can = hs.filter(function (h) { return !daCo[h.maHS] && L.khongDau(h.hoTen); });
  const xong = [], loi = [];
  for (let i = 0; i < can.length; i++) {
    const h = can[i];
    const goc = L.khongDau(h.hoTen);
    let ten = goc + hauTo, dem = 1;
    while (daCoTen[ten]) { dem++; ten = goc + dem + hauTo; }   // trùng họ tên -> thêm số
    daCoTen[ten] = true;
    if (tienDo) tienDo(i, can.length, h.hoTen);
    try {
      await taoTaiKhoan({
        tenDangNhap: ten, hoTen: 'PH ' + h.hoTen, matKhau: matKhauMacDinhPH(h.hoTen, cfg),
        vaiTro: 'PHU_HUYNH', maHS: h.maHS, lanDau: true
      });
      xong.push(h.hoTen + ' -> ' + ten);
    } catch (e) {
      loi.push(h.hoTen + ': ' + e.message);
      if (e.message.indexOf('quá nhiều') >= 0) break;       // bị chặn tạm thì dừng, chạy lại sau
    }
  }
  return { soTao: xong.length, tong: can.length, loi: loi };
}

export async function datTrangThaiTaiKhoan(uid, hoatDong) {
  await boc(updateDoc(doc(db, 'taiKhoan', uid), { trangThai: hoatDong ? 'HOAT_DONG' : 'KHOA' }));
  ghiLog(hoatDong ? 'MO_KHOA_TAI_KHOAN' : 'KHOA_TAI_KHOAN', uid);
}

export async function suaTaiKhoan(uid, f) {
  await boc(updateDoc(doc(db, 'taiKhoan', uid), f));
  ghiLog('SUA_TAI_KHOAN', uid);
}

/**
 * Cấp lại mật khẩu. Firebase không cho đặt mật khẩu hộ người khác từ trình duyệt, nên
 * tạo một tài khoản Auth mới cùng tên đăng nhập (email có thêm số phiên bản) và chuyển
 * hồ sơ sang đó. Tài khoản Auth cũ mất hồ sơ nên không vào được gì nữa.
 */
export async function capLaiMatKhau(tk, matKhauMoi, batDoiLai) {
  if (tk.uid === hoSo.uid) throw new Error('Đổi mật khẩu của chính mình ở menu tài khoản (góc phải trên).');
  const pb = (Number(tk.phienBanEmail) || 0) + 1;
  const a = await taoTaiKhoanAuth({ tenDangNhap: tk.tenDangNhap, matKhau: matKhauMoi }, pb);
  const { uid: _bo, ...hoSoCu } = tk;
  const lo = writeBatch(db);
  lo.set(doc(db, 'taiKhoan', a.uid), Object.assign({}, hoSoCu, { email: a.email, phienBanEmail: pb, lanDau: batDoiLai !== false }));
  lo.delete(doc(db, 'taiKhoan', tk.uid));
  lo.set(doc(db, 'dangNhap', tk.tenDangNhap), { email: a.email });
  await boc(lo.commit());
  ghiLog('CAP_LAI_MAT_KHAU', tk.tenDangNhap);
}

// ------------------------------------------------------------ Quản trị: cấu hình, danh mục

export async function luuCauHinh(cfg) {
  await boc(setDoc(doc(db, 'cauHinh', 'main'), cfg));
  nho.cfg = null;
  ghiLog('SUA_CAU_HINH', '');
}

export async function luuDanhMuc(loai, muc) {
  const ten = loai === 'CONG' ? 'danhMucCong' : 'danhMucLoi';
  await boc(setDoc(doc(db, ten, muc.ma), muc, { merge: true }));
  nho.dm = null;
  ghiLog('SUA_DANH_MUC', muc.ma);
}

// ------------------------------------------------------------ Năm học mới & sao lưu

/** Gom toàn bộ dữ liệu năm học thành một đối tượng để tải về làm bản lưu. */
export async function sapLuuNamHoc() {
  const ten = ['cauHinh', 'danhMucLoi', 'danhMucCong', 'hocSinh', 'tuan', 'nhatKy', 'xepLoaiThang'];
  const kq = { xuatLuc: new Date().toISOString() };
  for (const t of ten) {
    const s = await boc(getDocs(collection(db, t)));
    kq[t] = s.docs.map(function (d) {
      const x = d.data();
      Object.keys(x).forEach(function (k) {
        if (x[k] && typeof x[k].toDate === 'function') x[k] = x[k].toDate().toISOString();
      });
      return Object.assign({ _id: d.id }, x);
    });
  }
  return kq;
}

/**
 * Dọn dữ liệu năm cũ (trang tuần, nhật ký, xếp loại tháng, nhật ký hệ thống), đổi năm học.
 * GỌI SAU KHI ĐÃ TẢI BẢN SAO LƯU. Giữ nguyên danh mục, tài khoản, học sinh.
 */
export async function batDauNamHocMoi(namMoi) {
  if (!/^\d{4}-\d{4}$/.test(namMoi)) throw new Error('Năm học phải có dạng 2027-2028');
  for (const t of ['nhatKy', 'xepLoaiThang', 'tuan', 'nhatKyHeThong']) {
    const s = await boc(getDocs(collection(db, t)));
    for (let i = 0; i < s.docs.length; i += 400) {
      const lo = writeBatch(db);
      s.docs.slice(i, i + 400).forEach(function (d) { lo.delete(d.ref); });
      await boc(lo.commit());
    }
  }
  await boc(updateDoc(doc(db, 'cauHinh', 'main'), { NamHoc: namMoi }));
  nho.cfg = null; nho.tuan = null;
  ghiLog('NAM_HOC_MOI', namMoi);
}

// ------------------------------------------------------------ Đánh giá tháng & xuất Excel

/**
 * Ghép dữ liệu đánh giá của một THÁNG DƯƠNG LỊCH (ngày 1 → ngày cuối tháng): với mỗi học sinh,
 * toàn bộ lỗi trong tháng + xếp loại / ghi chú. Hàm thuần, dùng chung cho màn hình và file Excel.
 */
function ghepDanhGia(thang, cfg, hs, nhatKy, thangDocs, m) {
  const k = L.khoangThang(thang, cfg.NamHoc);
  const loiTheoHS = {};
  nhatKy.forEach(function (r) {
    if (r.trangThai !== 'HOAT_DONG' || r.loai !== 'LOI' || r.ngay < k.tu || r.ngay > k.den) return;
    (loiTheoHS[r.maHS] = loiTheoHS[r.maHS] || []).push({
      ngay: r.ngay, ten: L.tenMuc(r, m.loi[r.ma]), mon: r.mon || '', diem: Number(r.diem) || 0, nhom: (m.loi[r.ma] || {}).nhom || ''
    });
  });
  return {
    thang: thang, tu: k.tu, den: k.den, soNgay: k.soNgay,
    ds: hs.map(function (h) {
      const d = thangDocs[h.maHS + '_' + thang];
      const xl = d ? L.xepLoaiHieuLuc(d, cfg) : '';
      return {
        maHS: h.maHS, hoTen: h.hoTen, to: h.to || '',
        loi: (loiTheoHS[h.maHS] || []).sort(function (a, b) { return a.ngay < b.ngay ? -1 : (a.ngay > b.ngay ? 1 : 0); }),
        xepLoai: xl, thuCong: !!(d && d.xepLoai), deXuat: d && d.deXuat || '',
        ghiChu: d && d.ghiChu || '', daChot: !!(d && d.daChot)
      };
    })
  };
}

/** Đánh giá một tháng (màn hình "Đánh giá tháng"). Chỉ cán bộ lớp / GVCN. */
export async function danhGiaThang(thang) {
  const [cfg, dm] = [await layCauHinh(), await layDanhMuc()];
  const k = L.khoangThang(thang, cfg.NamHoc);
  const hs = (await layHocSinh()).filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  const [sN, sT] = await Promise.all([
    boc(getDocs(query(collection(db, 'nhatKy'), where('ngay', '>=', k.tu), where('ngay', '<=', k.den)))),
    boc(getDocs(query(collection(db, 'xepLoaiThang'), where('thang', '==', Number(thang)))))
  ]);
  const thangDocs = {};
  sT.docs.forEach(function (d) { thangDocs[d.id] = d.data(); });
  return ghepDanhGia(Number(thang), cfg, hs, sN.docs.map(function (d) { return chuanMuc(d.id, d.data()); }), thangDocs, dungDM(dm));
}

/** Lưu xếp loại + ghi chú của nhiều học sinh trong một tháng (xem luuXepLoai). */
export async function luuDanhGia(thang, thayDoi) {
  const items = Object.keys(thayDoi).map(function (ma) {
    return Object.assign({ maHS: ma, thang: thang }, thayDoi[ma]);
  });
  return luuXepLoai(items);
}

/**
 * Xuất file Excel đúng bố cục mẫu của trường (xem xuat-excel.js).
 * thang = số tháng thì chỉ xuất tháng đó; bỏ trống thì xuất cả năm: các tháng + HK1 + HK2.
 */
export async function xuatExcel(thang) {
  const mod = await import('./xuat-excel.js');
  const [cfg, dm, hsTat] = [await layCauHinh(), await layDanhMuc(), await layHocSinh(true)];
  const hs = hsTat.filter(function (r) { return r.trangThai === 'DANG_HOC'; });
  const m = dungDM(dm);
  const sNk = await boc(getDocs(collection(db, 'nhatKy')));
  const nhatKy = sNk.docs.map(function (d) { return chuanMuc(d.id, d.data()); });
  const sT = await boc(getDocs(collection(db, 'xepLoaiThang')));
  const thangDocs = {};
  sT.docs.forEach(function (d) { thangDocs[d.id] = d.data(); });

  const cacThang = thang ? [Number(thang)] : (cfg.ThangHK1 || []).concat(cfg.ThangHK2 || []);
  const thangDL = cacThang.map(function (t) { return ghepDanhGia(t, cfg, hs, nhatKy, thangDocs, m); });
  const ky = thang ? null : hs.map(function (h) {
    const theoThang = {};
    cacThang.forEach(function (t) { theoThang[t] = { xepLoai: L.xepLoaiHieuLuc(thangDocs[h.maHS + '_' + t], cfg) }; });
    return { maHS: h.maHS, hoTen: h.hoTen, thang: theoThang, ky: L.xepLoaiKyHS(theoThang, cfg, null) };
  });
  const tenFile = await mod.xuatFile({ cfg: cfg, thang: thangDL, ky: ky, homNay: L.homNay() });
  ghiLog('XUAT_EXCEL', tenFile);
  return tenFile;
}
