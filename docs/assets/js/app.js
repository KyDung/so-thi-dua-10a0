/**
 * app.js — SPA điều hướng bằng hash. Không cần build, không cần framework.
 *
 * Xem: ai cũng xem được, không cần đăng nhập.
 * Nhập: cán bộ lớp / GVCN đăng nhập.
 */

const el = document.getElementById('noiDung');
const NHAN = { TOT: 'TỐT', KHA: 'KHÁ', DAT: 'ĐẠT', CHUA_DAT: 'CHƯA ĐẠT' };
const THANG_HOC = [9, 10, 11, 12, 1, 2, 3, 4, 5];

let LOP = null, DANHMUC = null, DSHS = null;

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
  mh().catch(loi);
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
    btn.onclick = function () { Store.xoaHet(); location.hash = '#/bang-lop'; dinhTuyen(); };
  } else {
    btn.textContent = 'Cán bộ lớp';
    btn.onclick = function () { location.hash = '#/dang-nhap'; };
  }
}

// ---------- Màn hình chính: Bảng lớp theo tháng ----------
async function mhBangLop() {
  loading();
  const thang = Number(thamSo('thang')) || thangMacDinh();
  const ds = await API.bangLop(thang);
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
        Cột <em>Gợi ý</em> là máy tính theo quy chế của trường — chỉ để tham khảo, bạn quyết định cuối cùng.</p>
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
            <td><a href="#/chi-tiet?ma=${esc(r.maHS)}" style="color:inherit"><strong>${esc(r.hoTen)}</strong></a></td>
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

  if (!duocSua) return;

  const doi = {};   // maHS -> xếp loại mới
  const banDau = {};
  ds.forEach(function (r) { banDau[r.maHS] = r.xepLoai || ''; });

  function veLai() {
    const n = Object.keys(doi).length;
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
    const items = Object.keys(doi).map(function (ma) {
      return { maHS: ma, thang: thang, xepLoai: doi[ma] };
    });
    this.disabled = true; this.textContent = 'Đang lưu…';
    try {
      await API.luuXepLoai(items);
      el.insertAdjacentHTML('afterbegin',
        '<div class="msg ok">Đã lưu xếp loại cho ' + items.length + ' học sinh.</div>');
      window.scrollTo(0, 0);
      setTimeout(function () { mhBangLop().catch(loi); }, 800);
    } catch (e) {
      el.insertAdjacentHTML('afterbegin', '<div class="msg err">' + esc(e.message) + '</div>');
      window.scrollTo(0, 0);
      this.disabled = false; this.textContent = 'Lưu xếp loại';
    }
  };
}

// ---------- Chi tiết 1 học sinh ----------
async function mhChiTiet() {
  loading();
  if (!DSHS) DSHS = await API.dsHocSinh();
  const ma = thamSo('ma') || (DSHS[0] && DSHS[0].maHS);
  if (!ma) { el.innerHTML = '<div class="empty">Chưa có học sinh nào.</div>'; return; }

  const d = await API.chiTietHS(ma);
  const h = d.hocSinh;
  const tongDiem = d.chiTiet.reduce(function (s, r) { return s + Number(r.diem || 0); }, 0);
  const soLoi = d.chiTiet.filter(function (r) { return r.loai === 'LOI'; }).length;
  const soCong = d.chiTiet.filter(function (r) { return r.loai === 'CONG'; }).length;

  el.innerHTML = `
    <div class="card">
      <label class="f">Chọn học sinh</label>
      <select id="iHS">${DSHS.map(function (x) {
        return '<option value="' + esc(x.maHS) + '"' + (x.maHS === ma ? ' selected' : '') + '>' +
          esc(x.hoTen) + (x.to ? ' — ' + esc(x.to) : '') + '</option>';
      }).join('')}</select>
    </div>

    <div class="card">
      <h2>${esc(h.hoTen)}</h2>
      <p class="hint">${esc(h.maHS)}${h.to ? ' · ' + esc(h.to) : ''}${h.chucVu ? ' · ' + esc(h.chucVu) : ''}</p>
      <div class="stat">
        <div><div class="n ${tongDiem < 0 ? 'diem am' : 'diem duong'}">${tongDiem > 0 ? '+' : ''}${tongDiem}</div>
          <div class="l">Điểm thi đua cả năm</div></div>
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
      <p class="hint">Nếu thấy có sai sót, báo lại với cán bộ lớp hoặc cô chủ nhiệm.</p>
      ${d.chiTiet.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Ngày</th><th>Nội dung</th><th style="text-align:right">Điểm</th></tr></thead>
        <tbody>${d.chiTiet.map(function (r) {
          return `<tr>
            <td style="white-space:nowrap">${esc(r.ngay)}</td>
            <td>${esc(r.ten)}${r.moTa ? ' <span style="color:var(--ink-mute)">— ' + esc(r.moTa) + '</span>' : ''}
              ${r.nhom === 'HA_BAC' ? ' <span class="badge DAT">hạ 1 bậc</span>' : ''}
              ${r.nhom === 'CHUA_DAT' ? ' <span class="badge CHUA_DAT">nghiêm trọng</span>' : ''}</td>
            <td style="text-align:right">${diemHTML(r.diem)}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : '<div class="empty">Chưa có lượt nào được ghi nhận. 🎉</div>'}
    </div>`;

  q('#iHS').onchange = function () { location.hash = '#/chi-tiet?ma=' + this.value; };
}

// ---------- Xếp hạng thi đua ----------
async function mhThiDua() {
  loading();
  const bxh = await API.bangXepHangTo();
  const coTo = bxh.bang.length > 0;
  if (!DSHS) DSHS = await API.dsHocSinh();

  const thang = Number(thamSo('thang')) || thangMacDinh();
  const ds = await API.bangLop(thang);
  const top = ds.slice().sort(function (a, b) { return (b.diemThiDua || 0) - (a.diemThiDua || 0); });

  el.innerHTML = `
    ${coTo ? `<div class="card">
      <h2>Xếp hạng tổ</h2>
      <p class="hint">Tuần ${esc(LOP.tuanHienTai ? LOP.tuanHienTai.SoTuan : '?')} ·
        điểm tổ = tổng điểm thành viên + điểm có sẵn</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Hạng</th><th>Tổ</th><th style="text-align:right">Điểm TV</th>
          <th style="text-align:right">Có sẵn</th><th style="text-align:right">Tổng</th></tr></thead>
        <tbody>${bxh.bang.map(function (r) {
          return `<tr>
            <td><span class="hang ${r.hang === 1 ? 'top1' : ''}">${r.hang === 1 ? '🏆' : r.hang}</span></td>
            <td><strong>${esc(r.to)}</strong></td>
            <td style="text-align:right">${diemHTML(r.diemHS)}</td>
            <td style="text-align:right" class="diem">${esc(r.diemCoSan)}</td>
            <td style="text-align:right"><strong class="diem">${esc(r.tong)}</strong></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>` : ''}

    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div>
          <h2>Xếp hạng cá nhân – tháng ${esc(thang)}</h2>
          <p class="hint" style="margin:0">Theo điểm thi đua cộng trừ trong tháng.</p>
        </div>
        <div>${oChonThang(thang)}</div>
      </div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Hạng</th><th>Họ tên</th><th style="text-align:right">Điểm</th></tr></thead>
        <tbody>${top.map(function (r, i) {
          return `<tr style="cursor:pointer" data-ma="${esc(r.maHS)}">
            <td><span class="hang ${i === 0 ? 'top1' : ''}">${i === 0 ? '🏆' : i + 1}</span></td>
            <td>${esc(r.hoTen)}${r.to ? ' <span style="color:var(--ink-mute);font-size:12.5px">' + esc(r.to) + '</span>' : ''}</td>
            <td style="text-align:right">${diemHTML(r.diemThiDua)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`;

  const oT = q('#iThang');
  if (oT) oT.onchange = function () { location.hash = '#/thi-dua?thang=' + this.value; };

  qa('tbody tr[data-ma]').forEach(function (tr) {
    tr.onclick = function () { location.hash = '#/chi-tiet?ma=' + tr.dataset.ma; };
  });
}

// ---------- Ghi sổ (cán bộ lớp) ----------
// Mục đích: chép lại y như sổ giấy của trường. Gõ ngày, tên, nội dung, điểm.
// Không ép chọn theo danh mục — danh mục chỉ là gợi ý gõ nhanh.
async function mhChamDiem() {
  if (!vaiTro()) { location.hash = '#/dang-nhap'; return; }
  loading();

  const thang = Number(thamSo('thang')) || thangMacDinh();
  const [hs, daGhi] = await Promise.all([
    API.dsHocSinhCuaToi(),
    API.nhatKyThang(thang)
  ]);
  if (!DANHMUC) { try { DANHMUC = await API.danhMuc(); } catch (e) { DANHMUC = { loi: [], cong: [] }; } }

  const goiY = DANHMUC.loi.map(function (l) { return l.TenLoi; })
    .concat(DANHMUC.cong.map(function (c) { return c.TenCong; }));

  el.innerHTML = `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div>
          <h2>Ghi sổ tháng ${esc(thang)}</h2>
          <p class="hint" style="margin:0">Chép lại từ sổ theo dõi của lớp. Gõ xong một dòng thì bấm
            <strong>Thêm dòng</strong> (hoặc Enter), làm hết rồi bấm <strong>Lưu tất cả</strong>.</p>
        </div>
        <div>${oChonThang(thang)}</div>
      </div>
    </div>

    <div class="card">
      <form id="fThem" class="grid" style="grid-template-columns:1fr;gap:10px">
        <div class="row" style="gap:10px">
          <div style="flex:2;min-width:180px">
            <label class="f">Học sinh</label>
            <select id="iHS">${hs.map(function (h) {
              return '<option value="' + esc(h.maHS) + '">' + esc(h.hoTen) + '</option>';
            }).join('')}</select>
          </div>
          <div style="flex:1;min-width:140px">
            <label class="f">Ngày</label>
            <input type="date" id="iNgay" value="${hnay()}" required>
          </div>
        </div>
        <div class="row" style="gap:10px">
          <div style="flex:3;min-width:220px">
            <label class="f">Nội dung (chép y như trong sổ)</label>
            <input id="iNoiDung" list="dsGoiY" placeholder="ví dụ: Đi học muộn" required>
            <datalist id="dsGoiY">${goiY.map(function (t) {
              return '<option value="' + esc(t) + '">';
            }).join('')}</datalist>
          </div>
          <div style="flex:1;min-width:110px">
            <label class="f">Điểm <span style="font-weight:400">(để trống nếu sổ không ghi)</span></label>
            <input id="iDiem" type="number" step="1" placeholder="-1">
          </div>
        </div>
        <div class="row">
          <button class="primary" type="submit">Thêm dòng</button>
          <span class="hint" style="margin:0">Điểm trừ gõ số âm (−1, −2). Điểm cộng gõ số dương (1, 3).</span>
        </div>
      </form>
    </div>

    <div class="card" id="boxChoLuu" style="display:none">
      <h2>Chờ lưu <span id="demCho" style="color:var(--ink-mute);font-weight:400"></span></h2>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Ngày</th><th>Học sinh</th><th>Nội dung</th>
          <th style="text-align:right">Điểm</th><th></th></tr></thead>
        <tbody id="tbCho"></tbody>
      </table></div>
      <div class="row" style="margin-top:12px">
        <button class="primary" id="btnLuu">Lưu tất cả</button>
        <button id="btnXoaHet">Xoá hết</button>
      </div>
    </div>

    <div class="card">
      <h2>Đã ghi trong tháng ${esc(thang)} <span style="color:var(--ink-mute);font-weight:400">(${daGhi.length} dòng)</span></h2>
      ${daGhi.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th>Ngày</th><th>Học sinh</th><th>Nội dung</th>
          <th style="text-align:right">Điểm</th><th></th></tr></thead>
        <tbody>${daGhi.map(function (r) {
          return `<tr>
            <td style="white-space:nowrap">${esc(r.ngay)}</td>
            <td>${esc(r.hoTen)}</td>
            <td>${esc(r.noiDung)}</td>
            <td style="text-align:right">${diemHTML(r.diem)}</td>
            <td><button class="sm btnXoa" data-id="${esc(r.id)}">Xoá</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>` : '<div class="empty">Chưa ghi dòng nào trong tháng này.</div>'}
    </div>`;

  q('#iThang').onchange = function () { location.hash = '#/cham-diem?thang=' + this.value; };

  const cho = [];   // các dòng đang chờ lưu

  function veLaiCho() {
    const box = q('#boxChoLuu');
    box.style.display = cho.length ? '' : 'none';
    q('#demCho').textContent = cho.length ? '(' + cho.length + ' dòng)' : '';
    q('#tbCho').innerHTML = cho.map(function (r, i) {
      return `<tr>
        <td style="white-space:nowrap">${esc(r.ngay)}</td>
        <td>${esc(r.hoTen)}</td>
        <td>${esc(r.noiDung)}</td>
        <td style="text-align:right">${diemHTML(r.diem)}</td>
        <td><button class="sm btnBo" data-i="${i}">Bỏ</button></td>
      </tr>`;
    }).join('');
    qa('.btnBo').forEach(function (b) {
      b.onclick = function () { cho.splice(Number(b.dataset.i), 1); veLaiCho(); };
    });
  }

  q('#fThem').onsubmit = function (ev) {
    ev.preventDefault();
    const sel = q('#iHS');
    cho.push({
      maHS: sel.value,
      hoTen: sel.options[sel.selectedIndex].text,
      ngay: q('#iNgay').value,
      noiDung: q('#iNoiDung').value.trim(),
      diem: q('#iDiem').value === '' ? 0 : Number(q('#iDiem').value)
    });
    q('#iNoiDung').value = '';
    q('#iDiem').value = '';
    q('#iNoiDung').focus();
    veLaiCho();
  };

  q('#btnXoaHet').onclick = function () { cho.length = 0; veLaiCho(); };

  q('#btnLuu').onclick = async function () {
    this.disabled = true; this.textContent = 'Đang lưu…';
    try {
      const r = await API.ghiNhatKy(cho.map(function (x) {
        return { maHS: x.maHS, ngay: x.ngay, noiDung: x.noiDung, diem: x.diem };
      }));
      el.insertAdjacentHTML('afterbegin',
        '<div class="msg ok">Đã lưu ' + r.soBanGhi + ' dòng.</div>');
      window.scrollTo(0, 0);
      setTimeout(function () { mhChamDiem().catch(loi); }, 700);
    } catch (e) {
      el.insertAdjacentHTML('afterbegin', '<div class="msg err">' + esc(e.message) + '</div>');
      window.scrollTo(0, 0);
      this.disabled = false; this.textContent = 'Lưu tất cả';
    }
  };

  qa('.btnXoa').forEach(function (b) {
    b.onclick = async function () {
      if (!confirm('Xoá dòng này?')) return;
      b.disabled = true;
      try {
        await API.xoaNhatKy(b.dataset.id);
        mhChamDiem().catch(loi);
      } catch (e) {
        alert(e.message); b.disabled = false;
      }
    };
  });
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
    <div class="card">
      <h2>Những chỗ đang dùng giá trị mặc định</h2>
      <p class="hint">Các con số dưới đây do hệ thống tự đặt vì hai file gốc không nói rõ.
        Sửa trực tiếp trong sheet <code>CauHinh</code> của Google Sheet là web đổi theo ngay.</p>
      <details class="qa"><summary>3 lỗi nhỏ = 1 lần bị ghi sổ đầu bài</summary>
        <p>Quy định ghi "lỗi chưa bị trừ hạnh kiểm tháng này tính vào tháng sau" nhưng không nói
        bao nhiêu lỗi thì bị trừ. Khóa <code>NguongLoiNho</code>.</p></details>
      <details class="qa"><summary>Điểm thi đua không ảnh hưởng xếp loại</summary>
        <p>Xếp loại tính theo loại lỗi đúng quy chế trường. Muốn thêm luật theo điểm thì đổi
        <code>DungDiemDeXepLoai</code> thành TRUE.</p></details>
      <details class="qa"><summary>Danh sách tổ</summary>
        <p>File Excel gốc không có cột tổ. Sửa cột <code>To</code> trong sheet <code>HocSinh</code>.
        Để trống hết thì phần xếp hạng tổ tự ẩn đi.</p></details>
      <p class="hint" style="margin-top:12px">Danh sách đầy đủ nằm trong file
        <code>tai-lieu/CAU-HOI-CHO-CO.md</code> của dự án.</p>
    </div>`;

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
      dinhTuyen();
    } catch (e) {
      q('#dnLoi').innerHTML = '<div class="msg err" style="margin-top:12px">' + esc(e.message) + '</div>';
      btn.disabled = false; btn.textContent = 'Đăng nhập';
    }
  };
}

khoiDong();
