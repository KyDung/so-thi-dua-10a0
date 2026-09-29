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
  if (p.callback) {
    return ContentService.createTextOutput(p.callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let kq;
  try {
    const body = JSON.parse(e.postData.contents);
    const phien = body.token ? giaiToken(body.token) : null;
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
    tuanHienTai: tuanCuaNgay(new Date())
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

function apiLichTuan() { return docBang(SHEETS.TUAN); }

// =============== CHI TIẾT 1 HỌC SINH (ai cũng xem được) ===============

function apiChiTietHS(maHS) {
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.MaHS === maHS; })[0];
  if (!hs) throw new Error('Không tìm thấy học sinh');

  const chiTiet = docBang(SHEETS.NHATKY)
    .filter(function (r) { return r.MaHS === maHS && r.TrangThai === 'HOAT_DONG'; })
    .map(function (r) {
      const c = COT[r.Ma];
      return {
        ngay: fmtNgay(r.Ngay), thang: r.Thang, maTuan: r.MaTuan, loai: r.Loai,
        ten: r.MoTa || (c ? c.ten : r.Ma),
        cot: c ? c.ten : '', nhom: c ? c.nhom : '',
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

  return { hocSinh: { maHS: hs.MaHS, hoTen: hs.HoTen, to: hs.To, chucVu: hs.ChucVu }, chiTiet: chiTiet, thang: thang, ky: ky };
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
  if (Date.now() > p.hetHan) throw new Error('Phiên đã hết hạn, vui lòng đăng nhập lại');
  return p;
}

function kyChuoi(s) {
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET') || 'doi-chuoi-nay-di';
  const b = Utilities.computeHmacSha256Signature(s, secret);
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

function canQuyen(phien, dsVaiTro) {
  if (!phien) throw new Error('Cần đăng nhập');
  if (dsVaiTro.indexOf(phien.vaiTro) < 0) throw new Error('Không đủ quyền');
  return phien;
}

// =============== CÁN BỘ LỚP ===============

function apiDsHocSinh(phien) {
  let hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
  if (phien && phien.vaiTro === 'TO_TRUONG' && phien.to) {
    hs = hs.filter(function (r) { return r.To === phien.to; });
  }
  return hs.map(function (r) { return { maHS: r.MaHS, hoTen: r.HoTen, to: r.To, chucVu: r.ChucVu }; });
}


/**
 * Đọc lưới thi đua của một tuần — đúng cấu trúc sổ giấy.
 * Trả về mỗi học sinh một dòng, mỗi cột là danh sách các mục đã ghi.
 */
function apiLuoiTuan(phien, maTuan) {
  const cfg = docCauHinh();
  const diem6 = diemCot(cfg);
  let hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
  if (phien.vaiTro === 'TO_TRUONG' && phien.to) {
    hs = hs.filter(function (r) { return r.To === phien.to; });
  }

  const tuan = docBang(SHEETS.TUAN).filter(function (r) { return r.MaTuan === maTuan; })[0];
  if (!tuan) throw new Error('Không có tuần ' + maTuan + ' trong lịch');

  const daChot = {};
  docBang(SHEETS.THANG).forEach(function (r) {
    if (String(r.DaChot).toUpperCase() === 'TRUE') daChot[r.MaHS + '|' + r.Thang] = true;
  });

  // Gom các mục đã ghi theo học sinh -> cột
  const theo = {};
  docBang(SHEETS.NHATKY).forEach(function (r) {
    if (r.TrangThai !== 'HOAT_DONG' || r.MaTuan !== maTuan) return;
    if (!theo[r.MaHS]) theo[r.MaHS] = {};
    if (!theo[r.MaHS][r.Ma]) theo[r.MaHS][r.Ma] = [];
    theo[r.MaHS][r.Ma].push(String(r.MoTa || '').trim());
  });

  const dong = hs.map(function (h) {
    const o = { maHS: h.MaHS, hoTen: h.HoTen, chucVu: h.ChucVu, o: {}, tong: 0 };
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
      maTuan: tuan.MaTuan, soTuan: tuan.SoTuan, thang: tuan.Thang,
      tuNgay: fmtNgay(tuan.TuNgay), denNgay: fmtNgay(tuan.DenNgay)
    },
    cot: Object.keys(COT).map(function (k) {
      return { ma: k, ten: COT[k].ten, diem: diem6[k] };
    }),
    dong: dong,
    tongHS: dong.reduce(function (a, b) { return a + b.tong; }, 0),
    diemCoSan: isNaN(diemCoSan) ? 0 : diemCoSan,
    daChot: !!daChot[(hs[0] || {}).MaHS + '|' + tuan.Thang]
  };
}

/**
 * Lưu cả lưới một tuần. Ghi đè: xoá hết bản ghi cũ của tuần đó (trong phạm vi
 * học sinh người dùng được phép sửa) rồi ghi lại theo nội dung mới.
 *
 * dong: [{ maHS, o: { CONG: 'Hoá*, 10 Toán', NHO_LOP: 'MTT (Anh)', ... } }]
 */
function apiLuuLuoiTuan(phien, maTuan, dong) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const cfg = docCauHinh();
    const diem6 = diemCot(cfg);
    const hs = indexBy(docBang(SHEETS.HS), 'MaHS');

    const tuan = docBang(SHEETS.TUAN).filter(function (r) { return r.MaTuan === maTuan; })[0];
    if (!tuan) throw new Error('Không có tuần ' + maTuan + ' trong lịch');

    const daChot = {};
    docBang(SHEETS.THANG).forEach(function (r) {
      if (String(r.DaChot).toUpperCase() === 'TRUE') daChot[r.MaHS + '|' + r.Thang] = true;
    });

    // Tập học sinh được phép sửa
    const trongPhamVi = {};
    (dong || []).forEach(function (d) {
      const h = hs[d.maHS];
      if (!h) throw new Error('Không có học sinh ' + d.maHS);
      if (phien.vaiTro === 'TO_TRUONG' && phien.to && h.To !== phien.to) {
        throw new Error('Bạn chỉ được ghi cho học sinh trong ' + phien.to);
      }
      if (daChot[d.maHS + '|' + tuan.Thang]) {
        throw new Error('Tháng ' + tuan.Thang + ' đã chốt, không sửa được');
      }
      trongPhamVi[d.maHS] = true;
    });

    // 1. Đánh dấu xoá bản ghi cũ của tuần này, chỉ với HS trong phạm vi
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.NHATKY);
    const head = SCHEMA.NhatKy;
    const n = sh.getLastRow() - 1;
    if (n > 0) {
      const vals = sh.getRange(2, 1, n, head.length).getValues();
      const iTuan = head.indexOf('MaTuan'), iMa = head.indexOf('MaHS'), iTT = head.indexOf('TrangThai');
      let coDoi = false;
      for (let i = 0; i < vals.length; i++) {
        if (vals[i][iTuan] === maTuan && trongPhamVi[vals[i][iMa]] && vals[i][iTT] === 'HOAT_DONG') {
          vals[i][iTT] = 'DA_THAY'; coDoi = true;
        }
      }
      if (coDoi) sh.getRange(2, 1, n, head.length).setValues(vals);
    }

    // 2. Ghi bản ghi mới: mỗi mục trong ô là 1 dòng
    const ngay = fmtNgay(tuan.TuNgay);
    const rows = [];
    (dong || []).forEach(function (d) {
      Object.keys(COT).forEach(function (k) {
        tachMuc(d.o ? d.o[k] : '').forEach(function (muc) {
          rows.push([
            Utilities.getUuid(), d.maHS, ngay, maTuan, tuan.Thang, tuan.HocKy,
            k === 'CONG' ? 'CONG' : 'LOI', k, diem6[k], muc,
            phien.ten, new Date(), 'HOAT_DONG'
          ]);
        });
      });
    });
    if (rows.length) {
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, head.length).setValues(rows);
    }

    ghiLog(phien.ten, 'LUU_LUOI_TUAN', maTuan + ': ' + rows.length + ' mục');
    tinhLaiTatCa();
    return { soMuc: rows.length };
  } finally {
    lock.releaseLock();
  }
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
    if (phien.vaiTro !== 'GVCN') {
      const tg = new Date(vals[i][head.indexOf('ThoiGian')]);
      if ((Date.now() - tg.getTime()) > soNgay * 86400000) {
        throw new Error('Quá ' + soNgay + ' ngày, chỉ GVCN mới sửa được');
      }
    }
    vals[i][iTT] = 'DA_XOA';
    sh.getRange(2 + i, 1, 1, head.length).setValues([vals[i]]);
    ghiLog(phien.ten, 'XOA_NHAT_KY', id + ' (người nhập: ' + vals[i][iNg] + ')');
    tinhLaiTatCa();
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
        return r.MaHS === h.MaHS && Number(r.Thang) === thang && r.Loai === 'LOI';
      }).map(function (r) {
        const d = new Date(r.Ngay);
        return d.getDate() + '/' + (d.getMonth() + 1) + ': ' + (loi[r.Ma] ? loi[r.Ma].TenLoi : r.Ma);
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
