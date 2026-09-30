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
    // ---------- Không cần đăng nhập ----------
    // Chỉ tên lớp / trường, để trang đăng nhập hiện được tiêu đề. Không có dữ liệu học sinh.
    case 'thongTinLop':   return apiThongTinLop();

    // ---------- Xem dữ liệu: phải đăng nhập ----------
    // Phụ huynh chỉ xem được con mình, kiểm tra bên trong từng hàm.
    case 'danhMuc':       canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']); return apiDanhMuc();
    case 'lichTuan':      canQuyen(phien, ['PHU_HUYNH', 'TO_TRUONG', 'LOP_TRUONG', 'GVCN']); return apiLichTuan();
    case 'dsHocSinh':     return apiDsHocSinh(canQuyen(phien, ['PHU_HUYNH', 'TO_TRUONG', 'LOP_TRUONG', 'GVCN']));
    case 'bangLop':       return apiBangLop(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.thang);
    case 'chiTietHS':     return apiChiTietHS(canQuyen(phien, ['PHU_HUYNH', 'TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.maHS);

    // ---------- Cần đăng nhập: nhập liệu ----------
    case 'dangNhap':      return apiDangNhap(p.tenDangNhap, p.matKhau);
    case 'danhMucDayDu':  canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']); return apiDanhMucDayDu();
    case 'doiMatKhau':    return apiDoiMatKhau(canQuyen(phien, ['PHU_HUYNH', 'TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.mkCu, p.mkMoi);
    case 'nhatKyHS':      return apiNhatKyHS(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.maHS, p.maTuan);
    case 'themNhatKy':    return apiThemNhatKy(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.muc);
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
  return {
    truong: cfg.Truong, lop: cfg.Lop, namHoc: cfg.NamHoc,
    siSo: hs.length,
    tuanHienTai: tuanMoiNhat()
  };
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

function apiChiTietHS(phien, maHS) {
  // Phụ huynh chỉ được xem đúng con mình
  if (phien.vaiTro === 'PHU_HUYNH') {
    if (!phien.maHS) throw new Error('Tài khoản chưa gắn với học sinh nào. Nhờ cô chủ nhiệm kiểm tra lại.');
    maHS = phien.maHS;
  }
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
  const dmLoi = indexBy(docBang(SHEETS.LOI), 'MaLoi');
  const dmCong = indexBy(docBang(SHEETS.CONG), 'MaCong');
  const chiTiet = docBang(SHEETS.NHATKY)
    .filter(function (r) { return r.MaHS === maHS && r.TrangThai === 'HOAT_DONG'; })
    .map(function (r) {
      const dm = r.Loai === 'CONG' ? dmCong[r.Ma] : dmLoi[r.Ma];
      const t = tuan[r.MaTuan];
      // Mục "khác" do người nhập tự gõ -> lấy nội dung đã ghi làm tên
      const tuGo = (r.Ma === 'KHAC' || r.Ma === 'CONG_KHAC') && r.MoTa;
      return {
        ngay: fmtNgay(r.Ngay), thang: thangCuaNhatKy(r, tuan), maTuan: r.MaTuan, loai: r.Loai,
        soTuan: t ? t.SoTuan : '',
        tuNgay: t ? fmtNgay(t.TuNgay) : '',
        denNgay: t ? fmtNgay(t.DenNgay) : '',
        ten: tuGo ? r.MoTa : (dm ? (dm.TenLoi || dm.TenCong) : r.Ma),
        cot: dm ? dm.NhomCha : '', nhom: dm ? dm.Nhom : '',
        mon: r.Mon || '',
        ghiChu: tuGo ? '' : (r.MoTa || ''),
        diem: Number(r.Diem) || 0, moTa: ''
      };
    })
    .sort(function (a, b) { return a.ngay < b.ngay ? 1 : -1; });

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

  const diemTuan = docBang(SHEETS.TUANXL)
    .filter(function (r) { return r.MaHS === maHS; })
    .map(function (r) {
      return {
        maTuan: r.MaTuan, soTuan: r.SoTuan, thang: r.Thang,
        batDau: soHoac(r.DiemBatDau, 0), cong: soHoac(r.DiemCong, 0),
        tru: soHoac(r.DiemTru, 0), cuoi: soHoac(r.DiemCuoi, 0),
        soLoi: soHoac(r.SoLoi, 0),
        xepLoai: r.XepLoai, nhan: NHAN[r.XepLoai] || ''
      };
    });

  return { hocSinh: { maHS: hs.MaHS, hoTen: hs.HoTen, to: hs.To, chucVu: hs.ChucVu },
           chiTiet: chiTiet, tuan: lichTuan, diemTuan: diemTuan, thang: thang, ky: ky };
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
    hoTen: tk.HoTen, vaiTro: tk.VaiTro, toPhuTrach: tk.ToPhuTrach,
    maHS: tk.MaHS || '',
    lanDau: laDung(tk.LanDau)     // TRUE -> web bắt đổi mật khẩu trước khi vào
  };
}

function taoToken(tk) {
  const payload = { ten: tk.TenDangNhap, vaiTro: tk.VaiTro, to: tk.ToPhuTrach,
                    maHS: tk.MaHS || '', hetHan: Date.now() + 12 * 3600 * 1000 };
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
  return { ten: tk.TenDangNhap, vaiTro: tk.VaiTro, to: tk.ToPhuTrach,
           maHS: tk.MaHS || '', lanDau: laDung(tk.LanDau), hetHan: p.hetHan };
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
  if (phien && phien.vaiTro === 'PHU_HUYNH') {
    hs = hs.filter(function (r) { return r.MaHS === phien.maHS; });
  }
  if (phien && phien.vaiTro === 'TO_TRUONG' && phien.to) {
    hs = hs.filter(function (r) { return r.To === phien.to; });
  }
  return hs.map(function (r) { return { maHS: r.MaHS, hoTen: r.HoTen, to: r.To, chucVu: r.ChucVu }; });
}


/**
 * Trang tuần web nên mở sẵn khi vào:
 *   1. Tuần đang chứa hôm nay
 *   2. Nếu không có, tuần gần nhất đã bắt đầu (trường hợp tuần này chưa tạo trang)
 *   3. Nếu chưa tuần nào bắt đầu, tuần sớm nhất (đầu năm học, tạo trước)
 * Không lấy "ngày lớn nhất" vì nếu tạo sẵn trang cho cả năm thì sẽ nhảy vào tháng 5.
 */
function tuanMoiNhat() {
  const ds = docBang(SHEETS.TUAN).filter(function (t) { return t.MaTuan; });
  if (!ds.length) return null;
  ds.sort(function (a, b) { return fmtNgay(a.TuNgay) < fmtNgay(b.TuNgay) ? -1 : 1; });

  const homNay = fmtNgay(new Date());
  let chon = ds.filter(function (t) {
    return fmtNgay(t.TuNgay) <= homNay && homNay <= fmtNgay(t.DenNgay);
  })[0];
  if (!chon) {
    const daQua = ds.filter(function (t) { return fmtNgay(t.TuNgay) <= homNay; });
    chon = daQua.length ? daQua[daQua.length - 1] : ds[0];
  }
  return {
    MaTuan: chon.MaTuan, SoTuan: chon.SoTuan,
    TuNgay: fmtNgay(chon.TuNgay), DenNgay: fmtNgay(chon.DenNgay),
    Thang: thangTheoDoiTuan(chon), HocKy: chon.HocKy
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
 * Đổi mật khẩu. Lần đầu đăng nhập, phụ huynh bắt buộc gọi hàm này.
 */
function apiDoiMatKhau(phien, mkCu, mkMoi) {
  if (!mkMoi || String(mkMoi).length < 6) {
    throw new Error('Mật khẩu mới phải từ 6 ký tự trở lên');
  }
  if (String(mkMoi) === String(mkCu)) {
    throw new Error('Mật khẩu mới phải khác mật khẩu cũ');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.TK);
    const head = SCHEMA.TaiKhoan;
    const n = sh.getLastRow() - 1;
    if (n <= 0) throw new Error('Không có tài khoản nào');
    const vals = sh.getRange(2, 1, n, head.length).getValues();
    const iTen = head.indexOf('TenDangNhap'), iHash = head.indexOf('MatKhauHash');
    const iLanDau = head.indexOf('LanDau'), iGC = head.indexOf('GhiChu');

    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][iTen]).toLowerCase() !== String(phien.ten).toLowerCase()) continue;
      if (vals[i][iHash] !== hashMK(mkCu)) throw new Error('Mật khẩu cũ không đúng');
      vals[i][iHash] = hashMK(mkMoi);
      vals[i][iLanDau] = false;
      vals[i][iGC] = 'Đã tự đổi mật khẩu ' + fmtNgay(new Date());
      sh.getRange(2 + i, 1, 1, head.length).setValues([vals[i]]);
      ghiLog(phien.ten, 'DOI_MAT_KHAU', '');
      return { ok: true };
    }
    throw new Error('Không tìm thấy tài khoản');
  } finally {
    lock.releaseLock();
  }
}

/** Danh mục lỗi và điểm cộng, kèm nhóm cha để web dựng ô chọn có phân nhóm. */
function apiDanhMucDayDu() {
  const hien = function (r) { return String(r.HienThi).toUpperCase() !== 'FALSE'; };
  return {
    loi: docBang(SHEETS.LOI).filter(hien).map(function (r) {
      return {
        ma: r.MaLoi, ten: r.TenLoi, nhomCha: r.NhomCha, nhom: r.Nhom,
        diem: soHoac(r.DiemTru, 0), canMon: laDung(r.CanMon),
        nhanDoi: laDung(r.NhanDoiTuLan2), ghiSo: laDung(r.GhiSoDauBai),
        tuNhap: r.MaLoi === 'KHAC'
      };
    }),
    cong: docBang(SHEETS.CONG).filter(hien).map(function (r) {
      return {
        ma: r.MaCong, ten: r.TenCong, nhomCha: r.NhomCha,
        diem: soHoac(r.DiemCong, 0), canMon: laDung(r.CanMon),
        tuNhap: r.MaCong === 'CONG_KHAC'
      };
    })
  };
}

/**
 * Nhật ký theo NGÀY của một học sinh trong một tuần — đúng bảng cô gửi:
 *   ngày | Lỗi vi phạm - Môn | Môn - Điểm tốt | Môn - Điểm kém | Ghi chú
 */
function apiNhatKyHS(phien, maHS, maTuan) {
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.MaHS === maHS; })[0];
  if (!hs) throw new Error('Không tìm thấy học sinh');
  if (phien.vaiTro === 'TO_TRUONG' && phien.to && hs.To !== phien.to) {
    throw new Error('Bạn chỉ xem được học sinh trong ' + phien.to);
  }

  const tuan = docBang(SHEETS.TUAN).filter(function (r) { return r.MaTuan === maTuan; })[0];
  if (!tuan) throw new Error('Không tìm thấy trang tuần này');

  const dmLoi = indexBy(docBang(SHEETS.LOI), 'MaLoi');
  const dmCong = indexBy(docBang(SHEETS.CONG), 'MaCong');

  const ds = docBang(SHEETS.NHATKY).filter(function (r) {
    return r.MaHS === maHS && r.MaTuan === maTuan && r.TrangThai === 'HOAT_DONG';
  }).map(function (r) {
    const dm = r.Loai === 'CONG' ? dmCong[r.Ma] : dmLoi[r.Ma];
    const tuGo = (r.Ma === 'KHAC' || r.Ma === 'CONG_KHAC');
    return {
      id: r.Id, ngay: fmtNgay(r.Ngay), loai: r.Loai, ma: r.Ma,
      ten: tuGo && r.MoTa ? r.MoTa : (dm ? (dm.TenLoi || dm.TenCong) : r.Ma),
      nhomCha: dm ? dm.NhomCha : '', nhom: dm ? dm.Nhom : '',
      mon: r.Mon || '', diem: soHoac(r.Diem, 0),
      ghiChu: tuGo ? '' : (r.MoTa || ''),
      nguoiNhap: r.NguoiNhap
    };
  }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; });

  const cfg = docCauHinh();
  const batDau = soHoac(cfg.DiemXuatPhatTuan, 100);
  const xl = docBang(SHEETS.TUANXL).filter(function (r) {
    return r.MaHS === maHS && r.MaTuan === maTuan;
  })[0] || {};

  return {
    hocSinh: { maHS: hs.MaHS, hoTen: hs.HoTen, chucVu: hs.ChucVu },
    tuan: {
      maTuan: tuan.MaTuan, soTuan: tuan.SoTuan,
      tuNgay: fmtNgay(tuan.TuNgay), denNgay: fmtNgay(tuan.DenNgay),
      thang: thangTheoDoiTuan(tuan)
    },
    dong: ds,
    tong: {
      batDau: soHoac(xl.DiemBatDau, batDau),
      cong: soHoac(xl.DiemCong, 0),
      tru: soHoac(xl.DiemTru, 0),
      cuoi: soHoac(xl.DiemCuoi, batDau),
      soLoi: soHoac(xl.SoLoi, 0),
      xepLoai: xl.XepLoai || '', nhan: NHAN[xl.XepLoai] || ''
    }
  };
}

/**
 * Thêm một dòng nhật ký cho học sinh vào một ngày cụ thể.
 * muc: { maHS, ngay, loai:'LOI'|'CONG', ma, mon, ghiChu, diem (chỉ cho mục "khác") }
 */
function apiThemNhatKy(phien, muc) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const hs = indexBy(docBang(SHEETS.HS), 'MaHS');
    const h = hs[muc.maHS];
    if (!h || h.TrangThai !== 'DANG_HOC') throw new Error('Không có học sinh đang học ' + muc.maHS);
    if (phien.vaiTro === 'TO_TRUONG' && phien.to && h.To !== phien.to) {
      throw new Error('Bạn chỉ được ghi cho học sinh trong ' + phien.to);
    }

    const ngay = fmtNgay(ngayTu(muc.ngay));
    const tuan = docBang(SHEETS.TUAN).filter(function (t) {
      return t.MaTuan && fmtNgay(t.TuNgay) <= ngay && ngay <= fmtNgay(t.DenNgay);
    })[0];
    if (!tuan) throw new Error('Ngày ' + ngay + ' không nằm trong trang tuần nào. Hãy tạo trang tuần trước.');

    const thang = thangTheoDoiTuan(tuan);
    const cfg = docCauHinh();
    if (docBang(SHEETS.THANG).some(function (r) {
      return r.MaHS === muc.maHS && Number(r.Thang) === Number(thang) && laDung(r.DaChot);
    })) throw new Error('Tháng ' + thang + ' đã chốt, không ghi thêm được');

    const laCong = muc.loai === 'CONG';
    const dm = laCong
      ? docBang(SHEETS.CONG).filter(function (r) { return r.MaCong === muc.ma; })[0]
      : docBang(SHEETS.LOI).filter(function (r) { return r.MaLoi === muc.ma; })[0];
    if (!dm) throw new Error('Không có mã "' + muc.ma + '" trong danh mục');

    const tuNhap = muc.ma === 'KHAC' || muc.ma === 'CONG_KHAC';
    let diem;
    if (tuNhap) {
      if (!String(muc.ghiChu || '').trim()) throw new Error('Mục "khác" cần ghi rõ nội dung');
      diem = Number(muc.diem);
      if (isNaN(diem) || diem === 0) throw new Error('Mục "khác" cần nhập số điểm khác 0');
      diem = laCong ? Math.abs(diem) : -Math.abs(diem);
    } else {
      diem = soHoac(laCong ? dm.DiemCong : dm.DiemTru, 0);
    }

    if (laDung(dm.CanMon) && !String(muc.mon || '').trim()) {
      throw new Error('Mục "' + (dm.TenLoi || dm.TenCong) + '" cần ghi rõ môn học');
    }

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.NHATKY);
    sh.getRange(sh.getLastRow() + 1, 1, 1, SCHEMA.NhatKy.length).setValues([[
      Utilities.getUuid(), muc.maHS, ngay, tuan.MaTuan, thang, hocKyTheoThang(thang, cfg),
      laCong ? 'CONG' : 'LOI', muc.ma, String(muc.mon || '').trim(), diem,
      String(muc.ghiChu || '').trim(), phien.ten, new Date(), 'HOAT_DONG'
    ]]);

    ghiLog(phien.ten, 'THEM_NHAT_KY', muc.maHS + ' ' + ngay + ' ' + muc.ma + ' (' + diem + ')');
    tinhLaiTatCa();
    return { ok: true, diem: diem, maTuan: tuan.MaTuan, thang: thang };
  } finally {
    lock.releaseLock();
  }
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

function apiBangLop(phien, thang) {
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
  const dmLoiXuat = indexBy(docBang(SHEETS.LOI), 'MaLoi');
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
        const dm = dmLoiXuat[r.Ma];
        const ten = (r.Ma === 'KHAC' && r.MoTa) ? r.MoTa : (dm ? dm.TenLoi : r.Ma);
        return d.getDate() + '/' + (d.getMonth() + 1) + ': ' + ten + (r.Mon ? ' (' + r.Mon + ')' : '');
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
