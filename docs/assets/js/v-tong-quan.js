/**
 * v-tong-quan.js — Tổng quan lỗi và điểm cộng của cả lớp trong một tuần hoặc một tháng dương lịch
 * (ngày 1 → ngày cuối tháng), để cán bộ lớp và GVCN nắm tình hình chung.
 */
import { el, q, qa, esc, icon, loading, diemHTML, avatar, thamSo, chonThang, ganChonThang, T } from './ui.js';
import * as D from './data.js';
import { ngayNgan, tuanMacDinh, homNay, khoangThang } from './logic.js';
import { thangMacDinh, chonKieu, oChonTuan } from './v-lop.js';

const topN = function (obj, n) {
  return Object.keys(obj).map(function (k) { return Object.assign({ k: k }, obj[k]); })
    .sort(function (a, b) { return b.n - a.n || (a.k < b.k ? -1 : 1); }).slice(0, n);
};

export async function mhTongQuan() {
  const luot = T.luot;
  loading();
  const kieu = thamSo('che') === 'tuan' ? 'tuan' : 'thang';
  const dsTuan = await D.layTuan();
  const cfg = await D.layCauHinh();

  let tham, tieuDe, chon;
  if (kieu === 'tuan') {
    if (!dsTuan.length) {
      el.innerHTML = '<div class="card"><div class="empty">' + icon('lich') + '<strong>Chưa có trang tuần nào</strong>Tạo trang tuần ở Sổ thi đua trước.</div></div>';
      return;
    }
    const maTuan = thamSo('tuan') || tuanMacDinh(dsTuan, homNay()).maTuan;
    const t = dsTuan.filter(function (x) { return x.maTuan === maTuan; })[0] || dsTuan[0];
    tham = { kieu: 'tuan', maTuan: t.maTuan };
    tieuDe = 'Tổng quan Tuần ' + esc(t.soTuan);
    chon = oChonTuan(dsTuan, t.maTuan);
  } else {
    const thang = await thangMacDinh();
    tham = { kieu: 'thang', thang: thang };
    tieuDe = 'Tổng quan tháng ' + esc(thang);
    chon = chonThang(thang);
  }

  const d = await D.tongQuanLoi(tham);
  if (luot !== T.luot) return;

  const loi = d.muc.filter(function (r) { return r.loai === 'LOI'; });
  const cong = d.muc.filter(function (r) { return r.loai === 'CONG'; });
  const tongTru = loi.reduce(function (s, r) { return s + Math.abs(r.diem); }, 0);
  const tongCong = cong.reduce(function (s, r) { return s + r.diem; }, 0);

  const theoNhom = {}, theoLoi = {}, theoHS = {};
  loi.forEach(function (r) {
    const g = theoNhom[r.nhomCha || 'Khác'] = theoNhom[r.nhomCha || 'Khác'] || { n: 0, diem: 0 };
    g.n++; g.diem += Math.abs(r.diem);
    const l = theoLoi[r.ma] = theoLoi[r.ma] || { n: 0, ten: r.ten, nhomCha: r.nhomCha };
    l.n++;
    if (r.ma === 'KHAC') l.ten = 'Lỗi khác (tự ghi)';
  });
  d.muc.forEach(function (r) {
    const h = theoHS[r.maHS] = theoHS[r.maHS] || { maHS: r.maHS, hoTen: r.hoTen, to: r.to, loi: 0, tru: 0, cong: 0 };
    if (r.loai === 'LOI') { h.loi++; h.tru += Math.abs(r.diem); } else h.cong += r.diem;
  });
  const dsHS = Object.keys(theoHS).map(function (k) { return theoHS[k]; })
    .sort(function (a, b) { return b.loi - a.loi || b.tru - a.tru || (a.hoTen < b.hoTen ? -1 : 1); });
  const soHSLoi = dsHS.filter(function (h) { return h.loi > 0; }).length;
  const nhom = topN(theoNhom, 20), phoBien = topN(theoLoi, 8);
  const lonNhat = nhom.length ? nhom[0].n : 1, lonLoi = phoBien.length ? phoBien[0].n : 1;
  const k = tham.kieu === 'thang' ? khoangThang(tham.thang, cfg.NamHoc) : null;
  const khoang = k ? 'Từ ngày ' + ngayNgan(d.tu) + ' đến ngày ' + ngayNgan(d.den) + ' (' + k.soNgay + ' ngày)'
    : ngayNgan(d.tu) + ' – ' + ngayNgan(d.den);

  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h2>${tieuDe}</h2><p class="hint">${esc(khoang)} · tính theo ngày xảy ra từng lượt</p></div>
        <div class="row">${chonKieu(kieu)}${chon}</div>
      </div>
      <div class="stat xl">
        <div class="t-cd"><div class="n">${loi.length}</div><div class="l">Lượt vi phạm</div></div>
        <div class="t-dat"><div class="n">−${tongTru}</div><div class="l">Tổng điểm trừ</div></div>
        <div class="t-tot"><div class="n">${cong.length}</div><div class="l">Lượt điểm cộng (+${tongCong})</div></div>
        <div><div class="n">${soHSLoi}<span class="mute" style="font-size:16px">/${d.siSo}</span></div><div class="l">Bạn bị ghi lỗi</div></div>
      </div>
    </div>

    ${d.muc.length ? `
    <div class="grid g2">
      <div class="card">
        <h2>Lỗi theo nhóm</h2>
        <div class="stack" style="margin-top:14px">${nhom.length ? nhom.map(function (g) {
          return `<div><div class="row between small"><span>${esc(g.k)}</span><span><strong>${g.n}</strong> lượt · −${g.diem}đ</span></div>
            <div class="thanh-diem" style="margin-top:5px"><i style="width:${Math.max(4, g.n / lonNhat * 100).toFixed(0)}%"></i></div></div>`;
        }).join('') : '<div class="mute small">Không có lỗi nào.</div>'}</div>
      </div>
      <div class="card">
        <h2>Lỗi gặp nhiều nhất</h2>
        <div class="stack" style="margin-top:14px">${phoBien.length ? phoBien.map(function (l, i) {
          return `<div><div class="row between small"><span><span class="hang" style="width:22px;height:22px;font-size:11px">${i + 1}</span> ${esc(l.ten)}</span><strong>${l.n}</strong></div>
            <div class="thanh-diem" style="margin-top:5px"><i style="width:${Math.max(4, l.n / lonLoi * 100).toFixed(0)}%"></i></div></div>`;
        }).join('') : '<div class="mute small">Không có lỗi nào.</div>'}</div>
      </div>
    </div>

    <div class="card flush">
      <div class="card-head"><div><h2>Theo học sinh</h2><p class="hint">Sắp theo số lỗi nhiều → ít. Bấm vào tên để xem chi tiết.</p></div></div>
      <div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>TT</th><th>Họ tên</th><th class="r">Số lỗi</th><th class="r">Điểm trừ</th><th class="r">Điểm cộng</th></tr></thead>
        <tbody>${dsHS.map(function (h, i) {
          return `<tr><td class="stt">${i + 1}</td>
            <td><a class="ten-hs" href="#/chi-tiet?ma=${esc(encodeURIComponent(h.maHS))}">${avatar(h.hoTen, 'xs')}<span>${esc(h.hoTen)}${h.to ? '<small>' + esc(h.to) + '</small>' : ''}</span></a></td>
            <td class="r"><strong>${h.loi}</strong></td><td class="r">${h.tru ? diemHTML(-h.tru) : '<span class="mute">—</span>'}</td>
            <td class="r">${h.cong ? diemHTML(h.cong) : '<span class="mute">—</span>'}</td></tr>`;
        }).join('')}</tbody></table></div>
    </div>

    <div class="card flush">
      <div class="card-head"><div><h2>Chi tiết từng lượt <span class="mute" style="font-weight:500" id="demLuot">(${d.muc.length})</span></h2></div>
        <div class="row">
          <select id="locLoai" style="width:auto"><option value="">Tất cả</option><option value="LOI">Chỉ lỗi</option><option value="CONG">Chỉ điểm cộng</option></select>
          <input id="timLuot" type="search" placeholder="Tìm học sinh, nội dung…" autocomplete="off" style="min-width:220px">
        </div></div>
      <div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Ngày</th><th>Học sinh</th><th>Nội dung</th><th>Môn</th><th class="r">Điểm</th><th>Người ghi</th></tr></thead>
        <tbody id="bangLuot">${d.muc.map(function (r) {
          return `<tr data-loai="${r.loai}" data-k="${esc((r.hoTen + ' ' + r.ten + ' ' + r.mon + ' ' + r.nhomCha).toLowerCase())}">
            <td class="nowrap">${esc(ngayNgan(r.ngay))}</td>
            <td><a class="ten-hs" href="#/chi-tiet?ma=${esc(encodeURIComponent(r.maHS))}">${esc(r.hoTen)}</a></td>
            <td>${esc(r.ten)}${r.nhom === 'HA_BAC' ? ' <span class="badge DAT">hạ bậc</span>' : ''}${r.nhom === 'CHUA_DAT' ? ' <span class="badge CHUA_DAT">chưa đạt</span>' : ''}
              ${r.nhomCha || r.ghiChu ? '<br><small class="mute">' + esc([r.nhomCha, r.ghiChu].filter(Boolean).join(' · ')) + '</small>' : ''}</td>
            <td>${esc(r.mon)}</td><td class="r">${diemHTML(r.diem)}</td><td class="mute small">${esc(r.nguoiNhap)}</td></tr>`;
        }).join('')}</tbody></table></div>
    </div>`
    : `<div class="card"><div class="empty">${icon('so')}<strong>Chưa có lượt nào</strong>Chưa ai ghi lỗi hay điểm cộng trong khoảng thời gian này.</div></div>`}`;

  q('#iKieu').onclick = function (e) {
    const b = e.target.closest('[data-kieu]');
    if (b) location.hash = '#/tong-quan?che=' + b.dataset.kieu;
  };
  if (kieu === 'tuan') q('#iTuan').onchange = function () { location.hash = '#/tong-quan?che=tuan&tuan=' + encodeURIComponent(this.value); };
  else ganChonThang('iThang', function (t) { location.hash = '#/tong-quan?thang=' + t; });

  if (d.muc.length) {
    const loc = function () {
      const loai = q('#locLoai').value, tu = q('#timLuot').value.trim().toLowerCase();
      let n = 0;
      qa('#bangLuot tr').forEach(function (tr) {
        const hien = (!loai || tr.dataset.loai === loai) && (!tu || tr.dataset.k.indexOf(tu) >= 0);
        tr.style.display = hien ? '' : 'none';
        if (hien) n++;
      });
      q('#demLuot').textContent = '(' + n + ')';
    };
    q('#locLoai').onchange = loc;
    q('#timLuot').oninput = loc;
  }
}
