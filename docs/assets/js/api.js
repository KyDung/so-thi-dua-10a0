/**
 * api.js — Lớp gọi Apps Script.
 *
 * GET dùng JSONP vì Apps Script không trả header CORS cho request thường.
 * POST dùng Content-Type: text/plain để trình duyệt không gửi preflight OPTIONS
 * (Apps Script không xử lý được OPTIONS).
 */

const API = (function () {
  let demJsonp = 0;

  function jsonp(params) {
    return new Promise(function (resolve, reject) {
      if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE') >= 0) {
        reject(new Error('Chưa cấu hình API_URL trong docs/assets/js/config.js'));
        return;
      }
      const cb = '__jsonp_' + (++demJsonp) + '_' + Date.now();
      const s = document.createElement('script');
      const t = setTimeout(function () {
        dọn();
        reject(new Error('Máy chủ không phản hồi (quá 20 giây)'));
      }, 20000);

      function dọn() {
        clearTimeout(t);
        delete window[cb];
        if (s.parentNode) s.parentNode.removeChild(s);
      }

      window[cb] = function (kq) {
        dọn();
        if (kq && kq.ok) resolve(kq.data);
        else reject(new Error((kq && kq.error) || 'Lỗi không xác định'));
      };

      const q = Object.keys(params)
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
      s.src = CONFIG.API_URL + '?callback=' + cb + '&' + q;
      s.onerror = function () { dọn(); reject(new Error('Không kết nối được máy chủ')); };
      document.head.appendChild(s);
    });
  }

  async function post(body) {
    if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE') >= 0) {
      throw new Error('Chưa cấu hình API_URL trong docs/assets/js/config.js');
    }
    const token = Store.get('token');
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ token: token }, body))
    });
    const kq = await res.json();
    if (!kq.ok) throw new Error(kq.error || 'Lỗi không xác định');
    return kq.data;
  }

  return {
    // ---- Ai cũng xem được (GET/JSONP, không cần đăng nhập) ----
    thongTinLop: function () { return jsonp({ action: 'thongTinLop' }); },
    danhMuc: function () { return jsonp({ action: 'danhMuc' }); },
    lichTuan: function () { return jsonp({ action: 'lichTuan' }); },
    dsHocSinh: function () { return jsonp({ action: 'dsHocSinh' }); },
    bangLop: function (thang) { return jsonp({ action: 'bangLop', thang: thang }); },
    chiTietHS: function (maHS) { return jsonp({ action: 'chiTietHS', maHS: maHS }); },
    bangXepHangTo: function (maTuan) { return jsonp({ action: 'bangXepHangTo', maTuan: maTuan || '' }); },

    // ---- Cần đăng nhập: nhập liệu (POST) ----
    dangNhap: function (u, p) { return post({ action: 'dangNhap', tenDangNhap: u, matKhau: p }); },
    dsHocSinhCuaToi: function () { return post({ action: 'dsHocSinh' }); },
    nhatKyTuan: function (maTuan) { return post({ action: 'nhatKyTuan', maTuan: maTuan }); },
    ghiNhatKy: function (items) { return post({ action: 'ghiNhatKy', items: items }); },
    xoaNhatKy: function (id) { return post({ action: 'xoaNhatKy', id: id }); },
    luuXepLoai: function (items) { return post({ action: 'luuXepLoai', items: items }); },

    // ---- Chỉ GVCN ----
    tinhLai: function () { return post({ action: 'tinhLai' }); },
    chotThang: function (thang) { return post({ action: 'chotThang', thang: thang }); },
    duyetCaNam: function (maHS, xl, gc) { return post({ action: 'duyetCaNam', maHS: maHS, xepLoai: xl, ghiChu: gc }); },
    xuatExcel: function () { return post({ action: 'xuatExcel' }); }
  };
})();

/** Bộ nhớ phiên. Dùng sessionStorage để đóng tab là mất, an toàn hơn cho máy chung. */
const Store = {
  get: function (k) {
    try { return sessionStorage.getItem('td_' + k); } catch (e) { return null; }
  },
  set: function (k, v) {
    try { sessionStorage.setItem('td_' + k, v); } catch (e) { }
  },
  del: function (k) {
    try { sessionStorage.removeItem('td_' + k); } catch (e) { }
  },
  xoaHet: function () {
    ['token', 'hoTen', 'vaiTro', 'toPhuTrach'].forEach(Store.del);
  }
};
