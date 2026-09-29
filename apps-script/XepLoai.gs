/**
 * XepLoai.gs — Engine tính xếp loại rèn luyện.
 * Toàn bộ quy tắc đọc từ sheet CauHinh / DanhMucLoi, không hard-code ngưỡng.
 * Xem tai-lieu/QUY-TAC-MAC-DINH.md mục 3, 4, 5.
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

/**
 * Tính lại SỐ LIỆU cho toàn bộ học sinh (điểm thi đua, số lần ghi sổ, số lần hạ bậc).
 *
 * Mặc định `TuDongXepLoai = FALSE`: cột XepLoai do người nhập tự chọn, hàm này KHÔNG đụng vào.
 * Kết quả tính theo quy chế chỉ ghi vào cột `DeXuat` để tham khảo.
 *
 * Đổi `TuDongXepLoai = TRUE` trong sheet CauHinh thì web sẽ tự điền luôn cột XepLoai.
 */
function tinhLaiTatCa() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const cfg = docCauHinh();
    const hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });
    const loi = indexBy(docBang(SHEETS.LOI), 'MaLoi');
    const cong = indexBy(docBang(SHEETS.CONG), 'MaCong');
    const nhatky = docBang(SHEETS.NHATKY).filter(function (r) { return r.TrangThai === 'HOAT_DONG'; });

    const thangHK1 = String(cfg.ThangHK1).split(',').map(Number);
    const thangHK2 = String(cfg.ThangHK2).split(',').map(Number);
    const thuTuThang = thangHK1.concat(thangHK2);

    const tuDong = String(cfg.TuDongXepLoai).toUpperCase() === 'TRUE';
    const nguongNho = Number(cfg.NguongLoiNho) || 3;
    const congDon = String(cfg.CongDonLoiNho).toUpperCase() === 'TRUE';
    const resetKy = String(cfg.ResetViDauHocKy).toUpperCase() === 'TRUE';
    const gsKhongTot = Number(cfg.GhiSo_KhongDuocTot) || 3;
    const gsKhongKha = Number(cfg.GhiSo_KhongDuocKha) || 5;
    const dungDiem = String(cfg.DungDiemDeXepLoai).toUpperCase() === 'TRUE';

    // Gom nhật ký theo MaHS -> Thang
    const theoHS = {};
    nhatky.forEach(function (r) {
      const k = r.MaHS;
      if (!theoHS[k]) theoHS[k] = {};
      const t = Number(r.Thang);
      if (!theoHS[k][t]) theoHS[k][t] = [];
      theoHS[k][t].push(r);
    });

    // Giữ nguyên những gì người dùng đã nhập / đã chốt
    const cu = {};
    docBang(SHEETS.THANG).forEach(function (r) { cu[r.MaHS + '|' + r.Thang] = r; });

    const ketQua = [];

    hs.forEach(function (h) {
      let viLoiNho = 0;               // lỗi nhỏ lẻ tồn kho, chuyển giữa các tháng
      let demTheoNguongKy = {};       // đếm lỗi có NguongHocKy, reset mỗi học kỳ
      let kyTruoc = null;

      thuTuThang.forEach(function (thang) {
        const ky = thangHK1.indexOf(thang) >= 0 ? 'HK1' : 'HK2';
        if (ky !== kyTruoc) {
          demTheoNguongKy = {};
          if (resetKy) viLoiNho = 0;
          kyTruoc = ky;
        }

        const khoa = h.MaHS + '|' + thang;
        const truoc = cu[khoa] || {};

        // Đã chốt thì giữ nguyên toàn bộ, không tính lại
        if (String(truoc.DaChot).toUpperCase() === 'TRUE') {
          ketQua.push(objToRow(SCHEMA.XepLoaiThang, truoc));
          return;
        }

        const rows = (theoHS[h.MaHS] && theoHS[h.MaHS][thang]) || [];
        let soLoiNho = 0, soHaBac = 0, coChuaDat = false, ghiSoTrucTiep = 0, diem = 0;

        rows.forEach(function (r) {
          if (r.Loai === 'CONG') {
            diem += Number(r.Diem) || (cong[r.Ma] ? Number(cong[r.Ma].DiemCong) : 0);
            return;
          }
          const L = loi[r.Ma];
          if (!L) return;
          diem += Number(r.Diem) || Number(L.DiemTru);

          let nhom = L.Nhom;
          const nguong = Number(L.NguongHocKy) || 0;
          if (nguong > 0) {
            demTheoNguongKy[L.MaLoi] = (demTheoNguongKy[L.MaLoi] || 0) + 1;
            nhom = demTheoNguongKy[L.MaLoi] >= nguong ? 'HA_BAC' : 'NHO';
          }

          if (nhom === 'CHUA_DAT') coChuaDat = true;
          else if (nhom === 'HA_BAC') soHaBac++;
          else if (L.MaLoi === 'NN05') ghiSoTrucTiep++;   // bị ghi sổ đầu bài: tính thẳng
          else soLoiNho++;
        });

        const tongNho = soLoiNho + (congDon ? viLoiNho : 0);
        const ghiSoTuLoiNho = Math.floor(tongNho / nguongNho);
        viLoiNho = congDon ? (tongNho % nguongNho) : 0;
        const soLanGhiSo = ghiSoTuLoiNho + ghiSoTrucTiep;

        // --- Gợi ý xếp loại theo quy chế (chỉ để tham khảo) ---
        let deXuat;
        if (rows.length === 0) {
          deXuat = '';
        } else if (coChuaDat) {
          deXuat = 'CHUA_DAT';
        } else {
          deXuat = haBac('TOT', soHaBac);
          let tran = 'TOT';
          if (soLanGhiSo >= gsKhongKha) tran = 'DAT';
          else if (soLanGhiSo >= gsKhongTot) tran = 'KHA';
          deXuat = thapHon(deXuat, tran);

          if (dungDiem) {
            let tranDiem = 'CHUA_DAT';
            if (diem >= Number(cfg.NguongDiem_Tot)) tranDiem = 'TOT';
            else if (diem >= Number(cfg.NguongDiem_Kha)) tranDiem = 'KHA';
            else if (diem >= Number(cfg.NguongDiem_Dat)) tranDiem = 'DAT';
            deXuat = thapHon(deXuat, tranDiem);
          }
        }

        // Cột XepLoai: do người nhập quyết định, trừ khi bật chế độ tự động
        const xepLoai = tuDong ? deXuat : (truoc.XepLoai || '');

        ketQua.push([
          h.MaHS, thang, ky, soLoiNho, soLanGhiSo, soHaBac, viLoiNho, diem,
          xepLoai, deXuat, truoc.NguoiNhap || '', false, '', '', truoc.GhiChu || ''
        ]);
      });
    });

    ghiDeBang(SHEETS.THANG, ketQua);
    tinhXepLoaiKy();
    ghiLog('HE_THONG', 'TINH_LAI', 'Đã cập nhật số liệu ' + ketQua.length + ' bản ghi tháng');
    return ketQua.length;
  } finally {
    lock.releaseLock();
  }
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
        if (String(vals[i][iChot]).toUpperCase() === 'TRUE') {
          throw new Error('Tháng ' + thang + ' đã chốt, không sửa được');
        }
        vals[i][iXL] = xepLoai;
        vals[i][iNg] = nguoiNhap;
        if (ghiChu !== undefined && ghiChu !== null) vals[i][iGC] = ghiChu;
        sh.getRange(2 + i, 1, 1, head.length).setValues([vals[i]]);
        ghiLog(nguoiNhap, 'XEP_LOAI', maHS + ' T' + thang + ' -> ' + (xepLoai || '(bo trong)'));
        tinhXepLoaiKy();
        return { ok: true };
      }
    }

    // Chưa có dòng nào cho HS/tháng này -> thêm mới
    const cfg = docCauHinh();
    const ky = String(cfg.ThangHK1).split(',').map(Number).indexOf(Number(thang)) >= 0 ? 'HK1' : 'HK2';
    const row = objToRow(head, {
      MaHS: maHS, Thang: thang, HocKy: ky, SoLoiNho: 0, SoLanGhiSo: 0, SoLanHaBac: 0,
      LoiNhoTonKho: 0, DiemThiDua: 0, XepLoai: xepLoai, DeXuat: '',
      NguoiNhap: nguoiNhap, DaChot: false, NguoiChot: '', ThoiGianChot: '', GhiChu: ghiChu || ''
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
  const tuDong = String(cfg.TuDongXepLoai).toUpperCase() === 'TRUE';
  const thangHK1 = String(cfg.ThangHK1).split(',').map(Number);
  const thangHK2 = String(cfg.ThangHK2).split(',').map(Number);
  const hs = docBang(SHEETS.HS).filter(function (r) { return r.TrangThai === 'DANG_HOC'; });

  const bang = {};
  docBang(SHEETS.THANG).forEach(function (r) { bang[r.MaHS + '|' + r.Thang] = r.XepLoai; });

  const daDuyet = {}, cuKy = {};
  docBang(SHEETS.KY).forEach(function (r) {
    cuKy[r.MaHS + '|' + r.Ky] = r;
    if (String(r.DaDuyet).toUpperCase() === 'TRUE') daDuyet[r.MaHS + '|' + r.Ky] = r;
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
      // Chế độ thủ công: chỉ ghi gợi ý, không tự điền cột XepLoai
      const giuLai = (cuKy[khoa] || {}).XepLoai || '';
      rows.push([h.MaHS, p[0], tuDong ? (p[1] || '') : giuLai, p[1] || '', false, '']);
    });
  });
  ghiDeBang(SHEETS.KY, rows);
}

/**
 * Xếp loại 1 học kỳ từ mảng xếp loại các tháng (theo thứ tự thời gian).
 * Bám nguyên văn mục II của sheet QUY ĐỊNH.
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

  // --- TỐT ---
  const soDat = dem(co, function (x) { return x === 'DAT'; });
  const soCD = dem(co, function (x) { return x === 'CHUA_DAT'; });
  const totAll = dem(co, laTot) === co.length;
  if (totAll) return 'TOT';
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
