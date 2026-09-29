/**
 * Code.gs — API cho web tĩnh trên GitHub Pages.
 *
 * GET  -> trả JSONP (?callback=xxx) để tránh CORS preflight.
 * POST -> nhận Content-Type: text/plain (cũng để tránh preflight), body là JSON.
 *
 * Deploy: Triển khai → Ứng dụng web
 *   - Thực thi với tư cách: Tôi
 *   - Ai có quyền truy cập: Bất kỳ ai
 */

function doGet(e) {
  const p = e.parameter || {};
  let kq;
  try {
    kq = { ok: true, data: xuLy(p.action, p, null) };
  } catch (err) {
    kq = { ok: false, error: String(err && err.message || err) };
  }
  const json = JSON.stringify(kq);
  if (p.callback && /^__jsonp_[a-zA-Z0-9_]+$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let kq;
  try {
    const body = JSON.parse(e.postData.contents);
    const phien = body.action !== 'dangNhap' && body.token ? giaiToken(body.token) : null;
    kq = { ok: true, data: xuLy(body.action, body, phien) };
  } catch (err) {
    kq = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(kq))
    .setMimeType(ContentService.MimeType.JSON);
}

function xuLy(action, p, phien) {
  switch (action) {
    // ---------- Ai cũng xem được, không cần đăng nhập ----------
    case 'thongTinLop':   return apiThongTinLop();
    case 'danhMuc':       return apiDanhMuc();
    case 'lichTuan':      return apiLichTuan();
    case 'dsHocSinh':     return apiDsHocSinh(phien);
    case 'bangLop':       return apiBangLop(p.thang);
    case 'chiTietHS':     return apiChiTietHS(p.maHS);
    case 'bangXepHangTo': return apiBangXepHangTo(p.maTuan);

    // ---------- Cần đăng nhập: nhập liệu ----------
    case 'dangNhap':      return apiDangNhap(p.tenDangNhap, p.matKhau);
    case 'luoiTuan':      return apiLuoiTuan(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.maTuan);
    case 'luuLuoiTuan':   return apiLuuLuoiTuan(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.maTuan, p.dong);
    case 'taoTuan':       return apiTaoTuan(canQuyen(phien, ['LOP_TRUONG', 'GVCN']), p.tuan);
    case 'suaTuan':       return apiSuaTuan(canQuyen(phien, ['LOP_TRUONG', 'GVCN']), p.maTuan, p.tuan);
    case 'xoaTuan':       return apiXoaTuan(canQuyen(phien, ['LOP_TRUONG', 'GVCN']), p.maTuan);
    case 'xoaNhatKy':     return apiXoaNhatKy(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.id);
    case 'luuXepLoai':    return apiLuuXepLoai(canQuyen(phien, ['LOP_TRUONG', 'GVCN']), p.items);

    // ---------- Chỉ GVCN ----------
    case 'tinhLai':       canQuyen(phien, ['GVCN']); return { soBanGhi: tinhLaiTatCa() };
    case 'chotThang':     return { soHS: chotThang(p.thang, canQuyen(phien, ['GVCN']).ten) };
    case 'duyetCaNam':    return apiDuyetCaNam(canQuyen(phien, ['GVCN']), p.maHS, p.xepLoai, p.ghiChu);
    case 'xuatExcel':     return apiXuatExcel(canQuyen(phien, ['GVCN']));

    default: throw new Error('Không rõ action: ' + action);
  }
}

// =============== CÔNG KHAI ===============

function apiThongTinLop() {
  const cfg = docCauHinh();
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
  const to = {};
  hs.forEach(function (h) { to[h.To] = (to[h.To] || 0) + 1; });
  return {
    truong: cfg.Truong, lop: cfg.Lop, namHoc: cfg.NamHoc,
    siSo: hs.length,
    to: Object.keys(to).sort().map(function (k) { return { ten: k, siSo: to[k] }; }),
    congKhaiBangLop: String(cfg.CongKhaiBangLop).toUpperCase() === 'TRUE',
    tuanHienTai: tuanMoiNhat()
  };
}

function apiBangXepHangTo(maTuan) {
  const cfg = docCauHinh();
  const diemCoSan = Number(cfg.DiemCoSanTo) || 0;
  const hs = indexBy(docBang(SHEETS.HS), 'MaHS');
  const tuan = maTuan || (tuanCuaNgay(new Date()) || {}).MaTuan;

  const diemTo = {};
  Object.keys(hs).forEach(function (m) {
    const t = hs[m].To;
    if (t && diemTo[t] === undefined) diemTo[t] = 0;
  });

  docBang(SHEETS.NHATKY).forEach(function (r) {
    if (r.TrangThai !== 'HOAT_DONG' || r.MaTuan !== tuan) return;
    const h = hs[r.MaHS];
    if (!h || !h.To) return;
    diemTo[h.To] = (diemTo[h.To] || 0) + (Number(r.Diem) || 0);
  });

  const ds = Object.keys(diemTo).sort().map(function (t) {
    return { to: t, diemHS: diemTo[t], diemCoSan: diemCoSan, tong: diemTo[t] + diemCoSan };
  });
  ds.sort(function (a, b) { return b.tong - a.tong; });
  ds.forEach(function (x, i) { x.hang = i + 1; });
  return { maTuan: tuan, bang: ds };
}

function apiDanhMuc() {
  return {
    loi: docBang(SHEETS.LOI).filter(function (r) { return String(r.HienThi).toUpperCase() !== 'FALSE'; }),
    cong: docBang(SHEETS.CONG).filter(function (r) { return String(r.HienThi).toUpperCase() !== 'FALSE'; })
  };
}

function apiLichTuan() {
  const cfg = docCauHinh();
  return docBang(SHEETS.TUAN).map(function (t) {
    const thang = thangTheoDoiTuan(t);
    return Object.assign({}, t, {
      TuNgay: fmtNgay(t.TuNgay), DenNgay: fmtNgay(t.DenNgay),
      Thang: thang, HocKy: hocKyTheoThang(thang, cfg)
    });
  });
}

// =============== CHI TIẾT 1 HỌC SINH (ai cũng xem được) ===============

function apiChiTietHS(maHS) {
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.MaHS === maHS; })[0];
  if (!hs) throw new Error('Không tìm thấy học sinh');

  const dsTuan = docBang(SHEETS.TUAN);
  const tuan = indexBy(dsTuan, 'MaTuan');
  const lichTuan = dsTuan.map(function (t) {
    const thang = thangTheoDoiTuan(t);
    return {
      maTuan: t.MaTuan, soTuan: t.SoTuan, thang: thang,
      tuNgay: fmtNgay(t.TuNgay), denNgay: fmtNgay(t.DenNgay)
    };
  });
  const chiTiet = docBang(SHEETS.NHATKY)
    .filter(function (r) { return r.MaHS === maHS && r.TrangThai === 'HOAT_DONG'; })
    .map(function (r) {
      const c = COT[r.Ma];
      const t = tuan[r.MaTuan];
      return {
        ngay: fmtNgay(r.Ngay), thang: thangCuaNhatKy(r, tuan), maTuan: r.MaTuan, loai: r.Loai,
        soTuan: t ? t.SoTuan : '',
        tuNgay: t ? fmtNgay(t.TuNgay) : '',
        denNgay: t ? fmtNgay(t.DenNgay) : '',
        ten: r.MoTa || (c ? c.ten : r.Ma),
        cot: c ? c.ten : '', nhom: c ? c.nhom : '',
        diem: Number(r.Diem) || 0, moTa: ''
      };
    })
    .sort(function (a, b) { return a.tuNgay < b.tuNgay ? 1 : -1; });

  const thang = docBang(SHEETS.THANG)
    .filter(function (r) { return r.MaHS === maHS; })
    .map(function (r) {
      return {
        thang: r.Thang, hocKy: r.HocKy, xepLoai: r.XepLoai, nhan: NHAN[r.XepLoai] || '',
        diemThiDua: r.DiemThiDua, soLanGhiSo: r.SoLanGhiSo, soLanHaBac: r.SoLanHaBac,
        loiNhoTonKho: r.LoiNhoTonKho, daChot: String(r.DaChot).toUpperCase() === 'TRUE'
      };
    });

  const ky = docBang(SHEETS.KY).filter(function (r) { return r.MaHS === maHS; })
    .map(function (r) {
      return { ky: r.Ky, xepLoai: r.XepLoai, nhan: NHAN[r.XepLoai] || '', daDuyet: String(r.DaDuyet).toUpperCase() === 'TRUE', ghiChu: r.GhiChu };
    });

  return { hocSinh: { maHS: hs.MaHS, hoTen: hs.HoTen, to: hs.To, chucVu: hs.ChucVu }, chiTiet: chiTiet, tuan: lichTuan, thang: thang, ky: ky };
}

// =============== ĐĂNG NHẬP ===============

function apiDangNhap(ten, mk) {
  const tk = docBang(SHEETS.TK).filter(function (r) {
    return String(r.TenDangNhap).toLowerCase() === String(ten).toLowerCase();
  })[0];
  Utilities.sleep(400);
  if (!tk || tk.TrangThai !== 'HOAT_DONG' || tk.MatKhauHash !== hashMK(mk)) {
    ghiLog(ten, 'DANG_NHAP_LOI', '');
    throw new Error('Sai tên đăng nhập hoặc mật khẩu');
  }
  ghiLog(ten, 'DANG_NHAP', tk.VaiTro);
  return {
    token: taoToken(tk),
    hoTen: tk.HoTen, vaiTro: tk.VaiTro, toPhuTrach: tk.ToPhuTrach
  };
}

function taoToken(tk) {
  const payload = { ten: tk.TenDangNhap, vaiTro: tk.VaiTro, to: tk.ToPhuTrach, hetHan: Date.now() + 12 * 3600 * 1000 };
  const s = Utilities.base64EncodeWebSafe(JSON.stringify(payload));
  return s + '.' + kyChuoi(s);
}

function giaiToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 2 || kyChuoi(parts[0]) !== parts[1]) throw new Error('Phiên không hợp lệ');
  const p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  if (!Number.isFinite(p.hetHan) || Date.now() > p.hetHan) throw new Error('Phiên đã hết hạn, vui lòng đăng nhập lại');
  const tk = docBang(SHEETS.TK).filter(function (r) { return r.TenDangNhap === p.ten; })[0];
  if (!tk || tk.TrangThai !== 'HOAT_DONG') throw new Error('Tài khoản đã ngừng hoạt động');
  return { ten: tk.TenDangNhap, vaiTro: tk.VaiTro, to: tk.ToPhuTrach, hetHan: p.hetHan };
}

function kyChuoi(s) {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SECRET');
  if (!secret || secret === 'doi-chuoi-nay-di') {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      secret = props.getProperty('SECRET');
      if (!secret || secret === 'doi-chuoi-nay-di') {
        secret = Utilities.getUuid() + Utilities.getUuid();
        props.setProperty('SECRET', secret);
      }
    } finally { lock.releaseLock(); }
  }
  const b = Utilities.computeHmacSha256Signature(s, secret);
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

function canQuyen(phien, dsVaiTro) {
  if (!phien) throw new Error('Cần đăng nhập');
  if (dsVaiTro.indexOf(phien.vaiTro) < 0) throw new Error('Không đủ quyền');
  return phien;
}

// =============== CÁN BỘ LỚP ===============

function kiemTraTo(phien) {
  if (phien && phien.vaiTro === 'TO_TRUONG' && !phien.to) {
    throw new Error('Tài khoản chưa được phân tổ. Nhờ GVCN điền ToPhuTrach trong TaiKhoan.');
  }
}

function apiDsHocSinh(phien) {
  kiemTraTo(phien);
  let hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
  if (phien && phien.vaiTro === 'TO_TRUONG' && phien.to) {
    hs = hs.filter(function (r) { return r.To === phien.to; });
  }
  return hs.map(function (r) { return { maHS: r.MaHS, hoTen: r.HoTen, to: r.To, chucVu: r.ChucVu }; });
}


/**
 * Trang tuần mới nhất (theo ngày bắt đầu). Web mở lên là vào thẳng tuần này.
 */
function tuanMoiNhat() {
  const ds = docBang(SHEETS.TUAN).filter(function (t) { return t.MaTuan; });
  if (!ds.length) return null;
  ds.sort(function (a, b) { return fmtNgay(a.TuNgay) < fmtNgay(b.TuNgay) ? 1 : -1; });
  const t = ds[0];
  return {
    MaTuan: t.MaTuan, SoTuan: t.SoTuan,
    TuNgay: fmtNgay(t.TuNgay), DenNgay: fmtNgay(t.DenNgay),
    Thang: thangTheoDoiTuan(t), HocKy: t.HocKy
  };
}

/**
 * Tạo một trang tuần mới — giống mở trang mới trong sổ giấy.
 * Cán bộ lớp tự điền tuần mấy, từ ngày đến ngày. Tuần nghỉ thì không tạo.
 */
function apiTaoTuan(phien, t) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const soTuan = Number(t && t.soTuan);
    if (!soTuan || soTuan < 1 || soTuan > 60) throw new Error('Số tuần phải từ 1 đến 60');

    const tu = ngayTu(t.tuNgay), den = ngayTu(t.denNgay);
    const sTu = fmtNgay(tu), sDen = fmtNgay(den);
    if (sDen < sTu) throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
    if ((den - tu) / 86400000 > 13) throw new Error('Một trang tuần không quá 14 ngày');

    const ds = docBang(SHEETS.TUAN);
    if (ds.some(function (r) { return fmtNgay(r.TuNgay) === sTu; })) {
      throw new Error('Đã có trang tuần bắt đầu từ ngày ' + sTu);
    }
    if (ds.some(function (r) { return Number(r.SoTuan) === soTuan; })) {
      throw new Error('Đã có trang "Tuần ' + soTuan + '". Mỗi tuần chỉ tạo một trang.');
    }
    // Không cho hai trang tuần chồng ngày lên nhau
    const chong = ds.filter(function (r) {
      return fmtNgay(r.TuNgay) <= sDen && sTu <= fmtNgay(r.DenNgay);
    })[0];
    if (chong) {
      throw new Error('Khoảng ngày này trùng với Tuần ' + chong.SoTuan +
        ' (' + fmtNgay(chong.TuNgay) + ' đến ' + fmtNgay(chong.DenNgay) + ')');
    }

    const cfg = docCauHinh();
    const thang = thangTheoDoiTuan({ TuNgay: sTu, DenNgay: sDen });
    const maTuan = 'T' + sTu;

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TUAN);
    sh.getRange('C2:D300').setNumberFormat('@');
    sh.getRange(sh.getLastRow() + 1, 1, 1, SCHEMA.TuanHoc.length).setValues([[
      maTuan, soTuan, sTu, sDen, thang, hocKyTheoThang(thang, cfg),
      (t.ghiChu || ''), phien.ten, new Date()
    ]]);

    ghiLog(phien.ten, 'TAO_TUAN', 'Tuần ' + soTuan + ' (' + sTu + ' -> ' + sDen + ')');
    return { maTuan: maTuan, soTuan: soTuan, tuNgay: sTu, denNgay: sDen, thang: thang };
  } finally {
    lock.releaseLock();
  }
}

/** Sửa thông tin một trang tuần (số tuần, khoảng ngày, ghi chú). */
function apiSuaTuan(phien, maTuan, t) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TUAN);
    const head = SCHEMA.TuanHoc;
    const n = sh.getLastRow() - 1;
    if (n <= 0) throw new Error('Chưa có trang tuần nào');
    const vals = sh.getRange(2, 1, n, head.length).getValues();
    const iMa = head.indexOf('MaTuan'), iSo = head.indexOf('SoTuan');
    const iTu = head.indexOf('TuNgay'), iDen = head.indexOf('DenNgay');
    const iThang = head.indexOf('Thang'), iHK = head.indexOf('HocKy'), iGC = head.indexOf('GhiChu');

    for (let i = 0; i < vals.length; i++) {
      if (vals[i][iMa] !== maTuan) continue;
      const soTuan = Number(t.soTuan);
      if (!soTuan || soTuan < 1 || soTuan > 60) throw new Error('Số tuần phải từ 1 đến 60');
      const sTu = fmtNgay(ngayTu(t.tuNgay)), sDen = fmtNgay(ngayTu(t.denNgay));
      if (sDen < sTu) throw new Error('Ngày kết thúc phải sau ngày bắt đầu');

      // Kiểm tra trùng với các trang khác
      for (let j = 0; j < vals.length; j++) {
        if (j === i || !vals[j][iMa]) continue;
        if (Number(vals[j][iSo]) === soTuan) throw new Error('Đã có trang "Tuần ' + soTuan + '"');
        if (fmtNgay(vals[j][iTu]) <= sDen && sTu <= fmtNgay(vals[j][iDen])) {
          throw new Error('Khoảng ngày trùng với Tuần ' + vals[j][iSo]);
        }
      }

      const thang = thangTheoDoiTuan({ TuNgay: sTu, DenNgay: sDen });
      vals[i][iSo] = soTuan; vals[i][iTu] = sTu; vals[i][iDen] = sDen;
      vals[i][iThang] = thang; vals[i][iHK] = hocKyTheoThang(thang, docCauHinh());
      vals[i][iGC] = t.ghiChu || '';
      sh.getRange(2 + i, 1, 1, head.length).setValues([vals[i]]);
      ghiLog(phien.ten, 'SUA_TUAN', maTuan + ' -> Tuần ' + soTuan);
      tinhLaiTatCa();
      return { ok: true };
    }
    throw new Error('Không tìm thấy trang tuần này');
  } finally {
    lock.releaseLock();
  }
}

/** Xoá một trang tuần. Chỉ xoá được khi trang đó chưa ghi mục nào. */
function apiXoaTuan(phien, maTuan) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const coMuc = docBang(SHEETS.NHATKY).some(function (r) {
      return r.MaTuan === maTuan && r.TrangThai === 'HOAT_DONG';
    });
    if (coMuc) {
      throw new Error('Trang tuần này đã có dữ liệu. Xoá hết nội dung trong các ô ' +
        'rồi bấm Lưu trước, sau đó mới xoá được trang.');
    }
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TUAN);
    const head = SCHEMA.TuanHoc;
    const n = sh.getLastRow() - 1;
    if (n <= 0) throw new Error('Chưa có trang tuần nào');
    const vals = sh.getRange(2, 1, n, head.length).getValues();
    const iMa = head.indexOf('MaTuan');
    for (let i = 0; i < vals.length; i++) {
      if (vals[i][iMa] === maTuan) {
        sh.deleteRow(2 + i);
        ghiLog(phien.ten, 'XOA_TUAN', maTuan);
        return { ok: true };
      }
    }
    throw new Error('Không tìm thấy trang tuần này');
  } finally {
    lock.releaseLock();
  }
}

/**
 * Đọc lưới thi đua của một tuần — đúng cấu trúc sổ giấy.
 * Trả về mỗi học sinh một dòng, mỗi cột là danh sách các mục đã ghi.
 */
function apiLuoiTuan(phien, maTuan) {
  kiemTraTo(phien);
  const cfg = docCauHinh();
  const diem6 = diemCot(cfg);
  let hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
  if (phien.vaiTro === 'TO_TRUONG' && phien.to) {
    hs = hs.filter(function (r) { return r.To === phien.to; });
  }

  const tuan = docBang(SHEETS.TUAN).filter(function (r) { return r.MaTuan === maTuan; })[0];
  if (!tuan) throw new Error('Không có tuần ' + maTuan + ' trong lịch');
  const thangTuan = thangTheoDoiTuan(tuan);

  const daChot = {};
  docBang(SHEETS.THANG).forEach(function (r) {
    if (String(r.DaChot).toUpperCase() === 'TRUE') daChot[r.MaHS + '|' + r.Thang] = true;
  });

  // Gom các mục đã ghi theo học sinh -> cột
  const theo = {};
  const nhatKy = docBang(SHEETS.NHATKY);
  nhatKy.forEach(function (r) {
    if (r.TrangThai !== 'HOAT_DONG' || r.MaTuan !== maTuan) return;
    if (!theo[r.MaHS]) theo[r.MaHS] = {};
    if (!theo[r.MaHS][r.Ma]) theo[r.MaHS][r.Ma] = [];
    theo[r.MaHS][r.Ma].push(String(r.MoTa || '').trim());
  });

  const dong = hs.map(function (h) {
    const o = { maHS: h.MaHS, hoTen: h.HoTen, chucVu: h.ChucVu, o: {}, tong: 0,
      phienBan: phienBanDong(nhatKy, maTuan, h.MaHS) };
    Object.keys(COT).forEach(function (k) {
      const ds = (theo[h.MaHS] && theo[h.MaHS][k]) || [];
      o.o[k] = ds.join(', ');
      o.tong += ds.length * diem6[k];
    });
    return o;
  });

  const diemCoSan = Number(cfg.DiemCoSan);
  return {
    tuan: {
      maTuan: tuan.MaTuan, soTuan: tuan.SoTuan, thang: thangTuan,
      tuNgay: fmtNgay(tuan.TuNgay), denNgay: fmtNgay(tuan.DenNgay),
      ghiChu: tuan.GhiChu || ''
    },
    cot: Object.keys(COT).map(function (k) {
      return { ma: k, ten: COT[k].ten, diem: diem6[k] };
    }),
    dong: dong,
    tongHS: dong.reduce(function (a, b) { return a + b.tong; }, 0),
    diemCoSan: isNaN(diemCoSan) ? 0 : diemCoSan,
    daChot: !!daChot[(hs[0] || {}).MaHS + '|' + thangTuan]
  };
}

/**
 * Chỉ thay các dòng học sinh được gửi lên, sau khi đối chiếu phiên bản đã đọc.
 * Giữ lịch sử bản cũ và không thay dữ liệu của các học sinh khác.
 *
 * dong: [{ maHS, o: { CONG: 'Hoá*, 10 Toán', NHO_LOP: 'MTT (Anh)', ... } }]
 */
function apiLuuLuoiTuan(phien, maTuan, dong) {
  kiemTraTo(phien);
  if (!Array.isArray(dong) || !dong.length) throw new Error('Chưa có thay đổi để lưu');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const cfg = docCauHinh();
    const diem6 = diemCot(cfg);
    const hs = indexBy(docBang(SHEETS.HS), 'MaHS');
    const nhatKy = docBang(SHEETS.NHATKY);

    const tuan = docBang(SHEETS.TUAN).filter(function (r) { return r.MaTuan === maTuan; })[0];
    if (!tuan) throw new Error('Không tìm thấy trang tuần này. Có thể đã bị xoá.');
    const thangTuan = thangTheoDoiTuan(tuan);
    const hocKyTuan = hocKyTheoThang(thangTuan, cfg);

    const daChot = {};
    docBang(SHEETS.THANG).forEach(function (r) {
      if (String(r.DaChot).toUpperCase() === 'TRUE') daChot[r.MaHS + '|' + r.Thang] = true;
    });

    // Tập học sinh được phép sửa
    const trongPhamVi = {};
    (dong || []).forEach(function (d) {
      const h = hs[d.maHS];
      if (!h || h.TrangThai !== 'DANG_HOC') throw new Error('Không có học sinh đang học ' + d.maHS);
      if (trongPhamVi[d.maHS]) throw new Error('Trùng học sinh trong dữ liệu gửi lên');
      if (!d.o || Object.keys(COT).some(function (k) { return typeof d.o[k] !== 'string'; })) {
        throw new Error('Thiếu nội dung các cột. Hãy tải lại trang trước khi nhập.');
      }
      if (typeof d.phienBan !== 'string') throw new Error('Hãy tải lại trang để cập nhật chức năng lưu');
      if (d.phienBan !== phienBanDong(nhatKy, maTuan, d.maHS)) {
        throw new Error('Dữ liệu của ' + h.HoTen + ' đã được sửa ở phiên khác. Sao chép phần đang nhập rồi tải lại tuần để đối chiếu. Chưa lưu thay đổi nào.');
      }
      if (phien.vaiTro === 'TO_TRUONG' && phien.to && h.To !== phien.to) {
        throw new Error('Bạn chỉ được ghi cho học sinh trong ' + phien.to);
      }
      if (daChot[d.maHS + '|' + thangTuan]) {
        throw new Error('Tháng ' + thangTuan + ' đã chốt, không sửa được');
      }
      trongPhamVi[d.maHS] = true;
    });

    // 1. Đánh dấu xoá bản ghi cũ của tuần này, chỉ với HS trong phạm vi
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.NHATKY);
    const head = SCHEMA.NhatKy;
    const n = sh.getLastRow() - 1;
    const vals = n > 0 ? sh.getRange(2, 1, n, head.length).getValues() : [];
    if (n > 0) {
      const iTuan = head.indexOf('MaTuan'), iMa = head.indexOf('MaHS'), iTT = head.indexOf('TrangThai');
      for (let i = 0; i < vals.length; i++) {
        if (vals[i][iTuan] === maTuan && trongPhamVi[vals[i][iMa]] && vals[i][iTT] === 'HOAT_DONG') {
          vals[i][iTT] = 'DA_THAY';
        }
      }
    }

    // 2. Ghi bản ghi mới: mỗi mục trong ô là 1 dòng
    const ngay = fmtNgay(tuan.TuNgay);
    const rows = [];
    (dong || []).forEach(function (d) {
      Object.keys(COT).forEach(function (k) {
        tachMuc(d.o ? d.o[k] : '').forEach(function (muc) {
          rows.push([
            Utilities.getUuid(), d.maHS, ngay, maTuan, thangTuan, hocKyTuan,
            k === 'CONG' ? 'CONG' : 'LOI', k, diem6[k], muc,
            phien.ten, new Date(), 'HOAT_DONG'
          ]);
        });
      });
    });
    // Ghi lịch sử và dữ liệu mới cùng một lần, tránh xoá bản cũ trước khi ghi bản mới.
    const tatCa = vals.concat(rows);
    if (tatCa.length) sh.getRange(2, 1, tatCa.length, head.length).setValues(tatCa);

    ghiLog(phien.ten, 'LUU_LUOI_TUAN', maTuan + ': ' + rows.length + ' mục');
    let canhBao = '';
    try { tinhLaiDuLieu(); }
    catch (e) { canhBao = 'Đã lưu sổ tuần, nhưng chưa cập nhật bảng tổng hợp. Nhờ GVCN bấm Tính lại số liệu.'; }
    const moi = rows.map(function (r) { const o = {}; head.forEach(function (k, i) { o[k] = r[i]; }); return o; });
    const phienBan = {};
    dong.forEach(function (d) { phienBan[d.maHS] = phienBanDong(moi, maTuan, d.maHS); });
    return { soMuc: rows.length, soHS: dong.length, phienBan: phienBan, canhBao: canhBao };
  } finally {
    lock.releaseLock();
  }
}

/** ID đổi mỗi lần sửa một dòng; kiểm tra dưới cùng khóa với thao tác ghi. */
function phienBanDong(nhatKy, maTuan, maHS) {
  return JSON.stringify(nhatKy.filter(function (r) {
    return r.MaTuan === maTuan && r.MaHS === maHS && r.TrangThai === 'HOAT_DONG';
  }).map(function (r) { return String(r.Id); }).sort());
}

/** Tách nội dung một ô thành các mục. Ngăn bằng dấu phẩy, chấm phẩy hoặc xuống dòng. */
function tachMuc(s) {
  if (!s) return [];
  return String(s).split(/[,;\n]+/)
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return x.length > 0; });
}

/** Không xóa cứng - chỉ đổi trạng thái, giữ vết để truy được. */
function apiXoaNhatKy(phien, id) {
  kiemTraTo(phien);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return xoaNhatKyDuLieu(phien, id); }
  finally { lock.releaseLock(); }
}

function xoaNhatKyDuLieu(phien, id) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.NHATKY);
  const head = SCHEMA.NhatKy;
  const n = sh.getLastRow() - 1;
  if (n <= 0) throw new Error('Không có dữ liệu');
  const vals = sh.getRange(2, 1, n, head.length).getValues();
  const iId = head.indexOf('Id'), iTT = head.indexOf('TrangThai'), iNg = head.indexOf('NguoiNhap');
  const cfg = docCauHinh();
  const soNgay = Number(cfg.SoNgayDuocSua) || 7;

  for (let i = 0; i < vals.length; i++) {
    if (vals[i][iId] !== id) continue;
    const maHS = vals[i][head.indexOf('MaHS')];
    const tuan = indexBy(docBang(SHEETS.TUAN), 'MaTuan');
    const thang = thangCuaNhatKy({
      MaTuan: vals[i][head.indexOf('MaTuan')],
      Thang: vals[i][head.indexOf('Thang')]
    }, tuan);
    const h = docBang(SHEETS.HS).filter(function (r) { return r.MaHS === maHS; })[0];
    if (phien.vaiTro === 'TO_TRUONG' && (!h || h.To !== phien.to)) {
      throw new Error('Bạn chỉ được ghi cho học sinh trong ' + phien.to);
    }
    if (docBang(SHEETS.THANG).some(function (r) {
      return r.MaHS === maHS && Number(r.Thang) === Number(thang) && String(r.DaChot).toUpperCase() === 'TRUE';
    })) throw new Error('Tháng ' + thang + ' đã chốt, không sửa được');
    if (phien.vaiTro !== 'GVCN') {
      const tg = new Date(vals[i][head.indexOf('ThoiGian')]);
      if ((Date.now() - tg.getTime()) > soNgay * 86400000) {
        throw new Error('Quá ' + soNgay + ' ngày, chỉ GVCN mới sửa được');
      }
    }
    vals[i][iTT] = 'DA_XOA';
    sh.getRange(2 + i, 1, 1, head.length).setValues([vals[i]]);
    ghiLog(phien.ten, 'XOA_NHAT_KY', id + ' (người nhập: ' + vals[i][iNg] + ')');
    tinhLaiDuLieu();
    return { ok: true };
  }
  throw new Error('Không tìm thấy bản ghi');
}

/**
 * Lưu xếp loại do người nhập chọn. items: [{maHS, thang, xepLoai, ghiChu}]
 * Chỉ lớp trưởng và GVCN được xếp loại (tổ trưởng chỉ ghi nhật ký vi phạm).
 */
function apiLuuXepLoai(phien, items) {
  if (!items || !items.length) return { soBanGhi: 0 };
  items.forEach(function (it) {
    luuXepLoai(it.maHS, it.thang, it.xepLoai || '', it.ghiChu, phien.ten);
  });
  return { soBanGhi: items.length };
}

function apiBangLop(thang) {
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
  const bang = {};
  docBang(SHEETS.THANG).forEach(function (r) { bang[r.MaHS + '|' + r.Thang] = r; });
  return hs.map(function (h) {
    const r = bang[h.MaHS + '|' + thang] || {};
    return {
      maHS: h.MaHS, hoTen: h.HoTen, to: h.To,
      xepLoai: r.XepLoai || '', nhan: NHAN[r.XepLoai] || '',
      deXuat: r.DeXuat || '', nhanDeXuat: NHAN[r.DeXuat] || '',
      nguoiNhap: r.NguoiNhap || '',
      diemThiDua: r.DiemThiDua || 0, soLanGhiSo: r.SoLanGhiSo || 0,
      soLanHaBac: r.SoLanHaBac || 0, daChot: String(r.DaChot).toUpperCase() === 'TRUE'
    };
  });
}

function apiDuyetCaNam(phien, maHS, xepLoai, ghiChu) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.KY);
  const head = SCHEMA.XepLoaiKy;
  const n = sh.getLastRow() - 1;
  const vals = sh.getRange(2, 1, n, head.length).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (vals[i][0] === maHS && vals[i][1] === 'CA_NAM') {
      vals[i][head.indexOf('XepLoai')] = xepLoai;
      vals[i][head.indexOf('DaDuyet')] = true;
      vals[i][head.indexOf('GhiChu')] = ghiChu || '';
      sh.getRange(2 + i, 1, 1, head.length).setValues([vals[i]]);
      ghiLog(phien.ten, 'DUYET_CA_NAM', maHS + ' -> ' + xepLoai);
      return { ok: true };
    }
  }
  throw new Error('Không tìm thấy bản ghi cả năm của ' + maHS);
}

/** Xuất ra đúng cấu trúc 14 sheet của file trường. Trả về link tải. */
function apiXuatExcel(phien) {
  const cfg = docCauHinh();
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
  const thangHK1 = String(cfg.ThangHK1).split(',').map(Number);
  const thangHK2 = String(cfg.ThangHK2).split(',').map(Number);

  const bangThang = {};
  docBang(SHEETS.THANG).forEach(function (r) { bangThang[r.MaHS + '|' + r.Thang] = r; });
  const tuan = indexBy(docBang(SHEETS.TUAN), 'MaTuan');
  const nhatky = docBang(SHEETS.NHATKY).filter(function (r) { return r.TrangThai === 'HOAT_DONG'; });
  const bangKy = {};
  docBang(SHEETS.KY).forEach(function (r) { bangKy[r.MaHS + '|' + r.Ky] = r.XepLoai; });

  const ss = SpreadsheetApp.create('THEO_DOI_NOI_QUY_' + cfg.Lop + '_' + fmtNgay(new Date()));

  // --- Sheet từng tháng ---
  thangHK1.concat(thangHK2).forEach(function (thang) {
    const sh = ss.insertSheet(String(thang));
    sh.getRange(1, 1).setValue('TRƯỜNG ' + cfg.Truong.toUpperCase());
    sh.getRange(2, 1).setValue('ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN THÁNG ' + thang + ' - LỚP: ' + cfg.Lop);
    sh.getRange(3, 1).setValue('NĂM HỌC ' + cfg.NamHoc);
    sh.getRange(4, 1, 1, 5).setValues([['TT', 'Họ tên', 'NHỮNG LỖI VI PHẠM\n(Ngày: Lỗi vi phạm)', 'KẾT QUẢ\nT/K/Đ/CĐ', 'GHI CHÚ']])
      .setFontWeight('bold').setWrap(true);

    const rows = hs.map(function (h, i) {
      const dsLoi = nhatky.filter(function (r) {
        return r.MaHS === h.MaHS && thangCuaNhatKy(r, tuan) === thang && r.Loai === 'LOI';
      }).map(function (r) {
        const d = new Date(r.Ngay);
        const c = COT[r.Ma];
        return d.getDate() + '/' + (d.getMonth() + 1) + ': ' + (r.MoTa || (c ? c.ten : r.Ma));
      }).join('\n');
      const xl = bangThang[h.MaHS + '|' + thang];
      return [i + 1, h.HoTen, dsLoi, (xl && NHAN[xl.XepLoai]) || '', (xl && xl.GhiChu) || ''];
    });
    sh.getRange(5, 1, rows.length, 5).setValues(rows).setWrap(true);

    const dem = { TOT: 0, KHA: 0, DAT: 0, CHUA_DAT: 0 };
    hs.forEach(function (h) {
      const xl = bangThang[h.MaHS + '|' + thang];
      if (xl && dem[xl.XepLoai] !== undefined) dem[xl.XepLoai]++;
    });
    sh.getRange(5 + rows.length, 1).setValue(
      'TỔNG: ' + hs.length + ' HS    TỐT: ' + dem.TOT + '    KHÁ: ' + dem.KHA +
      '    ĐẠT: ' + dem.DAT + '    CHƯA ĐẠT: ' + dem.CHUA_DAT);
    sh.getRange(7 + rows.length, 1).setValue('  BAN GIÁM HIỆU              KHỐI TRƯỞNG CHỦ NHIỆM              GIÁO VIÊN CHỦ NHIỆM');
    sh.setColumnWidth(2, 220); sh.setColumnWidth(3, 400);
  });

  // --- Sheet HK1 / HK2 ---
  [['HK1', thangHK1, 'HỌC KỲ I'], ['HK2', thangHK2, 'HỌC KỲ II']].forEach(function (cfgKy) {
    const sh = ss.insertSheet(cfgKy[0]);
    sh.getRange(1, 1).setValue('TRƯỜNG ' + cfg.Truong.toUpperCase());
    sh.getRange(2, 1).setValue('ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN LỚP: ' + cfg.Lop);
    sh.getRange(3, 1).setValue(cfgKy[2] + ' - NĂM HỌC ' + cfg.NamHoc);
    const head = ['TT', 'Họ tên'].concat(cfgKy[1].map(function (t) { return 'Tháng ' + t; }));
    head.push(cfgKy[0] === 'HK1' ? 'HK I' : 'HK II');
    if (cfgKy[0] === 'HK2') { head.push('HK I', 'CẢ NĂM'); }
    head.push('GHI CHÚ');
    sh.getRange(4, 1, 1, head.length).setValues([head]).setFontWeight('bold');

    const rows = hs.map(function (h, i) {
      const r = [i + 1, h.HoTen];
      cfgKy[1].forEach(function (t) {
        const x = bangThang[h.MaHS + '|' + t];
        r.push(x ? NHAN[x.XepLoai] : '');
      });
      r.push(NHAN[bangKy[h.MaHS + '|' + cfgKy[0]]] || '');
      if (cfgKy[0] === 'HK2') {
        r.push(NHAN[bangKy[h.MaHS + '|HK1']] || '');
        r.push(NHAN[bangKy[h.MaHS + '|CA_NAM']] || '');
      }
      r.push('');
      return r;
    });
    sh.getRange(5, 1, rows.length, head.length).setValues(rows);
    sh.setColumnWidth(2, 220);
  });

  ss.deleteSheet(ss.getSheetByName('Sheet1'));
  ghiLog(phien.ten, 'XUAT_EXCEL', ss.getId());
  return { url: ss.getUrl(), ten: ss.getName() };
}
