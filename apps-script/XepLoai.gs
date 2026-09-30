/**
 * XepLoai.gs — Tính điểm thi đua và xếp loại rèn luyện.
 *
 * Bám theo "huong-dan-thi-đua-cá-nhân-2023-2024.docx":
 *   - Mỗi học sinh bắt đầu mỗi TUẦN với 100 điểm
 *   - Vi phạm thì trừ, làm tốt thì cộng (không giới hạn)
 *   - Xếp loại TUẦN theo ngưỡng điểm
 *   - Xếp loại THÁNG = điểm trung bình các tuần, rồi áp thêm các lưu ý của quy chế
 *
 * Mọi ngưỡng và mức điểm đọc từ sheet CauHinh / DanhMucLoi, không cố định trong code.
 */

const BAC = ['CHUA_DAT', 'DAT', 'KHA', 'TOT'];   // thấp → cao
const NHAN = { TOT: 'TỐT', KHA: 'KHÁ', DAT: 'ĐẠT', CHUA_DAT: 'CHƯA ĐẠT' };

function haBac(bac, n) {
  const i = BAC.indexOf(bac);
  return BAC[Math.max(0, i - n)];
}

function thapHon(a, b) {
  return BAC.indexOf(a) <= BAC.indexOf(b) ? a : b;
}

function soHoac(v, macDinh) {
  const n = Number(v);
  return isNaN(n) || v === '' || v === null || v === undefined ? macDinh : n;
}

function laDung(v) {
  return v === true || String(v).toUpperCase() === 'TRUE';
}

/** Các ngưỡng điểm của một tuần, đọc từ CauHinh. */
function nguongTuan(cfg) {
  return {
    batDau: soHoac(cfg.DiemXuatPhatTuan, 100),
    tot: soHoac(cfg.NguongTuan_Tot, 100),
    kha: soHoac(cfg.NguongTuan_Kha, 80),
    dat: soHoac(cfg.NguongTuan_Dat, 50),
    nhanDoi: laDung(cfg.NhanDoiTuLan2)
  };
}

/**
 * Xếp loại một tuần từ điểm cuối tuần.
 * Tốt đòi hỏi vừa đủ điểm VỪA không có lỗi nào — đúng như tài liệu.
 */
function xepLoaiTheoDiem(diem, soLoi, ng) {
  if (diem >= ng.tot && soLoi === 0) return 'TOT';
  if (diem >= ng.kha) return 'KHA';
  if (diem >= ng.dat) return 'DAT';
  return 'CHUA_DAT';
}

/**
 * Tính lại toàn bộ: điểm từng tuần, xếp loại tuần, rồi xếp loại tháng và học kỳ.
 *
 * Đọc sheet NhatKy (mỗi lượt vi phạm / điểm cộng là 1 dòng) và ghi ra:
 *   - XepLoaiTuan: điểm và xếp loại từng tuần
 *   - XepLoaiThang: điểm trung bình tuần, các bộ đếm, xếp loại tháng
 *   - XepLoaiKy: học kỳ và cả năm
 */
function tinhLaiTatCa() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const cfg = docCauHinh();
    const ng = nguongTuan(cfg);
    const hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
    const loi = indexBy(docBang(SHEETS.LOI), 'MaLoi');
    const cong = indexBy(docBang(SHEETS.CONG), 'MaCong');
    const tuanTheoMa = indexBy(docBang(SHEETS.TUAN), 'MaTuan');
    const nhatky = docBang(SHEETS.NHATKY).filter(function (r) { return r.TrangThai === 'HOAT_DONG'; });

    const dsTuan = docBang(SHEETS.TUAN).filter(function (t) { return t.MaTuan; })
      .sort(function (a, b) { return fmtNgay(a.TuNgay) < fmtNgay(b.TuNgay) ? -1 : 1; });

    // Gom nhật ký: MaHS -> MaTuan -> [dòng]
    const theo = {};
    nhatky.forEach(function (r) {
      if (!theo[r.MaHS]) theo[r.MaHS] = {};
      if (!theo[r.MaHS][r.MaTuan]) theo[r.MaHS][r.MaTuan] = [];
      theo[r.MaHS][r.MaTuan].push(r);
    });

    const dongTuan = [];
    // MaHS -> Thang -> { tongDiem, soTuan, ghiSo, haBac, chuaDat }
    const gomThang = {};

    hs.forEach(function (h) {
      // Đếm lỗi có ngưỡng học kỳ (ví dụ không đeo thẻ: lần 2 trong HK mới hạ bậc)
      let demKy = {}, kyTruoc = null;

      dsTuan.forEach(function (t) {
        const thangTuan = thangTheoDoiTuan(t);
        const kyTuan = hocKyTheoThang(thangTuan, cfg);
        if (kyTuan !== kyTruoc) { demKy = {}; kyTruoc = kyTuan; }

        const rows = (theo[h.MaHS] && theo[h.MaHS][t.MaTuan]) || [];
        let diemCong = 0, diemTru = 0, soLoi = 0, ghiSo = 0, soHaBac = 0, chuaDat = false;
        const demTrongTuan = {};   // đếm số lần mỗi mã lỗi trong tuần, để nhân đôi

        rows.forEach(function (r) {
          const diemGhi = Number(r.Diem);

          if (r.Loai === 'CONG') {
            const c = cong[r.Ma];
            // Điểm cộng "khác" do người nhập tự gõ -> lấy đúng số đã lưu
            diemCong += isNaN(diemGhi) ? soHoac(c && c.DiemCong, 0) : diemGhi;
            return;
          }

          const L = loi[r.Ma];
          soLoi++;

          // Mức trừ: ưu tiên số đã lưu trong nhật ký (lỗi "khác" gõ tay),
          // không có thì lấy từ danh mục.
          let tru = Math.abs(isNaN(diemGhi) ? soHoac(L && L.DiemTru, 0) : diemGhi);

          if (L) {
            // Tái phạm trong cùng tuần thì nhân đôi (mục I của tài liệu)
            demTrongTuan[r.Ma] = (demTrongTuan[r.Ma] || 0) + 1;
            if (ng.nhanDoi && laDung(L.NhanDoiTuLan2) && demTrongTuan[r.Ma] >= 2) tru *= 2;

            if (laDung(L.GhiSoDauBai)) ghiSo++;

            let nhom = L.Nhom;
            const nguongHK = soHoac(L.NguongHocKy, 0);
            if (nguongHK > 0) {
              demKy[r.Ma] = (demKy[r.Ma] || 0) + 1;
              if (demKy[r.Ma] >= nguongHK) nhom = 'HA_BAC';
            }
            if (nhom === 'CHUA_DAT') chuaDat = true;
            else if (nhom === 'HA_BAC') soHaBac++;
          }

          diemTru += tru;
        });

        const diemCuoi = ng.batDau + diemCong - diemTru;
        const xl = chuaDat ? 'CHUA_DAT' : xepLoaiTheoDiem(diemCuoi, soLoi, ng);

        dongTuan.push([
          h.MaHS, t.MaTuan, t.SoTuan, thangTuan,
          ng.batDau, diemCong, -diemTru, diemCuoi,
          soLoi, ghiSo, soHaBac, chuaDat, xl
        ]);

        const k = h.MaHS + '|' + thangTuan;
        if (!gomThang[k]) {
          gomThang[k] = { maHS: h.MaHS, thang: thangTuan, hocKy: kyTuan,
                          tong: 0, soTuan: 0, ghiSo: 0, haBac: 0, chuaDat: false, soLoi: 0 };
        }
        const g = gomThang[k];
        g.tong += diemCuoi; g.soTuan++;
        g.ghiSo += ghiSo; g.haBac += soHaBac; g.soLoi += soLoi;
        if (chuaDat) g.chuaDat = true;
      });
    });

    ghiDeBang(SHEETS.TUANXL, dongTuan);
    tinhXepLoaiThang(cfg, ng, hs, gomThang);
    tinhXepLoaiKy();
    ghiLog('HE_THONG', 'TINH_LAI', dongTuan.length + ' dòng tuần');
    return dongTuan.length;
  } finally {
    lock.releaseLock();
  }
}

/** Dùng chung tên cũ để các nơi khác gọi không phải sửa. */
function tinhLaiDuLieu() { return tinhLaiTatCa(); }

/**
 * Xếp loại tháng: lấy điểm trung bình các tuần trong tháng rồi áp ngưỡng,
 * sau đó áp thêm các lưu ý của quy chế trường (mục b.1 - b.4 của tài liệu).
 */
function tinhXepLoaiThang(cfg, ng, hs, gomThang) {
  const tuDong = laDung(cfg.TuDongXepLoai);
  const gsKhongTot = soHoac(cfg.GhiSo_KhongDuocTot, 3);
  const gsKhongKha = soHoac(cfg.GhiSo_KhongDuocKha, 5);

  const cu = {};
  docBang(SHEETS.THANG).forEach(function (r) { cu[r.MaHS + '|' + r.Thang] = r; });

  const rows = [];
  Object.keys(gomThang).forEach(function (k) {
    const g = gomThang[k];
    const truoc = cu[k] || {};

    // Tháng đã chốt thì giữ nguyên, không tính lại
    if (laDung(truoc.DaChot)) { rows.push(objToRow(SCHEMA.XepLoaiThang, truoc)); return; }

    const diemTB = g.soTuan ? Math.round(g.tong / g.soTuan * 10) / 10 : ng.batDau;

    let deXuat;
    if (g.chuaDat) {
      deXuat = 'CHUA_DAT';
    } else {
      deXuat = xepLoaiTheoDiem(diemTB, g.soLoi, ng);
      deXuat = haBac(deXuat, g.haBac);                       // mỗi lỗi hạ bậc -> hạ 1 bậc
      let tran = 'TOT';
      if (g.ghiSo >= gsKhongKha) tran = 'DAT';               // ghi sổ >= 5 lần: không được Khá
      else if (g.ghiSo >= gsKhongTot) tran = 'KHA';          // ghi sổ >= 3 lần: không được Tốt
      deXuat = thapHon(deXuat, tran);
    }

    rows.push([
      g.maHS, g.thang, g.hocKy,
      g.soLoi, g.ghiSo, g.haBac, 0, diemTB,
      tuDong ? deXuat : (truoc.XepLoai || ''), deXuat,
      truoc.NguoiNhap || '', false, '', '', truoc.GhiChu || ''
    ]);
  });
  ghiDeBang(SHEETS.THANG, rows);
}

/**
 * Lưu xếp loại do người nhập chọn cho 1 học sinh trong 1 tháng.
 * xepLoai: 'TOT' | 'KHA' | 'DAT' | 'CHUA_DAT' | '' (bỏ trống)
 */
function luuXepLoai(maHS, thang, xepLoai, ghiChu, nguoiNhap) {
  if (xepLoai && BAC.indexOf(xepLoai) < 0) throw new Error('Xếp loại không hợp lệ: ' + xepLoai);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.THANG);
    const head = SCHEMA.XepLoaiThang;
    const n = sh.getLastRow() - 1;
    const iMa = head.indexOf('MaHS'), iTh = head.indexOf('Thang');
    const iXL = head.indexOf('XepLoai'), iNg = head.indexOf('NguoiNhap');
    const iGC = head.indexOf('GhiChu'), iChot = head.indexOf('DaChot');

    if (n > 0) {
      const vals = sh.getRange(2, 1, n, head.length).getValues();
      for (let i = 0; i < vals.length; i++) {
        if (vals[i][iMa] !== maHS || Number(vals[i][iTh]) !== Number(thang)) continue;
        if (laDung(vals[i][iChot])) throw new Error('Tháng ' + thang + ' đã chốt, không sửa được');
        vals[i][iXL] = xepLoai;
        vals[i][iNg] = nguoiNhap;
        if (ghiChu !== undefined && ghiChu !== null) vals[i][iGC] = ghiChu;
        sh.getRange(2 + i, 1, 1, head.length).setValues([vals[i]]);
        ghiLog(nguoiNhap, 'XEP_LOAI', maHS + ' T' + thang + ' -> ' + (xepLoai || '(bo trong)'));
        tinhXepLoaiKy();
        return { ok: true };
      }
    }

    const cfg = docCauHinh();
    const row = objToRow(head, {
      MaHS: maHS, Thang: thang, HocKy: hocKyTheoThang(thang, cfg),
      SoLoiNho: 0, SoLanGhiSo: 0, SoLanHaBac: 0, LoiNhoTonKho: 0,
      DiemThiDua: soHoac(cfg.DiemXuatPhatTuan, 100),
      XepLoai: xepLoai, DeXuat: '', NguoiNhap: nguoiNhap,
      DaChot: false, NguoiChot: '', ThoiGianChot: '', GhiChu: ghiChu || ''
    });
    sh.getRange(sh.getLastRow() + 1, 1, 1, head.length).setValues([row]);
    ghiLog(nguoiNhap, 'XEP_LOAI', maHS + ' T' + thang + ' -> ' + (xepLoai || '(bo trong)'));
    tinhXepLoaiKy();
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Xếp loại học kỳ + cả năm theo mục II/III của quy định. */
function tinhXepLoaiKy() {
  const cfg = docCauHinh();
  const tuDong = laDung(cfg.TuDongXepLoai);
  const thangHK1 = String(cfg.ThangHK1).split(',').map(Number);
  const thangHK2 = String(cfg.ThangHK2).split(',').map(Number);
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });

  const bang = {};
  docBang(SHEETS.THANG).forEach(function (r) { bang[r.MaHS + '|' + r.Thang] = r.XepLoai; });

  const daDuyet = {}, cuKy = {};
  docBang(SHEETS.KY).forEach(function (r) {
    cuKy[r.MaHS + '|' + r.Ky] = r;
    if (laDung(r.DaDuyet)) daDuyet[r.MaHS + '|' + r.Ky] = r;
  });

  const rows = [];
  hs.forEach(function (h) {
    const k1 = thangHK1.map(function (t) { return bang[h.MaHS + '|' + t] || null; });
    const k2 = thangHK2.map(function (t) { return bang[h.MaHS + '|' + t] || null; });
    const xl1 = xepLoaiMotKy(k1);
    const xl2 = xepLoaiMotKy(k2);
    const nam = (xl1 && xl2) ? thapHon(xl1, xl2) : null;

    [['HK1', xl1], ['HK2', xl2], ['CA_NAM', nam]].forEach(function (p) {
      const khoa = h.MaHS + '|' + p[0];
      if (daDuyet[khoa]) { rows.push(objToRow(SCHEMA.XepLoaiKy, daDuyet[khoa])); return; }
      const giuLai = (cuKy[khoa] || {}).XepLoai || '';
      rows.push([h.MaHS, p[0], tuDong ? (p[1] || '') : giuLai, p[1] || '', false, '']);
    });
  });
  ghiDeBang(SHEETS.KY, rows);
}

/**
 * Xếp loại 1 học kỳ từ mảng xếp loại các tháng (theo thứ tự thời gian).
 * Bám nguyên văn mục "ĐÁNH GIÁ XLRL HỌC SINH CUỐI KỲ" của tài liệu.
 */
function xepLoaiMotKy(ds) {
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

/** Chốt 1 tháng: khóa không cho cán bộ lớp sửa nữa. */
function chotThang(thang, nguoiChot) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.THANG);
  const head = SCHEMA.XepLoaiThang;
  const iThang = head.indexOf('Thang'), iChot = head.indexOf('DaChot');
  const iNguoi = head.indexOf('NguoiChot'), iTG = head.indexOf('ThoiGianChot');
  const n = sh.getLastRow() - 1;
  if (n <= 0) return 0;
  const vals = sh.getRange(2, 1, n, head.length).getValues();
  let dem = 0;
  vals.forEach(function (r) {
    if (Number(r[iThang]) === Number(thang)) {
      r[iChot] = true; r[iNguoi] = nguoiChot; r[iTG] = new Date(); dem++;
    }
  });
  sh.getRange(2, 1, n, head.length).setValues(vals);
  ghiLog(nguoiChot, 'CHOT_THANG', 'Tháng ' + thang + ', ' + dem + ' HS');
  return dem;
}
