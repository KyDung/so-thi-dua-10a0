/**
 * ui.js — Tiện ích giao diện dùng chung: thoát ký tự, biểu tượng, thông báo, hộp thoại.
 */
import { NHAN, THANG_HOC } from './logic.js';

export const el = document.getElementById('noiDung');

/** Trạng thái chung giữa các màn hình. */
export const T = { chuaLuu: false, dangLuu: false, luot: 0 };

/** Cầu nối tới bộ định tuyến (app.js gán vào), để các màn hình gọi tải lại mà không import vòng. */
export const R = { lamMoi: function () { }, vaiTro: function () { return null; }, tieuDe: function () { } };

export const esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
export const q = function (sel) { return el.querySelector(sel); };
export const qa = function (sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); };

export const icon = function (ten, cls) {
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + ten + '"/></svg>';
};

export const loading = function (t) {
  el.innerHTML = '<div class="loading-card"><div class="spin"></div><span>' + esc(t || 'Đang tải') + '</span></div>';
};

export const loiHien = function (e) {
  el.innerHTML = '<div class="msg err">' + icon('canhbao') + '<div>' + esc(e && e.message || e) + '</div></div>';
};

/** Đoạn thông báo nhỏ gắn trong trang (không biến mất). */
export const msg = function (loai, noiDung) {
  const ic = { ok: 'tich', err: 'canhbao', warn: 'canhbao', info: 'thongtin' }[loai] || 'thongtin';
  return '<div class="msg ' + loai + '">' + icon(ic) + '<div>' + noiDung + '</div></div>';
};

export const diemHTML = function (d) {
  d = Number(d) || 0;
  return '<span class="diem ' + (d > 0 ? 'duong' : (d < 0 ? 'am' : '')) + '">' + (d > 0 ? '+' : '') + d + '</span>';
};

export const badge = function (xl, nhan) {
  return xl ? '<span class="badge ' + esc(xl) + '">' + esc(nhan || NHAN[xl] || xl) + '</span>' : '';
};

export const chuaXep = '<span class="mute small">chưa xếp</span>';

/** Chữ cái đầu của tên người Việt (tên gọi nằm cuối). */
export const chuDau = function (ten) {
  const p = String(ten || '').replace(/^PH\s+/i, '').split(/\s+/).filter(function (x) { return /[a-zA-ZÀ-ỹ]/.test(x); });
  const chu = (p[p.length - 1] || '?').match(/[a-zA-ZÀ-ỹ]/);
  return (chu ? chu[0] : '?').toUpperCase();
};

/** Màu nền avatar ổn định theo tên. */
export const mauAvatar = function (ten) {
  let h = 0;
  String(ten || '').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 360; });
  return 'hsl(' + h + ' 55% 46%)';
};

export const avatar = function (ten, co) {
  return '<span class="avatar' + (co ? ' ' + co : '') + '" style="background:' + mauAvatar(ten) + '">' + esc(chuDau(ten)) + '</span>';
};

/** Đọc tham số sau dấu ? trong hash, ví dụ #/chi-tiet?ma=10A0_01 */
export const thamSo = function (ten) {
  const i = location.hash.indexOf('?');
  if (i < 0) return '';
  return new URLSearchParams(location.hash.slice(i + 1)).get(ten) || '';
};

/** Dải chọn tháng dạng nút bấm (dễ chạm trên điện thoại hơn ô thả xuống). */
export const chonThang = function (dangChon, id) {
  return '<div class="chips" id="' + (id || 'iThang') + '" role="tablist">' +
    THANG_HOC.map(function (t) {
      return '<button type="button" class="chip' + (Number(t) === Number(dangChon) ? ' on' : '') +
        '" data-thang="' + t + '" role="tab">T' + t + '</button>';
    }).join('') + '</div>';
};

export const ganChonThang = function (id, khiDoi) {
  const box = q('#' + (id || 'iThang'));
  if (!box) return;
  box.addEventListener('click', function (e) {
    const b = e.target.closest('[data-thang]');
    if (b) khiDoi(Number(b.dataset.thang));
  });
  const on = box.querySelector('.on');
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
};

// ---------------------------------------------------------------- Thông báo nổi

export function toast(noiDung, loai) {
  const khung = document.getElementById('thongBao');
  const d = document.createElement('div');
  d.className = 'toast ' + (loai || 'ok');
  d.innerHTML = icon(loai === 'err' ? 'canhbao' : 'tich') + '<span>' + esc(noiDung) + '</span>';
  khung.appendChild(d);
  setTimeout(function () { d.classList.add('di'); }, loai === 'err' ? 5200 : 2800);
  setTimeout(function () { d.remove(); }, loai === 'err' ? 5600 : 3200);
}

// ---------------------------------------------------------------- Hộp thoại

/**
 * Mở hộp thoại. `noiDung` là HTML. Trả về { dong, goc } — `goc` để gắn sự kiện.
 */
export function moHopThoai(tieuDe, noiDung, tuyChon) {
  tuyChon = tuyChon || {};
  const lop = document.getElementById('lopPhu');
  const box = document.createElement('div');
  box.className = 'modal-bg';
  box.innerHTML = '<div class="modal' + (tuyChon.rong ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(tieuDe) + '">' +
    '<div class="modal-head"><h3>' + esc(tieuDe) + '</h3>' +
    '<button type="button" class="icon-btn" data-dong aria-label="Đóng">' + icon('dong') + '</button></div>' +
    '<div class="modal-body">' + noiDung + '</div></div>';
  lop.appendChild(box);
  document.body.classList.add('khoa-cuon');
  const dong = function () {
    box.remove();
    if (!lop.children.length) document.body.classList.remove('khoa-cuon');
    document.removeEventListener('keydown', phim);
    if (tuyChon.khiDong) tuyChon.khiDong();
  };
  const phim = function (e) { if (e.key === 'Escape') dong(); };
  document.addEventListener('keydown', phim);
  box.addEventListener('mousedown', function (e) { if (e.target === box) dong(); });
  box.querySelector('[data-dong]').onclick = dong;
  const dau = box.querySelector('input,select,textarea');
  if (dau) setTimeout(function () { dau.focus(); }, 30);
  return { dong: dong, goc: box };
}

/** Đóng mọi hộp thoại đang mở (gọi khi chuyển màn hình). */
export function dongHetHopThoai() {
  const lop = document.getElementById('lopPhu');
  lop.querySelectorAll('[data-dong]').forEach(function (b) { b.click(); });
  lop.innerHTML = '';
  document.body.classList.remove('khoa-cuon');
}

/** Hộp xác nhận, trả về Promise<boolean>. */
export function hoi(tieuDe, noiDung, nhanOK, nguyHiem) {
  return new Promise(function (xong) {
    let traLoi = false;
    const h = moHopThoai(tieuDe,
      '<p class="modal-text">' + noiDung + '</p>' +
      '<div class="modal-act"><button type="button" class="btn" data-huy>Huỷ</button>' +
      '<button type="button" class="btn ' + (nguyHiem ? 'danger' : 'primary') + '" data-ok>' + esc(nhanOK || 'Đồng ý') + '</button></div>',
      { khiDong: function () { xong(traLoi); } });
    h.goc.querySelector('[data-huy]').onclick = h.dong;
    h.goc.querySelector('[data-ok]').onclick = function () { traLoi = true; h.dong(); };
  });
}

/** Đặt nút vào trạng thái đang xử lý. Trả về hàm khôi phục. */
export function banNut(btn, chu) {
  const cu = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spin sm"></span> ' + esc(chu || 'Đang xử lý…');
  return function () { btn.disabled = false; btn.innerHTML = cu; };
}
