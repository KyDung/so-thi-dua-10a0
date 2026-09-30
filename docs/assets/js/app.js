/**
 * app.js — SPA điều hướng bằng hash. Không cần build, không cần framework.
 *
 * Xem: ai cũng xem được, không cần đăng nhập.
 * Nhập: cán bộ lớp / GVCN đăng nhập.
 */

const el = document.getElementById('noiDung');
const NHAN = { TOT: 'TỐT', KHA: 'KHÁ', DAT: 'ĐẠT', CHUA_DAT: 'CHƯA ĐẠT' };
const THANG_HOC = [9, 10, 11, 12, 1, 2, 3, 4, 5];

let LOP = null, DANHMUC = null, DSHS = null, LICHTUAN = null;
let chuaLuu = false, dangLuu = false, hashDangXem = location.hash, lanHienThi = 0;
window.addEventListener('beforeunload', function (e) {
  if (chuaLuu || dangLuu) { e.preventDefault(); e.returnValue = ''; }
});

function coTheRoiTrang() {
  if (dangLuu) { alert('Đang lưu dữ liệu, vui lòng chờ một chút.'); return false; }
  return !chuaLuu || confirm('Bạn còn nội dung chưa lưu. Rời trang và bỏ các thay đổi này?');
}

// ---------- tiện ích ----------
const esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
const q = function (sel) { return el.querySelector(sel); };
const qa = function (sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };
const loading = function (t) { el.innerHTML = '<div class="loading">' + (t || 'Đang tải') + '</div>'; };
const loi = function (e) { el.innerHTML = '<div class="msg err">' + esc(e.message || e) + '</div>'; };
const diemHTML = function (d) {
  d = Number(d) || 0;
  return '<span class="diem ' + (d > 0 ? 'duong' : (d < 0 ? 'am' : '')) + '">' + (d > 0 ? '+' : '') + d + '</span>';
};
const vaiTro = function () { return Store.get('vaiTro'); };
const hnay = function () { return new Date().toISOString().slice(0, 10); };
const thangMacDinh = function () {
  const thangMay = new Date().getMonth() + 1;
  if (THANG_HOC.indexOf(thangMay) >= 0) return thangMay;
  return (LOP && LOP.tuanHienTai && LOP.tuanHienTai.Thang) || THANG_HOC[0];
};
/** Đọc tham số sau dấu ? trong hash, ví dụ #/chi-tiet?ma=10A0_01 */
const thamSo = function (ten) {
  const i = location.hash.indexOf('?');
  if (i < 0) return '';
  return new URLSearchParams(location.hash.slice(i + 1)).get(ten) || '';
};

function oChonThang(thangDangChon, onChange) {
  return '<select id="iThang" style="max-width:150px">' +
    THANG_HOC.map(function (t) {
      return '<option value="' + t + '"' + (Number(t) === Number(thangDangChon) ? ' selected' : '') +
        '>Tháng ' + t + '</option>';
    }).join('') + '</select>';
}

// ---------- khung ----------
async function khoiDong() {
  try {
    LOP = await API.thongTinLop();
  } catch (e) {
    LOP = { truong: CONFIG.TEN_TRUONG, lop: CONFIG.TEN_LOP, namHoc: CONFIG.NAM_HOC, siSo: 0, to: [] };
    baoLoiKetNoi(e);
  }
  document.getElementById('tieuDe').textContent = 'Sổ theo dõi thi đua · ' + LOP.lop;
  document.getElementById('phuDe').textContent = LOP.truong + ' · Năm học ' + LOP.namHoc;
  window.addEventListener('hashchange', dinhTuyen);
  dinhTuyen();
}

/** Hiện dải báo lỗi ở đầu trang khi không gọi được Apps Script. */
function baoLoiKetNoi(e) {
  const box = document.getElementById('bangLoi');
  if (!box) return;
  const chuaCauHinh = String(e && e.message || '').indexOf('Chưa cấu hình') >= 0;
  box.innerHTML = chuaCauHinh
    ? '<strong>Chưa kết nối máy chủ dữ liệu.</strong> Cần dán URL Apps Script vào ' +
      '<code>docs/assets/js/config.js</code> rồi push lại. Xem hướng dẫn trong <code>README.md</code>.'
    : '<strong>Không tải được dữ liệu.</strong> ' + esc(e && e.message || e) +
      '<br>Kiểm tra: Apps Script đã deploy chưa, quyền truy cập có đang để "Bất kỳ ai" không.';
  box.style.display = '';
}

function dinhTuyen() {
  if (!coTheRoiTrang()) {
    history.replaceState(null, '', location.pathname + location.search + hashDangXem);
    const chonTuan = q('#iTuan');
    if (chonTuan) chonTuan.value = chonTuan.dataset.hienTai;
    const chonThang = q('#iThang');
    if (chonThang && chonThang.dataset.hienTai) chonThang.value = chonThang.dataset.hienTai;
    return;
  }
  chuaLuu = false;
  hashDangXem = location.hash;
  const luot = ++lanHienThi;
  const h = location.hash.replace(/^#\/?/, '') || 'bang-lop';
  const ten = h.split('?')[0];
  document.querySelectorAll('nav.tabs a').forEach(function (a) {
    a.classList.toggle('on', a.getAttribute('href').split('?')[0] === '#/' + ten);
  });
  const mh = {
    'bang-lop': mhBangLop,
    'chi-tiet': mhChiTiet,
    'thi-dua': mhThiDua,
    'cham-diem': mhChamDiem,
    'quan-tri': mhQuanTri,
    'doi-mat-khau': mhDoiMatKhau,
    'dang-nhap': mhDangNhap
  }[ten] || manHinhMacDinh();

  // Chưa đăng nhập thì không xem được gì ngoài trang đăng nhập
  if (!vaiTro() && ten !== 'dang-nhap') {
    capNhatNav();
    mhDangNhap().catch(function (e) { if (luot === lanHienThi) loi(e); });
    window.scrollTo(0, 0);
    return;
  }
  mh().catch(function (e) { if (luot === lanHienThi) loi(e); });
  window.scrollTo(0, 0);
  capNhatNav();
}

/** Vào web thì mở màn nào: phụ huynh xem con mình, cán bộ lớp xem bảng lớp. */
function manHinhMacDinh() {
  return vaiTro() === 'PHU_HUYNH' ? mhChiTiet : mhBangLop;
}

function trangChuTheoVaiTro() {
  if (vaiTro() === 'PHU_HUYNH') {
    return '#/chi-tiet?ma=' + encodeURIComponent(Store.get('maHS') || '');
  }
  return vaiTro() === 'GVCN' ? '#/bang-lop' : '#/cham-diem';
}

function capNhatNav() {
  const vt = vaiTro();
  const laPH = vt === 'PHU_HUYNH';
  const hien = function (chon, dk) {
    document.querySelectorAll(chon).forEach(function (a) { a.style.display = dk ? '' : 'none'; });
  };
  hien('[data-daDangNhap]', !!vt);              // Chi tiết: ai đăng nhập cũng thấy
  hien('[data-canQuyen]', !!vt && !laPH);       // Bảng lớp, Xếp hạng, Sổ thi đua
  hien('[data-doiMK]', !!vt);
  hien('[data-gvcn]', vt === 'GVCN');

  const btn = document.getElementById('btnPhien');
  if (vt) {
    btn.textContent = 'Thoát (' + (Store.get('hoTen') || '') + ')';
    btn.onclick = function () {
      if (!coTheRoiTrang()) return;
      chuaLuu = false; Store.xoaHet();
      location.hash = '#/dang-nhap'; dinhTuyen();
    };
  } else {
    btn.textContent = 'Đăng nhập';
    btn.onclick = function () { location.hash = '#/dang-nhap'; };
  }
}

// ---------- Màn hình chính: Bảng lớp theo tháng ----------
async function mhBangLop() {
  const luot = lanHienThi;
  loading();
  const thang = Number(thamSo('thang')) || thangMacDinh();
  const ds = await API.bangLop(thang);
  if (luot !== lanHienThi) return;
  const dem = { TOT: 0, KHA: 0, DAT: 0, CHUA_DAT: 0 };
  let chuaXep = 0;
  ds.forEach(function (r) {
    if (dem[r.xepLoai] !== undefined) dem[r.xepLoai]++; else chuaXep++;
  });
  const daChot = ds.length && ds[0].daChot;
  // Lớp trưởng và GVCN được xếp loại; tổ trưởng chỉ ghi nhật ký vi phạm
  const duocSua = !daChot && (vaiTro() === 'LOP_TRUONG' || vaiTro() === 'GVCN');

  el.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div>
          <h2>Kết quả rèn luyện tháng ${esc(thang)}</h2>
          <p class="hint" style="margin:0">${ds.length} học sinh ·
            ${daChot ? '<span class="badge DAT">đã chốt</span>'
                     : '<span style="color:var(--ink-mute)">đang cập nhật, chưa chốt</span>'}</p>
        </div>
        <div>${oChonThang(thang)}</div>
      </div>
      <div class="stat" style="margin-top:14px">
        <div><div class="n" style="color:var(--tot)">${dem.TOT}</div><div class="l">TỐT</div></div>
        <div><div class="n" style="color:var(--kha)">${dem.KHA}</div><div class="l">KHÁ</div></div>
        <div><div class="n" style="color:var(--dat)">${dem.DAT}</div><div class="l">ĐẠT</div></div>
        <div><div class="n" style="color:var(--cd)">${dem.CHUA_DAT}</div><div class="l">CHƯA ĐẠT</div></div>
        ${chuaXep ? `<div><div class="n" style="color:var(--ink-mute)">${chuaXep}</div><div class="l">CHƯA XẾP</div></div>` : ''}
      </div>
    </div>

    ${duocSua ? `<div class="card">
      <h2>Xếp loại tháng ${esc(thang)}</h2>
      <p class="hint">Chọn xếp loại cho từng bạn rồi bấm <strong>Lưu xếp loại</strong>.
        Nhập đúng kết quả từ sổ chính. Cột <em>Gợi ý</em> chỉ là tính toán tham khảo theo cấu hình của lớp.</p>
      <div class="row">
        <button class="primary" id="btnLuuXL" disabled>Lưu xếp loại</button>
        <button id="btnDungGoiY" class="sm">Điền theo gợi ý</button>
        <span id="demXL" style="color:var(--ink-mute);font-size:13.5px"></span>
      </div>
    </div>` : ''}

    <div class="card">
      <p class="hint">Bấm vào tên để xem chi tiết từng lượt vi phạm và điểm cộng.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>TT</th><th>Họ tên</th><th>Xếp loại</th>
          ${duocSua ? '<th>Gợi ý</th>' : ''}
          <th style="text-align:right">Điểm</th><th style="text-align:right">Ghi sổ</th>
          <th style="text-align:right">Hạ bậc</th></tr></thead>
        <tbody>${ds.map(function (r, i) {
          const oXepLoai = duocSua
            ? `<select class="selXL" data-ma="${esc(r.maHS)}" style="min-width:120px">
                 <option value=""${r.xepLoai ? '' : ' selected'}>— chưa xếp —</option>
                 ${['TOT', 'KHA', 'DAT', 'CHUA_DAT'].map(function (k) {
                   return '<option value="' + k + '"' + (r.xepLoai === k ? ' selected' : '') + '>' + NHAN[k] + '</option>';
                 }).join('')}
               </select>`
            : (r.xepLoai
                ? `<span class="badge ${esc(r.xepLoai)}">${esc(r.nhan)}</span>`
                : '<span style="color:var(--ink-mute);font-size:13px">chưa xếp</span>');
          return `<tr>
            <td>${i + 1}</td>
            <td><a href="#/chi-tiet?ma=${esc(encodeURIComponent(r.maHS))}&thang=${thang}" style="color:inherit"><strong>${esc(r.hoTen)}</strong></a></td>
            <td>${oXepLoai}</td>
            ${duocSua ? `<td>${r.deXuat
              ? '<span class="badge ' + esc(r.deXuat) + '" style="opacity:.6">' + esc(r.nhanDeXuat) + '</span>'
              : '<span style="color:var(--ink-mute);font-size:12.5px">—</span>'}</td>` : ''}
            <td style="text-align:right">${diemHTML(r.diemThiDua)}</td>
            <td style="text-align:right">${esc(r.soLanGhiSo)}</td>
            <td style="text-align:right">${esc(r.soLanHaBac)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>

    <div class="card">
      <h2>Ghi chú</h2>
      <p class="hint" style="margin:0">Xếp loại do cán bộ lớp / giáo viên chủ nhiệm nhập, giống như ghi vào sổ giấy.
        Các cột <em>Điểm</em>, <em>Ghi sổ</em>, <em>Hạ bậc</em> là số liệu máy tự tổng hợp từ nhật ký hằng ngày
        để tiện theo dõi, không tự động quyết định xếp loại.</p>
    </div>`;

  q('#iThang').onchange = function () { location.hash = '#/bang-lop?thang=' + this.value; };
  q('#iThang').dataset.hienTai = thang;

  if (!duocSua) return;

  const doi = {};   // maHS -> xếp loại mới
  const banDau = {};
  ds.forEach(function (r) { banDau[r.maHS] = r.xepLoai || ''; });

  function veLai() {
    const n = Object.keys(doi).length;
    chuaLuu = n > 0;
    q('#demXL').textContent = n ? n + ' thay đổi chưa lưu' : '';
    q('#btnLuuXL').disabled = n === 0;
  }

  qa('.selXL').forEach(function (sel) {
    sel.onchange = function () {
      const ma = sel.dataset.ma;
      if (sel.value === banDau[ma]) delete doi[ma]; else doi[ma] = sel.value;
      veLai();
    };
  });

  q('#btnDungGoiY').onclick = function () {
    ds.forEach(function (r) {
      if (!r.deXuat) return;
      const sel = el.querySelector('.selXL[data-ma="' + r.maHS + '"]');
      if (!sel || sel.value === r.deXuat) return;
      sel.value = r.deXuat;
      sel.dispatchEvent(new Event('change'));
    });
  };

  q('#btnLuuXL').onclick = async function () {
    qa(':scope > .msg').forEach(function (x) { x.remove(); });
    const items = Object.keys(doi).map(function (ma) {
      return { maHS: ma, thang: thang, xepLoai: doi[ma] };
    });
    this.disabled = true; this.textContent = 'Đang lưu…';
    dangLuu = true;
    qa('.selXL, #btnDungGoiY').forEach(function (x) { x.disabled = true; });
    try {
      await API.luuXepLoai(items);
      chuaLuu = false;
      Object.keys(doi).forEach(function (ma) { banDau[ma] = doi[ma]; delete doi[ma]; });
      veLai();
      el.insertAdjacentHTML('afterbegin',
        '<div class="msg ok">Đã lưu xếp loại cho ' + items.length + ' học sinh.</div>');
      window.scrollTo(0, 0);
    } catch (e) {
      el.insertAdjacentHTML('afterbegin', '<div class="msg err">' + esc(e.message) + '</div>');
      window.scrollTo(0, 0);
      this.disabled = false; this.textContent = 'Lưu xếp loại';
    } finally {
      dangLuu = false;
      qa('.selXL, #btnDungGoiY').forEach(function (x) { x.disabled = false; });
      this.textContent = 'Lưu xếp loại';
    }
  };
}

// ---------- Chi tiết 1 học sinh ----------
async function mhChiTiet() {
  // Phụ huynh chỉ xem được con mình, không đổi sang học sinh khác
  const phuHuynh = vaiTro() === 'PHU_HUYNH' ? (Store.get('maHS') || '') : '';
  const luot = lanHienThi;
  loading();
  if (!DSHS) DSHS = await API.dsHocSinh();
  if (luot !== lanHienThi) return;
  const ma = phuHuynh || thamSo('ma') || (DSHS[0] && DSHS[0].maHS);
  if (!ma) { el.innerHTML = '<div class="empty">Chưa có học sinh nào.</div>'; return; }

  const d = await API.chiTietHS(ma);
  if (luot !== lanHienThi) return;
  const tuanLoc = thamSo('tuan');            // lọc đúng 1 tuần, ưu tiên hơn lọc tháng
  const thangLoc = tuanLoc ? 0 : (Number(thamSo('thang')) || thangMacDinh());
  const hopTuan = function (maTuan, thang) {
    if (tuanLoc) return maTuan === tuanLoc;
    return !thangLoc || Number(thang) === thangLoc;
  };
  const chiTiet = d.chiTiet.filter(function (r) { return hopTuan(r.maTuan, r.thang); });
  const cacTuan = (d.tuan || []).filter(function (t) { return hopTuan(t.maTuan, t.thang); })
    .sort(function (a, b) { return String(a.tuNgay).localeCompare(String(b.tuNgay)); });
  const theoTuan = {};
  chiTiet.forEach(function (r) {
    if (!theoTuan[r.maTuan]) theoTuan[r.maTuan] = [];
    theoTuan[r.maTuan].push(r);
  });
  const h = d.hocSinh;
  const tongDiem = chiTiet.reduce(function (s, r) { return s + Number(r.diem || 0); }, 0);
  const soLoi = chiTiet.filter(function (r) { return r.loai === 'LOI'; }).length;
  const soCong = chiTiet.filter(function (r) { return r.loai === 'CONG'; }).length;
  const tuanDangLoc = tuanLoc
    ? (d.tuan || []).filter(function (t) { return t.maTuan === tuanLoc; })[0]
    : null;
  const nhanLoc = tuanDangLoc
    ? 'tuần ' + (tuanDangLoc.soTuan || tuanDangLoc.maTuan)
    : (thangLoc ? 'tháng ' + thangLoc : 'cả năm');
  const thangCuaTuanLoc = tuanLoc
    ? Number((d.tuan || []).filter(function (t) { return t.maTuan === tuanLoc; }).map(function (t) { return t.thang; })[0] || 0)
    : 0;
  const tongHopThang = d.thang.filter(function (t) {
    if (tuanLoc) return Number(t.thang) === thangCuaTuanLoc;
    return !thangLoc || Number(t.thang) === thangLoc;
  });

  function mucTuan(items, loai) {
    const ds = items.filter(function (r) { return r.loai === loai; });
    if (!ds.length) return '<div class="week-empty">Không có</div>';
    return '<ul class="week-list">' + ds.map(function (r) {
      return '<li><span><strong>' + esc(r.ten) + '</strong>' +
        (r.cot ? '<small>' + esc(r.cot) + '</small>' : '') +
        (r.nhom === 'HA_BAC' ? ' <span class="badge DAT">hạ 1 bậc</span>' : '') +
        (r.nhom === 'CHUA_DAT' ? ' <span class="badge CHUA_DAT">nghiêm trọng</span>' : '') +
        '</span>' + diemHTML(r.diem) + '</li>';
    }).join('') + '</ul>';
  }

  function theTuan(t) {
    const items = (theoTuan[t.maTuan] || []).sort(function (a, b) { return Number(b.diem) - Number(a.diem); });
    const diem = items.reduce(function (s, r) { return s + Number(r.diem || 0); }, 0);
    return `<section class="week-card">
      <div class="week-head">
        <div>
          <h3>Tuần ${esc(t.soTuan || t.maTuan)}</h3>
          <p>${esc(t.tuNgay)} đến ${esc(t.denNgay)}</p>
        </div>
        ${diemHTML(diem)}
      </div>
      <div class="week-cols">
        <div>
          <h4>Điểm cộng</h4>
          ${mucTuan(items, 'CONG')}
        </div>
        <div>
          <h4>Điểm trừ</h4>
          ${mucTuan(items, 'LOI')}
        </div>
      </div>
    </section>`;
  }

  el.innerHTML = `
    <div class="card">
      ${phuHuynh ? '' : `<label class="f" for="iHS">Chọn học sinh</label>
      <select id="iHS">${DSHS.map(function (x) {
        return '<option value="' + esc(x.maHS) + '"' + (x.maHS === ma ? ' selected' : '') + '>' +
          esc(x.hoTen) + '</option>';
      }).join('')}</select>`}
      <label class="f" for="iLoc" style="margin-top:12px">Xem theo</label>
      <select id="iLoc">
        <option value="thang:0"${!tuanLoc && !thangLoc ? ' selected' : ''}>Cả năm học</option>
        <optgroup label="Theo tháng">
          ${THANG_HOC.map(function (t) {
            return '<option value="thang:' + t + '"' + (!tuanLoc && t === thangLoc ? ' selected' : '') +
              '>Tháng ' + t + '</option>';
          }).join('')}
        </optgroup>
        ${(d.tuan || []).length ? `<optgroup label="Theo tuần">
          ${(d.tuan || []).slice().sort(function (a, b) {
            return String(b.tuNgay).localeCompare(String(a.tuNgay));
          }).map(function (t) {
            return '<option value="tuan:' + esc(t.maTuan) + '"' + (t.maTuan === tuanLoc ? ' selected' : '') +
              '>Tuần ' + esc(t.soTuan || t.maTuan) + ' (' + esc(String(t.tuNgay).slice(8, 10) + '/' + String(t.tuNgay).slice(5, 7)) +
              '–' + esc(String(t.denNgay).slice(8, 10) + '/' + String(t.denNgay).slice(5, 7)) + ')</option>';
          }).join('')}
        </optgroup>` : ''}
      </select>
    </div>

    <div class="card">
      <h2>${esc(h.hoTen)}</h2>
      <p class="hint">${esc(h.maHS)}${h.chucVu ? ' · ' + esc(h.chucVu) : ''}</p>
      <div class="stat">
        <div><div class="n ${tongDiem < 0 ? 'diem am' : 'diem duong'}">${tongDiem > 0 ? '+' : ''}${tongDiem}</div>
          <div class="l">Điểm thi đua ${nhanLoc}</div></div>
        <div><div class="n">${soLoi}</div><div class="l">Lượt vi phạm</div></div>
        <div><div class="n">${soCong}</div><div class="l">Lượt được cộng</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Chi tiết ${nhanLoc}</h2>
      <p class="hint">Nội dung bên dưới là các mục được cán bộ lớp chép lại từ sổ chính theo từng tuần.</p>
      ${cacTuan.length ? '<div class="week-grid">' + cacTuan.map(theTuan).join('') + '</div>'
        : '<div class="empty">Chưa có lịch tuần cho tháng này.</div>'}
    </div>

    <div class="card">
      <h2>Xếp loại ${tuanLoc ? 'tháng ' + esc(thangCuaTuanLoc) : (thangLoc ? 'tháng ' + esc(thangLoc) : 'từng tháng')}</h2>
      ${tongHopThang.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Tháng</th><th>Xếp loại</th><th style="text-align:right">Điểm</th>
          <th style="text-align:right">Ghi sổ ĐB</th><th style="text-align:right">Hạ bậc</th>
          <th style="text-align:right">Lỗi nhỏ dư</th><th></th></tr></thead>
        <tbody>${tongHopThang.map(function (t) {
          return `<tr>
            <td><strong>Tháng ${esc(t.thang)}</strong></td>
            <td>${t.xepLoai ? '<span class="badge ' + esc(t.xepLoai) + '">' + esc(t.nhan) + '</span>' : '<span style="color:var(--ink-mute);font-size:12.5px">chưa xếp</span>'}</td>
            <td style="text-align:right">${diemHTML(t.diemThiDua)}</td>
            <td style="text-align:right">${esc(t.soLanGhiSo || 0)}</td>
            <td style="text-align:right">${esc(t.soLanHaBac || 0)}</td>
            <td style="text-align:right">${esc(t.loiNhoTonKho || 0)}</td>
            <td>${t.daChot ? '<span class="badge DAT">đã chốt</span>'
                           : '<span style="color:var(--ink-mute);font-size:12.5px">tạm tính</span>'}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : '<div class="empty">Chưa có dữ liệu tháng nào.</div>'}
      ${d.ky && d.ky.length ? `<p class="hint" style="margin-top:12px">${d.ky.map(function (k) {
        return '<strong>' + (k.ky === 'CA_NAM' ? 'Cả năm' : k.ky) + ':</strong> ' +
          (k.xepLoai ? '<span class="badge ' + k.xepLoai + '">' + esc(k.nhan) + '</span>' : '—') +
          (k.daDuyet ? '' : ' <em>(dự kiến)</em>');
      }).join(' &nbsp;·&nbsp; ')}</p>` : ''}
    </div>`;

  const locHienTai = tuanLoc ? '&tuan=' + encodeURIComponent(tuanLoc) : '&thang=' + thangLoc;
  const oHS = q('#iHS');
  if (oHS) oHS.onchange = function () {
    location.hash = '#/chi-tiet?ma=' + encodeURIComponent(this.value) + locHienTai;
  };
  q('#iLoc').onchange = function () {
    const v = String(this.value).split(':');
    const p = v[0] === 'tuan' ? '&tuan=' + encodeURIComponent(v[1]) : '&thang=' + v[1];
    location.hash = '#/chi-tiet?ma=' + encodeURIComponent(ma) + p;
  };
}

// ---------- Xếp hạng thi đua ----------
async function mhThiDua() {
  const luot = lanHienThi;
  loading();
  const thang = Number(thamSo('thang')) || thangMacDinh();
  const ds = await API.bangLop(thang);
  if (luot !== lanHienThi) return;
  const top = ds.slice().sort(function (a, b) { return (b.diemThiDua || 0) - (a.diemThiDua || 0); });

  el.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div>
          <h2>Xếp hạng thi đua — tháng ${esc(thang)}</h2>
          <p class="hint" style="margin:0">Cộng dồn điểm các tuần trong tháng, lấy từ sổ thi đua.</p>
        </div>
        <div>${oChonThang(thang)}</div>
      </div>
    </div>

    <div class="card">
      <div class="tbl-wrap"><table>
        <thead><tr><th>Hạng</th><th>Họ tên</th><th style="text-align:right">Điểm</th></tr></thead>
        <tbody>${top.map(function (r, i) {
          return `<tr style="cursor:pointer" data-ma="${esc(r.maHS)}">
            <td><span class="hang ${i === 0 ? 'top1' : ''}">${i === 0 ? '🏆' : i + 1}</span></td>
            <td>${esc(r.hoTen)}</td>
            <td style="text-align:right">${diemHTML(r.diemThiDua)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`;

  q('#iThang').onchange = function () { location.hash = '#/thi-dua?thang=' + this.value; };
  qa('tbody tr[data-ma]').forEach(function (tr) {
    tr.onclick = function () { location.hash = '#/chi-tiet?ma=' + tr.dataset.ma + '&thang=' + thang; };
  });
}

/** Đoán số tuần và khoảng ngày cho trang mới, dựa vào trang gần nhất. */
function goiYTuanMoi(dsTuan) {
  const hnayD = new Date();
  if (!dsTuan || !dsTuan.length) {
    const t2 = new Date(hnayD); t2.setDate(t2.getDate() - ((t2.getDay() + 6) % 7));
    const cn = new Date(t2); cn.setDate(cn.getDate() + 6);
    return { soTuan: 1, tuNgay: ngayISO(t2), denNgay: ngayISO(cn) };
  }
  const gan = dsTuan[0];
  const tu = new Date(String(gan.TuNgay) + 'T12:00:00');
  tu.setDate(tu.getDate() + 7);
  const den = new Date(tu); den.setDate(den.getDate() + 6);
  return { soTuan: Number(gan.SoTuan || 0) + 1, tuNgay: ngayISO(tu), denNgay: ngayISO(den) };
}

function ngayISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0');
}

/** Form tạo / sửa một trang tuần. */
function formTaoTuan(suaTuan, dsTuan) {
  const v = suaTuan
    ? { soTuan: suaTuan.soTuan, tuNgay: suaTuan.tuNgay, denNgay: suaTuan.denNgay, ghiChu: suaTuan.ghiChu || '' }
    : Object.assign({ ghiChu: '' }, goiYTuanMoi(dsTuan));
  return `
    <form id="fTuan" class="row" style="gap:10px;align-items:flex-end">
      <div style="flex:1;min-width:110px">
        <label class="f">Tuần thứ</label>
        <input type="number" id="tSo" min="1" max="60" value="${esc(v.soTuan)}" required>
      </div>
      <div style="flex:1;min-width:150px">
        <label class="f">Từ ngày</label>
        <input type="date" id="tTu" value="${esc(v.tuNgay)}" required>
      </div>
      <div style="flex:1;min-width:150px">
        <label class="f">Đến ngày</label>
        <input type="date" id="tDen" value="${esc(v.denNgay)}" required>
      </div>
      <div style="flex:2;min-width:170px">
        <label class="f">Ghi chú <span style="font-weight:400">(không bắt buộc)</span></label>
        <input id="tGhiChu" value="${esc(v.ghiChu)}" placeholder="ví dụ: tuần sau nghỉ Tết">
      </div>
      <button class="primary" type="submit">${suaTuan ? 'Lưu trang tuần' : 'Tạo trang'}</button>
    </form>
    <p class="hint" style="margin:10px 0 0">Tuần nghỉ Tết, nghỉ lễ thì <strong>không cần tạo trang</strong> —
      cứ bỏ qua, tuần sau tạo tiếp là được.</p>
    <div id="tLoi"></div>`;
}

/** Gắn sự kiện cho form tạo/sửa trang tuần. */
function ganFormTaoTuan(suaTuan) {
  const f = q('#fTuan');
  if (!f) return;

  // Chọn ngày bắt đầu thì tự điền ngày kết thúc sau đó 6 ngày
  q('#tTu').onchange = function () {
    const d = new Date(this.value + 'T12:00:00');
    if (isNaN(d.getTime())) return;
    const den = q('#tDen');
    if (!den.value || den.value < this.value) {
      d.setDate(d.getDate() + 6);
      den.value = ngayISO(d);
    }
  };

  f.onsubmit = async function (ev) {
    ev.preventDefault();
    const btn = f.querySelector('button');
    const tuan = {
      soTuan: q('#tSo').value,
      tuNgay: q('#tTu').value,
      denNgay: q('#tDen').value,
      ghiChu: q('#tGhiChu').value.trim()
    };
    btn.disabled = true; btn.textContent = 'Đang lưu…';
    try {
      const kq = suaTuan
        ? await API.suaTuan(suaTuan.maTuan, tuan)
        : await API.taoTuan(tuan);
      LICHTUAN = null;
      location.hash = '#/cham-diem?tuan=' + (suaTuan ? suaTuan.maTuan : kq.maTuan);
      dinhTuyen();
    } catch (e) {
      q('#tLoi').innerHTML = '<div class="msg err" style="margin-top:10px">' + esc(e.message) + '</div>';
      btn.disabled = false; btn.textContent = suaTuan ? 'Lưu trang tuần' : 'Tạo trang';
    }
  };
}

// ---------- Sổ thi đua: nhập theo NGÀY cho từng học sinh ----------
// Dựng theo bảng cô gửi: ngày | Lỗi vi phạm - Môn | Môn - Điểm tốt | Môn - Điểm kém | Ghi chú
// Mỗi HS bắt đầu tuần với 100đ, chọn lỗi thì tự trừ, có mục "khác" để gõ tay.
async function mhChamDiem() {
  const luot = lanHienThi;
  if (!vaiTro()) { location.hash = '#/dang-nhap'; return; }
  loading();

  LICHTUAN = await API.lichTuan();
  if (luot !== lanHienThi) return;
  const tuanHoc = LICHTUAN.filter(function (t) { return t.MaTuan; })
    .sort(function (a, b) { return String(b.TuNgay).localeCompare(String(a.TuNgay)); });

  if (!tuanHoc.length) {
    el.innerHTML = `
      <div class="card">
        <h2>Chưa có trang tuần nào</h2>
        <p class="hint">Sổ thi đua bắt đầu bằng việc tạo một trang tuần — giống như mở
          trang mới trong sổ giấy. Điền tuần mấy, từ ngày đến ngày là xong.</p>
        ${formTaoTuan()}
      </div>`;
    ganFormTaoTuan();
    return;
  }

  if (!DANHMUC) DANHMUC = await API.danhMucDayDu();
  if (!DSHS) DSHS = await API.dsHocSinhCuaToi();
  if (luot !== lanHienThi) return;
  if (!DSHS.length) { el.innerHTML = '<div class="empty">Không có học sinh nào bạn được ghi.</div>'; return; }

  const maTuan = thamSo('tuan') || tuanHoc[0].MaTuan;
  const maHS = thamSo('ma') || DSHS[0].maHS;
  const quanLyTuan = vaiTro() === 'LOP_TRUONG' || vaiTro() === 'GVCN';

  const d = await API.nhatKyHS(maHS, maTuan);
  if (luot !== lanHienThi) return;

  const oChonTuan = '<select id="iTuan" style="min-width:210px">' + tuanHoc.map(function (t) {
    return '<option value="' + esc(t.MaTuan) + '"' + (t.MaTuan === maTuan ? ' selected' : '') + '>' +
      'Tuần ' + esc(t.SoTuan) + ' — ' + esc(ngayNgan(t.TuNgay)) + ' đến ' + esc(ngayNgan(t.DenNgay)) +
      '</option>';
  }).join('') + '</select>';

  const oChonHS = '<select id="iChonHS" style="min-width:200px">' + DSHS.map(function (h) {
    return '<option value="' + esc(h.maHS) + '"' + (h.maHS === maHS ? ' selected' : '') + '>' +
      esc(h.hoTen) + '</option>';
  }).join('') + '</select>';

  const t = d.tong;
  el.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div>
          <h2>Sổ thi đua — Tuần ${esc(d.tuan.soTuan)}</h2>
          <p class="hint" style="margin:0">${esc(d.tuan.tuNgay)} đến ${esc(d.tuan.denNgay)} · tháng ${esc(d.tuan.thang)}</p>
        </div>
        <div class="row" style="gap:8px">
          ${oChonTuan}
          <button class="sm" id="btnTrangMoi">+ Trang tuần mới</button>
          ${quanLyTuan ? '<button class="sm" id="btnSuaTuan">Sửa</button>' +
                         '<button class="sm" id="btnXoaTuan">Xoá trang</button>' : ''}
        </div>
      </div>
      <div id="khungTaoTuan" style="display:none;margin-top:14px"></div>
    </div>

    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div style="flex:1;min-width:200px">
          <label class="f">Học sinh</label>
          ${oChonHS}
        </div>
        <div class="stat" style="flex:2;min-width:260px">
          <div><div class="n diem">${esc(t.batDau)}</div><div class="l">Điểm đầu tuần</div></div>
          <div><div class="n diem duong">+${esc(t.cong)}</div><div class="l">Cộng</div></div>
          <div><div class="n diem am">${esc(t.tru)}</div><div class="l">Trừ</div></div>
          <div><div class="n ${t.cuoi >= t.batDau ? 'diem duong' : 'diem am'}">${esc(t.cuoi)}</div>
            <div class="l">Còn lại</div></div>
          <div><div class="n">${t.xepLoai ? '<span class="badge ' + esc(t.xepLoai) + '">' + esc(t.nhan) + '</span>' : '—'}</div>
            <div class="l">Xếp loại tuần</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Thêm một mục</h2>
      <p class="hint">Chọn lỗi trong danh sách thì web tự trừ điểm. Không có trong danh sách thì
        chọn <strong>Lỗi khác</strong> rồi tự ghi nội dung và số điểm.</p>
      <form id="fThem">
        <div class="row" style="gap:10px">
          <div style="flex:1;min-width:140px">
            <label class="f">Ngày</label>
            <input type="date" id="mNgay" value="${esc(ngayTrongTuan(d.tuan))}"
              min="${esc(d.tuan.tuNgay)}" max="${esc(d.tuan.denNgay)}" required>
          </div>
          <div style="flex:1;min-width:130px">
            <label class="f">Loại</label>
            <select id="mLoai">
              <option value="LOI">Lỗi vi phạm</option>
              <option value="CONG">Điểm cộng</option>
            </select>
          </div>
          <div style="flex:3;min-width:240px">
            <label class="f">Nội dung</label>
            <select id="mMa"></select>
          </div>
        </div>
        <div class="row" style="gap:10px;margin-top:10px">
          <div style="flex:1;min-width:130px" id="oMon">
            <label class="f">Môn <span id="monBatBuoc" style="font-weight:400"></span></label>
            <input id="mMon" list="dsMon" placeholder="Toán, Văn, Anh...">
            <datalist id="dsMon">
              ${['Toán','Văn','Anh','Lí','Hoá','Sinh','Sử','Địa','GDCD','Tin','Công nghệ','Thể dục','GDQP']
                .map(function (m) { return '<option value="' + m + '">'; }).join('')}
            </datalist>
          </div>
          <div style="flex:1;min-width:110px;display:none" id="oDiem">
            <label class="f">Số điểm</label>
            <input type="number" id="mDiem" step="1" min="1" placeholder="5">
          </div>
          <div style="flex:2;min-width:180px">
            <label class="f">Ghi chú</label>
            <input id="mGhiChu" placeholder="không bắt buộc">
          </div>
          <button class="primary" type="submit" style="align-self:flex-end">Thêm</button>
        </div>
        <p class="hint" id="mGoiY" style="margin:10px 0 0"></p>
      </form>
      <div id="mLoi"></div>
    </div>

    <div class="card">
      <h2>Đã ghi trong tuần <span style="color:var(--ink-mute);font-weight:400">(${d.dong.length} mục)</span></h2>
      ${d.dong.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Ngày</th><th>Nội dung</th><th>Môn</th><th>Ghi chú</th>
          <th style="text-align:right">Điểm</th><th></th></tr></thead>
        <tbody>${d.dong.map(function (r) {
          return `<tr>
            <td style="white-space:nowrap">${esc(ngayNgan(r.ngay))}</td>
            <td>${esc(r.ten)}
              ${r.nhom === 'HA_BAC' ? '<span class="badge DAT">hạ 1 bậc</span>' : ''}
              ${r.nhom === 'CHUA_DAT' ? '<span class="badge CHUA_DAT">chưa đạt</span>' : ''}
              ${r.nhomCha ? '<br><small style="color:var(--ink-mute)">' + esc(r.nhomCha) + '</small>' : ''}</td>
            <td>${esc(r.mon)}</td>
            <td style="color:var(--ink-mute)">${esc(r.ghiChu)}</td>
            <td style="text-align:right">${diemHTML(r.diem)}</td>
            <td><button class="sm btnXoaMuc" data-id="${esc(r.id)}">Xoá</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : '<div class="empty">Chưa ghi mục nào cho bạn này trong tuần.</div>'}
    </div>`;

  // ---- điều hướng ----
  const diTiep = function (tuan, hs) {
    location.hash = '#/cham-diem?tuan=' + encodeURIComponent(tuan) + '&ma=' + encodeURIComponent(hs);
  };
  q('#iTuan').onchange = function () { diTiep(this.value, maHS); };
  q('#iTuan').dataset.hienTai = maTuan;
  q('#iChonHS').onchange = function () { diTiep(maTuan, this.value); };

  q('#btnTrangMoi').onclick = function () { moKhungTuan(); };
  if (quanLyTuan) {
    q('#btnSuaTuan').onclick = function () { moKhungTuan(d.tuan); };
    q('#btnXoaTuan').onclick = async function () {
      if (!confirm('Xoá trang Tuần ' + d.tuan.soTuan + '?')) return;
      try { await API.xoaTuan(maTuan); LICHTUAN = null; location.hash = '#/cham-diem'; dinhTuyen(); }
      catch (e) { alert(e.message); }
    };
  }

  function moKhungTuan(suaTuan) {
    const box = q('#khungTaoTuan');
    if (box.style.display !== 'none' && box.dataset.sua === String(!!suaTuan)) {
      box.style.display = 'none'; return;
    }
    box.dataset.sua = String(!!suaTuan);
    box.innerHTML = formTaoTuan(suaTuan, tuanHoc);
    box.style.display = '';
    ganFormTaoTuan(suaTuan);
    box.scrollIntoView({ block: 'nearest' });
  }

  // ---- ô chọn nội dung đổi theo Loại ----
  function veLaiDanhMuc() {
    const laCong = q('#mLoai').value === 'CONG';
    const ds = laCong ? DANHMUC.cong : DANHMUC.loi;
    const nhom = {};
    ds.forEach(function (x) { (nhom[x.nhomCha || 'Khác'] = nhom[x.nhomCha || 'Khác'] || []).push(x); });
    q('#mMa').innerHTML = Object.keys(nhom).map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + nhom[g].map(function (x) {
        const d = x.tuNhap ? 'tự nhập' : (x.diem > 0 ? '+' + x.diem : String(x.diem)) + 'đ';
        return '<option value="' + esc(x.ma) + '">' + esc(x.ten) + ' (' + d + ')</option>';
      }).join('') + '</optgroup>';
    }).join('');
    veLaiMuc();
  }

  function mucDangChon() {
    const laCong = q('#mLoai').value === 'CONG';
    const ds = laCong ? DANHMUC.cong : DANHMUC.loi;
    return ds.filter(function (x) { return x.ma === q('#mMa').value; })[0];
  }

  function veLaiMuc() {
    const m = mucDangChon();
    if (!m) return;
    q('#oDiem').style.display = m.tuNhap ? '' : 'none';
    q('#mDiem').required = !!m.tuNhap;
    q('#monBatBuoc').textContent = m.canMon ? '(bắt buộc)' : '(không bắt buộc)';
    q('#mMon').required = !!m.canMon;
    q('#mGhiChu').placeholder = m.tuNhap ? 'ghi rõ nội dung — bắt buộc' : 'không bắt buộc';
    const nhac = [];
    if (m.tuNhap) nhac.push('Tự ghi nội dung và số điểm.');
    else nhac.push('Tự trừ ' + Math.abs(m.diem) + 'đ.');
    if (m.nhanDoi) nhac.push('Tái phạm trong cùng tuần thì trừ gấp đôi.');
    if (m.ghiSo) nhac.push('Tính 1 lần bị ghi sổ đầu bài.');
    if (m.nhom === 'HA_BAC') nhac.push('Hạ 1 bậc hạnh kiểm tháng.');
    if (m.nhom === 'CHUA_DAT') nhac.push('Xếp loại Chưa đạt tháng đó.');
    q('#mGoiY').textContent = nhac.join(' ');
  }

  q('#mLoai').onchange = veLaiDanhMuc;
  q('#mMa').onchange = veLaiMuc;
  veLaiDanhMuc();

  // ---- thêm mục ----
  q('#fThem').onsubmit = async function (ev) {
    ev.preventDefault();
    const btn = q('#fThem button');
    btn.disabled = true; btn.textContent = 'Đang lưu…';
    try {
      await API.themNhatKy({
        maHS: maHS, ngay: q('#mNgay').value, loai: q('#mLoai').value,
        ma: q('#mMa').value, mon: q('#mMon').value.trim(),
        ghiChu: q('#mGhiChu').value.trim(), diem: q('#mDiem').value
      });
      dinhTuyen();
    } catch (e) {
      q('#mLoi').innerHTML = '<div class="msg err" style="margin-top:10px">' + esc(e.message) + '</div>';
      btn.disabled = false; btn.textContent = 'Thêm';
    }
  };

  qa('.btnXoaMuc').forEach(function (b) {
    b.onclick = async function () {
      if (!confirm('Xoá mục này?')) return;
      b.disabled = true;
      try { await API.xoaNhatKy(b.dataset.id); dinhTuyen(); }
      catch (e) { alert(e.message); b.disabled = false; }
    };
  });
}

/** Ngày mặc định khi thêm mục: hôm nay nếu nằm trong tuần, không thì ngày đầu tuần. */
function ngayTrongTuan(tuan) {
  const h = hnay();
  return (h >= tuan.tuNgay && h <= tuan.denNgay) ? h : tuan.tuNgay;
}

function ngayNgan(s) {
  s = String(s || '');
  return s.length >= 10 ? s.slice(8, 10) + '/' + s.slice(5, 7) : s;
}

// ---------- Quản trị (GVCN) ----------
async function mhQuanTri() {
  if (vaiTro() !== 'GVCN') {
    el.innerHTML = '<div class="msg warn">Khu vực này chỉ dành cho giáo viên chủ nhiệm.</div>';
    return;
  }
  const thangNay = thangMacDinh();
  el.innerHTML = `
    <div class="card">
      <h2>Công cụ chủ nhiệm</h2>
      <p class="hint">Chốt tháng xong thì cán bộ lớp không sửa được tháng đó nữa.
        Lỡ chốt nhầm thì vào sheet <code>XepLoaiThang</code> đổi cột <code>DaChot</code> về FALSE.</p>
      <div class="row" style="align-items:flex-end">
        <div><label class="f">Tháng cần chốt</label>${oChonThang(thangNay)}</div>
        <button id="btnChot">Chốt tháng</button>
      </div>
      <div class="row" style="margin-top:14px">
        <button id="btnTinhLai">Tính lại số liệu</button>
        <button class="primary" id="btnXuat">Xuất file Excel theo mẫu trường</button>
      </div>
      <div id="kqQT" style="margin-top:12px"></div>
    </div>
`;

  const bao = function (cls, t) { q('#kqQT').innerHTML = '<div class="msg ' + cls + '">' + t + '</div>'; };

  q('#btnTinhLai').onclick = async function () {
    bao('warn', 'Đang tính…');
    try { const r = await API.tinhLai(); bao('ok', 'Đã tính lại ' + r.soBanGhi + ' bản ghi.'); }
    catch (e) { bao('err', esc(e.message)); }
  };
  q('#btnChot').onclick = async function () {
    const thang = q('#iThang').value;
    if (!confirm('Chốt tháng ' + thang + '? Sau khi chốt, cán bộ lớp không sửa được tháng này nữa.')) return;
    try { const r = await API.chotThang(thang); bao('ok', 'Đã chốt tháng ' + thang + ' cho ' + r.soHS + ' học sinh.'); }
    catch (e) { bao('err', esc(e.message)); }
  };
  q('#btnXuat').onclick = async function () {
    bao('warn', 'Đang tạo file, có thể mất 20–30 giây…');
    try {
      const r = await API.xuatExcel();
      bao('ok', 'Đã tạo: <a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.ten) + '</a> ' +
        '(mở lên rồi chọn Tệp → Tải xuống → Microsoft Excel)');
    } catch (e) { bao('err', esc(e.message)); }
  };
}

// ---------- Đổi mật khẩu (bắt buộc ở lần đăng nhập đầu) ----------
let mkCuTamThoi = '';

async function mhDoiMatKhau() {
  if (!vaiTro()) { location.hash = '#/dang-nhap'; return; }
  el.innerHTML = `
    <div class="card" style="max-width:440px;margin:0 auto">
      <h2>Đổi mật khẩu</h2>
      <p class="hint">${mkCuTamThoi
        ? 'Đây là lần đăng nhập đầu tiên. Hãy đặt mật khẩu riêng để người khác không vào được tài khoản của bạn.'
        : 'Đặt mật khẩu mới cho tài khoản ' + esc(Store.get('hoTen') || '') + '.'}</p>
      <form id="fMK">
        <label class="f">Mật khẩu hiện tại</label>
        <input id="mkCu" type="password" value="${esc(mkCuTamThoi)}" autocomplete="current-password" required>
        <label class="f" style="margin-top:10px">Mật khẩu mới <span style="font-weight:400">(từ 6 ký tự)</span></label>
        <input id="mkMoi" type="password" minlength="6" autocomplete="new-password" required>
        <label class="f" style="margin-top:10px">Nhập lại mật khẩu mới</label>
        <input id="mkLai" type="password" minlength="6" autocomplete="new-password" required>
        <button class="primary" type="submit" style="margin-top:14px;width:100%">Đổi mật khẩu</button>
      </form>
      <div id="mkLoi"></div>
    </div>`;

  q('#fMK').onsubmit = async function (ev) {
    ev.preventDefault();
    const bao = function (t) { q('#mkLoi').innerHTML = '<div class="msg err" style="margin-top:12px">' + esc(t) + '</div>'; };
    if (q('#mkMoi').value !== q('#mkLai').value) { bao('Hai ô mật khẩu mới không giống nhau'); return; }
    const btn = q('#fMK button');
    btn.disabled = true; btn.textContent = 'Đang đổi…';
    try {
      await API.doiMatKhau(q('#mkCu').value, q('#mkMoi').value);
      mkCuTamThoi = '';
      const vt = vaiTro();
      el.innerHTML = '<div class="msg ok">Đã đổi mật khẩu. Lần sau đăng nhập bằng mật khẩu mới.</div>';
      setTimeout(function () { location.hash = trangChuTheoVaiTro(); dinhTuyen(); }, 1200);
    } catch (e) {
      bao(e.message);
      btn.disabled = false; btn.textContent = 'Đổi mật khẩu';
    }
  };
}

// ---------- Đăng nhập ----------
async function mhDangNhap() {
  el.innerHTML = `
    <div class="card" style="max-width:420px;margin:0 auto">
      <h2>Đăng nhập</h2>
      <p class="hint">Sổ theo dõi này chỉ dành cho lớp, cần đăng nhập mới xem được.</p>
      <details class="qa" style="margin-bottom:14px">
        <summary>Phụ huynh đăng nhập thế nào?</summary>
        <p style="margin:8px 0 0">Tên đăng nhập và mật khẩu do cô chủ nhiệm phát.
          Tên đăng nhập là <strong>họ tên con viết liền không dấu</strong> kèm đuôi lớp —
          ví dụ <code>nguyenvanana0k67</code>.</p>
        <p style="margin:8px 0 0">Lần đầu vào, web sẽ yêu cầu đổi sang mật khẩu riêng của mình.
          Mỗi phụ huynh chỉ xem được kết quả của con mình.</p>
        <p style="margin:8px 0 0">Quên mật khẩu thì nhắn cô chủ nhiệm cấp lại.</p>
      </details>
      <form id="fDN">
        <label class="f">Tên đăng nhập</label>
        <input id="iU" autocomplete="username" required>
        <label class="f" style="margin-top:10px">Mật khẩu</label>
        <input id="iP" type="password" autocomplete="current-password" required>
        <button class="primary" type="submit" style="margin-top:14px;width:100%">Đăng nhập</button>
      </form>
      <div id="dnLoi"></div>
    </div>`;

  q('#fDN').onsubmit = async function (ev) {
    ev.preventDefault();
    const btn = q('#fDN button');
    btn.disabled = true; btn.textContent = 'Đang kiểm tra…';
    try {
      const d = await API.dangNhap(q('#iU').value.trim(), q('#iP').value);
      Store.set('token', d.token); Store.set('hoTen', d.hoTen);
      Store.set('vaiTro', d.vaiTro); Store.set('toPhuTrach', d.toPhuTrach || '');
      location.hash = d.vaiTro === 'GVCN' ? '#/bang-lop' : '#/cham-diem';
    } catch (e) {
      q('#dnLoi').innerHTML = '<div class="msg err" style="margin-top:12px">' + esc(e.message) + '</div>';
      btn.disabled = false; btn.textContent = 'Đăng nhập';
    }
  };
}

khoiDong();
