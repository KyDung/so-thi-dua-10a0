/**
 * v-danh-gia.js — "Đánh giá kết quả rèn luyện tháng": bảng giống hệt mẫu của trường.
 * Mỗi học sinh một dòng: toàn bộ lỗi trong tháng (ngày 1 → ngày cuối), cán bộ lớp / GVCN tự chọn
 * kết quả T/K/Đ/CĐ và ghi chú, rồi xuất Excel đúng bố cục mẫu.
 */
import {
  el, q, qa, esc, icon, loading, badge, avatar, chonThang, ganChonThang, toast, banNut, msg, T, R
} from './ui.js';
import * as D from './data.js';
import { NHAN, ngayNgan } from './logic.js';
import { thangMacDinh } from './v-lop.js';

export async function mhDanhGia() {
  const luot = T.luot;
  loading();
  const thang = await thangMacDinh();
  const d = await D.danhGiaThang(thang);
  if (luot !== T.luot) return;

  const vt = D.vaiTro();
  const daChot = d.ds.length > 0 && d.ds.every(function (r) { return r.daChot; });
  const duocSua = !daChot && (vt === 'LOP_TRUONG' || vt === 'GVCN');   // tổ trưởng chỉ xem
  const tongLoi = d.ds.reduce(function (s, r) { return s + r.loi.length; }, 0);

  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h2>Đánh giá kết quả rèn luyện tháng ${esc(d.thang)}</h2>
          <p class="hint">Từ ngày ${esc(ngayNgan(d.tu))} đến ngày ${esc(ngayNgan(d.den))} (${d.soNgay} ngày) · ${d.ds.length} học sinh · ${tongLoi} lượt lỗi
            ${daChot ? ' · <span class="badge tim">đã chốt</span>' : ''}</p></div>
        ${chonThang(d.thang)}
      </div>
      <div class="row between">
        <div id="tongDG" class="row" style="gap:8px"></div>
        <div class="row">
          ${duocSua ? `<button class="btn" id="btnGoiY">${icon('sao', 'sm')} Điền theo gợi ý</button>
          <button class="btn primary" id="btnLuuDG" disabled>${icon('tich', 'sm')} Lưu đánh giá</button>` : ''}
          <button class="btn" id="btnXuatThang">${icon('tai', 'sm')} Xuất Excel tháng ${esc(d.thang)}</button>
        </div>
      </div>
      <div id="demDG" class="small mute" style="margin-top:8px;min-height:18px"></div>
      ${duocSua ? '' : (daChot ? msg('info', 'Tháng này đã chốt nên không sửa được nữa.') : msg('info', 'Chỉ lớp trưởng và giáo viên chủ nhiệm điền được kết quả đánh giá.'))}
    </div>

    <div class="card flush">
      <div class="tbl-wrap"><table class="bang-dg">
        <thead><tr><th>TT</th><th>Họ tên</th><th>Những lỗi vi phạm <span class="mute" style="text-transform:none">(Ngày: Lỗi vi phạm)</span></th>
          <th style="min-width:150px">Kết quả <span class="mute" style="text-transform:none">T/K/Đ/CĐ</span></th><th style="min-width:170px">Ghi chú</th></tr></thead>
        <tbody>${d.ds.map(function (h, i) {
          const o = duocSua
            ? `<select class="dgXL" data-ma="${esc(h.maHS)}">
                <option value=""${h.xepLoai ? '' : ' selected'}>—</option>
                ${['TOT', 'KHA', 'DAT', 'CHUA_DAT'].map(function (k) {
                  return '<option value="' + k + '"' + (h.xepLoai === k ? ' selected' : '') + '>' + NHAN[k] + '</option>';
                }).join('')}</select>
               ${h.deXuat && h.deXuat !== h.xepLoai ? '<div class="small mute" style="margin-top:4px">gợi ý: ' + esc(NHAN[h.deXuat]) + '</div>' : ''}`
            : (h.xepLoai ? badge(h.xepLoai) : '<span class="mute small">chưa xếp</span>');
          const g = duocSua
            ? `<input class="dgGC" data-ma="${esc(h.maHS)}" value="${esc(h.ghiChu)}" placeholder="…">`
            : esc(h.ghiChu);
          return `<tr data-ma="${esc(h.maHS)}">
            <td class="stt">${i + 1}</td>
            <td><a class="ten-hs" href="#/chi-tiet?ma=${esc(encodeURIComponent(h.maHS))}">${avatar(h.hoTen, 'xs')}<span>${esc(h.hoTen)}</span></a></td>
            <td class="dg-loi">${h.loi.length ? h.loi.map(function (l) {
              return '<div><strong>' + esc(Number(l.ngay.slice(8, 10)) + '/' + Number(l.ngay.slice(5, 7))) + ':</strong> ' + esc(l.ten) + (l.mon ? ' <span class="mute">(' + esc(l.mon) + ')</span>' : '') + '</div>';
            }).join('') : '<span class="mute small">Không có lỗi</span>'}</td>
            <td>${o}</td><td>${g}</td></tr>`;
        }).join('') || '<tr><td colspan="5"><div class="empty">Chưa có học sinh nào trong lớp.</div></td></tr>'}</tbody>
      </table></div>
    </div>`;

  ganChonThang('iThang', function (t) { location.hash = '#/danh-gia?thang=' + t; });

  // ----- tổng theo kết quả (cập nhật khi đổi ô chọn) -----
  const hienTong = function () {
    const dem = { TOT: 0, KHA: 0, DAT: 0, CHUA_DAT: 0 };
    d.ds.forEach(function (h) {
      const sel = duocSua ? q('.dgXL[data-ma="' + h.maHS + '"]') : null;
      const xl = sel ? sel.value : h.xepLoai;
      if (dem[xl] !== undefined) dem[xl]++;
    });
    q('#tongDG').innerHTML = '<span class="badge xam">TỔNG: ' + d.ds.length + ' HS</span>' + ['TOT', 'KHA', 'DAT', 'CHUA_DAT'].map(function (k) {
      return '<span class="badge ' + k + '">' + NHAN[k] + ': ' + dem[k] + '</span>';
    }).join('');
  };
  hienTong();

  q('#btnXuatThang').onclick = async function () {
    if (T.chuaLuu) { toast('Bạn còn thay đổi chưa lưu. Bấm Lưu đánh giá trước khi xuất.', 'err'); return; }
    const khoiPhuc = banNut(this, 'Đang tạo file…');
    try { const ten = await D.xuatExcel(d.thang); toast('Đã tạo ' + ten); }
    catch (e) { toast(e.message, 'err'); }
    khoiPhuc();
  };

  if (!duocSua) return;

  const goc = {}, doi = {};
  d.ds.forEach(function (h) { goc[h.maHS] = { xepLoai: h.xepLoai || '', ghiChu: h.ghiChu || '' }; });

  const veLai = function () {
    const n = Object.keys(doi).length;
    T.chuaLuu = n > 0;
    if (!q('#demDG')) return;
    q('#demDG').textContent = n ? n + ' thay đổi chưa lưu' : '';
    q('#btnLuuDG').disabled = n === 0;
    hienTong();
  };
  const ghiNhan = function (ma) {
    const xl = q('.dgXL[data-ma="' + ma + '"]').value, gc = q('.dgGC[data-ma="' + ma + '"]').value.trim();
    const c = {};
    if (xl !== goc[ma].xepLoai) c.xepLoai = xl;
    if (gc !== goc[ma].ghiChu) c.ghiChu = gc;
    if (Object.keys(c).length) doi[ma] = c; else delete doi[ma];
    veLai();
  };
  qa('.dgXL').forEach(function (s) { s.onchange = function () { ghiNhan(s.dataset.ma); }; });
  qa('.dgGC').forEach(function (i) { i.oninput = function () { ghiNhan(i.dataset.ma); }; });

  q('#btnGoiY').onclick = function () {
    d.ds.forEach(function (h) {
      const sel = q('.dgXL[data-ma="' + h.maHS + '"]');
      if (!h.deXuat || !sel || sel.value === h.deXuat) return;
      sel.value = h.deXuat; ghiNhan(h.maHS);
    });
  };

  q('#btnLuuDG').onclick = async function () {
    const khoiPhuc = banNut(this, 'Đang lưu…');
    T.dangLuu = true;
    qa('.dgXL, .dgGC, #btnGoiY').forEach(function (x) { x.disabled = true; });
    try {
      const n = await D.luuDanhGia(d.thang, doi);
      T.chuaLuu = false; T.dangLuu = false;
      toast('Đã lưu đánh giá cho ' + n + ' học sinh.');
      R.lamMoi();
    } catch (e) {
      T.dangLuu = false;
      toast(e.message, 'err');
      qa('.dgXL, .dgGC, #btnGoiY').forEach(function (x) { x.disabled = false; });
      khoiPhuc();
    }
  };
}
