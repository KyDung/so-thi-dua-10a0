/**
 * v-chi-tiet.js — Chi tiết một học sinh: điểm cộng / trừ theo tuần, xếp loại các tháng.
 * Phụ huynh vào thẳng trang này và chỉ thấy đúng con mình.
 */
import { el, q, esc, icon, loading, diemHTML, badge, avatar, thamSo, T } from './ui.js';
import * as D from './data.js';
import { THANG_HOC, ngayNgan } from './logic.js';
import { thangMacDinh } from './v-lop.js';

export async function mhChiTiet() {
  const luot = T.luot;
  const phuHuynh = D.vaiTro() === 'PHU_HUYNH';
  loading();
  const dsHS = await D.layHocSinh();
  if (luot !== T.luot) return;
  const dsChon = dsHS.filter(function (x) { return x.trangThai === 'DANG_HOC'; });
  const ma = phuHuynh ? dsHS[0] && dsHS[0].maHS : (thamSo('ma') || (dsChon[0] && dsChon[0].maHS));
  if (!ma) { el.innerHTML = '<div class="card"><div class="empty">Chưa có học sinh nào.</div></div>'; return; }

  const d = await D.chiTietHS(ma);
  if (luot !== T.luot) return;

  const tuanLoc = thamSo('tuan');                       // lọc đúng 1 tuần, ưu tiên hơn lọc tháng
  const thangThamSo = thamSo('thang');
  const thangLoc = tuanLoc ? 0 : (thangThamSo === '0' ? 0 : (Number(thangThamSo) || await thangMacDinh()));
  const hop = function (maTuan, thang) {
    if (tuanLoc) return maTuan === tuanLoc;
    return !thangLoc || Number(thang) === thangLoc;
  };

  const chiTiet = d.chiTiet.filter(function (r) { return hop(r.maTuan, r.thang); });
  const cacTuan = d.tuan.filter(function (t) { return hop(t.maTuan, t.thang); })
    .sort(function (a, b) { return String(b.tuNgay).localeCompare(String(a.tuNgay)); });   // tuần mới nhất lên đầu
  const theoTuan = {};
  chiTiet.forEach(function (r) { (theoTuan[r.maTuan] = theoTuan[r.maTuan] || []).push(r); });
  const diemTuan = {};
  d.diemTuan.forEach(function (t) { diemTuan[t.maTuan] = t; });

  const h = d.hocSinh;
  // Điểm cộng trừ của một tuần đã tính cả quy tắc "tái phạm trong tuần trừ gấp đôi"
  const diemCuaTuan = function (maTuan) {
    const dt = diemTuan[maTuan];
    return dt ? dt.cong + dt.tru : 0;
  };
  const tongDiem = cacTuan.reduce(function (s, t) { return s + diemCuaTuan(t.maTuan); }, 0);
  const soLoi = chiTiet.filter(function (r) { return r.loai === 'LOI'; }).length;
  const soCong = chiTiet.filter(function (r) { return r.loai === 'CONG'; }).length;
  const tuanDangLoc = tuanLoc ? d.tuan.filter(function (t) { return t.maTuan === tuanLoc; })[0] : null;
  const nhanLoc = tuanDangLoc ? 'tuần ' + (tuanDangLoc.soTuan || tuanDangLoc.maTuan)
    : (thangLoc ? 'tháng ' + thangLoc : 'cả năm');
  const thangCuaTuanLoc = tuanDangLoc ? Number(tuanDangLoc.thang) : 0;
  const tongHopThang = d.thang.filter(function (t) {
    if (tuanLoc) return Number(t.thang) === thangCuaTuanLoc;
    return !thangLoc || Number(t.thang) === thangLoc;
  });

  function mucTuan(items, loai) {
    const ds = items.filter(function (r) { return r.loai === loai; });
    if (!ds.length) return '<div class="week-empty">Không có</div>';
    return '<ul class="week-list">' + ds.map(function (r) {
      return '<li><span><strong>' + esc(r.ten) + '</strong>' +
        (r.mon ? ' <span class="badge xam">' + esc(r.mon) + '</span>' : '') +
        (r.nhom === 'HA_BAC' ? ' <span class="badge DAT">hạ 1 bậc</span>' : '') +
        (r.nhom === 'CHUA_DAT' ? ' <span class="badge CHUA_DAT">nghiêm trọng</span>' : '') +
        '<small>' + esc(ngayNgan(r.ngay)) + (r.cot ? ' · ' + esc(r.cot) : '') + (r.ghiChu ? ' · ' + esc(r.ghiChu) : '') + '</small>' +
        '</span>' + diemHTML(r.diem) + '</li>';
    }).join('') + '</ul>';
  }

  function theTuan(t) {
    const items = (theoTuan[t.maTuan] || []).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; });
    const dt = diemTuan[t.maTuan];
    const diem = diemCuaTuan(t.maTuan);
    if (!items.length) {
      return `<section class="week-card"><div class="week-head">
        <div><h3>Tuần ${esc(t.soTuan || t.maTuan)}</h3><p>${esc(ngayNgan(t.tuNgay))} – ${esc(ngayNgan(t.denNgay))}</p></div>
        <span class="mute small">Không có mục nào</span></div></section>`;
    }
    return `<section class="week-card">
      <div class="week-head">
        <div><h3>Tuần ${esc(t.soTuan || t.maTuan)}</h3><p>${esc(ngayNgan(t.tuNgay))} – ${esc(ngayNgan(t.denNgay))}</p></div>
        <div class="row" style="gap:10px">${dt && items.length ? badge(dt.xepLoai) : ''}${diemHTML(diem)}</div>
      </div>
      <div class="week-body">
        <h4>Điểm cộng</h4>${mucTuan(items, 'CONG')}
        <h4>Điểm trừ</h4>${mucTuan(items, 'LOI')}
      </div>
    </section>`;
  }

  const chonHS = phuHuynh ? '' : `<div class="col" style="min-width:220px"><label class="f" for="iHS">Học sinh</label>
      <select id="iHS">${dsChon.map(function (x) {
        return '<option value="' + esc(x.maHS) + '"' + (x.maHS === ma ? ' selected' : '') + '>' + esc(x.hoTen) + '</option>';
      }).join('')}</select></div>`;

  el.innerHTML = `
    <div class="card">
      <div class="hero-hs">
        ${avatar(h.hoTen, 'lg')}
        <div style="flex:1;min-width:200px">
          <h2>${esc(h.hoTen)}</h2>
          <p class="hint" style="margin:2px 0 0">${esc(h.maHS)}${h.chucVu ? ' · ' + esc(h.chucVu) : ''}${h.to ? ' · ' + esc(h.to) : ''}</p>
        </div>
      </div>
      <div class="row end" style="margin-top:16px">
        ${chonHS}
        <div class="col" style="min-width:220px"><label class="f" for="iLoc">Xem theo</label>
          <select id="iLoc">
            <option value="thang:0"${!tuanLoc && !thangLoc ? ' selected' : ''}>Cả năm học</option>
            <optgroup label="Theo tháng">
              ${THANG_HOC.map(function (t) {
                return '<option value="thang:' + t + '"' + (!tuanLoc && t === thangLoc ? ' selected' : '') + '>Tháng ' + t + '</option>';
              }).join('')}
            </optgroup>
            ${d.tuan.length ? `<optgroup label="Theo tuần">
              ${d.tuan.slice().sort(function (a, b) { return String(b.tuNgay).localeCompare(String(a.tuNgay)); }).map(function (t) {
                return '<option value="tuan:' + esc(t.maTuan) + '"' + (t.maTuan === tuanLoc ? ' selected' : '') +
                  '>Tuần ' + esc(t.soTuan || t.maTuan) + ' (' + esc(ngayNgan(t.tuNgay)) + '–' + esc(ngayNgan(t.denNgay)) + ')</option>';
              }).join('')}
            </optgroup>` : ''}
          </select></div>
      </div>
    </div>

    <div class="card">
      <div class="stat xl">
        <div class="${tongDiem < 0 ? 't-cd' : 't-tot'}"><div class="n">${tongDiem > 0 ? '+' : ''}${tongDiem}</div><div class="l">Điểm thi đua ${esc(nhanLoc)}</div></div>
        <div><div class="n">${soLoi}</div><div class="l">Lượt vi phạm</div></div>
        <div><div class="n">${soCong}</div><div class="l">Lượt được cộng</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div><h2>Chi tiết ${esc(nhanLoc)}</h2>
        <p class="hint">Các mục do cán bộ lớp chép lại từ sổ chính, chia theo từng tuần.</p></div></div>
      ${cacTuan.length ? '<div class="week-grid">' + cacTuan.map(theTuan).join('') + '</div>'
        : '<div class="empty">' + icon('lich') + '<strong>Chưa có trang tuần</strong>Chưa có tuần nào thuộc khoảng thời gian này.</div>'}
    </div>

    <div class="card flush">
      <div class="card-head"><div><h2>Xếp loại ${tuanLoc ? 'tháng ' + esc(thangCuaTuanLoc) : (thangLoc ? 'tháng ' + esc(thangLoc) : 'từng tháng')}</h2></div></div>
      ${tongHopThang.length ? `<div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Tháng</th><th>Xếp loại</th><th class="r">Điểm TB</th><th class="r">Ghi sổ ĐB</th><th class="r">Hạ bậc</th><th>Nhận xét của cô / cán bộ lớp</th><th></th></tr></thead>
        <tbody>${tongHopThang.map(function (t) {
          return `<tr>
            <td><strong>Tháng ${esc(t.thang)}</strong></td>
            <td>${t.xepLoai ? badge(t.xepLoai, t.nhan) : '<span class="mute small">chưa xếp</span>'}</td>
            <td class="r"><span class="diem">${esc(t.diemThiDua)}</span></td>
            <td class="r">${esc(t.soLanGhiSo || 0)}</td>
            <td class="r">${esc(t.soLanHaBac || 0)}</td>
            <td class="small">${esc(t.ghiChu) || '<span class="mute">—</span>'}</td>
            <td>${t.daChot ? '<span class="badge tim">đã chốt</span>' : '<span class="mute small">tạm tính</span>'}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : '<div class="empty">Chưa có dữ liệu tháng nào.</div>'}
      ${d.ky.length ? `<div class="row" style="padding:16px 20px;border-top:1px solid var(--line-2);gap:18px">${d.ky.map(function (k) {
        return '<span><span class="mute small">' + (k.ky === 'CA_NAM' ? 'Cả năm' : k.ky) + '</span> ' + badge(k.xepLoai, k.nhan) +
          (k.daDuyet ? '' : ' <em class="mute small">(dự kiến)</em>') + '</span>';
      }).join('')}</div>` : ''}
    </div>`;

  const oHS = q('#iHS');
  const locHienTai = tuanLoc ? '&tuan=' + encodeURIComponent(tuanLoc) : '&thang=' + thangLoc;
  if (oHS) oHS.onchange = function () { location.hash = '#/chi-tiet?ma=' + encodeURIComponent(this.value) + locHienTai; };
  q('#iLoc').onchange = function () {
    const v = String(this.value).split(':');
    const p = v[0] === 'tuan' ? '&tuan=' + encodeURIComponent(v[1]) : '&thang=' + v[1];
    location.hash = '#/chi-tiet?ma=' + encodeURIComponent(ma) + p;
  };
}
