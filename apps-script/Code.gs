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
    case 'nhatKyTuan':    return apiNhatKyTuan(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.maTuan);
    case 'ghiNhatKy':     return apiGhiNhatKy(canQuyen(phien, ['TO_TRUONG', 'LOP_TRUONG', 'GVCN']), p.items);
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
  const loi = indexBy(docBang(SHEETS.LOI), 'MaLoi');
  const cong = indexBy(docBang(SHEETS.CONG), 'MaCong');

  const chiTiet = docBang(SHEETS.NHATKY)
    .filter(function (r) { return r.MaHS === maHS && r.TrangThai === 'HOAT_DONG'; })
    .map(function (r) {
      const dm = r.Loai === 'CONG' ? cong[r.Ma] : loi[r.Ma];
      return {
        ngay: fmtNgay(r.Ngay), thang: r.Thang, maTuan: r.MaTuan, loai: r.Loai,
        ten: dm ? (dm.TenLoi || dm.TenCong) : r.Ma,
        nhom: dm ? dm.Nhom : '', diem: Number(r.Diem) || 0, moTa: r.MoTa
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

function apiNhatKyTuan(phien, maTuan) {
  const hs = indexBy(docBang(SHEETS.HS), 'MaHS');
  return docBang(SHEETS.NHATKY).filter(function (r) {
    if (r.TrangThai !== 'HOAT_DONG' || r.MaTuan !== maTuan) return false;
    if (phien.vaiTro === 'TO_TRUONG' && phien.to) {
      return hs[r.MaHS] && hs[r.MaHS].To === phien.to;
    }
    return true;
  }).map(function (r) {
    return { id: r.Id, maHS: r.MaHS, ngay: fmtNgay(r.Ngay), loai: r.Loai, ma: r.Ma, diem: r.Diem, moTa: r.MoTa, nguoiNhap: r.NguoiNhap };
  });
}

/**
 * Ghi nhiều bản ghi một lượt (giao diện chấm cả tổ rồi bấm Lưu một lần).
 * items: [{maHS, ngay:'yyyy-MM-dd', loai:'LOI'|'CONG', ma, moTa}]
 */
function apiGhiNhatKy(phien, items) {
  if (!items || !items.length) return { soBanGhi: 0 };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const hs = indexBy(docBang(SHEETS.HS), 'MaHS');
    const loi = indexBy(docBang(SHEETS.LOI), 'MaLoi');
    const cong = indexBy(docBang(SHEETS.CONG), 'MaCong');
    const daChot = {};
    docBang(SHEETS.THANG).forEach(function (r) {
      if (String(r.DaChot).toUpperCase() === 'TRUE') daChot[r.MaHS + '|' + r.Thang] = true;
    });

    const rows = [];
    items.forEach(function (it) {
      const h = hs[it.maHS];
      if (!h) throw new Error('Không có học sinh ' + it.maHS);
      if (phien.vaiTro === 'TO_TRUONG' && phien.to && h.To !== phien.to) {
        throw new Error('Bạn chỉ được chấm học sinh trong ' + phien.to);
      }
      const t = tuanCuaNgay(new Date(it.ngay + 'T12:00:00+07:00'));
      if (!t) throw new Error('Ngày ' + it.ngay + ' không nằm trong lịch tuần học');
      if (daChot[it.maHS + '|' + t.Thang]) throw new Error('Tháng ' + t.Thang + ' đã chốt, không sửa được');

      const dm = it.loai === 'CONG' ? cong[it.ma] : loi[it.ma];
      if (!dm) throw new Error('Không có mã ' + it.ma + ' trong danh mục');
      const diem = it.loai === 'CONG' ? Number(dm.DiemCong) : Number(dm.DiemTru);

      rows.push([
        Utilities.getUuid(), it.maHS, it.ngay, t.MaTuan, t.Thang, t.HocKy,
        it.loai, it.ma, diem, it.moTa || '', phien.ten, new Date(), 'HOAT_DONG'
      ]);
    });

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.NHATKY);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, SCHEMA.NhatKy.length).setValues(rows);
    ghiLog(phien.ten, 'GHI_NHAT_KY', rows.length + ' bản ghi');
    tinhLaiTatCa();
    return { soBanGhi: rows.length };
  } finally {
    lock.releaseLock();
  }
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
  const loi = indexBy(docBang(SHEETS.LOI), 'MaLoi');

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
