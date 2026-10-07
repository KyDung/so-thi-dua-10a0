/**
 * v-so.js — Sổ thi đua: nhập theo NGÀY cho từng học sinh.
 * Dựng theo bảng của cô: ngày | lỗi vi phạm - môn | môn - điểm tốt | môn - điểm kém | ghi chú.
 * Mỗi học sinh bắt đầu tuần với 100đ, chọn lỗi thì tự trừ, có mục "khác" để gõ tay.
 */
import {
  el, q, qa, esc, icon, loading, diemHTML, badge, avatar, thamSo, toast, moHopThoai, hoi, banNut, msg, R
} from './ui.js';
import { T } from './ui.js';
import * as D from './data.js';
import { ngayNgan, goiYTuanMoi, homNay, congNgay, tuanMacDinh, danhSachMon, chuanMon } from './logic.js';


/** Hộp thoại tạo / sửa một trang tuần. */
function hopTuan(suaTuan, dsTuan, xong) {
  const v = suaTuan
    ? { soTuan: suaTuan.soTuan, tuNgay: suaTuan.tuNgay, denNgay: suaTuan.denNgay, ghiChu: suaTuan.ghiChu || '' }
    : Object.assign({ ghiChu: '' }, goiYTuanMoi(dsTuan));
  const h = moHopThoai(suaTuan ? 'Sửa trang tuần' : 'Trang tuần mới', `
    <form id="fTuan" class="stack">
      <div class="row">
        <div class="col"><label class="f" for="tSo">Tuần thứ</label>
          <input type="number" id="tSo" min="1" max="60" value="${esc(v.soTuan)}" required></div>
      </div>
      <div class="row">
        <div class="col"><label class="f" for="tTu">Từ ngày</label><input type="date" id="tTu" value="${esc(v.tuNgay)}" required></div>
        <div class="col"><label class="f" for="tDen">Đến ngày</label><input type="date" id="tDen" value="${esc(v.denNgay)}" required></div>
      </div>
      <div><label class="f" for="tGhiChu">Ghi chú <small>(không bắt buộc)</small></label>
        <input id="tGhiChu" value="${esc(v.ghiChu)}" placeholder="ví dụ: tuần sau nghỉ Tết"></div>
      <p class="hint" style="margin:0">Tuần nghỉ Tết, nghỉ lễ thì <strong>không cần tạo trang</strong> — cứ bỏ qua, tuần sau tạo tiếp là được.</p>
      <div id="tLoi"></div>
      <div class="modal-act"><button type="button" class="btn" data-huy>Huỷ</button>
        <button class="btn primary" type="submit">${suaTuan ? 'Lưu trang tuần' : 'Tạo trang'}</button></div>
    </form>`);
  const g = h.goc;
  g.querySelector('[data-huy]').onclick = h.dong;
  // Chọn ngày bắt đầu thì tự điền ngày kết thúc sau đó 6 ngày
  g.querySelector('#tTu').onchange = function () {
    const den = g.querySelector('#tDen');
    if (this.value && (!den.value || den.value < this.value)) den.value = congNgay(this.value, 6);
  };
  g.querySelector('#fTuan').onsubmit = async function (ev) {
    ev.preventDefault();
    const khoiPhuc = banNut(g.querySelector('button[type=submit]'), 'Đang lưu…');
    const tuan = {
      soTuan: g.querySelector('#tSo').value, tuNgay: g.querySelector('#tTu').value,
      denNgay: g.querySelector('#tDen').value, ghiChu: g.querySelector('#tGhiChu').value.trim()
    };
    try {
      const kq = suaTuan ? await D.suaTuan(suaTuan.maTuan, tuan) : await D.taoTuan(tuan);
      h.dong();
      xong(suaTuan ? suaTuan.maTuan : kq.maTuan);
    } catch (e) {
      g.querySelector('#tLoi').innerHTML = msg('err', esc(e.message));
      khoiPhuc();
    }
  };
}

export async function mhChamDiem() {
  const luot = T.luot;
  loading();

  const dsTuan = await D.layTuan(true);
  if (luot !== T.luot) return;

  const vt = D.vaiTro();
  const quanLyTuan = vt === 'CAN_BO' || vt === 'GVCN';

  if (!dsTuan.length) {
    el.innerHTML = `<div class="card" style="max-width:640px;margin:20px auto;text-align:center">
        <div class="empty" style="padding-bottom:12px">${icon('lich')}<strong>Chưa có trang tuần nào</strong>
          Sổ thi đua bắt đầu bằng việc tạo một trang tuần — giống như mở trang mới trong sổ giấy.
          Điền tuần mấy, từ ngày đến ngày là xong.</div>
        ${quanLyTuan ? '<button class="btn primary" id="btnTrangMoi">' + icon('them', 'sm') + ' Tạo trang tuần đầu tiên</button>'
          : '<p class="hint">Nhờ lớp trưởng hoặc GVCN tạo trang tuần đầu tiên.</p>'}
      </div>`;
    const b = q('#btnTrangMoi');
    if (b) b.onclick = function () { hopTuan(null, dsTuan, function (ma) { location.hash = '#/cham-diem?tuan=' + ma; R.lamMoi(); }); };
    return;
  }

  const [dm, dsHS, cfg] = [await D.danhMucHienThi(), await D.hocSinhDuocGhi(), await D.layCauHinh()];
  const dsMon = danhSachMon(cfg);
  const nhomMon = function (nhan, ds) {
    return ds.length ? '<optgroup label="' + nhan + '">' + ds.map(function (m) { return '<option value="' + esc(m) + '">' + esc(m) + '</option>'; }).join('') + '</optgroup>' : '';
  };
  if (luot !== T.luot) return;
  if (!dsHS.length) { el.innerHTML = '<div class="card"><div class="empty">Không có học sinh nào bạn được ghi.</div></div>'; return; }

  const macDinh = tuanMacDinh(dsTuan, homNay());
  const maTuan = thamSo('tuan') || macDinh.maTuan;
  const maHS = thamSo('ma') || dsHS[0].maHS;

  const d = await D.nhatKyHS(maHS, maTuan);
  if (luot !== T.luot) return;
  const t = d.tong;

  const oChonTuan = '<select id="iTuan">' + dsTuan.map(function (x) {
    return '<option value="' + esc(x.maTuan) + '"' + (x.maTuan === maTuan ? ' selected' : '') + '>' +
      'Tuần ' + esc(x.soTuan) + ' · ' + esc(ngayNgan(x.tuNgay)) + ' – ' + esc(ngayNgan(x.denNgay)) + '</option>';
  }).join('') + '</select>';
  const oChonHS = '<select id="iChonHS">' + dsHS.map(function (h) {
    return '<option value="' + esc(h.maHS) + '"' + (h.maHS === maHS ? ' selected' : '') + '>' + esc(h.hoTen) + '</option>';
  }).join('') + '</select>';

  const ngayMacDinh = (function () {
    const h = homNay();
    return h >= d.tuan.tuNgay && h <= d.tuan.denNgay ? h : d.tuan.tuNgay;
  })();
  const chiSo = dsHS.findIndex(function (h) { return h.maHS === maHS; });

  el.innerHTML = `
    <div class="card">
      <div class="card-head">
        <div><h2>Sổ thi đua — Tuần ${esc(d.tuan.soTuan)}</h2>
          <p class="hint">${esc(d.tuan.tuNgay)} đến ${esc(d.tuan.denNgay)} · tháng ${esc(d.tuan.thang)}${d.tuan.ghiChu ? ' · ' + esc(d.tuan.ghiChu) : ''}</p></div>
        <div class="row">
          ${quanLyTuan ? '<button class="btn sm" id="btnSuaTuan">' + icon('sua', 'sm') + ' Sửa</button>' +
            '<button class="btn sm danger" id="btnXoaTuan">' + icon('xoa', 'sm') + ' Xoá trang</button>' : ''}
          ${quanLyTuan ? '<button class="btn sm primary" id="btnTrangMoi">' + icon('them', 'sm') + ' Trang tuần mới</button>' : ''}
        </div>
      </div>
      <div class="row end">
        <div class="col" style="min-width:240px"><label class="f" for="iTuan">Trang tuần</label>${oChonTuan}</div>
        <div class="col" style="min-width:240px"><label class="f" for="iChonHS">Học sinh</label>
          <div class="row" style="flex-wrap:nowrap">${oChonHS}
            <button class="btn" id="btnTruoc" ${chiSo <= 0 ? 'disabled' : ''} title="Bạn trước" aria-label="Bạn trước">‹</button>
            <button class="btn" id="btnSau" ${chiSo >= dsHS.length - 1 ? 'disabled' : ''} title="Bạn sau" aria-label="Bạn sau">›</button></div></div>
      </div>
    </div>

    <div class="grid main-side">
      <div>
        <div class="card">
          <h2>Thêm một mục</h2>
          <p class="hint" style="margin-bottom:14px">Chọn lỗi trong danh sách thì web tự trừ điểm. Không có trong danh sách thì chọn
            <strong>Lỗi khác</strong> rồi tự ghi nội dung và số điểm.</p>
          <form id="fThem" class="stack">
            <div class="row">
              <div class="col"><label class="f" for="mNgay">Ngày</label>
                <input type="date" id="mNgay" value="${esc(ngayMacDinh)}" min="${esc(d.tuan.tuNgay)}" max="${esc(d.tuan.denNgay)}" required></div>
              <div class="col"><label class="f" for="mLoai">Loại</label>
                <select id="mLoai"><option value="LOI">Lỗi vi phạm</option><option value="CONG">Điểm cộng</option></select></div>
            </div>
            <div><label class="f" for="mMa">Nội dung</label><select id="mMa"></select></div>
            <div class="row">
              <div class="col" id="oMon"><label class="f" for="mMonSel">Môn <small id="monBatBuoc"></small></label>
                <select id="mMonSel"><option value="">— chọn môn —</option>
                  ${nhomMon('Môn học và hoạt động bắt buộc', dsMon.batBuoc)}${nhomMon('Môn lựa chọn', dsMon.luaChon)}${nhomMon('Môn khác của trường', dsMon.khac)}
                  <option value="__khac">Môn khác (tự nhập)…</option></select>
                <input id="mMon" placeholder="Nhập tên môn, ví dụ Tiếng Nhật" autocomplete="off" style="display:none;margin-top:8px"></div>
              <div class="col" id="oDiem" style="display:none"><label class="f" for="mDiem">Số điểm</label>
                <input type="number" id="mDiem" step="1" min="1" placeholder="5"></div>
            </div>
            <div><label class="f" for="mGhiChu">Ghi chú</label><input id="mGhiChu" placeholder="không bắt buộc"></div>
            <p class="hint" id="mGoiY" style="margin:0"></p>
            <div id="mLoi"></div>
            <button class="btn primary" type="submit">${icon('them', 'sm')} Thêm vào sổ</button>
          </form>
        </div>

        <div class="card flush">
          <div class="card-head"><div><h2>Đã ghi trong tuần <span class="mute" style="font-weight:500">(${d.dong.length} mục)</span></h2></div></div>
          ${d.dong.length ? `<div class="tbl-wrap" style="margin-top:12px"><table>
            <thead><tr><th>Ngày</th><th>Nội dung</th><th>Môn</th><th class="r">Điểm</th><th></th></tr></thead>
            <tbody>${d.dong.map(function (r) {
              return `<tr>
                <td class="nowrap">${esc(ngayNgan(r.ngay))}</td>
                <td>${esc(r.ten)}
                  ${r.nhom === 'HA_BAC' ? '<span class="badge DAT">hạ 1 bậc</span>' : ''}${r.nhom === 'CHUA_DAT' ? '<span class="badge CHUA_DAT">chưa đạt</span>' : ''}
                  ${r.nhomCha || r.ghiChu ? '<br><small class="mute">' + esc([r.nhomCha, r.ghiChu].filter(Boolean).join(' · ')) + '</small>' : ''}</td>
                <td>${esc(r.mon)}</td>
                <td class="r">${diemHTML(r.diem)}</td>
                <td class="r"><button class="icon-btn btnXoaMuc" data-id="${esc(r.id)}" title="Xoá mục này" aria-label="Xoá">${icon('xoa')}</button></td>
              </tr>`;
            }).join('')}</tbody></table></div>`
            : '<div class="empty">' + icon('so') + 'Chưa ghi mục nào cho bạn này trong tuần.</div>'}
        </div>
      </div>

      <div class="card" style="position:sticky;top:calc(var(--top-h) + 16px)">
        <div class="hero-hs" style="margin-bottom:14px">${avatar(d.hocSinh.hoTen, 'lg')}
          <div><h2 style="font-size:17px">${esc(d.hocSinh.hoTen)}</h2>
            <p class="hint" style="margin:2px 0 0">${esc(d.hocSinh.chucVu || d.hocSinh.to || d.hocSinh.maHS)}</p></div></div>
        <div class="stat">
          <div><div class="n diem">${esc(t.batDau)}</div><div class="l">Điểm đầu tuần</div></div>
          <div><div class="n diem duong">+${esc(t.cong)}</div><div class="l">Cộng</div></div>
          <div><div class="n diem am">${esc(t.tru)}</div><div class="l">Trừ</div></div>
          <div><div class="n ${t.cuoi >= t.batDau ? 'diem duong' : 'diem am'}">${esc(t.cuoi)}</div><div class="l">Còn lại</div></div>
        </div>
        <div class="row between" style="margin-top:14px"><span class="mute small">Xếp loại tuần</span>
          ${t.xepLoai ? badge(t.xepLoai, t.nhan) : '<span class="mute">—</span>'}</div>
      </div>
    </div>`;

  // ---- điều hướng ----
  const diTiep = function (tuan, hs) {
    location.hash = '#/cham-diem?tuan=' + encodeURIComponent(tuan) + '&ma=' + encodeURIComponent(hs);
  };
  q('#iTuan').onchange = function () { diTiep(this.value, maHS); };
  q('#iChonHS').onchange = function () { diTiep(maTuan, this.value); };
  q('#btnTruoc').onclick = function () { if (chiSo > 0) diTiep(maTuan, dsHS[chiSo - 1].maHS); };
  q('#btnSau').onclick = function () { if (chiSo < dsHS.length - 1) diTiep(maTuan, dsHS[chiSo + 1].maHS); };

  if (quanLyTuan) {
    const sauTuan = function (ma) { location.hash = '#/cham-diem?tuan=' + encodeURIComponent(ma); R.lamMoi(); };
    q('#btnTrangMoi').onclick = function () { hopTuan(null, dsTuan, sauTuan); };
    q('#btnSuaTuan').onclick = function () { hopTuan(d.tuan, dsTuan, sauTuan); };
    q('#btnXoaTuan').onclick = async function () {
      if (!await hoi('Xoá trang Tuần ' + esc(d.tuan.soTuan) + '?',
        'Chỉ xoá được khi trang chưa có mục nào.', 'Xoá trang', true)) return;
      try { await D.xoaTuan(maTuan); toast('Đã xoá trang tuần.'); location.hash = '#/cham-diem'; R.lamMoi(); }
      catch (e) { toast(e.message, 'err'); }
    };
  }

  // ---- ô chọn nội dung đổi theo Loại ----
  function veLaiDanhMuc() {
    const laCong = q('#mLoai').value === 'CONG';
    const ds = laCong ? dm.cong : dm.loi;
    const nhom = {};
    ds.forEach(function (x) { (nhom[x.nhomCha || 'Khác'] = nhom[x.nhomCha || 'Khác'] || []).push(x); });
    q('#mMa').innerHTML = Object.keys(nhom).map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + nhom[g].map(function (x) {
        const dd = x.tuNhap ? 'tự nhập' : (x.diem > 0 ? '+' + x.diem : String(x.diem)) + 'đ';
        return '<option value="' + esc(x.ma) + '">' + esc(x.ten) + ' (' + dd + ')</option>';
      }).join('') + '</optgroup>';
    }).join('');
    veLaiMuc();
  }
  function mucDangChon() {
    const ds = q('#mLoai').value === 'CONG' ? dm.cong : dm.loi;
    return ds.filter(function (x) { return x.ma === q('#mMa').value; })[0];
  }
  function veLaiMuc() {
    const m = mucDangChon();
    if (!m) return;
    q('#oDiem').style.display = m.tuNhap ? '' : 'none';
    q('#mDiem').required = !!m.tuNhap;
    q('#monBatBuoc').textContent = m.canMon ? '(bắt buộc)' : '(không bắt buộc)';
    q('#mMonSel').required = !!m.canMon;
    q('#mGhiChu').placeholder = m.tuNhap ? 'ghi rõ nội dung — bắt buộc' : 'không bắt buộc';
    const nhac = [];
    if (m.tuNhap) nhac.push('Tự ghi nội dung và số điểm.'); else nhac.push('Tự ' + (m.diem > 0 ? 'cộng ' : 'trừ ') + Math.abs(m.diem) + 'đ.');
    if (m.nhanDoiTuLan2) nhac.push('Tái phạm trong cùng tuần thì trừ gấp đôi.');
    if (m.ghiSoDauBai) nhac.push('Tính 1 lần bị ghi sổ đầu bài.');
    if (m.nhom === 'HA_BAC') nhac.push('Hạ 1 bậc hạnh kiểm tháng.');
    if (m.nhom === 'CHUA_DAT') nhac.push('Xếp loại Chưa đạt tháng đó.');
    q('#mGoiY').textContent = nhac.join(' ');
  }
  // Chọn "Môn khác" thì hiện ô gõ tên môn
  q('#mMonSel').onchange = function () {
    const khac = this.value === '__khac';
    q('#mMon').style.display = khac ? '' : 'none';
    q('#mMon').required = khac;
    if (khac) q('#mMon').focus();
  };
  const layMon = function () {
    const v = q('#mMonSel').value;
    return chuanMon(v === '__khac' ? q('#mMon').value : v);
  };
  q('#mLoai').onchange = veLaiDanhMuc;
  q('#mMa').onchange = veLaiMuc;
  veLaiDanhMuc();

  // ---- thêm mục ----
  q('#fThem').onsubmit = async function (ev) {
    ev.preventDefault();
    const khoiPhuc = banNut(q('#fThem button[type=submit]'), 'Đang lưu…');
    q('#mLoi').innerHTML = '';
    try {
      await D.themNhatKy({
        maHS: maHS, ngay: q('#mNgay').value, loai: q('#mLoai').value, ma: q('#mMa').value,
        mon: layMon(), ghiChu: q('#mGhiChu').value.trim(), diem: q('#mDiem').value
      });
      toast('Đã thêm vào sổ.');
      R.lamMoi();
    } catch (e) {
      q('#mLoi').innerHTML = msg('err', esc(e.message));
      khoiPhuc();
    }
  };

  qa('.btnXoaMuc').forEach(function (b) {
    b.onclick = async function () {
      if (!await hoi('Xoá mục này?', 'Mục bị xoá sẽ không còn tính vào điểm, nhưng vẫn được lưu vết trong hệ thống.', 'Xoá', true)) return;
      b.disabled = true;
      try { await D.xoaNhatKy(b.dataset.id); toast('Đã xoá mục.'); R.lamMoi(); }
      catch (e) { toast(e.message, 'err'); b.disabled = false; }
    };
  });
}
