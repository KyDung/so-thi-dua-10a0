/**
 * logic.js — Toàn bộ phép tính điểm thi đua và xếp loại. Không chạm DOM hay Firebase,
 * nên chạy được cả trên trình duyệt lẫn Node (xem tests/).
 *
 * Bám theo "huong-dan-thi-đua-cá-nhân-2023-2024.docx":
 *   - Mỗi học sinh bắt đầu mỗi TUẦN với 100 điểm
 *   - Vi phạm thì trừ, làm tốt thì cộng (không giới hạn)
 *   - Xếp loại TUẦN theo ngưỡng điểm
 *   - Xếp loại THÁNG = điểm trung bình các tuần, rồi áp thêm các lưu ý của quy chế
 *
 * Ngày luôn là chuỗi 'yyyy-MM-dd' (so sánh chuỗi đúng thứ tự thời gian, không lệch múi giờ).
 */

export const BAC = ['CHUA_DAT', 'DAT', 'KHA', 'TOT'];   // thấp → cao
export const NHAN = { TOT: 'TỐT', KHA: 'KHÁ', DAT: 'ĐẠT', CHUA_DAT: 'CHƯA ĐẠT' };
export const THANG_HOC = [9, 10, 11, 12, 1, 2, 3, 4, 5];

export function haBac(bac, n) {
  return BAC[Math.max(0, BAC.indexOf(bac) - n)];
}

export function thapHon(a, b) {
  return BAC.indexOf(a) <= BAC.indexOf(b) ? a : b;
}

export function soHoac(v, macDinh) {
  if (v === '' || v === null || v === undefined) return macDinh;
  const n = Number(v);
  return isNaN(n) ? macDinh : n;
}

export function laDung(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

// ---------------------------------------------------------------- Ngày tháng

const RE_NGAY = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/** Chuẩn hoá về 'yyyy-MM-dd'. Ném lỗi nếu không đọc được. */
export function chuanNgay(v) {
  const s = String(v == null ? '' : v).trim().slice(0, 10);
  const m = s.match(RE_NGAY);
  if (!m) throw new Error('Không đọc được ngày: "' + v + '". Cần dạng yyyy-MM-dd.');
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) {
    throw new Error('Ngày không tồn tại: "' + v + '"');
  }
  return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

/** Số ngày chênh lệch giữa hai ngày 'yyyy-MM-dd' (b - a). */
export function soNgayGiua(a, b) {
  const t = function (s) { const m = chuanNgay(s).split('-'); return Date.UTC(+m[0], +m[1] - 1, +m[2]); };
  return Math.round((t(b) - t(a)) / 86400000);
}

export function congNgay(s, n) {
  const m = chuanNgay(s).split('-');
  const d = new Date(Date.UTC(+m[0], +m[1] - 1, +m[2] + n));
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') +
    '-' + String(d.getUTCDate()).padStart(2, '0');
}

/** Ngày hôm nay theo giờ Việt Nam. */
export function homNay() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Khoảng ngày của một tháng DƯƠNG LỊCH trong năm học: từ ngày 1 đến ngày cuối (28/29/30/31).
 * Tháng 6–12 thuộc năm đầu của "2026-2027", tháng 1–5 thuộc năm sau.
 */
export function khoangThang(thang, namHoc) {
  const m = String(namHoc || '').match(/^(\d{4})-(\d{4})$/);
  const nam = m ? (Number(thang) >= 6 ? Number(m[1]) : Number(m[2])) : new Date().getFullYear();
  const cuoi = new Date(Date.UTC(nam, Number(thang), 0)).getUTCDate();   // ngày 0 của tháng sau = ngày cuối tháng này
  const mm = String(thang).padStart(2, '0');
  return { tu: nam + '-' + mm + '-01', den: nam + '-' + mm + '-' + String(cuoi).padStart(2, '0'), nam: nam, soNgay: cuoi };
}

/** 'yyyy-MM-dd' → 'dd/MM' */
export function ngayNgan(s) {
  s = String(s || '');
  return s.length >= 10 ? s.slice(8, 10) + '/' + s.slice(5, 7) : s;
}

/**
 * Tháng theo dõi của một tuần trong sổ lớp.
 * Tuần vắt tháng tính theo tháng của ngày bắt đầu tuần; riêng tuần mở năm
 * học kiểu 31/8-6/9 vẫn thuộc tháng 9.
 */
export function thangTheoDoiTuan(tuan) {
  const thangTu = Number(chuanNgay(tuan.tuNgay).slice(5, 7));
  const thangDen = Number(chuanNgay(tuan.denNgay).slice(5, 7));
  if (thangTu === thangDen) return thangTu;
  return [6, 7, 8].indexOf(thangTu) >= 0 ? thangDen : thangTu;
}

export function hocKyTheoThang(thang, cfg) {
  const hk1 = (cfg && cfg.ThangHK1 || []).map(Number);
  return hk1.indexOf(Number(thang)) >= 0 ? 'HK1' : 'HK2';
}

/** Trang tuần chứa một ngày, hoặc undefined. */
export function tuanCuaNgay(ngay, dsTuan) {
  return dsTuan.filter(function (t) { return t.tuNgay <= ngay && ngay <= t.denNgay; })[0];
}

/**
 * Trang tuần nên mở sẵn khi vào:
 *   1. Tuần đang chứa hôm nay
 *   2. Không có thì tuần gần nhất đã bắt đầu
 *   3. Chưa tuần nào bắt đầu thì tuần sớm nhất
 * Không lấy "ngày lớn nhất" vì tạo sẵn trang cho cả năm sẽ nhảy vào tháng 5.
 */
export function tuanMacDinh(dsTuan, ngayHomNay) {
  const ds = dsTuan.slice().sort(function (a, b) { return a.tuNgay < b.tuNgay ? -1 : 1; });
  if (!ds.length) return null;
  const h = ngayHomNay || homNay();
  const dang = ds.filter(function (t) { return t.tuNgay <= h && h <= t.denNgay; })[0];
  if (dang) return dang;
  const daQua = ds.filter(function (t) { return t.tuNgay <= h; });
  return daQua.length ? daQua[daQua.length - 1] : ds[0];
}

/**
 * Kiểm tra dữ liệu một trang tuần. Trả về trang tuần đã chuẩn hoá.
 * `boQua` là maTuan đang sửa (không tự so với chính nó).
 */
export function kiemTraTuan(t, dsTuan, boQua) {
  const soTuan = Number(t && t.soTuan);
  if (!soTuan || soTuan < 1 || soTuan > 60) throw new Error('Số tuần phải từ 1 đến 60');

  const tu = chuanNgay(t.tuNgay), den = chuanNgay(t.denNgay);
  if (den < tu) throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
  if (soNgayGiua(tu, den) > 13) throw new Error('Một trang tuần không quá 14 ngày');

  const khac = dsTuan.filter(function (r) { return r.maTuan !== boQua; });
  if (khac.some(function (r) { return r.tuNgay === tu; })) {
    throw new Error('Đã có trang tuần bắt đầu từ ngày ' + tu);
  }
  if (khac.some(function (r) { return Number(r.soTuan) === soTuan; })) {
    throw new Error('Đã có trang "Tuần ' + soTuan + '". Mỗi tuần chỉ tạo một trang.');
  }
  const chong = khac.filter(function (r) { return r.tuNgay <= den && tu <= r.denNgay; })[0];
  if (chong) {
    throw new Error('Khoảng ngày này trùng với Tuần ' + chong.soTuan +
      ' (' + chong.tuNgay + ' đến ' + chong.denNgay + ')');
  }
  return { soTuan: soTuan, tuNgay: tu, denNgay: den, ghiChu: String(t.ghiChu || '').trim() };
}

/** Gợi ý số tuần và khoảng ngày cho trang mới, dựa vào trang gần nhất. */
export function goiYTuanMoi(dsTuan, ngayHomNay) {
  if (!dsTuan || !dsTuan.length) {
    const h = ngayHomNay || homNay();
    const thuMay = (new Date(h + 'T12:00:00Z').getUTCDay() + 6) % 7;   // 0 = thứ hai
    const t2 = congNgay(h, -thuMay);
    return { soTuan: 1, tuNgay: t2, denNgay: congNgay(t2, 6) };
  }
  const gan = dsTuan.slice().sort(function (a, b) { return a.tuNgay < b.tuNgay ? 1 : -1; })[0];
  const tu = congNgay(gan.tuNgay, 7);
  return { soTuan: Number(gan.soTuan || 0) + 1, tuNgay: tu, denNgay: congNgay(tu, 6) };
}

// ---------------------------------------------------------------- Tài khoản

/**
 * Bỏ dấu tiếng Việt, bỏ khoảng trắng, chuyển thành chữ thường.
 * "NGUYỄN HOÀNG ANH" -> "nguyenhoanganh". Dùng sinh tên đăng nhập và mật khẩu mặc định.
 * Ghép theo từng nhóm chữ cái, không dùng hai chuỗi song song vì chỉ cần lệch một
 * ký tự là cả bảng ánh xạ sai.
 */
export function khongDau(s) {
  const nhom = {
    a: 'aàáạảãâầấậẩẫăằắặẳẵ',
    e: 'eèéẹẻẽêềếệểễ',
    i: 'iìíịỉĩ',
    o: 'oòóọỏõôồốộổỗơờớợởỡ',
    u: 'uùúụủũưừứựửữ',
    y: 'yỳýỵỷỹ',
    d: 'dđ'
  };
  const map = {};
  Object.keys(nhom).forEach(function (k) {
    for (let i = 0; i < nhom[k].length; i++) map[nhom[k].charAt(i)] = k;
  });
  const t = String(s || '').toLowerCase().normalize('NFC');
  let kq = '';
  for (let i = 0; i < t.length; i++) {
    const c = t.charAt(i);
    kq += map[c] !== undefined ? map[c] : c;
  }
  return kq.replace(/[^a-z0-9]/g, '');
}

/** Firebase Auth cần email; tên đăng nhập được đổi thành email giả, người dùng không thấy. */
export const MIEN_EMAIL = 'so-thi-dua.local';

export function emailTuTenDangNhap(ten, phienBan) {
  const goc = String(ten).trim().toLowerCase();
  return goc + (phienBan ? '.' + phienBan : '') + '@' + MIEN_EMAIL;
}

export function chuanTenDangNhap(ten) {
  const t = String(ten || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,40}$/.test(t)) {
    throw new Error('Tên đăng nhập chỉ gồm chữ thường không dấu, số, dấu gạch dưới (3–40 ký tự)');
  }
  return t;
}

// ---------------------------------------------------------------- Điểm tuần

/** Các ngưỡng điểm của một tuần, đọc từ cấu hình. */
export function nguongTuan(cfg) {
  return {
    batDau: soHoac(cfg.DiemXuatPhatTuan, 100),
    tot: soHoac(cfg.NguongTuan_Tot, 100),
    kha: soHoac(cfg.NguongTuan_Kha, 80),
    dat: soHoac(cfg.NguongTuan_Dat, 50),
    nhanDoi: laDung(cfg.NhanDoiTuLan2)
  };
}

/** Tốt đòi hỏi vừa đủ điểm VỪA không có lỗi nào — đúng như tài liệu. */
export function xepLoaiTheoDiem(diem, soLoi, ng) {
  if (diem >= ng.tot && soLoi === 0) return 'TOT';
  if (diem >= ng.kha) return 'KHA';
  if (diem >= ng.dat) return 'DAT';
  return 'CHUA_DAT';
}

/**
 * Tính điểm một học sinh từ nhật ký.
 *
 * @param nhatKy   các dòng nhật ký đang hiệu lực của học sinh đó
 *                 { maTuan, loai:'LOI'|'CONG', ma, diem }
 * @param dsTuan   mọi trang tuần { maTuan, soTuan, tuNgay, denNgay }
 * @param cfg      cấu hình (khoá như sheet CauHinh cũ)
 * @param dmLoi    { maLoi: {diem, nhom, nhanDoiTuLan2, ghiSoDauBai, nguongHocKy} }
 * @param dmCong   { maCong: {diem} }
 * @returns { tuan: [...], thang: { [thang]: {...} } }
 */
export function tinhHocSinh(nhatKy, dsTuan, cfg, dmLoi, dmCong) {
  const ng = nguongTuan(cfg);
  const theoTuan = {};
  nhatKy.forEach(function (r) {
    (theoTuan[r.maTuan] = theoTuan[r.maTuan] || []).push(r);
  });
  const tuanSapXep = dsTuan.slice().sort(function (a, b) { return a.tuNgay < b.tuNgay ? -1 : 1; });

  const tuan = [];
  const gomThang = {};
  let demKy = {}, kyTruoc = null;   // lỗi có ngưỡng học kỳ (vd không đeo thẻ: lần 2 trong HK mới hạ bậc)

  tuanSapXep.forEach(function (t) {
    const thang = thangTheoDoiTuan(t);
    const hocKy = hocKyTheoThang(thang, cfg);
    if (hocKy !== kyTruoc) { demKy = {}; kyTruoc = hocKy; }

    let diemCong = 0, diemTru = 0, soLoi = 0, ghiSo = 0, soHaBac = 0, chuaDat = false;
    const demTrongTuan = {};   // số lần mỗi mã lỗi trong tuần, để nhân đôi

    (theoTuan[t.maTuan] || []).forEach(function (r) {
      const diemGhi = Number(r.diem);

      if (r.loai === 'CONG') {
        const c = dmCong[r.ma];
        // Điểm cộng "khác" do người nhập tự gõ -> lấy đúng số đã lưu
        diemCong += isNaN(diemGhi) ? soHoac(c && c.diem, 0) : diemGhi;
        return;
      }

      const L = dmLoi[r.ma];
      soLoi++;
      // Mức trừ: ưu tiên số đã lưu trong nhật ký (lỗi "khác" gõ tay), không có thì lấy danh mục
      let tru = Math.abs(isNaN(diemGhi) ? soHoac(L && L.diem, 0) : diemGhi);

      if (L) {
        demTrongTuan[r.ma] = (demTrongTuan[r.ma] || 0) + 1;
        if (ng.nhanDoi && laDung(L.nhanDoiTuLan2) && demTrongTuan[r.ma] >= 2) tru *= 2;
        if (laDung(L.ghiSoDauBai)) ghiSo++;

        let nhom = L.nhom;
        const nguongHK = soHoac(L.nguongHocKy, 0);
        if (nguongHK > 0) {
          demKy[r.ma] = (demKy[r.ma] || 0) + 1;
          if (demKy[r.ma] >= nguongHK) nhom = 'HA_BAC';
        }
        if (nhom === 'CHUA_DAT') chuaDat = true;
        else if (nhom === 'HA_BAC') soHaBac++;
      }
      diemTru += tru;
    });

    const cuoi = ng.batDau + diemCong - diemTru;
    const xepLoai = chuaDat ? 'CHUA_DAT' : xepLoaiTheoDiem(cuoi, soLoi, ng);
    tuan.push({
      maTuan: t.maTuan, soTuan: t.soTuan, thang: thang, hocKy: hocKy,
      batDau: ng.batDau, cong: diemCong, tru: -diemTru, cuoi: cuoi,
      soLoi: soLoi, ghiSo: ghiSo, haBac: soHaBac, chuaDat: chuaDat, xepLoai: xepLoai
    });

    const g = gomThang[thang] = gomThang[thang] ||
      { thang: thang, hocKy: hocKy, tong: 0, soTuan: 0, ghiSo: 0, haBac: 0, soLoi: 0, chuaDat: false };
    g.tong += cuoi; g.soTuan++;
    g.ghiSo += ghiSo; g.haBac += soHaBac; g.soLoi += soLoi;
    if (chuaDat) g.chuaDat = true;
  });

  const gsKhongTot = soHoac(cfg.GhiSo_KhongDuocTot, 3);
  const gsKhongKha = soHoac(cfg.GhiSo_KhongDuocKha, 5);
  const thang = {};
  Object.keys(gomThang).forEach(function (k) {
    const g = gomThang[k];
    const diemTB = g.soTuan ? Math.round(g.tong / g.soTuan * 10) / 10 : ng.batDau;
    let deXuat;
    if (g.chuaDat) {
      deXuat = 'CHUA_DAT';
    } else {
      deXuat = xepLoaiTheoDiem(diemTB, g.soLoi, ng);
      deXuat = haBac(deXuat, g.haBac);                  // mỗi lỗi hạ bậc -> hạ 1 bậc
      let tran = 'TOT';
      if (g.ghiSo >= gsKhongKha) tran = 'DAT';          // ghi sổ >= 5 lần: không được Khá
      else if (g.ghiSo >= gsKhongTot) tran = 'KHA';     // ghi sổ >= 3 lần: không được Tốt
      deXuat = thapHon(deXuat, tran);
    }
    thang[k] = {
      thang: g.thang, hocKy: g.hocKy, soLoi: g.soLoi, soLanGhiSo: g.ghiSo,
      soLanHaBac: g.haBac, diemThiDua: diemTB, deXuat: deXuat
    };
  });
  return { tuan: tuan, thang: thang };
}

// ---------------------------------------------------------------- Xếp loại kỳ

/**
 * Xếp loại 1 học kỳ từ mảng xếp loại các tháng (theo thứ tự thời gian).
 * Bám nguyên văn mục "ĐÁNH GIÁ XLRL HỌC SINH CUỐI KỲ" của tài liệu.
 */
export function xepLoaiMotKy(ds) {
  const co = ds.filter(function (x) { return x; });
  if (co.length === 0) return null;

  const n = ds.length;
  const dauKy = ds.slice(0, 2);                 // 2 tháng đầu HK
  const cuoiKy = ds.slice(Math.max(0, n - 2));  // 2 tháng cuối HK
  const dem = function (arr, dk) { return arr.filter(function (x) { return x && dk(x); }).length; };

  const laTot = function (x) { return x === 'TOT'; };
  const laKhaTot = function (x) { return x === 'TOT' || x === 'KHA'; };
  const laDatTroLen = function (x) { return x !== 'CHUA_DAT'; };

  const soDat = dem(co, function (x) { return x === 'DAT'; });
  const soCD = dem(co, function (x) { return x === 'CHUA_DAT'; });

  // --- TỐT ---
  if (dem(co, laTot) === co.length) return 'TOT';
  if (soCD === 0 && soDat === 1 && dem(dauKy, function (x) { return x === 'DAT'; }) === 1) return 'TOT';
  if (dem(co, laTot) >= 3 && dem(cuoiKy, laTot) >= 1 && soDat === 0 && soCD === 0) return 'TOT';

  // --- KHÁ ---
  if (soCD === 0 && dem(co, laKhaTot) === co.length) return 'KHA';
  if (soCD === 1 && dem(dauKy, function (x) { return x === 'CHUA_DAT'; }) === 1) return 'KHA';
  if (dem(co, laKhaTot) >= 3 && dem(cuoiKy, laKhaTot) >= 1 && soCD === 0) return 'KHA';

  // --- ĐẠT ---
  if (dem(co, laDatTroLen) >= 3 && dem(cuoiKy, laDatTroLen) >= 1) return 'DAT';

  return 'CHUA_DAT';
}

/**
 * Xếp loại thực tế của một tháng: người nhập đã chọn thì lấy theo đó,
 * chưa chọn mà bật tự động thì lấy gợi ý của máy.
 */
export function xepLoaiHieuLuc(docThang, cfg) {
  if (!docThang) return '';
  if (docThang.xepLoai) return docThang.xepLoai;
  return laDung(cfg && cfg.TuDongXepLoai) ? (docThang.deXuat || '') : '';
}

/**
 * Học kỳ và cả năm của một học sinh.
 * @param thangDoc  { [thang]: doc xepLoaiThang }
 * @param duyet     { CA_NAM: {xepLoai, daDuyet, ghiChu}, ... } các mục GVCN đã duyệt tay
 */
export function xepLoaiKyHS(thangDoc, cfg, duyet) {
  duyet = duyet || {};
  const lay = function (t) { return xepLoaiHieuLuc(thangDoc[t], cfg) || null; };
  const xl1 = xepLoaiMotKy((cfg.ThangHK1 || []).map(lay));
  const xl2 = xepLoaiMotKy((cfg.ThangHK2 || []).map(lay));
  const nam = (xl1 && xl2) ? thapHon(xl1, xl2) : null;
  const kq = {};
  [['HK1', xl1], ['HK2', xl2], ['CA_NAM', nam]].forEach(function (p) {
    const d = duyet[p[0]];
    kq[p[0]] = d && d.daDuyet
      ? { xepLoai: d.xepLoai, deXuat: p[1] || '', daDuyet: true, ghiChu: d.ghiChu || '' }
      : { xepLoai: p[1] || '', deXuat: p[1] || '', daDuyet: false, ghiChu: '' };
  });
  return kq;
}

// ---------------------------------------------------------------- Nhập nhật ký

/**
 * Kiểm tra và dựng một dòng nhật ký mới.
 * muc: { maHS, ngay, loai:'LOI'|'CONG', ma, mon, ghiChu, diem (chỉ cho mục "khác") }
 * dm:  dòng danh mục tương ứng (đã chuẩn hoá: { ma, ten, diem, canMon })
 */
export function dungNhatKy(muc, dm, dsTuan, cfg) {
  const ngay = chuanNgay(muc.ngay);
  const tuan = tuanCuaNgay(ngay, dsTuan);
  if (!tuan) throw new Error('Ngày ' + ngay + ' không nằm trong trang tuần nào. Hãy tạo trang tuần trước.');
  if (!dm) throw new Error('Không có mã "' + muc.ma + '" trong danh mục');

  const laCong = muc.loai === 'CONG';
  const tuNhap = muc.ma === 'KHAC' || muc.ma === 'CONG_KHAC';
  let diem;
  if (tuNhap) {
    if (!String(muc.ghiChu || '').trim()) throw new Error('Mục "khác" cần ghi rõ nội dung');
    diem = Number(muc.diem);
    if (isNaN(diem) || diem === 0) throw new Error('Mục "khác" cần nhập số điểm khác 0');
    diem = laCong ? Math.abs(diem) : -Math.abs(diem);
  } else {
    diem = soHoac(dm.diem, 0);
  }
  if (dm.canMon && !String(muc.mon || '').trim()) {
    throw new Error('Mục "' + dm.ten + '" cần ghi rõ môn học');
  }
  const thang = thangTheoDoiTuan(tuan);
  return {
    maHS: muc.maHS, ngay: ngay, maTuan: tuan.maTuan, thang: thang,
    hocKy: hocKyTheoThang(thang, cfg), loai: laCong ? 'CONG' : 'LOI',
    ma: muc.ma, mon: chuanMon(muc.mon), diem: diem,
    moTa: String(muc.ghiChu || '').trim()
  };
}

/** Tên hiển thị của một dòng nhật ký (mục "khác" lấy nội dung tự gõ làm tên). */
export function tenMuc(r, dm) {
  const tuGo = (r.ma === 'KHAC' || r.ma === 'CONG_KHAC') && r.moTa;
  return tuGo ? r.moTa : (dm ? dm.ten : r.ma);
}

export function laMucTuGo(r) {
  return r.ma === 'KHAC' || r.ma === 'CONG_KHAC';
}

// ---------------------------------------------------------------- Môn học (chương trình GDPT 2018)

/** Môn học và hoạt động bắt buộc, môn lựa chọn của học sinh lớp 10. */
export const DS_MON = {
  batBuoc: ['Ngữ văn', 'Toán', 'Tiếng Anh', 'Lịch sử', 'Giáo dục thể chất', 'Giáo dục quốc phòng và an ninh',
    'Hoạt động trải nghiệm, hướng nghiệp', 'Nội dung giáo dục của địa phương'],
  luaChon: ['Địa lí', 'Giáo dục kinh tế và pháp luật', 'Vật lí', 'Hóa học', 'Sinh học', 'Tin học', 'Công nghệ', 'Âm nhạc', 'Mĩ thuật']
};

const BI_DANH_MON = {
  van: 'Ngữ văn', nguvan: 'Ngữ văn', toan: 'Toán',
  anh: 'Tiếng Anh', tienganh: 'Tiếng Anh', su: 'Lịch sử', lichsu: 'Lịch sử',
  theduc: 'Giáo dục thể chất', gdtc: 'Giáo dục thể chất', giaoducthechat: 'Giáo dục thể chất',
  gdqp: 'Giáo dục quốc phòng và an ninh', gdqpan: 'Giáo dục quốc phòng và an ninh', qp: 'Giáo dục quốc phòng và an ninh',
  quocphong: 'Giáo dục quốc phòng và an ninh', giaoducquocphongvaanninh: 'Giáo dục quốc phòng và an ninh',
  hdtn: 'Hoạt động trải nghiệm, hướng nghiệp', hdtnhn: 'Hoạt động trải nghiệm, hướng nghiệp',
  hoatdongtrainghiemhuongnghiep: 'Hoạt động trải nghiệm, hướng nghiệp',
  gddp: 'Nội dung giáo dục của địa phương', noidunggiaoduccuadiaphuong: 'Nội dung giáo dục của địa phương',
  dia: 'Địa lí', diali: 'Địa lí', dialy: 'Địa lí',
  gdktpl: 'Giáo dục kinh tế và pháp luật', ktpl: 'Giáo dục kinh tế và pháp luật', gdcd: 'Giáo dục kinh tế và pháp luật',
  giaodukinhtevaphapluat: 'Giáo dục kinh tế và pháp luật', giaoduckinhtevaphapluat: 'Giáo dục kinh tế và pháp luật',
  ly: 'Vật lí', li: 'Vật lí', vatli: 'Vật lí', vatly: 'Vật lí', hoa: 'Hóa học', hoahoc: 'Hóa học', sinh: 'Sinh học', sinhhoc: 'Sinh học',
  tin: 'Tin học', tinhoc: 'Tin học', congnghe: 'Công nghệ', amnhac: 'Âm nhạc', mythuat: 'Mĩ thuật', mithuat: 'Mĩ thuật'
};

/** Đưa tên môn viết tắt / sai chính tả về tên chuẩn ("văn" → "Ngữ văn"). Môn lạ thì giữ nguyên. */
export function chuanMon(s) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return BI_DANH_MON[khongDau(t)] || t.charAt(0).toUpperCase() + t.slice(1);
}

/** Danh sách môn để hiện trong ô chọn: bắt buộc, lựa chọn, và các môn khác của trường (cấu hình MonKhac). */
export function danhSachMon(cfg) {
  const khac = ((cfg && cfg.MonKhac) || []).map(chuanMon).filter(Boolean);
  const co = DS_MON.batBuoc.concat(DS_MON.luaChon).map(khongDau);
  const rieng = khac.filter(function (m, i) {
    const k = khongDau(m);
    return co.indexOf(k) < 0 && khac.findIndex(function (x) { return khongDau(x) === k; }) === i;   // bỏ trùng và bỏ môn đã có sẵn
  });
  return { batBuoc: DS_MON.batBuoc, luaChon: DS_MON.luaChon, khac: rieng };
}

/** Thứ tự sắp xếp môn: bắt buộc → lựa chọn → môn khác (theo tên). */
export function thuTuMon(m, cfg) {
  const ds = danhSachMon(cfg);
  const tat = ds.batBuoc.concat(ds.luaChon, ds.khac);
  const i = tat.indexOf(m);
  return i >= 0 ? i : 1000;
}
