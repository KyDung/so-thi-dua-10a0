/**
 * v-quan-tri.js — Khu vực của giáo viên chủ nhiệm: chốt tháng, học sinh, tài khoản,
 * cấu hình, danh mục lỗi, nhật ký hệ thống, năm học mới.
 */
import {
  el, q, qa, esc, icon, loading, msg, thamSo, chonThang, ganChonThang, toast, moHopThoai, hoi, banNut, avatar, badge, R, T
} from './ui.js';
import * as D from './data.js';
import { thangMacDinh } from './v-lop.js';
import { MO_TA_CAU_HINH } from './seed.js';
import { laDung, khongDau } from './logic.js';

const MUC = [
  ['tong-quan', 'Chốt & xuất'], ['hoc-sinh', 'Học sinh'], ['tai-khoan', 'Tài khoản'],
  ['cau-hinh', 'Cấu hình'], ['danh-muc', 'Danh mục lỗi'], ['nhat-ky', 'Nhật ký']
];

export async function mhQuanTri() {
  if (D.vaiTro() !== 'GVCN') {
    el.innerHTML = msg('warn', 'Khu vực này chỉ dành cho giáo viên chủ nhiệm.');
    return;
  }
  const muc = thamSo('muc') || 'tong-quan';
  el.innerHTML = '<div class="tabs-sub no-in">' + MUC.map(function (m) {
    return '<a href="#/quan-tri?muc=' + m[0] + '"' + (m[0] === muc ? ' class="on"' : '') + '>' + m[1] + '</a>';
  }).join('') + '</div><div id="khungMuc"></div>';
  const goc = el.querySelector('#khungMuc');
  goc.innerHTML = '<div class="loading-card"><div class="spin"></div></div>';
  const ham = { 'tong-quan': tongQuan, 'hoc-sinh': hocSinh, 'tai-khoan': taiKhoan,
    'cau-hinh': cauHinh, 'danh-muc': danhMuc, 'nhat-ky': nhatKy }[muc] || tongQuan;
  await ham(goc, T.luot);
}

const $ = function (goc, sel) { return goc.querySelector(sel); };

function taiXuong(ten, noiDung, loai) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([noiDung], { type: loai || 'application/json' }));
  a.download = ten;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}

// ---------------------------------------------------------------- Tổng quan

async function tongQuan(goc, luot) {
  const [cfg, hs, tuan] = [await D.layCauHinh(true), await D.layHocSinh(true), await D.layTuan(true)];
  if (luot !== T.luot) return;
  const soHS = hs.filter(function (r) { return r.trangThai === 'DANG_HOC'; }).length;
  const thangNay = await thangMacDinh();

  goc.innerHTML = `
    <div class="grid g3" style="margin-bottom:16px">
      <div class="card" style="margin:0"><div class="stat"><div><div class="n">${soHS}</div><div class="l">Học sinh đang học</div></div></div></div>
      <div class="card" style="margin:0"><div class="stat"><div><div class="n">${tuan.length}</div><div class="l">Trang tuần đã tạo</div></div></div></div>
      <div class="card" style="margin:0"><div class="stat"><div><div class="n">${esc(cfg.NamHoc)}</div><div class="l">Năm học · ${esc(cfg.Lop)}</div></div></div></div>
    </div>
    ${soHS === 0 ? msg('info', 'Lớp chưa có học sinh. Vào <a href="#/quan-tri?muc=hoc-sinh">Học sinh</a> để dán danh sách lớp.') : ''}

    <div class="grid g2">
      <div class="card">
        <h2>Chốt tháng</h2>
        <p class="hint" style="margin-bottom:14px">Chốt xong thì cán bộ lớp không ghi, xoá hay đổi xếp loại tháng đó được nữa.
          Lỡ chốt nhầm thì bấm <strong>Mở chốt</strong>.</p>
        ${chonThang(thangNay, 'iThangChot')}
        <div class="row" style="margin-top:14px">
          <button class="btn primary" id="btnChot">${icon('chia', 'sm')} Chốt tháng <span id="soChot">${thangNay}</span></button>
          <button class="btn" id="btnMoChot">Mở chốt</button>
        </div>
      </div>
      <div class="card">
        <h2>Số liệu & xuất file</h2>
        <p class="hint" style="margin-bottom:14px">Số liệu <strong>tự cập nhật ngay</strong> mỗi khi có người ghi, xoá mục, sửa trang tuần, đổi cấu hình hay mức điểm.
          Nút <em>Đồng bộ lại</em> chỉ để sửa chữa khi nghi số liệu bị lệch (ví dụ mất mạng giữa chừng).</p>
        <div class="row">
          <button class="btn" id="btnTinhLai">${icon('lai', 'sm')} Đồng bộ lại số liệu</button>
          <button class="btn primary" id="btnXuat">${icon('tai', 'sm')} Xuất Excel CẢ NĂM học</button>
        </div>
        <p class="hint" style="margin-top:12px">File cả năm gồm tất cả các tháng (mỗi tháng một sheet) cùng HK1 và HK2, theo mẫu của trường. Chỉ cần một tháng thì vào tab <strong>Đánh giá</strong> → <em>Xuất Excel tháng N</em>. Đối chiếu với mẫu trước khi nộp.</p>
      </div>
    </div>

    <div class="card">
      <h2>Bắt đầu năm học mới</h2>
      <p class="hint" style="margin-bottom:14px">Tải bản sao lưu toàn bộ năm học này về máy, rồi dọn sạch trang tuần, nhật ký và xếp loại để dùng tiếp.
        Giữ nguyên danh mục lỗi, tài khoản, cấu hình, danh sách học sinh.</p>
      <button class="btn danger" id="btnNamMoi">Bắt đầu năm học mới…</button>
    </div>`;

  let thangChot = thangNay;
  ganChonThang('iThangChot', function (t) {
    thangChot = t;
    qa('#iThangChot .chip').forEach(function (c) { c.classList.toggle('on', Number(c.dataset.thang) === t); });
    $(goc, '#soChot').textContent = t;
  });
  // ganChonThang gắn sự kiện trên phần tử trong el; chip đổi tại chỗ nên không cần dựng lại

  $(goc, '#btnChot').onclick = async function () {
    if (!await hoi('Chốt tháng ' + thangChot + '?', 'Sau khi chốt, cán bộ lớp không sửa được tháng này nữa. Web sẽ tính lại số liệu trước khi chốt.', 'Chốt tháng')) return;
    const khoiPhuc = banNut(this, 'Đang chốt…');
    try { const n = await D.chotThang(thangChot); toast('Đã chốt tháng ' + thangChot + ' cho ' + n + ' học sinh.'); }
    catch (e) { toast(e.message, 'err'); }
    khoiPhuc();
  };
  $(goc, '#btnMoChot').onclick = async function () {
    if (!await hoi('Mở chốt tháng ' + thangChot + '?', 'Cán bộ lớp sẽ sửa được tháng này trở lại.', 'Mở chốt')) return;
    const khoiPhuc = banNut(this, 'Đang mở…');
    try { await D.chotThang(thangChot, true); toast('Đã mở chốt tháng ' + thangChot + '.'); }
    catch (e) { toast(e.message, 'err'); }
    khoiPhuc();
  };
  $(goc, '#btnTinhLai').onclick = async function () {
    const khoiPhuc = banNut(this, 'Đang tính…');
    try { const n = await D.tinhLaiTatCa(); toast('Đã tính lại, cập nhật ' + n + ' dòng.'); }
    catch (e) { toast(e.message, 'err'); }
    khoiPhuc();
  };
  $(goc, '#btnXuat').onclick = async function () {
    const khoiPhuc = banNut(this, 'Đang tạo file…');
    try { const ten = await D.xuatExcel(); toast('Đã xuất file cả năm: ' + ten); }
    catch (e) { toast(e.message, 'err'); }
    khoiPhuc();
  };
  $(goc, '#btnNamMoi').onclick = function () { hopNamMoi(cfg); };
}

function hopNamMoi(cfg) {
  const [a, b] = String(cfg.NamHoc).split('-').map(Number);
  const h = moHopThoai('Bắt đầu năm học mới', `
    <form id="fNam" class="stack">
      <p class="modal-text" style="margin:0">Web sẽ <strong>tải về một file sao lưu</strong> toàn bộ dữ liệu năm ${esc(cfg.NamHoc)}
        (hãy cất giữ file này), sau đó xoá trang tuần, nhật ký, xếp loại tháng khỏi hệ thống.</p>
      <div><label class="f" for="nNam">Năm học mới</label><input id="nNam" value="${a + 1}-${b + 1}" pattern="\\d{4}-\\d{4}" required></div>
      <label class="chk"><input type="checkbox" id="nHieu" required> Tôi hiểu dữ liệu năm cũ sẽ bị xoá khỏi hệ thống.</label>
      <div id="nLoi"></div>
      <div class="modal-act"><button type="button" class="btn" data-huy>Huỷ</button>
        <button class="btn danger solid" type="submit">Sao lưu & bắt đầu</button></div>
    </form>`);
  const g = h.goc;
  g.querySelector('[data-huy]').onclick = h.dong;
  g.querySelector('#fNam').onsubmit = async function (ev) {
    ev.preventDefault();
    const namMoi = g.querySelector('#nNam').value.trim();
    const khoiPhuc = banNut(g.querySelector('button[type=submit]'), 'Đang sao lưu…');
    try {
      const luu = await D.sapLuuNamHoc();
      taiXuong('SAO-LUU_' + cfg.Lop + '_' + cfg.NamHoc + '.json', JSON.stringify(luu, null, 1));
      if (!await hoi('Đã tải file sao lưu', 'Hãy kiểm tra file đã được tải về máy. Bấm <strong>Xoá & bắt đầu</strong> để dọn dữ liệu năm cũ.', 'Xoá & bắt đầu', true)) {
        khoiPhuc(); return;
      }
      await D.batDauNamHocMoi(namMoi);
      h.dong();
      toast('Đã chuyển sang năm học ' + namMoi + '. Nhớ tạo trang tuần 1.');
      R.tieuDe();
      R.lamMoi();
    } catch (e) {
      g.querySelector('#nLoi').innerHTML = msg('err', esc(e.message));
      khoiPhuc();
    }
  };
}

// ---------------------------------------------------------------- Học sinh

async function hocSinh(goc, luot) {
  const ds = await D.layHocSinh(true);
  if (luot !== T.luot) return;

  goc.innerHTML = `
    <div class="card">
      <h2>Thêm học sinh</h2>
      <p class="hint" style="margin-bottom:12px">Dán danh sách họ tên, <strong>mỗi bạn một dòng</strong> (copy cột "Họ tên" từ file Excel là nhanh nhất).
        Mã học sinh được tự đánh số nối tiếp.</p>
      <textarea id="dsTen" placeholder="Nguyễn Văn An&#10;Trần Thị Bình&#10;…"></textarea>
      <div class="row" style="margin-top:12px"><button class="btn primary" id="btnThemHS">${icon('them', 'sm')} Thêm vào lớp</button>
        <span class="small mute" id="demTen"></span></div>
    </div>

    <div class="card flush">
      <div class="card-head"><div><h2>Danh sách lớp <span class="mute" style="font-weight:500">(${ds.length})</span></h2>
        <p class="hint">Cột <em>Tổ</em> chỉ cần nếu lớp thi đua theo tổ — tổ trưởng chỉ ghi được cho bạn thuộc tổ mình.</p></div>
        <button class="btn primary" id="btnLuuHS" disabled>${icon('tich', 'sm')} Lưu thay đổi</button></div>
      <div class="tbl-wrap" style="margin-top:12px"><table>
        <thead><tr><th>Mã</th><th>Họ tên</th><th>Tổ</th><th>Chức vụ</th><th>Trạng thái</th></tr></thead>
        <tbody>${ds.map(function (h) {
          return `<tr data-ma="${esc(h.maHS)}">
            <td class="mute small nowrap">${esc(h.maHS)}</td>
            <td><input data-f="hoTen" value="${esc(h.hoTen)}" style="min-width:190px"></td>
            <td><input data-f="to" value="${esc(h.to || '')}" placeholder="Tổ 1" style="width:100px"></td>
            <td><input data-f="chucVu" value="${esc(h.chucVu || '')}" placeholder="Lớp trưởng…" style="min-width:140px"></td>
            <td><select data-f="trangThai" style="min-width:130px">
              <option value="DANG_HOC"${h.trangThai === 'DANG_HOC' ? ' selected' : ''}>Đang học</option>
              <option value="DA_NGHI"${h.trangThai !== 'DANG_HOC' ? ' selected' : ''}>Đã nghỉ / chuyển</option></select></td>
          </tr>`;
        }).join('') || '<tr><td colspan="5"><div class="empty">Chưa có học sinh nào. Dán danh sách ở khung trên.</div></td></tr>'}</tbody>
      </table></div>
    </div>`;

  $(goc, '#dsTen').oninput = function () {
    const n = this.value.split('\n').filter(function (s) { return s.trim(); }).length;
    $(goc, '#demTen').textContent = n ? n + ' tên' : '';
  };
  $(goc, '#btnThemHS').onclick = async function () {
    const dsTen = $(goc, '#dsTen').value.split('\n');
    const khoiPhuc = banNut(this, 'Đang thêm…');
    try {
      const n = await D.themHocSinh(dsTen);
      toast('Đã thêm ' + n + ' học sinh.');
      R.lamMoi();
    } catch (e) { toast(e.message, 'err'); khoiPhuc(); }
  };

  const goc0 = {}, doi = {};
  ds.forEach(function (h) { goc0[h.maHS] = { hoTen: h.hoTen, to: h.to || '', chucVu: h.chucVu || '', trangThai: h.trangThai }; });
  qa('tbody tr[data-ma] [data-f]').forEach(function (inp) {
    const sua = function () {
      const ma = inp.closest('tr').dataset.ma, f = inp.dataset.f;
      const moi = inp.value.trim();
      if (moi === goc0[ma][f]) { if (doi[ma]) { delete doi[ma][f]; if (!Object.keys(doi[ma]).length) delete doi[ma]; } }
      else { (doi[ma] = doi[ma] || {})[f] = moi; }
      T.chuaLuu = Object.keys(doi).length > 0;
      $(goc, '#btnLuuHS').disabled = !T.chuaLuu;
    };
    inp.oninput = sua; inp.onchange = sua;
  });
  $(goc, '#btnLuuHS').onclick = async function () {
    for (const ma of Object.keys(doi)) {
      if (doi[ma].hoTen === '') { toast('Họ tên không được để trống.', 'err'); return; }
    }
    const khoiPhuc = banNut(this, 'Đang lưu…');
    try { await D.capNhatHocSinh(doi); T.chuaLuu = false; toast('Đã lưu thay đổi.'); R.lamMoi(); }
    catch (e) { toast(e.message, 'err'); khoiPhuc(); }
  };
}

// ---------------------------------------------------------------- Tài khoản

const TEN_VT = { GVCN: 'GVCN', LOP_TRUONG: 'Lớp trưởng', TO_TRUONG: 'Tổ trưởng', PHU_HUYNH: 'Phụ huynh' };

async function taiKhoan(goc, luot) {
  const [ds, hs, cfg] = [await D.dsTaiKhoan(), await D.layHocSinh(true), await D.layCauHinh()];
  if (luot !== T.luot) return;
  const hsTheoMa = {};
  hs.forEach(function (h) { hsTheoMa[h.maHS] = h; });
  const soPH = ds.filter(function (t) { return t.vaiTro === 'PHU_HUYNH'; }).length;
  const soHS = hs.filter(function (h) { return h.trangThai === 'DANG_HOC'; }).length;

  goc.innerHTML = `
    <div class="card">
      <div class="card-head" style="margin-bottom:0">
        <div><h2>Tài khoản <span class="mute" style="font-weight:500">(${ds.length})</span></h2>
          <p class="hint">Phụ huynh: ${soPH}/${soHS} học sinh đã có tài khoản.
            Tên đăng nhập = họ tên không dấu + <code>${esc(cfg.HauToTenDangNhap)}</code>, mật khẩu ban đầu = họ tên không dấu + <code>${esc(cfg.MatKhauMacDinhHau)}</code>.</p></div>
        <div class="row">
          <button class="btn" id="btnThemCB">${icon('them', 'sm')} Thêm cán bộ lớp</button>
          <button class="btn" id="btnIn">${icon('tai', 'sm')} In tài khoản phụ huynh</button>
          <button class="btn primary" id="btnTaoPH" ${soPH >= soHS ? 'disabled' : ''}>${icon('nhom', 'sm')} ${soPH >= soHS && soHS ? 'Đã đủ tài khoản phụ huynh' : 'Tạo tài khoản phụ huynh'}</button>
        </div>
      </div>
      <div id="tienDo" style="display:none"><div class="progress"><i></i></div><p class="hint" id="tienDoChu"></p></div>
      <div id="kqTao"></div>
    </div>

    <div class="card flush"><div class="tbl-wrap"><table>
      <thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Vai trò</th><th>Gắn với</th><th>Trạng thái</th><th></th></tr></thead>
      <tbody>${ds.map(function (t) {
        const h = hsTheoMa[t.maHS];
        return `<tr data-uid="${esc(t.uid)}">
          <td><strong>${esc(t.tenDangNhap)}</strong>${t.lanDau ? '<br><span class="badge DAT">chưa đổi mật khẩu</span>' : ''}</td>
          <td><span class="ten-hs">${avatar(t.hoTen, 'xs')}${esc(t.hoTen)}</span></td>
          <td><span class="badge tim">${esc(TEN_VT[t.vaiTro] || t.vaiTro)}</span></td>
          <td>${t.vaiTro === 'PHU_HUYNH' ? esc(h ? h.hoTen : t.maHS) : esc(t.toPhuTrach || '—')}</td>
          <td>${t.trangThai === 'HOAT_DONG' ? '<span class="badge TOT">hoạt động</span>' : '<span class="badge CHUA_DAT">đã khoá</span>'}</td>
          <td class="r nowrap">
            <button class="btn sm" data-h="sua">Sửa</button>
            ${t.uid === D.nguoiDung().uid ? '<a class="btn sm" href="#/doi-mat-khau">Đổi MK của tôi</a> ' : '<button class="btn sm" data-h="mk">Đặt lại MK</button>'}
            ${t.uid === D.nguoiDung().uid ? '' : '<button class="btn sm ' + (t.trangThai === 'HOAT_DONG' ? 'danger' : '') + '" data-h="khoa">' + (t.trangThai === 'HOAT_DONG' ? 'Khoá' : 'Mở khoá') + '</button>'}
          </td></tr>`;
      }).join('')}</tbody></table></div></div>`;

  $(goc, '#btnTaoPH').onclick = async function () {
    if (!await hoi('Tạo tài khoản phụ huynh?', 'Tạo tài khoản cho ' + (soHS - soPH) + ' học sinh chưa có. Có thể mất vài chục giây. Chạy lại được nếu bị gián đoạn.', 'Tạo')) return;
    const btn = this, khoiPhuc = banNut(btn, 'Đang tạo…');
    const tien = $(goc, '#tienDo');
    tien.style.display = '';
    T.dangLuu = true;
    try {
      const kq = await D.taoTaiKhoanPhuHuynh(function (i, n, ten) {
        tien.querySelector('i').style.width = (i / n * 100) + '%';
        $(goc, '#tienDoChu').textContent = 'Đang tạo ' + (i + 1) + '/' + n + ': ' + ten;
      });
      T.dangLuu = false;
      toast('Đã tạo ' + kq.soTao + ' tài khoản.');
      if (kq.loi.length) {
        $(goc, '#kqTao').innerHTML = msg('warn', 'Chưa tạo được ' + kq.loi.length + ' tài khoản:<br>' + kq.loi.map(esc).join('<br>') +
          '<br>Bấm <strong>Tạo tài khoản phụ huynh</strong> lại để thử tiếp.');
        tien.style.display = 'none'; khoiPhuc();
      } else R.lamMoi();
    } catch (e) { T.dangLuu = false; toast(e.message, 'err'); khoiPhuc(); }
  };
  $(goc, '#btnIn').onclick = function () { inTaiKhoanPH(ds, hsTheoMa, cfg); };
  $(goc, '#btnThemCB').onclick = function () { hopThemCanBo(); };

  qa('[data-h]').forEach(function (b) {
    b.onclick = async function () {
      const uid = b.closest('tr').dataset.uid;
      const t = ds.filter(function (x) { return x.uid === uid; })[0];
      if (b.dataset.h === 'khoa') {
        const khoa = t.trangThai === 'HOAT_DONG';
        if (!await hoi((khoa ? 'Khoá' : 'Mở khoá') + ' tài khoản ' + esc(t.tenDangNhap) + '?', khoa ? 'Người này sẽ không đăng nhập được nữa.' : 'Người này đăng nhập lại được.', khoa ? 'Khoá' : 'Mở khoá', khoa)) return;
        try { await D.datTrangThaiTaiKhoan(uid, !khoa); toast(khoa ? 'Đã khoá.' : 'Đã mở khoá.'); R.lamMoi(); }
        catch (e) { toast(e.message, 'err'); }
      } else if (b.dataset.h === 'sua') {
        hopSuaTK(t, hsTheoMa);
      } else {
        hopCapLaiMK(t, hsTheoMa[t.maHS], cfg);
      }
    };
  });
}

function hopThemCanBo() {
  const h = moHopThoai('Thêm cán bộ lớp', `
    <form id="fCB" class="stack">
      <div><label class="f" for="cTen">Tên đăng nhập <small>(chữ thường không dấu)</small></label><input id="cTen" autocapitalize="none" required></div>
      <div><label class="f" for="cHoTen">Họ tên</label><input id="cHoTen" required></div>
      <div class="row">
        <div class="col"><label class="f" for="cVT">Vai trò</label>
          <select id="cVT"><option value="LOP_TRUONG">Lớp trưởng</option><option value="TO_TRUONG">Tổ trưởng</option><option value="GVCN">GVCN (toàn quyền)</option></select></div>
        <div class="col" id="oTo"><label class="f" for="cTo">Tổ phụ trách</label><input id="cTo" placeholder="Tổ 1"></div>
      </div>
      <div><label class="f" for="cMk">Mật khẩu ban đầu <small>(từ 6 ký tự — người dùng sẽ phải đổi khi đăng nhập lần đầu)</small></label><input id="cMk" required minlength="6"></div>
      <div id="cLoi"></div>
      <div class="modal-act"><button type="button" class="btn" data-huy>Huỷ</button><button class="btn primary" type="submit">Tạo tài khoản</button></div>
    </form>`);
  const g = h.goc;
  g.querySelector('[data-huy]').onclick = h.dong;
  const doiVT = function () { g.querySelector('#oTo').style.display = g.querySelector('#cVT').value === 'TO_TRUONG' ? '' : 'none'; };
  g.querySelector('#cVT').onchange = doiVT; doiVT();
  g.querySelector('#fCB').onsubmit = async function (ev) {
    ev.preventDefault();
    const khoiPhuc = banNut(g.querySelector('button[type=submit]'), 'Đang tạo…');
    try {
      const vt = g.querySelector('#cVT').value;
      await D.taoTaiKhoan({
        tenDangNhap: g.querySelector('#cTen').value, hoTen: g.querySelector('#cHoTen').value.trim(),
        matKhau: g.querySelector('#cMk').value, vaiTro: vt,
        toPhuTrach: vt === 'TO_TRUONG' ? g.querySelector('#cTo').value.trim() : ''
      });
      h.dong(); toast('Đã tạo tài khoản.'); R.lamMoi();
    } catch (e) { g.querySelector('#cLoi').innerHTML = msg('err', esc(e.message)); khoiPhuc(); }
  };
}

function hopSuaTK(t, hsTheoMa) {
  const laTui = t.uid === D.nguoiDung().uid;
  const h = moHopThoai('Sửa tài khoản ' + t.tenDangNhap, `
    <form id="fSua" class="stack">
      <div><label class="f" for="sTen">Họ tên hiển thị</label><input id="sTen" value="${esc(t.hoTen)}" required></div>
      ${t.vaiTro === 'PHU_HUYNH' ? '<p class="hint" style="margin:0">Phụ huynh của: <strong>' + esc(hsTheoMa[t.maHS] ? hsTheoMa[t.maHS].hoTen : t.maHS) + '</strong></p>' : `
      <div class="row">
        <div class="col"><label class="f" for="sVT">Vai trò</label>
          <select id="sVT" ${laTui ? 'disabled title="Không tự đổi vai trò của chính mình"' : ''}>${['GVCN', 'LOP_TRUONG', 'TO_TRUONG'].map(function (v) {
            return '<option value="' + v + '"' + (t.vaiTro === v ? ' selected' : '') + '>' + esc(TEN_VT[v]) + '</option>';
          }).join('')}</select></div>
        <div class="col" id="oTo"><label class="f" for="sTo">Tổ phụ trách</label><input id="sTo" value="${esc(t.toPhuTrach || '')}" placeholder="Tổ 1"></div>
      </div>`}
      <div id="sLoi"></div>
      <div class="modal-act"><button type="button" class="btn" data-huy>Huỷ</button><button class="btn primary" type="submit">Lưu</button></div>
    </form>`);
  const g = h.goc;
  g.querySelector('[data-huy]').onclick = h.dong;
  g.querySelector('#fSua').onsubmit = async function (ev) {
    ev.preventDefault();
    const f = { hoTen: g.querySelector('#sTen').value.trim() };
    if (g.querySelector('#sVT')) { f.vaiTro = g.querySelector('#sVT').value; f.toPhuTrach = g.querySelector('#sTo').value.trim(); }
    try { await D.suaTaiKhoan(t.uid, f); h.dong(); toast('Đã lưu.'); R.lamMoi(); }
    catch (e) { g.querySelector('#sLoi').innerHTML = msg('err', esc(e.message)); }
  };
}

function hopCapLaiMK(t, hs, cfg) {
  const macDinh = t.vaiTro === 'PHU_HUYNH' && hs ? D.matKhauMacDinhPH(hs.hoTen, cfg) : '';
  const h = moHopThoai('Đặt lại mật khẩu — ' + t.tenDangNhap, `
    <form id="fMK" class="stack">
      <p class="modal-text" style="margin:0">Đặt mật khẩu mới cho tài khoản này (GVCN có thể đặt cho bất kỳ ai).</p>
      <div><label class="f" for="mMoi">Mật khẩu mới <small>(từ 6 ký tự)</small></label><input id="mMoi" value="${esc(macDinh)}" minlength="6" required></div>
      <label class="chk"><input type="checkbox" id="mBat" ${t.vaiTro === 'PHU_HUYNH' ? 'checked' : ''}> Bắt người dùng đổi lại mật khẩu khi đăng nhập</label>
      <div id="mLoi"></div>
      <div class="modal-act"><button type="button" class="btn" data-huy>Huỷ</button><button class="btn primary" type="submit">Đặt lại</button></div>
    </form>`);
  const g = h.goc;
  g.querySelector('[data-huy]').onclick = h.dong;
  g.querySelector('#fMK').onsubmit = async function (ev) {
    ev.preventDefault();
    const khoiPhuc = banNut(g.querySelector('button[type=submit]'), 'Đang xử lý…');
    try {
      const mk = g.querySelector('#mMoi').value;
      await D.capLaiMatKhau(t, mk, g.querySelector('#mBat').checked);
      g.querySelector('.modal-body').innerHTML = msg('ok', 'Đã đặt lại. Mật khẩu mới: <strong>' + esc(mk) + '</strong><br>Gửi cho người dùng.') +
        '<div class="modal-act"><button class="btn primary" data-xong>Xong</button></div>';
      g.querySelector('[data-xong]').onclick = function () { h.dong(); R.lamMoi(); };
    } catch (e) { g.querySelector('#mLoi').innerHTML = msg('err', esc(e.message)); khoiPhuc(); }
  };
}

/** Mở cửa sổ in danh sách tài khoản phụ huynh để phát cho lớp. */
function inTaiKhoanPH(ds, hsTheoMa, cfg) {
  const ph = ds.filter(function (t) { return t.vaiTro === 'PHU_HUYNH' && t.maHS; })
    .sort(function (a, b) { return a.maHS < b.maHS ? -1 : 1; });
  if (!ph.length) { toast('Chưa có tài khoản phụ huynh nào.', 'err'); return; }
  const dong = ph.map(function (t, i) {
    const h = hsTheoMa[t.maHS];
    const mk = t.lanDau ? D.matKhauMacDinhPH(h ? h.hoTen : '', cfg) : '(phụ huynh đã đổi)';
    return '<tr><td>' + (i + 1) + '</td><td>' + esc(h ? h.hoTen : t.maHS) + '</td><td>' + esc(t.tenDangNhap) + '</td><td>' + esc(mk) + '</td></tr>';
  }).join('');
  const w = window.open('', '_blank');
  if (!w) { toast('Trình duyệt đã chặn cửa sổ in. Cho phép cửa sổ bật lên rồi thử lại.', 'err'); return; }
  w.document.write('<!doctype html><meta charset="utf-8"><title>Tài khoản phụ huynh ' + esc(cfg.Lop) + '</title>' +
    '<style>body{font:14px system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:6px 10px;text-align:left}' +
    'th{background:#eee}h1{font-size:18px}p{color:#555}</style>' +
    '<h1>Tài khoản phụ huynh — lớp ' + esc(cfg.Lop) + ' (' + esc(cfg.NamHoc) + ')</h1>' +
    '<p>Đăng nhập tại địa chỉ web của lớp. Lần đầu đăng nhập sẽ phải đổi mật khẩu. <strong>Cắt rời từng dòng để phát riêng cho từng phụ huynh, không dán công khai.</strong></p>' +
    '<table><tr><th>TT</th><th>Học sinh</th><th>Tên đăng nhập</th><th>Mật khẩu ban đầu</th></tr>' + dong + '</table>');
  w.document.close();
  setTimeout(function () { w.print(); }, 300);
}

// ---------------------------------------------------------------- Cấu hình

async function cauHinh(goc, luot) {
  const cfg = await D.layCauHinh(true);
  if (luot !== T.luot) return;
  goc.innerHTML = `<form id="fCH" class="card">
      <div class="card-head"><div><h2>Cấu hình lớp</h2>
        <p class="hint">Đổi ngưỡng điểm, cách tính, năm học… Lưu xong, số liệu cả lớp tự cập nhật theo giá trị mới.</p></div>
        <button class="btn primary" type="submit">${icon('tich', 'sm')} Lưu cấu hình</button></div>
      <div class="kv">${MO_TA_CAU_HINH.map(function (m) {
        const v = cfg[m.k];
        if (m.kieu === 'bool') {
          return `<label class="chk" style="padding:10px 0"><input type="checkbox" data-k="${m.k}" data-kieu="bool"${laDung(v) ? ' checked' : ''}> ${esc(m.nhan)}</label>`;
        }
        const gt = m.kieu === 'dsso' ? (v || []).join(', ') : (v == null ? '' : v);
        return `<div><label class="f" for="c_${m.k}">${esc(m.nhan)}</label>
          <input id="c_${m.k}" data-k="${m.k}" data-kieu="${m.kieu}" ${m.kieu === 'so' ? 'type="number" step="any"' : ''} value="${esc(gt)}" ${m.goiY ? 'placeholder="' + esc(m.goiY) + '"' : ''}></div>`;
      }).join('')}</div>
      <div id="chLoi"></div>
    </form>`;
  $(goc, '#fCH').onsubmit = async function (ev) {
    ev.preventDefault();
    const moi = Object.assign({}, cfg);
    try {
      qa('#fCH [data-k]').forEach(function (i) {
        const k = i.dataset.k, kieu = i.dataset.kieu;
        if (kieu === 'bool') moi[k] = i.checked;
        else if (kieu === 'so') {
          if (i.value === '' || isNaN(Number(i.value))) throw new Error('Ô "' + (MO_TA_CAU_HINH.filter(function (m) { return m.k === k; })[0].nhan) + '" cần là số');
          moi[k] = Number(i.value);
        } else if (kieu === 'dsso') {
          const ds = i.value.split(/[,;\s]+/).filter(Boolean).map(Number);
          if (!ds.length || ds.some(function (n) { return !(n >= 1 && n <= 12); })) throw new Error('Danh sách tháng phải là các số từ 1 đến 12');
          moi[k] = ds;
        } else moi[k] = i.value.trim();
      });
      if (!/^\d{4}-\d{4}$/.test(moi.NamHoc)) throw new Error('Năm học phải có dạng 2026-2027');
      const khoiPhuc = banNut($(goc, '#fCH button[type=submit]'), 'Đang lưu…');
      try {
        await D.luuCauHinh(moi);
        toast('Đã lưu cấu hình, đang cập nhật số liệu cả lớp…');
        await D.tinhLaiTatCa();            // đổi ngưỡng / cách tính thì số liệu cũ phải theo ngay
        toast('Đã cập nhật số liệu theo cấu hình mới.');
        R.tieuDe(); R.lamMoi();
      } catch (e) { khoiPhuc(); throw e; }
    } catch (e) { $(goc, '#chLoi').innerHTML = msg('err', esc(e.message)); }
  };
}

// ---------------------------------------------------------------- Danh mục lỗi / điểm cộng

async function danhMuc(goc, luot) {
  const dm = await D.layDanhMuc(true);
  if (luot !== T.luot) return;
  const hang = function (loai, r) {
    const laCong = loai === 'CONG';
    return `<tr data-loai="${loai}" data-ma="${esc(r.ma)}">
      <td class="mute small nowrap">${esc(r.ma)}</td>
      <td><input data-f="ten" value="${esc(r.ten)}" style="min-width:260px"></td>
      <td class="small mute">${esc(r.nhomCha)}</td>
      <td><input data-f="diem" type="number" step="1" min="0" value="${Math.abs(r.diem)}" style="width:80px" ${r.ma === 'KHAC' || r.ma === 'CONG_KHAC' ? 'disabled title="Mục tự nhập"' : ''}></td>
      ${laCong ? '' : `<td><select data-f="nhom" style="min-width:110px">${['NHO', 'HA_BAC', 'CHUA_DAT'].map(function (n) {
        return '<option value="' + n + '"' + (r.nhom === n ? ' selected' : '') + '>' + { NHO: 'Nhỏ', HA_BAC: 'Hạ bậc', CHUA_DAT: 'Chưa đạt' }[n] + '</option>';
      }).join('')}</select></td>`}
      <td><input type="checkbox" data-f="hienThi"${r.hienThi !== false ? ' checked' : ''} title="Hiển thị khi nhập"></td>
      <td class="r"><button class="btn sm" data-luu disabled>Lưu</button></td>
    </tr>`;
  };
  goc.innerHTML = `
    <div class="card">
      <div class="card-head" style="margin-bottom:0"><div><h2>Danh mục lỗi vi phạm</h2>
        <p class="hint">Sửa tên, mức trừ, nhóm. Bỏ tích <em>Hiện</em> để ẩn một lỗi khỏi ô chọn (dữ liệu cũ không mất).</p></div>
        <button class="btn" id="btnThemLoi">${icon('them', 'sm')} Thêm lỗi</button></div>
    </div>
    <div class="card flush"><div class="tbl-wrap"><table>
      <thead><tr><th>Mã</th><th>Tên lỗi</th><th>Nhóm</th><th>Trừ (đ)</th><th>Mức</th><th>Hiện</th><th></th></tr></thead>
      <tbody>${dm.loi.map(function (r) { return hang('LOI', r); }).join('')}</tbody></table></div></div>

    <div class="card">
      <div class="card-head" style="margin-bottom:0"><div><h2>Danh mục điểm cộng</h2></div>
        <button class="btn" id="btnThemCong">${icon('them', 'sm')} Thêm điểm cộng</button></div>
    </div>
    <div class="card flush"><div class="tbl-wrap"><table>
      <thead><tr><th>Mã</th><th>Tên</th><th>Nhóm</th><th>Cộng (đ)</th><th>Hiện</th><th></th></tr></thead>
      <tbody>${dm.cong.map(function (r) { return hang('CONG', r); }).join('')}</tbody></table></div></div>`;

  qa('tbody tr[data-ma]').forEach(function (tr) {
    const nut = tr.querySelector('[data-luu]');
    qa_in(tr, '[data-f]').forEach(function (i) { i.oninput = i.onchange = function () { nut.disabled = false; }; });
    nut.onclick = async function () {
      const laCong = tr.dataset.loai === 'CONG';
      const r = (laCong ? dm.cong : dm.loi).filter(function (x) { return x.ma === tr.dataset.ma; })[0];
      const f = function (k) { return tr.querySelector('[data-f="' + k + '"]'); };
      const ten = f('ten').value.trim();
      if (!ten) { toast('Tên không được để trống.', 'err'); return; }
      const upd = { ma: r.ma, ten: ten, hienThi: f('hienThi').checked };
      if (!f('diem').disabled) {
        const so = Math.abs(Number(f('diem').value) || 0);
        upd.diem = laCong ? so : -so;
      }
      if (f('nhom')) upd.nhom = f('nhom').value;
      const khoiPhuc = banNut(nut, '…');
      try {
        const doiDiem = ['diem', 'nhom'].some(function (k) { return k in upd && upd[k] !== r[k]; });
        await D.luuDanhMuc(tr.dataset.loai, upd); Object.assign(r, upd);
        if (doiDiem) { toast('Đã lưu, đang cập nhật số liệu…'); await D.tinhLaiTatCa(); }
        toast('Đã lưu "' + ten + '".'); nut.innerHTML = 'Lưu';
      }
      catch (e) { toast(e.message, 'err'); khoiPhuc(); }
    };
  });
  $(goc, '#btnThemLoi').onclick = function () { hopThemMuc('LOI', dm); };
  $(goc, '#btnThemCong').onclick = function () { hopThemMuc('CONG', dm); };
}

function qa_in(goc, sel) { return Array.prototype.slice.call(goc.querySelectorAll(sel)); }

function hopThemMuc(loai, dm) {
  const laCong = loai === 'CONG';
  const ds = laCong ? dm.cong : dm.loi;
  const nhomCo = Array.from(new Set(ds.map(function (r) { return r.nhomCha; })));
  const h = moHopThoai(laCong ? 'Thêm điểm cộng' : 'Thêm lỗi vi phạm', `
    <form id="fMuc" class="stack">
      <div class="row">
        <div class="col" style="flex:0 0 120px"><label class="f" for="uMa">Mã</label><input id="uMa" placeholder="${laCong ? 'DT11' : 'VP04'}" required></div>
        <div class="col"><label class="f" for="uTen">Tên</label><input id="uTen" required></div>
      </div>
      <div class="row">
        <div class="col"><label class="f" for="uNhomCha">Nhóm</label><input id="uNhomCha" list="dsNhom" placeholder="Vi phạm khác" required>
          <datalist id="dsNhom">${nhomCo.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('')}</datalist></div>
        <div class="col" style="flex:0 0 120px"><label class="f" for="uDiem">${laCong ? 'Cộng (đ)' : 'Trừ (đ)'}</label><input id="uDiem" type="number" min="1" step="1" required></div>
      </div>
      ${laCong ? '' : `<div class="row"><div class="col"><label class="f" for="uNhom">Mức</label>
        <select id="uNhom"><option value="NHO">Nhỏ</option><option value="HA_BAC">Hạ 1 bậc</option><option value="CHUA_DAT">Chưa đạt</option></select></div></div>
        <label class="chk"><input type="checkbox" id="uGhiSo"> Tính là 1 lần ghi sổ đầu bài</label>
        <label class="chk"><input type="checkbox" id="uDoi" checked> Tái phạm trong tuần thì trừ gấp đôi</label>`}
      <label class="chk"><input type="checkbox" id="uMon"> Bắt buộc ghi rõ môn học</label>
      <div id="uLoi"></div>
      <div class="modal-act"><button type="button" class="btn" data-huy>Huỷ</button><button class="btn primary" type="submit">Thêm</button></div>
    </form>`);
  const g = h.goc;
  g.querySelector('[data-huy]').onclick = h.dong;
  g.querySelector('#fMuc').onsubmit = async function (ev) {
    ev.preventDefault();
    const ma = g.querySelector('#uMa').value.trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,12}$/.test(ma)) { g.querySelector('#uLoi').innerHTML = msg('err', 'Mã chỉ gồm chữ HOA, số, gạch dưới (2–12 ký tự)'); return; }
    if (ds.some(function (r) { return r.ma === ma; })) { g.querySelector('#uLoi').innerHTML = msg('err', 'Mã "' + esc(ma) + '" đã có'); return; }
    const so = Math.abs(Number(g.querySelector('#uDiem').value));
    const muc = laCong
      ? { ma: ma, ten: g.querySelector('#uTen').value.trim(), nhomCha: g.querySelector('#uNhomCha').value.trim(), diem: so,
          canMon: g.querySelector('#uMon').checked, tranTuan: 0, hienThi: true, ghiChu: '', thuTu: ds.length + 1000 }
      : { ma: ma, ten: g.querySelector('#uTen').value.trim(), nhomCha: g.querySelector('#uNhomCha').value.trim(), nhom: g.querySelector('#uNhom').value,
          diem: -so, nhanDoiTuLan2: g.querySelector('#uDoi').checked, nguongHocKy: 0, ghiSoDauBai: g.querySelector('#uGhiSo').checked,
          canMon: g.querySelector('#uMon').checked, hienThi: true, ghiChu: '', thuTu: ds.length + 1000 };
    const khoiPhuc = banNut(g.querySelector('button[type=submit]'), 'Đang lưu…');
    try { await D.luuDanhMuc(loai, muc); h.dong(); toast('Đã thêm.'); R.lamMoi(); }
    catch (e) { g.querySelector('#uLoi').innerHTML = msg('err', esc(e.message)); khoiPhuc(); }
  };
}

// ---------------------------------------------------------------- Nhật ký hệ thống

async function nhatKy(goc, luot) {
  const ds = await D.xemNhatKyHeThong(150);
  if (luot !== T.luot) return;
  const gio = function (d) { return d ? d.toLocaleString('vi-VN', { hour12: false }) : '—'; };
  goc.innerHTML = `<div class="card flush">
    <div class="card-head"><div><h2>Nhật ký hệ thống</h2><p class="hint">150 thao tác gần nhất: ai làm gì, khi nào.</p></div></div>
    ${ds.length ? `<div class="tbl-wrap" style="margin-top:12px"><table>
      <thead><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Chi tiết</th></tr></thead>
      <tbody>${ds.map(function (r) {
        return '<tr><td class="nowrap small">' + esc(gio(r.thoiGian)) + '</td><td>' + esc(r.nguoiDung) + '</td><td><code>' + esc(r.hanhDong) +
          '</code></td><td class="small mute">' + esc(r.chiTiet) + '</td></tr>';
      }).join('')}</tbody></table></div>` : '<div class="empty">Chưa có thao tác nào.</div>'}</div>`;
}
