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
  return (LOP && LOP.tuanHienTai && LOP.tuanHienTai.Thang) || (new Date().getMonth() + 1);
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
    'dang-nhap': mhDangNhap
  }[ten] || mhBangLop;
  mh().catch(function (e) { if (luot === lanHienThi) loi(e); });
  window.scrollTo(0, 0);
  capNhatNav();
}

function capNhatNav() {
  document.querySelectorAll('[data-canQuyen]').forEach(function (a) {
    a.style.display = vaiTro() ? '' : 'none';
  });
  document.querySelectorAll('[data-gvcn]').forEach(function (a) {
    a.style.display = vaiTro() === 'GVCN' ? '' : 'none';
  });
  const btn = document.getElementById('btnPhien');
  if (vaiTro()) {
    btn.textContent = 'Thoát (' + (Store.get('hoTen') || '') + ')';
    btn.onclick = function () {
      if (!coTheRoiTrang()) return;
      chuaLuu = false; Store.xoaHet();
      if (location.hash === '#/bang-lop') dinhTuyen(); else location.hash = '#/bang-lop';
    };
  } else {
    btn.textContent = 'Cán bộ lớp';
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
  const luot = lanHienThi;
  loading();
  if (!DSHS) DSHS = await API.dsHocSinh();
  if (luot !== lanHienThi) return;
  const ma = thamSo('ma') || (DSHS[0] && DSHS[0].maHS);
  if (!ma) { el.innerHTML = '<div class="empty">Chưa có học sinh nào.</div>'; return; }

  const d = await API.chiTietHS(ma);
  if (luot !== lanHienThi) return;
  const thangLoc = Number(thamSo('thang')) || 0;
  const chiTiet = d.chiTiet.filter(function (r) { return !thangLoc || Number(r.thang) === thangLoc; });
  const h = d.hocSinh;
  const tongDiem = chiTiet.reduce(function (s, r) { return s + Number(r.diem || 0); }, 0);
  const soLoi = chiTiet.filter(function (r) { return r.loai === 'LOI'; }).length;
  const soCong = chiTiet.filter(function (r) { return r.loai === 'CONG'; }).length;

  el.innerHTML = `
    <div class="card">
      <label class="f" for="iHS">Chọn học sinh</label>
      <select id="iHS">${DSHS.map(function (x) {
        return '<option value="' + esc(x.maHS) + '"' + (x.maHS === ma ? ' selected' : '') + '>' +
          esc(x.hoTen) + '</option>';
      }).join('')}</select>
      <label class="f" for="iLocThang" style="margin-top:12px">Thời gian theo dõi</label>
      <select id="iLocThang"><option value="0">Cả năm học</option>${THANG_HOC.map(function (t) {
        return '<option value="' + t + '"' + (t === thangLoc ? ' selected' : '') + '>Tháng ' + t + '</option>';
      }).join('')}</select>
    </div>

    <div class="card">
      <h2>${esc(h.hoTen)}</h2>
      <p class="hint">${esc(h.maHS)}${h.chucVu ? ' · ' + esc(h.chucVu) : ''}</p>
      <div class="stat">
        <div><div class="n ${tongDiem < 0 ? 'diem am' : 'diem duong'}">${tongDiem > 0 ? '+' : ''}${tongDiem}</div>
          <div class="l">Điểm thi đua ${thangLoc ? 'tháng ' + thangLoc : 'cả năm'}</div></div>
        <div><div class="n">${soLoi}</div><div class="l">Lượt vi phạm</div></div>
        <div><div class="n">${soCong}</div><div class="l">Lượt được cộng</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Xếp loại từng tháng</h2>
      ${d.thang.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Tháng</th><th>Xếp loại</th><th style="text-align:right">Điểm</th>
          <th style="text-align:right">Ghi sổ ĐB</th><th style="text-align:right">Hạ bậc</th>
          <th style="text-align:right">Lỗi nhỏ dư</th><th></th></tr></thead>
        <tbody>${d.thang.map(function (t) {
          return `<tr>
            <td><strong>Tháng ${esc(t.thang)}</strong></td>
            <td><span class="badge ${esc(t.xepLoai)}">${esc(t.nhan)}</span></td>
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
    </div>

    <div class="card">
      <h2>Chi tiết từng lượt</h2>
      <p class="hint">Dữ liệu được chép theo tuần từ sổ chính, không xác định ngày xảy ra từng lượt.
        Nếu thấy sai sót, báo lại cán bộ lớp hoặc giáo viên chủ nhiệm.</p>
      ${chiTiet.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Tuần ghi nhận</th><th>Nội dung</th><th style="text-align:right">Điểm</th></tr></thead>
        <tbody>${chiTiet.map(function (r) {
          return `<tr>
            <td>${r.soTuan ? 'Tuần ' + esc(r.soTuan) : esc(r.maTuan)}${r.tuNgay ? '<br><small>' + esc(r.tuNgay) + ' – ' + esc(r.denNgay) + '</small>' : ''}</td>
            <td>${esc(r.ten)}${r.moTa ? ' <span style="color:var(--ink-mute)">— ' + esc(r.moTa) + '</span>' : ''}
              ${r.nhom === 'HA_BAC' ? ' <span class="badge DAT">hạ 1 bậc</span>' : ''}
              ${r.nhom === 'CHUA_DAT' ? ' <span class="badge CHUA_DAT">nghiêm trọng</span>' : ''}</td>
            <td style="text-align:right">${diemHTML(r.diem)}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : '<div class="empty">Chưa có lượt nào được ghi nhận. 🎉</div>'}
    </div>`;

  q('#iHS').onchange = function () { location.hash = '#/chi-tiet?ma=' + encodeURIComponent(this.value) + '&thang=' + thangLoc; };
  q('#iLocThang').onchange = function () { location.hash = '#/chi-tiet?ma=' + encodeURIComponent(ma) + '&thang=' + this.value; };
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
    tr.onclick = function () { location.hash = '#/chi-tiet?ma=' + tr.dataset.ma; };
  });
}

// ---------- Sổ thi đua tuần (cán bộ lớp) ----------
// Dựng đúng lưới của sổ giấy: mỗi học sinh một dòng, 6 cột điểm cộng/trừ.
// Mỗi mục gõ trong một ô = 1 lượt, tính điểm theo cột đó. Tổng tự cộng.
async function mhChamDiem() {
  const luot = lanHienThi;
  if (!vaiTro()) { location.hash = '#/dang-nhap'; return; }
  loading();

  if (!LICHTUAN) LICHTUAN = await API.lichTuan();
  if (luot !== lanHienThi) return;
  const maTuan = thamSo('tuan') || (LOP.tuanHienTai && LOP.tuanHienTai.MaTuan) ||
    (LICHTUAN[0] && LICHTUAN[0].MaTuan);
  const d = await API.luoiTuan(maTuan);
  if (luot !== lanHienThi) return;
  if (d.dong.some(function (r) { return typeof r.phienBan !== 'string'; })) {
    throw new Error('Chức năng nhập đang chờ cập nhật. Nhờ người quản lý triển khai bản Apps Script mới rồi tải lại trang.');
  }

  const oChonTuan = '<select id="iTuan" style="min-width:230px">' + LICHTUAN.map(function (t) {
    return '<option value="' + esc(t.MaTuan) + '"' + (t.MaTuan === maTuan ? ' selected' : '') + '>' +
      'Tuần ' + esc(t.SoTuan) + ' — ' + esc(String(t.TuNgay).slice(8, 10) + '/' + String(t.TuNgay).slice(5, 7)) +
      ' đến ' + esc(String(t.DenNgay).slice(8, 10) + '/' + String(t.DenNgay).slice(5, 7)) + '</option>';
  }).join('') + '</select>';

  // Nhóm cột cho đúng kiểu đầu bảng 2 tầng của sổ giấy
  const cot = d.cot;
  const cotTru = cot.filter(function (c) { return c.ma !== 'CONG'; });

  el.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div>
          <h2>Sổ thi đua — Tuần ${esc(d.tuan.soTuan)}, tháng ${esc(d.tuan.thang)}</h2>
          <p class="hint" style="margin:0">Từ ${esc(d.tuan.tuNgay)} đến ${esc(d.tuan.denNgay)} ·
            ${d.daChot ? '<span class="badge DAT">tháng đã chốt, không sửa được</span>'
                       : 'Gõ mỗi lượt một mục, nhiều mục ngăn bằng dấu phẩy'}</p>
        </div>
        <div>${oChonTuan}</div>
      </div>
    </div>

    <div class="card">
      <div class="tbl-wrap"><table class="luoi">
        <thead>
          <tr>
            <th rowspan="2" style="min-width:34px">TT</th>
            <th rowspan="2" style="min-width:150px">Họ và tên</th>
            <th rowspan="2" class="c-cong">Điểm cộng<br><span class="dv">(+${esc(cot[0].diem)}đ / mục)</span></th>
            <th colspan="${cotTru.length}" style="text-align:center">Điểm trừ</th>
            <th rowspan="2" style="text-align:right;min-width:70px">Tổng</th>
          </tr>
          <tr>
            ${cotTru.map(function (c) {
              return '<th class="c-tru">' + esc(c.ten.replace('Hạ 1 bậc HK', 'Hạ 1 bậc')).replace(' - ', '<br>') +
                '<br><span class="dv">(' + esc(c.diem) + 'đ)</span></th>';
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${d.dong.map(function (r, i) {
            return `<tr data-ma="${esc(r.maHS)}">
              <td>${i + 1}</td>
              <td class="ten">${esc(r.hoTen)}${r.chucVu ? '<br><span class="cv">(' + esc(r.chucVu) + ')</span>' : ''}</td>
              ${cot.map(function (c) {
                return '<td><input class="o" data-cot="' + esc(c.ma) + '" data-diem="' + esc(c.diem) + '" ' +
                  'aria-label="' + esc(r.hoTen + ' — ' + c.ten) + '" value="' + esc(r.o[c.ma] || '') + '"' + (d.daChot ? ' disabled' : '') + '></td>';
              }).join('')}
              <td class="tong" style="text-align:right">${diemHTML(r.tong)}</td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="${2 + cot.length}" style="text-align:right"><strong>TỔNG:</strong></td>
            <td style="text-align:right"><strong id="tongHS" class="diem">${esc(d.tongHS)}</strong></td>
          </tr>
          <tr>
            <td colspan="${2 + cot.length}" style="text-align:right"><strong>ĐIỂM CÓ SẴN:</strong></td>
            <td style="text-align:right"><strong class="diem">${esc(d.diemCoSan)}</strong></td>
          </tr>
          <tr>
            <td colspan="${2 + cot.length}" style="text-align:right"><strong>ĐIỂM TỔNG:</strong></td>
            <td style="text-align:right"><strong id="diemTong" class="diem">${esc(d.tongHS + d.diemCoSan)}</strong></td>
          </tr>
        </tfoot>
      </table></div>

      ${d.daChot ? '' : `<div class="row" style="margin-top:14px">
        <button class="primary" id="btnLuu" disabled>Lưu thay đổi</button>
        <span id="trangThaiLuu" class="hint" role="status" style="margin:0">Chưa có thay đổi.</span>
      </div>`}
    </div>`;

  q('#iTuan').onchange = function () { location.hash = '#/cham-diem?tuan=' + this.value; };
  q('#iTuan').dataset.hienTai = maTuan;

  if (d.daChot) return;

  /** Đếm số mục trong một ô: ngăn bằng dấu phẩy, chấm phẩy hoặc xuống dòng. */
  function demMuc(v) {
    return String(v || '').split(/[,;\n]+/)
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return x.length > 0; }).length;
  }

  function tinhLaiTong() {
    let tong = 0;
    qa('tbody tr[data-ma]').forEach(function (tr) {
      let t = 0;
      tr.querySelectorAll('.o').forEach(function (inp) {
        t += demMuc(inp.value) * Number(inp.dataset.diem);
      });
      tr.querySelector('.tong').innerHTML = diemHTML(t);
      tong += t;
    });
    q('#tongHS').textContent = tong;
    q('#tongHS').className = 'diem ' + (tong > 0 ? 'duong' : (tong < 0 ? 'am' : ''));
    q('#diemTong').textContent = tong + Number(d.diemCoSan);
  }

  const banDau = {};
  d.dong.forEach(function (r) { banDau[r.maHS] = r; });
  function cacDongDoi() {
    return qa('tbody tr[data-ma]').map(function (tr) {
      const o = {};
      tr.querySelectorAll('.o').forEach(function (inp) { o[inp.dataset.cot] = inp.value; });
      return { maHS: tr.dataset.ma, o: o, phienBan: banDau[tr.dataset.ma].phienBan };
    }).filter(function (r) {
      return cot.some(function (c) { return r.o[c.ma] !== (banDau[r.maHS].o[c.ma] || ''); });
    });
  }
  qa('.o').forEach(function (inp) { inp.oninput = function () {
    tinhLaiTong();
    const n = cacDongDoi().length;
    chuaLuu = n > 0;
    q('#btnLuu').disabled = !chuaLuu;
    q('#trangThaiLuu').textContent = n ? n + ' học sinh có thay đổi chưa lưu.' : 'Chưa có thay đổi.';
  }; });

  q('#btnLuu').onclick = async function () {
    qa(':scope > .msg').forEach(function (x) { x.remove(); });
    const dong = cacDongDoi();
    if (!dong.length) return;
    this.disabled = true; this.textContent = 'Đang lưu…';
    dangLuu = true;
    qa('.o, #iTuan').forEach(function (x) { x.disabled = true; });
    try {
      const r = await API.luuLuoiTuan(maTuan, dong);
      dong.forEach(function (x) { banDau[x.maHS].o = x.o; banDau[x.maHS].phienBan = r.phienBan[x.maHS]; });
      chuaLuu = false;
      q('#trangThaiLuu').textContent = 'Đã lưu thay đổi của ' + dong.length + ' học sinh.';
      el.insertAdjacentHTML('afterbegin',
        '<div class="msg ' + (r.canhBao ? 'warn' : 'ok') + '">' + esc(r.canhBao || 'Đã lưu thay đổi tuần ' + d.tuan.soTuan + '.') + '</div>');
      window.scrollTo(0, 0);
    } catch (e) {
      el.insertAdjacentHTML('afterbegin', '<div class="msg err">' + esc(e.message) + '</div>');
      window.scrollTo(0, 0);
    } finally {
      dangLuu = false;
      qa('.o, #iTuan').forEach(function (x) { x.disabled = false; });
      this.disabled = !chuaLuu; this.textContent = 'Lưu thay đổi';
    }
  };
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

// ---------- Đăng nhập ----------
async function mhDangNhap() {
  el.innerHTML = `
    <div class="card" style="max-width:420px;margin:0 auto">
      <h2>Đăng nhập cán bộ lớp</h2>
      <p class="hint">Chỉ cần đăng nhập khi <strong>nhập điểm</strong>.
        Xem kết quả thì không cần — quay lại <a href="#/bang-lop">bảng lớp</a>.
</p>
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
