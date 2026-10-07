/**
 * v-diem-tot.js — Điểm tốt các môn của từng học sinh theo tuần hoặc tháng (dương lịch).
 * "Điểm tốt" là các mục cộng thuộc nhóm "Điểm tốt" (điểm 10, 9–9.75, 8–8.75) ghi kèm môn học.
 */
import { el, q, qa, esc, icon, loading, diemHTML, avatar, thamSo, chonThang, ganChonThang, T } from './ui.js';
import * as D from './data.js';
import { ngayNgan, tuanMacDinh, homNay, khoangThang, thuTuMon, chuanMon } from './logic.js';
import { thangMacDinh, chonKieu, oChonTuan } from './v-lop.js';

const MUC = { DT10: 10, DT09: 9, DT08: 8 };
const mucDiem = function (r) { return MUC[r.ma] || ({ 3: 10, 2: 9, 1: 8 }[r.diem]) || 0; };
const CHUA_MON = 'Chưa ghi môn';

/** "10×1 · 9×2" từ bộ đếm theo mức */
const chuoiMuc = function (c) {
  return [10, 9, 8].filter(function (m) { return c[m]; }).map(function (m) { return m + '×' + c[m]; }).join(' · ');
};

/** Màn hình Điểm tốt: cán bộ lớp / GVCN xem cả lớp, phụ huynh chỉ xem con mình. */
export async function mhDiemTot() {
  return D.vaiTro() === 'PHU_HUYNH' ? mhDiemTotCuaCon() : mhDiemTotCaLop();
}

/** Ô chọn khoảng thời gian dùng chung: trả về tham số truy vấn, tiêu đề và ô chọn. */
async function chonKhoang(dsTuan, tenMan) {
  const kieu = thamSo('che') === 'tuan' ? 'tuan' : 'thang';
  if (kieu === 'tuan') {
    const maTuan = thamSo('tuan') || tuanMacDinh(dsTuan, homNay()).maTuan;
    const t = dsTuan.filter(function (x) { return x.maTuan === maTuan; })[0] || dsTuan[0];
    return { kieu: kieu, tham: { kieu: 'tuan', maTuan: t.maTuan }, soTuan: t.soTuan, chon: oChonTuan(dsTuan, t.maTuan) };
  }
  const thang = await thangMacDinh();
  return { kieu: kieu, tham: { kieu: 'thang', thang: thang }, thang: thang, chon: chonThang(thang) };
}

// ---------------------------------------------------------------- Phụ huynh: điểm tốt của con

async function mhDiemTotCuaCon() {
  const luot = T.luot;
  loading();
  const dsTuan = await D.layTuan();
  const cfg = await D.layCauHinh();
  if (thamSo('che') === 'tuan' && !dsTuan.length) {
    el.innerHTML = '<div class="card"><div class="empty">' + icon('lich') + '<strong>Chưa có trang tuần nào</strong>Cô và cán bộ lớp chưa tạo trang tuần.</div></div>';
    return;
  }
  const kh = await chonKhoang(dsTuan);
  const d = await D.diemTotCuaCon(kh.tham);
  if (luot !== T.luot) return;
  const h = d.hocSinh;

  const muc = d.muc.filter(function (r) { return MUC[r.ma] || r.nhomCha === 'Điểm tốt'; })
    .map(function (r) { return Object.assign({}, r, { mon: chuanMon(r.mon) || CHUA_MON, muc: mucDiem(r) }); });
  const tongMuc = { 10: 0, 9: 0, 8: 0 }, theoMon = {};
  muc.forEach(function (r) {
    const m = theoMon[r.mon] = theoMon[r.mon] || { n: 0, c: {} };
    m.n++; m.c[r.muc] = (m.c[r.muc] || 0) + 1;
    if (tongMuc[r.muc] !== undefined) tongMuc[r.muc]++;
  });
  const dsMon = Object.keys(theoMon).sort(function (a, b) {
    return (a === CHUA_MON) - (b === CHUA_MON) || thuTuMon(a, cfg) - thuTuMon(b, cfg) || (a < b ? -1 : 1);
  });
  const k = kh.kieu === 'thang' ? khoangThang(kh.thang, cfg.NamHoc) : null;
  const khoang = k ? 'Từ ngày ' + ngayNgan(d.tu) + ' đến ngày ' + ngayNgan(d.den) + ' (' + k.soNgay + ' ngày)' : ngayNgan(d.tu) + ' – ' + ngayNgan(d.den);
  const tieuDe = kh.kieu === 'tuan' ? 'Điểm tốt — Tuần ' + esc(kh.soTuan) : 'Điểm tốt — tháng ' + esc(kh.thang);

  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><div class="hero-hs">${h ? avatar(h.hoTen, 'lg') : ''}<div><h2>${tieuDe}</h2>
          <p class="hint">${h ? esc(h.hoTen) + ' · ' : ''}${esc(khoang)}</p></div></div></div>
        <div class="row">${chonKieu(kh.kieu)}${kh.chon}</div>
      </div>
      <div class="stat xl">
        <div class="t-tot"><div class="n">${muc.length}</div><div class="l">Lượt điểm tốt</div></div>
        <div><div class="n">${tongMuc[10]}</div><div class="l">Điểm 10</div></div>
        <div><div class="n">${tongMuc[9]}</div><div class="l">Điểm 9 – 9.75</div></div>
        <div><div class="n">${tongMuc[8]}</div><div class="l">Điểm 8 – 8.75</div></div>
      </div>
    </div>

    ${muc.length ? `
    <div class="card">
      <h2>Điểm tốt theo môn</h2>
      <div class="stack" style="margin-top:14px">${dsMon.map(function (m) {
        const x = theoMon[m];
        return `<div class="row between"><span><strong>${esc(m)}</strong></span>
          <span><strong>${x.n}</strong> lượt <span class="mute small">· ${esc(chuoiMuc(x.c))}</span></span></div>`;
      }).join('<hr style="border:0;border-top:1px dashed var(--line);margin:0">')}</div>
    </div>

    <div class="card flush">
      <div class="card-head"><div><h2>Chi tiết từng lượt</h2></div></div>
      <div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Ngày</th><th>Môn</th><th class="r">Mức</th><th class="r">Điểm cộng</th><th>Ghi chú</th></tr></thead>
        <tbody>${muc.map(function (r) {
          return `<tr><td class="nowrap">${esc(ngayNgan(r.ngay))}</td><td>${esc(r.mon)}</td>
            <td class="r"><span class="badge TOT">${r.muc ? 'điểm ' + r.muc : 'khác'}</span></td>
            <td class="r">${diemHTML(r.diem)}</td><td class="small mute">${esc(r.ghiChu)}</td></tr>`;
        }).join('')}</tbody></table></div>
    </div>`
    : `<div class="card"><div class="empty">${icon('sao')}<strong>Chưa có điểm tốt nào</strong>Trong khoảng thời gian này con chưa có điểm tốt được ghi vào sổ.</div></div>`}`;

  q('#iKieu').onclick = function (e) {
    const b = e.target.closest('[data-kieu]');
    if (b) location.hash = '#/diem-tot?che=' + b.dataset.kieu;
  };
  if (kh.kieu === 'tuan') q('#iTuan').onchange = function () { location.hash = '#/diem-tot?che=tuan&tuan=' + encodeURIComponent(this.value); };
  else ganChonThang('iThang', function (t) { location.hash = '#/diem-tot?thang=' + t; });
}

// ---------------------------------------------------------------- Cán bộ lớp / GVCN: cả lớp

async function mhDiemTotCaLop() {
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
    tieuDe = 'Điểm tốt — Tuần ' + esc(t.soTuan);
    chon = oChonTuan(dsTuan, t.maTuan);
  } else {
    const thang = await thangMacDinh();
    tham = { kieu: 'thang', thang: thang };
    tieuDe = 'Điểm tốt — tháng ' + esc(thang);
    chon = chonThang(thang);
  }

  const d = await D.tongQuanLoi(tham);
  if (luot !== T.luot) return;

  // Chỉ lấy các mục cộng thuộc nhóm "Điểm tốt"
  const muc = d.muc.filter(function (r) { return r.loai === 'CONG' && (MUC[r.ma] || r.nhomCha === 'Điểm tốt'); })
    .map(function (r) { return Object.assign({}, r, { mon: chuanMon(r.mon) || CHUA_MON, muc: mucDiem(r) }); });

  const theoMon = {}, theoHS = {}, tongMuc = { 10: 0, 9: 0, 8: 0 };
  muc.forEach(function (r) {
    const m = theoMon[r.mon] = theoMon[r.mon] || { n: 0, c: {} };
    m.n++; m.c[r.muc] = (m.c[r.muc] || 0) + 1;
    const h = theoHS[r.maHS] = theoHS[r.maHS] || { maHS: r.maHS, hoTen: r.hoTen, n: 0, mon: {} };
    h.n++;
    const o = h.mon[r.mon] = h.mon[r.mon] || { n: 0, c: {} };
    o.n++; o.c[r.muc] = (o.c[r.muc] || 0) + 1;
    if (tongMuc[r.muc] !== undefined) tongMuc[r.muc]++;
  });
  const dsMon = Object.keys(theoMon).sort(function (a, b) {
    return (a === CHUA_MON) - (b === CHUA_MON) || thuTuMon(a, cfg) - thuTuMon(b, cfg) || (a < b ? -1 : 1);
  });
  const dsHS = Object.keys(theoHS).map(function (k) { return theoHS[k]; })
    .sort(function (a, b) { return b.n - a.n || (a.hoTen < b.hoTen ? -1 : 1); });
  const monNhat = dsMon.slice().sort(function (a, b) { return theoMon[b].n - theoMon[a].n; })[0];
  const lonMon = monNhat ? theoMon[monNhat].n : 1;
  const k = tham.kieu === 'thang' ? khoangThang(tham.thang, cfg.NamHoc) : null;
  const khoang = k ? 'Từ ngày ' + ngayNgan(d.tu) + ' đến ngày ' + ngayNgan(d.den) + ' (' + k.soNgay + ' ngày)' : ngayNgan(d.tu) + ' – ' + ngayNgan(d.den);

  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h2>${tieuDe}</h2><p class="hint">${esc(khoang)} · điểm tốt từng môn của từng học sinh</p></div>
        <div class="row">${chonKieu(kieu)}${chon}</div>
      </div>
      <div class="stat xl">
        <div class="t-tot"><div class="n">${muc.length}</div><div class="l">Lượt điểm tốt</div></div>
        <div><div class="n">${tongMuc[10]}</div><div class="l">Điểm 10</div></div>
        <div><div class="n">${tongMuc[9]}</div><div class="l">Điểm 9 – 9.75</div></div>
        <div><div class="n">${tongMuc[8]}</div><div class="l">Điểm 8 – 8.75</div></div>
        <div><div class="n">${dsHS.length}<span class="mute" style="font-size:16px">/${d.siSo}</span></div><div class="l">Bạn có điểm tốt</div></div>
      </div>
    </div>

    ${muc.length ? `
    <div class="card">
      <h2>Theo môn</h2>
      <p class="hint">Môn nhiều điểm tốt nhất: <strong>${esc(monNhat)}</strong> (${lonMon} lượt)</p>
      <div class="stack" style="margin-top:14px">${dsMon.map(function (m) {
        const x = theoMon[m];
        return `<div><div class="row between small"><span>${esc(m)}</span><span><strong>${x.n}</strong> lượt <span class="mute">· ${esc(chuoiMuc(x.c))}</span></span></div>
          <div class="thanh-diem" style="margin-top:5px"><i style="width:${Math.max(4, x.n / lonMon * 100).toFixed(0)}%"></i></div></div>`;
      }).join('')}</div>
    </div>

    <div class="card flush">
      <div class="card-head"><div><h2>Học sinh × môn</h2>
        <p class="hint">Số lượt điểm tốt của từng bạn ở mỗi môn (rê chuột / chạm vào ô để xem mức điểm). Chỉ hiện các môn có điểm tốt trong khoảng này.</p></div></div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="ma-tran">
        <thead><tr><th>TT</th><th>Họ tên</th><th class="r">Tổng</th>${dsMon.map(function (m) { return '<th class="r">' + esc(m) + '</th>'; }).join('')}</tr></thead>
        <tbody>${dsHS.map(function (h, i) {
          return `<tr><td class="stt">${i + 1}</td>
            <td><a class="ten-hs" href="#/chi-tiet?ma=${esc(encodeURIComponent(h.maHS))}">${avatar(h.hoTen, 'xs')}<span>${esc(h.hoTen)}</span></a></td>
            <td class="r"><strong>${h.n}</strong></td>
            ${dsMon.map(function (m) {
              const o = h.mon[m];
              return o ? '<td class="r" title="' + esc(m + ': ' + chuoiMuc(o.c)) + '"><strong>' + o.n + '</strong><div class="small mute">' + esc(chuoiMuc(o.c)) + '</div></td>'
                : '<td class="r mute">·</td>';
            }).join('')}</tr>`;
        }).join('')}</tbody></table></div>
    </div>

    <div class="card flush">
      <div class="card-head"><div><h2>Chi tiết từng lượt <span class="mute" style="font-weight:500" id="demLuot">(${muc.length})</span></h2></div>
        <div class="row">
          <select id="locMon" style="width:auto"><option value="">Tất cả các môn</option>${dsMon.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('')}</select>
          <input id="timLuot" type="search" placeholder="Tìm học sinh…" autocomplete="off" style="min-width:200px">
        </div></div>
      <div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Ngày</th><th>Học sinh</th><th>Môn</th><th class="r">Mức</th><th class="r">Điểm cộng</th><th>Ghi chú</th></tr></thead>
        <tbody id="bangLuot">${muc.map(function (r) {
          return `<tr data-mon="${esc(r.mon)}" data-k="${esc(r.hoTen.toLowerCase())}">
            <td class="nowrap">${esc(ngayNgan(r.ngay))}</td>
            <td><a class="ten-hs" href="#/chi-tiet?ma=${esc(encodeURIComponent(r.maHS))}">${esc(r.hoTen)}</a></td>
            <td>${esc(r.mon)}</td><td class="r"><span class="badge TOT">${r.muc ? 'điểm ' + r.muc : 'khác'}</span></td>
            <td class="r">${diemHTML(r.diem)}</td><td class="small mute">${esc(r.ghiChu)}</td></tr>`;
        }).join('')}</tbody></table></div>
    </div>`
    : `<div class="card"><div class="empty">${icon('sao')}<strong>Chưa có điểm tốt nào</strong>Chưa ai ghi điểm tốt (điểm 10, 9, 8) trong khoảng thời gian này. Ghi ở Sổ thi đua → Loại “Điểm cộng” → Điểm tốt.</div></div>`}`;

  q('#iKieu').onclick = function (e) {
    const b = e.target.closest('[data-kieu]');
    if (b) location.hash = '#/diem-tot?che=' + b.dataset.kieu;
  };
  if (kieu === 'tuan') q('#iTuan').onchange = function () { location.hash = '#/diem-tot?che=tuan&tuan=' + encodeURIComponent(this.value); };
  else ganChonThang('iThang', function (t) { location.hash = '#/diem-tot?thang=' + t; });

  if (muc.length) {
    const loc = function () {
      const mon = q('#locMon').value, tu = q('#timLuot').value.trim().toLowerCase();
      let n = 0;
      qa('#bangLuot tr').forEach(function (tr) {
        const hien = (!mon || tr.dataset.mon === mon) && (!tu || tr.dataset.k.indexOf(tu) >= 0);
        tr.style.display = hien ? '' : 'none';
        if (hien) n++;
      });
      q('#demLuot').textContent = '(' + n + ')';
    };
    q('#locMon').onchange = loc;
    q('#timLuot').oninput = loc;
  }
}
