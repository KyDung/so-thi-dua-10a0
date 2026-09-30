/**
 * api.js — Lớp gọi Apps Script.
 *
 * GET: dùng fetch bình thường. Apps Script có gửi `Access-Control-Allow-Origin: *`
 *      trên cả redirect lẫn phản hồi cuối nên không vướng CORS.
 *      Nếu fetch bị chặn (tiện ích chặn quảng cáo, mạng lọc...) thì quay về JSONP.
 * POST: Content-Type text/plain để trình duyệt không gửi preflight OPTIONS
 *       (Apps Script không xử lý được OPTIONS).
 */

const API = (function () {
  let demJsonp = 0;

  /** Lỗi do máy chủ trả về (sai mã, không đủ quyền...) — không thử lại bằng cách khác. */
  function loiNghiepVu(msg) {
    const e = new Error(msg);
    e.tuMayChu = true;
    return e;
  }

  function kiemTraCauHinh() {
    if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE') >= 0) {
      throw new Error('Chưa cấu hình API_URL trong docs/assets/js/config.js');
    }
  }

  function chuoiTruyVan(params) {
    return Object.keys(params)
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
  }

  /** Gọi GET. Thử fetch trước, hỏng thì quay về JSONP. */
  async function get(params) {
    kiemTraCauHinh();
    try {
      const res = await fetch(CONFIG.API_URL + '?' + chuoiTruyVan(params), {
        method: 'GET', redirect: 'follow'
      });
      if (!res.ok) throw new Error('Máy chủ trả về HTTP ' + res.status);
      const kq = await res.json();
      if (!kq.ok) throw loiNghiepVu(kq.error || 'Lỗi không xác định');
      return kq.data;
    } catch (e) {
      if (e.tuMayChu) throw e;
      return jsonp(params);   // fetch bị chặn -> thử cách cũ
    }
  }

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

      s.src = CONFIG.API_URL + '?callback=' + cb + '&' + chuoiTruyVan(params);
      s.onerror = function () {
        dọn();
        reject(new Error('Không gọi được Apps Script. Thường do tiện ích chặn quảng cáo ' +
          'hoặc mạng của trường chặn script.google.com — thử tắt tiện ích, hoặc mở bằng 4G.'));
      };
      document.head.appendChild(s);
    });
  }

  async function post(body) {
    kiemTraCauHinh();
    const token = Store.get('token');
    let res;
    try {
      res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ token: token }, body)),
        redirect: 'follow'
      });
    } catch (e) {
      throw new Error('Không gửi được dữ liệu lên máy chủ. Kiểm tra mạng, ' +
        'hoặc tiện ích chặn quảng cáo đang chặn script.google.com.');
    }
    if (!res.ok) throw new Error('Máy chủ trả về HTTP ' + res.status);
    const kq = await res.json();
    if (!kq.ok) throw new Error(kq.error || 'Lỗi không xác định');
    return kq.data;
  }

  return {
    // ---- Không cần đăng nhập: chỉ tên lớp cho trang đăng nhập ----
    thongTinLop: function () { return get({ action: 'thongTinLop' }); },

    // ---- Xem dữ liệu: gửi kèm token nên dùng POST ----
    danhMuc: function () { return post({ action: 'danhMuc' }); },
    lichTuan: function () { return post({ action: 'lichTuan' }); },
    dsHocSinh: function () { return post({ action: 'dsHocSinh' }); },
    bangLop: function (thang) { return post({ action: 'bangLop', thang: thang }); },
    chiTietHS: function (maHS) { return post({ action: 'chiTietHS', maHS: maHS }); },

    // ---- Cần đăng nhập: nhập liệu (POST) ----
    dangNhap: function (u, p) { return post({ action: 'dangNhap', tenDangNhap: u, matKhau: p }); },
    doiMatKhau: function (cu, moi) { return post({ action: 'doiMatKhau', mkCu: cu, mkMoi: moi }); },
    danhMucDayDu: function () { return post({ action: 'danhMucDayDu' }); },
    nhatKyHS: function (maHS, maTuan) { return post({ action: 'nhatKyHS', maHS: maHS, maTuan: maTuan }); },
    themNhatKy: function (muc) { return post({ action: 'themNhatKy', muc: muc }); },
    dsHocSinhCuaToi: function () { return post({ action: 'dsHocSinh' }); },
    taoTuan: function (tuan) { return post({ action: 'taoTuan', tuan: tuan }); },
    suaTuan: function (maTuan, tuan) { return post({ action: 'suaTuan', maTuan: maTuan, tuan: tuan }); },
    xoaTuan: function (maTuan) { return post({ action: 'xoaTuan', maTuan: maTuan }); },
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
    ['token', 'hoTen', 'vaiTro', 'toPhuTrach', 'maHS'].forEach(Store.del);
  }
};
