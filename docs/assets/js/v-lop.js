/**
 * v-lop.js — Bảng lớp theo tháng (kèm xếp loại) và Xếp hạng thi đua.
 */
import {
  el, q, qa, esc, icon, loading, msg, diemHTML, badge, avatar, thamSo, chonThang, ganChonThang,
  toast, banNut, T, R
} from './ui.js';
import * as D from './data.js';
import { NHAN, THANG_HOC, tuanMacDinh, homNay, ngayNgan } from './logic.js';

/**
 * Tháng mở sẵn: tháng của trang tuần hiện tại (tuần vắt tháng như 28/9–4/10 vẫn tính là tháng 9),
 * chưa có trang tuần nào thì lấy tháng dương lịch nếu thuộc năm học.
 */
export async function thangMacDinh() {
  const t = Number(thamSo('thang'));
  if (t) return t;
  const tuan = tuanMacDinh(await D.layTuan(), homNay());
  if (tuan) return tuan.thang;
  const thangNay = new Date().getMonth() + 1;
  return THANG_HOC.indexOf(thangNay) >= 0 ? thangNay : THANG_HOC[0];
}

const phanTram = function (n, tong) { return tong ? (n / tong * 100).toFixed(1) : 0; };

export async function mhBangLop() {
  const luot = T.luot;
  loading();
  const thang = await thangMacDinh();
  const ds = await D.bangLop(thang);
  if (luot !== T.luot) return;

  const dem = { TOT: 0, KHA: 0, DAT: 0, CHUA_DAT: 0 };
  let chuaXep = 0;
  ds.forEach(function (r) { if (dem[r.xepLoai] !== undefined) dem[r.xepLoai]++; else chuaXep++; });
  const daChot = ds.length > 0 && ds.every(function (r) { return r.daChot; });
  const vt = D.vaiTro();
  // Cán bộ lớp và GVCN được chọn xếp loại
  const duocSua = !daChot && (vt === 'CAN_BO' || vt === 'GVCN');

  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div>
          <h2>Kết quả rèn luyện tháng ${esc(thang)}</h2>
          <p class="hint">${ds.length} học sinh ·
            ${daChot ? '<span class="badge tim">' + icon('chia', 'sm') + '&nbsp;đã chốt</span>' : 'đang cập nhật, chưa chốt'}</p>
        </div>
        ${chonThang(thang)}
      </div>
      <div class="stat xl">
        <div class="t-tot"><div class="n">${dem.TOT}</div><div class="l">TỐT</div></div>
        <div class="t-kha"><div class="n">${dem.KHA}</div><div class="l">KHÁ</div></div>
        <div class="t-dat"><div class="n">${dem.DAT}</div><div class="l">ĐẠT</div></div>
        <div class="t-cd"><div class="n">${dem.CHUA_DAT}</div><div class="l">CHƯA ĐẠT</div></div>
        ${chuaXep ? `<div><div class="n mute">${chuaXep}</div><div class="l">CHƯA XẾP</div></div>` : ''}
      </div>
      <div class="bar" title="Tỉ lệ xếp loại">
        <i class="b-tot" style="width:${phanTram(dem.TOT, ds.length)}%"></i>
        <i class="b-kha" style="width:${phanTram(dem.KHA, ds.length)}%"></i>
        <i class="b-dat" style="width:${phanTram(dem.DAT, ds.length)}%"></i>
        <i class="b-cd" style="width:${phanTram(dem.CHUA_DAT, ds.length)}%"></i>
      </div>
    </div>

    ${duocSua ? `<div class="card">
      <div class="row between">
        <div><h2>Xếp loại tháng ${esc(thang)}</h2>
          <p class="hint">Chọn xếp loại từng bạn theo sổ chính rồi bấm <strong>Lưu xếp loại</strong>.
            Cột <em>Gợi ý</em> chỉ là tính toán tham khảo.</p></div>
        <div class="row">
          <button class="btn" id="btnDungGoiY">${icon('sao', 'sm')} Điền theo gợi ý</button>
          <button class="btn primary" id="btnLuuXL" disabled>${icon('tich', 'sm')} Lưu xếp loại</button>
        </div>
      </div>
      <div id="demXL" class="small mute" style="margin-top:8px;min-height:18px"></div>
    </div>` : ''}

    <div class="card flush">
      <div class="card-head">
        <div><h2>Danh sách lớp</h2><p class="hint">Bấm vào tên để xem chi tiết từng lượt vi phạm và điểm cộng.</p></div>
        <div style="min-width:220px;flex:0 1 280px"><input id="timHS" type="search" placeholder="Tìm theo tên…" autocomplete="off"></div>
      </div>
      <div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>TT</th><th>Họ tên</th><th>Xếp loại</th>
          ${duocSua ? '<th>Gợi ý</th>' : ''}
          <th class="r">Điểm TB</th><th class="r">Ghi sổ</th><th class="r">Hạ bậc</th></tr></thead>
        <tbody>${ds.map(function (r, i) {
          const o = duocSua
            ? `<select class="selXL" data-ma="${esc(r.maHS)}" style="min-width:128px;padding:7px 30px 7px 10px">
                 <option value=""${r.xepLoai ? '' : ' selected'}>— chưa xếp —</option>
                 ${['TOT', 'KHA', 'DAT', 'CHUA_DAT'].map(function (k) {
                   return '<option value="' + k + '"' + (r.xepLoai === k ? ' selected' : '') + '>' + NHAN[k] + '</option>';
                 }).join('')}
               </select>`
            : (r.xepLoai ? badge(r.xepLoai) : '<span class="mute small">chưa xếp</span>');
          return `<tr data-ten="${esc(r.hoTen.toLowerCase())}">
            <td class="stt">${i + 1}</td>
            <td><a class="ten-hs" href="#/chi-tiet?ma=${esc(encodeURIComponent(r.maHS))}&thang=${thang}">${avatar(r.hoTen, 'xs')}
              <span>${esc(r.hoTen)}${r.chucVu ? '<small>' + esc(r.chucVu) + '</small>' : ''}</span></a></td>
            <td>${o}</td>
            ${duocSua ? `<td>${r.deXuat ? '<span class="badge goi-y ' + esc(r.deXuat) + '">' + esc(r.nhanDeXuat) + '</span>' : '<span class="mute small">—</span>'}</td>` : ''}
            <td class="r">${r.coSoLieu ? '<span class="diem">' + esc(r.diemThiDua) + '</span>' : '<span class="mute">—</span>'}</td>
            <td class="r">${esc(r.soLanGhiSo)}</td>
            <td class="r">${esc(r.soLanHaBac)}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="7"><div class="empty">Chưa có học sinh nào trong lớp.</div></td></tr>'}</tbody>
      </table></div>
    </div>

    <div class="card">
      <h2>Ghi chú</h2>
      <p class="hint">Xếp loại do cán bộ lớp / giáo viên chủ nhiệm nhập, giống như ghi vào sổ giấy.
        Các cột <em>Điểm TB</em>, <em>Ghi sổ</em>, <em>Hạ bậc</em> là số liệu máy tự tổng hợp từ nhật ký
        hằng ngày để tiện theo dõi. Bạn nào chưa được chọn xếp loại sẽ lấy theo gợi ý của máy (nếu GVCN bật tự động).</p>
    </div>`;

  ganChonThang('iThang', function (t) { location.hash = '#/bang-lop?thang=' + t; });

  q('#timHS').oninput = function () {
    const k = this.value.trim().toLowerCase();
    qa('tbody tr[data-ten]').forEach(function (tr) { tr.style.display = tr.dataset.ten.indexOf(k) >= 0 ? '' : 'none'; });
  };

  if (!duocSua) return;

  const doi = {};          // maHS -> xếp loại mới
  const banDau = {};
  ds.forEach(function (r) { banDau[r.maHS] = r.xepLoai || ''; });

  function veLai() {
    const n = Object.keys(doi).length;
    T.chuaLuu = n > 0;
    if (!q('#demXL')) return;
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
    const items = Object.keys(doi).map(function (ma) { return { maHS: ma, thang: thang, xepLoai: doi[ma] }; });
    const khoiPhuc = banNut(this, 'Đang lưu…');
    T.dangLuu = true;
    qa('.selXL, #btnDungGoiY').forEach(function (x) { x.disabled = true; });
    try {
      await D.luuXepLoai(items);
      T.chuaLuu = false;
      Object.keys(doi).forEach(function (ma) { banDau[ma] = doi[ma]; delete doi[ma]; });
      toast('Đã lưu xếp loại cho ' + items.length + ' học sinh.');
      T.dangLuu = false;
      R.lamMoi();
    } catch (e) {
      toast(e.message, 'err');
      khoiPhuc();
    } finally {
      T.dangLuu = false;
      qa('.selXL, #btnDungGoiY').forEach(function (x) { x.disabled = false; });
      veLai();
    }
  };
}

// ---------------------------------------------------------------- Xếp hạng thi đua

/** Nút chuyển "Theo tuần | Theo tháng" dùng chung cho Xếp hạng và Tổng quan. */
export function chonKieu(kieu) {
  return '<div class="seg" id="iKieu"><button type="button" data-kieu="tuan" class="' + (kieu === 'tuan' ? 'on' : '') + '">Theo tuần</button>' +
    '<button type="button" data-kieu="thang" class="' + (kieu === 'thang' ? 'on' : '') + '">Theo tháng</button></div>';
}

export function oChonTuan(dsTuan, maTuan) {
  return '<select id="iTuan" style="min-width:230px">' + dsTuan.map(function (x) {
    return '<option value="' + esc(x.maTuan) + '"' + (x.maTuan === maTuan ? ' selected' : '') + '>Tuần ' + esc(x.soTuan) +
      ' · ' + esc(ngayNgan(x.tuNgay)) + ' – ' + esc(ngayNgan(x.denNgay)) + '</option>';
  }).join('') + '</select>';
}

export async function mhThiDua() {
  const luot = T.luot;
  loading();
  const kieu = thamSo('che') === 'tuan' ? 'tuan' : 'thang';
  const dsTuan = await D.layTuan();
  let rows, tieuDe, goiY, chon, noiDungTrong;

  if (kieu === 'tuan') {
    if (!dsTuan.length) {
      el.innerHTML = '<div class="card"><div class="empty">' + icon('lich') + '<strong>Chưa có trang tuần nào</strong>Tạo trang tuần ở Sổ thi đua trước.</div></div>';
      return;
    }
    const maTuan = thamSo('tuan') || tuanMacDinh(dsTuan, homNay()).maTuan;
    const kq = await D.bangTuan(maTuan);
    if (luot !== T.luot) return;
    rows = kq.ds.map(function (r) { return Object.assign({ diemXH: r.diem, phu: r.soLoi ? r.soLoi + ' lỗi' : '' }, r); });
    tieuDe = 'Xếp hạng — Tuần ' + esc(kq.tuan.soTuan);
    goiY = esc(ngayNgan(kq.tuan.tuNgay)) + ' – ' + esc(ngayNgan(kq.tuan.denNgay)) + ' · điểm cuối tuần (100 điểm đầu tuần, cộng trừ theo sổ).';
    chon = oChonTuan(dsTuan, maTuan);
    noiDungTrong = 'Chưa có số liệu.';
  } else {
    const thang = await thangMacDinh();
    const ds = await D.bangLop(thang);
    if (luot !== T.luot) return;
    rows = ds.filter(function (r) { return r.coSoLieu; }).map(function (r) { return Object.assign({ diemXH: r.diemThiDua, phu: '' }, r); });
    tieuDe = 'Xếp hạng — tháng ' + esc(thang);
    goiY = 'Điểm trung bình các tuần trong tháng, lấy từ sổ thi đua.';
    chon = chonThang(thang);
    noiDungTrong = 'Số liệu xuất hiện khi cán bộ lớp bắt đầu ghi sổ thi đua của tháng này.';
  }

  const co = rows.sort(function (a, b) { return b.diemXH - a.diemXH || (a.hoTen < b.hoTen ? -1 : 1); });
  const cao = co.length ? co[0].diemXH : 0;
  const thap = co.length ? co[co.length - 1].diemXH : 0;
  const giuThamSo = kieu === 'tuan' ? '&che=tuan&tuan=' + encodeURIComponent(thamSo('tuan') || '') : '&thang=' + (thamSo('thang') || '');

  const veBuc = function (r, hang) {
    const huy = ['🥇', '🥈', '🥉'][hang - 1];
    return `<a class="podium-i h${hang}" href="#/chi-tiet?ma=${esc(encodeURIComponent(r.maHS))}">
      <div class="huy">${huy}</div>${avatar(r.hoTen, 'lg')}
      <strong>${esc(r.hoTen)}</strong><span class="diem">${esc(r.diemXH)}</span></a>`;
  };

  el.innerHTML = `
    <div class="card">
      <div class="card-head" style="margin-bottom:${co.length >= 3 ? 18 : 0}px">
        <div><h2>${tieuDe}</h2><p class="hint">${goiY}</p></div>
        <div class="row">${chonKieu(kieu)}${chon}</div>
      </div>
      ${co.length >= 3 ? `<div class="podium">${veBuc(co[1], 2)}${veBuc(co[0], 1)}${veBuc(co[2], 3)}</div>` : ''}
    </div>

    <div class="card flush">
      ${co.length ? `<div class="tbl-wrap"><table>
        <thead><tr><th style="width:70px">Hạng</th><th>Họ tên</th><th style="width:32%">Điểm</th><th class="r">Điểm</th>${kieu === 'tuan' ? '<th class="r">Lỗi</th>' : ''}</tr></thead>
        <tbody>${co.map(function (r, i) {
          const rong = cao === thap ? 100 : Math.max(6, (r.diemXH - thap) / (cao - thap) * 100);
          return `<tr style="cursor:pointer" data-ma="${esc(r.maHS)}">
            <td><span class="hang">${i + 1}</span></td>
            <td><span class="ten-hs">${avatar(r.hoTen, 'xs')}<span>${esc(r.hoTen)}</span></span></td>
            <td><div class="thanh-diem"><i style="width:${rong.toFixed(0)}%"></i></div></td>
            <td class="r"><span class="diem">${esc(r.diemXH)}</span></td>
            ${kieu === 'tuan' ? '<td class="r">' + esc(r.soLoi || 0) + '</td>' : ''}
          </tr>`;
        }).join('')}</tbody></table></div>`
        : `<div class="empty">${icon('cup')}<strong>Chưa có số liệu</strong>${noiDungTrong}</div>`}
    </div>`;

  q('#iKieu').onclick = function (e) {
    const b = e.target.closest('[data-kieu]');
    if (b) location.hash = '#/thi-dua?che=' + b.dataset.kieu;
  };
  if (kieu === 'tuan') q('#iTuan').onchange = function () { location.hash = '#/thi-dua?che=tuan&tuan=' + encodeURIComponent(this.value); };
  else ganChonThang('iThang', function (t) { location.hash = '#/thi-dua?thang=' + t; });
  qa('tbody tr[data-ma]').forEach(function (tr) {
    tr.onclick = function () { location.hash = '#/chi-tiet?ma=' + tr.dataset.ma; };
  });
}
