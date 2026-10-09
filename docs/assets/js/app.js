/**
 * app.js — Khung trang, định tuyến bằng hash, đăng nhập, khởi tạo lần đầu, đổi mật khẩu.
 * Các màn hình chính nằm ở v-*.js. Không cần build, không cần framework.
 *
 * Xem và nhập đều phải đăng nhập. Phụ huynh chỉ xem được con mình (firestore.rules giữ chặt).
 */
import { CHUA_CAU_HINH, MAC_DINH } from './config.js';
import {
  el, q, esc, icon, loiHien, msg, avatar, toast, banNut, dongHetHopThoai, T, R
} from './ui.js';
import * as D from './data.js';
import { mhBangLop, mhThiDua } from './v-lop.js';
import { mhChiTiet } from './v-chi-tiet.js';
import { mhTongQuan } from './v-tong-quan.js';
import { mhDanhGia } from './v-danh-gia.js';
import { mhDiemTot } from './v-diem-tot.js';
import { mhChamDiem } from './v-so.js';
import { mhQuanTri } from './v-quan-tri.js';

let hashDangXem = location.hash;
let daKhoiTao = true;

window.addEventListener('beforeunload', function (e) {
  if (T.chuaLuu || T.dangLuu) { e.preventDefault(); e.returnValue = ''; }
});

function coTheRoiTrang() {
  if (T.dangLuu) { alert('Đang lưu dữ liệu, vui lòng chờ một chút.'); return false; }
  return !T.chuaLuu || confirm('Bạn còn nội dung chưa lưu. Rời trang và bỏ các thay đổi này?');
}

// ---------------------------------------------------------------- Khởi động

async function khoiDong() {
  R.lamMoi = dinhTuyen;
  R.vaiTro = D.vaiTro;
  R.tieuDe = function () {
    return D.lopTomTat().then(function (l) { datTieuDe(l.truong, l.lop, l.namHoc); });
  };
  window.addEventListener('hashchange', dinhTuyen);

  if (CHUA_CAU_HINH) {
    datTieuDe(MAC_DINH.TEN_TRUONG, MAC_DINH.TEN_LOP, MAC_DINH.NAM_HOC);
    capNhatKhung();
    manHuongDanCauHinh();
    return;
  }

  try {
    daKhoiTao = await D.daKhoiTao();
    if (daKhoiTao) {
      const l = await D.lopTomTat();
      datTieuDe(l.truong, l.lop, l.namHoc);
    } else {
      datTieuDe(MAC_DINH.TEN_TRUONG, MAC_DINH.TEN_LOP, MAC_DINH.NAM_HOC);
    }
  } catch (e) {
    datTieuDe(MAC_DINH.TEN_TRUONG, MAC_DINH.TEN_LOP, MAC_DINH.NAM_HOC);
    baoLoiKetNoi(e);
  }

  D.theoDoiDangNhap(function (h, e) {
    if (e) baoLoiKetNoi(e);
    capNhatKhung();
    // Đang ở form đăng nhập / cài đặt mà vẫn chưa có hồ sơ (vừa bị từ chối, tài khoản bị khoá…):
    // không vẽ lại, kẻo mất dòng báo lỗi vừa hiện.
    if (!h && (document.getElementById('fDN') || document.getElementById('fKT'))) return;
    dinhTuyen();
  });
}

function datTieuDe(truong, lop, namHoc) {
  document.getElementById('tieuDe').textContent = 'Sổ thi đua · ' + lop;
  document.getElementById('phuDe').textContent = truong + ' · Năm học ' + namHoc;
  document.title = 'Sổ thi đua ' + lop;
}

/** Hiện dải báo lỗi ở đầu trang khi không gọi được Firebase. */
function baoLoiKetNoi(e) {
  const box = document.getElementById('bangLoi');
  box.innerHTML = icon('canhbao') + '<div><strong>Không tải được dữ liệu.</strong> ' + esc(e && e.message || e) +
    '<br>Kiểm tra kết nối mạng, và Firebase đã bật Firestore + Authentication (Email/Mật khẩu) chưa.</div>';
  box.style.display = '';
}

// ---------------------------------------------------------------- Bỏ qua đổi mật khẩu lần đầu

const khoaBoQua = function () { const h = D.nguoiDung(); return 'td_boqua_mk_' + (h ? h.uid : ''); };
/** Người dùng mới được phép bấm "Để sau" ở màn đặt mật khẩu; trong phiên đó web không ép nữa. */
function daBoQuaDoiMK() {
  try { return sessionStorage.getItem(khoaBoQua()) === '1'; } catch (e) { return false; }
}
function datBoQuaDoiMK() {
  try { sessionStorage.setItem(khoaBoQua(), '1'); } catch (e) { /* bỏ qua */ }
}
/** Còn bị ép đổi mật khẩu không (chưa đổi và chưa bấm "Để sau"). */
const phaiDoiMK = function (hoSo) { return !!hoSo.lanDau && !daBoQuaDoiMK(); };

// ---------------------------------------------------------------- Định tuyến

const MAN_HINH = {
  'bang-lop': mhBangLop,
  'chi-tiet': mhChiTiet,
  'thi-dua': mhThiDua,
  'tong-quan': mhTongQuan,
  'danh-gia': mhDanhGia,
  'diem-tot': mhDiemTot,
  'cham-diem': mhChamDiem,
  'quan-tri': mhQuanTri,
  'doi-mat-khau': mhDoiMatKhau,
  'dang-nhap': mhDangNhap,
  'khoi-tao': mhKhoiTao
};

function dinhTuyen() {
  if (CHUA_CAU_HINH) { manHuongDanCauHinh(); return; }
  if (!coTheRoiTrang()) {
    history.replaceState(null, '', location.pathname + location.search + hashDangXem);
    return;
  }
  T.chuaLuu = false;
  dongHetHopThoai();
  hashDangXem = location.hash;
  const luot = ++T.luot;
  const hoSo = D.nguoiDung();
  let ten = location.hash.replace(/^#\/?/, '').split('?')[0] || manHinhMacDinh();

  document.body.classList.toggle('chua-dn', !hoSo);
  capNhatKhung();

  if (!hoSo) {
    // Chưa khởi tạo thì chỉ có một việc để làm: cài đặt lần đầu
    ten = daKhoiTao ? 'dang-nhap' : 'khoi-tao';
  } else {
    if (phaiDoiMK(hoSo) && ten !== 'doi-mat-khau') { location.replace('#/doi-mat-khau'); return; }
    // Vai trò nào không được vào màn nào thì đưa về trang chủ của vai trò đó
    if (!duocVao(ten)) { location.replace(trangChuTheoVaiTro()); return; }
  }

  document.querySelectorAll('nav.tabs a').forEach(function (a) {
    a.classList.toggle('on', a.getAttribute('href').split('?')[0] === '#/' + ten);
  });
  danhDauNutThem();
  const mh = MAN_HINH[ten] || mhBangLop;
  window.scrollTo(0, 0);
  Promise.resolve().then(mh).catch(function (e) { if (luot === T.luot) loiHien(e); });
}

function manHinhMacDinh() {
  const vt = D.vaiTro();
  if (!vt) return daKhoiTao ? 'dang-nhap' : 'khoi-tao';
  return trangChuTheoVaiTro().replace(/^#\//, '').split('?')[0];
}

function duocVao(ten) {
  const vt = D.vaiTro();
  if (ten === 'dang-nhap' || ten === 'khoi-tao') return false;      // đã đăng nhập rồi
  if (ten === 'doi-mat-khau') return true;
  if (vt === 'PHU_HUYNH') return ten === 'chi-tiet' || ten === 'diem-tot';
  if (ten === 'quan-tri') return vt === 'GVCN';
  return !!MAN_HINH[ten];
}

function trangChuTheoVaiTro() {
  const vt = D.vaiTro();
  if (vt === 'PHU_HUYNH') return '#/chi-tiet';
  return vt === 'GVCN' ? '#/bang-lop' : '#/cham-diem';
}

// ---------------------------------------------------------------- Khung: điều hướng + người dùng

/** Nút "Thêm" sáng lên khi trang đang xem thuộc nhóm mục được cất trong đó. */
function danhDauNutThem() {
  const b = document.getElementById('btnThemMuc');
  if (b) b.classList.toggle('on', !!document.querySelector('#dieuHuong a.phu.on'));
}

/** Bảng trượt từ dưới lên liệt kê tất cả các mục (điện thoại). */
function moBangMuc(muc, hienTai) {
  const lop = document.getElementById('lopPhu');
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = '<div class="sheet" role="dialog" aria-label="Tất cả các mục"><div class="sheet-vach"></div>' +
    '<h3>Tất cả các mục</h3><div class="sheet-luoi">' + muc.map(function (m) {
      return '<a href="' + m[0] + '"' + (m[0] === hienTai ? ' class="on"' : '') + '>' + icon(m[1]) + '<span>' + m[2] + '</span></a>';
    }).join('') + '</div></div>';
  lop.appendChild(bg);
  document.body.classList.add('khoa-cuon');
  const dong = function () { bg.remove(); if (!lop.children.length) document.body.classList.remove('khoa-cuon'); };
  bg.addEventListener('click', function (e) { if (e.target === bg || e.target.closest('a')) dong(); });
}

function capNhatKhung() {
  const hoSo = D.nguoiDung();
  const nav = document.getElementById('dieuHuong');
  const khung = document.getElementById('khungNguoi');

  if (!hoSo) {
    nav.innerHTML = '';
    khung.innerHTML = '';
    return;
  }
  const vt = hoSo.vaiTro;
  const muc = [];
  if (vt !== 'PHU_HUYNH') muc.push(['#/bang-lop', 'bang', 'Bảng lớp']);
  muc.push(['#/chi-tiet', 'nguoi', vt === 'PHU_HUYNH' ? 'Kết quả của con' : 'Chi tiết']);
  if (vt === 'PHU_HUYNH') muc.push(['#/diem-tot', 'sao', 'Điểm tốt của con']);
  if (vt !== 'PHU_HUYNH') muc.push(['#/thi-dua', 'cup', 'Xếp hạng'], ['#/tong-quan', 'nhom', 'Tổng quan'], ['#/diem-tot', 'sao', 'Điểm tốt'], ['#/danh-gia', 'tich', 'Đánh giá'], ['#/cham-diem', 'so', 'Sổ thi đua']);
  if (vt === 'GVCN') muc.push(['#/quan-tri', 'cai', 'Quản trị']);
  // Điện thoại: chỉ chừa chỗ cho 4 mục hay dùng + nút "Thêm" mở bảng liệt kê TẤT CẢ các mục
  // (để không ai tưởng menu chỉ có vài mục). Máy tính vẫn hiện đủ trên thanh trên cùng.
  const CHINH = ['#/bang-lop', '#/cham-diem', '#/tong-quan', '#/danh-gia'];
  const coPhu = muc.length > 5;
  nav.innerHTML = phaiDoiMK(hoSo) ? '' : muc.map(function (m) {
    return '<a href="' + m[0] + '"' + (coPhu && CHINH.indexOf(m[0]) < 0 ? ' class="phu"' : '') + '>' + icon(m[1]) + '<span>' + m[2] + '</span></a>';
  }).join('') + (coPhu && !phaiDoiMK(hoSo) ? '<button type="button" class="nut-them" id="btnThemMuc" aria-label="Xem tất cả các mục">' +
    icon('luoi') + '<span>Thêm</span></button>' : '');
  const hienTai = location.hash.split('?')[0] || '';
  nav.querySelectorAll('a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === hienTai); });
  danhDauNutThem();
  const btnThem = document.getElementById('btnThemMuc');
  if (btnThem) btnThem.onclick = function () { moBangMuc(muc, hienTai || location.hash.split('?')[0]); };

  khung.innerHTML = '<div class="nguoi">' +
    '<button class="nguoi-btn" id="btnNguoi" aria-haspopup="true">' + avatar(hoSo.hoTen) +
    '<span class="ten">' + esc(hoSo.hoTen) + '</span></button></div>';
  document.getElementById('btnNguoi').onclick = function (e) {
    e.stopPropagation();
    const cu = document.getElementById('menuNguoi');
    if (cu) { cu.remove(); return; }
    const m = document.createElement('div');
    m.className = 'menu'; m.id = 'menuNguoi';
    m.innerHTML = '<div class="menu-head"><strong>' + esc(hoSo.hoTen) + '</strong><span>' +
      esc(D.VAI_TRO[vt] || vt) + ' · ' + esc(hoSo.tenDangNhap) + '</span></div>' +
      '<a href="#/doi-mat-khau">' + icon('chia') + 'Đổi mật khẩu' + (hoSo.lanDau ? ' <span class="badge DAT">nên đổi</span>' : '') + '</a>' +
      '<button class="nguy" id="btnThoat">' + icon('ra') + 'Đăng xuất</button>';
    khung.querySelector('.nguoi').appendChild(m);
    m.querySelector('a') && (m.querySelector('a').onclick = function () { m.remove(); });
    document.getElementById('btnThoat').onclick = async function () {
      m.remove();
      if (!coTheRoiTrang()) return;
      T.chuaLuu = false;
      try { sessionStorage.removeItem(khoaBoQua()); } catch (e) { /* bỏ qua */ }
      await D.dangXuat();
      location.hash = '#/dang-nhap';
    };
  };
}
document.addEventListener('click', function () {
  const m = document.getElementById('menuNguoi');
  if (m) m.remove();
});

// ---------------------------------------------------------------- Hướng dẫn cấu hình (chưa dán firebaseConfig)

function manHuongDanCauHinh() {
  el.innerHTML = `
    <div class="card" style="max-width:720px;margin:20px auto">
      <h2>Chưa kết nối Firebase</h2>
      <p class="hint">Web đã chạy, chỉ còn thiếu bước nối với dự án Firebase của bạn (khoảng 5 phút, miễn phí).</p>
      <ol style="line-height:1.9;padding-left:20px;color:var(--ink-2)">
        <li>Vào <a href="https://console.firebase.google.com" target="_blank" rel="noopener">console.firebase.google.com</a> → <strong>Tạo dự án</strong>.</li>
        <li><strong>Build → Authentication</strong> → Bắt đầu → bật <strong>Email/Mật khẩu</strong>.</li>
        <li><strong>Build → Firestore Database</strong> → Tạo cơ sở dữ liệu (chọn vùng <code>asia-southeast1</code>, chế độ production).</li>
        <li><strong>Firestore → Rules</strong>: dán nội dung file <code>firestore.rules</code> trong repo rồi <strong>Publish</strong>.</li>
        <li><strong>Cài đặt dự án → Chung → Ứng dụng của bạn → Web (&lt;/&gt;)</strong>: copy <code>firebaseConfig</code> dán vào
          <code>docs/assets/js/config.js</code>.</li>
        <li>Tải lại trang này → làm theo màn hình <strong>Khởi tạo lần đầu</strong> để tạo tài khoản giáo viên chủ nhiệm.</li>
      </ol>
      <p class="hint">Hướng dẫn chi tiết có trong <code>README.md</code>.</p>
    </div>`;
}

// ---------------------------------------------------------------- Đăng nhập

function manHinhHero(tieuDe, dong) {
  return `<div class="dn-hero">
      <div>
        <div class="big">🏅</div>
        <h1>${esc(tieuDe)}</h1>
        <p>${dong}</p>
      </div>
      <ul>
        <li>${icon('so')}Cán bộ lớp ghi sổ thi đua theo tuần</li>
        <li>${icon('sao')}Điểm cộng, điểm trừ và xếp loại rõ ràng</li>
        <li>${icon('chia')}Phụ huynh chỉ xem được kết quả của con mình</li>
      </ul>
    </div>`;
}

function oMatKhau(id, nhan, tuDong) {
  return `<label class="f" for="${id}">${nhan}</label>
    <div class="mk-hien"><input id="${id}" type="password" autocomplete="${tuDong}" required>
    <button type="button" class="icon-btn" data-xem="${id}" aria-label="Hiện mật khẩu" tabindex="-1">${icon('thongtin')}</button></div>`;
}
function ganXemMatKhau() {
  el.querySelectorAll('[data-xem]').forEach(function (b) {
    b.onclick = function () {
      const i = el.querySelector('#' + b.dataset.xem);
      i.type = i.type === 'password' ? 'text' : 'password';
    };
  });
}

async function mhDangNhap() {
  const l = await D.lopTomTat().catch(function () { return { lop: MAC_DINH.TEN_LOP, truong: MAC_DINH.TEN_TRUONG }; });
  el.innerHTML = `<div class="dn-wrap">
    ${manHinhHero('Sổ thi đua lớp ' + l.lop, esc(l.truong) + ' — theo dõi thi đua và rèn luyện mỗi tuần, mỗi tháng.')}
    <div class="dn-form">
      <h2>Đăng nhập</h2>
      <p class="hint">Sổ này chỉ dành cho lớp, cần đăng nhập mới xem được.</p>
      <details class="qa">
        <summary>Phụ huynh đăng nhập thế nào?</summary>
        <p>Tên đăng nhập và mật khẩu do cô chủ nhiệm phát. Tên đăng nhập là <strong>họ tên con viết liền không dấu</strong>
          kèm đuôi lớp, ví dụ <code>nguyenvanana0k67</code>.</p>
        <p>Lần đầu vào, web sẽ yêu cầu đổi sang mật khẩu riêng. Quên mật khẩu thì nhắn cô chủ nhiệm cấp lại.</p>
      </details>
      <form id="fDN" class="stack">
        <div><label class="f" for="iU">Tên đăng nhập</label>
          <input id="iU" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div>${oMatKhau('iP', 'Mật khẩu', 'current-password')}</div>
        <button class="btn primary block" type="submit">Đăng nhập</button>
      </form>
      <div id="dnLoi" style="margin-top:14px"></div>
    </div>
  </div>`;
  ganXemMatKhau();
  q('#iU').focus();

  q('#fDN').onsubmit = async function (ev) {
    ev.preventDefault();
    const khoiPhuc = banNut(q('#fDN button[type=submit]'), 'Đang kiểm tra…');
    q('#dnLoi').innerHTML = '';
    try {
      await D.dangNhap(q('#iU').value, q('#iP').value);
      location.hash = trangChuTheoVaiTro();
      capNhatKhung(); dinhTuyen();
    } catch (e) {
      q('#dnLoi').innerHTML = msg('err', esc(e.message));
      khoiPhuc();
    }
  };
}

// ---------------------------------------------------------------- Khởi tạo lần đầu

async function mhKhoiTao() {
  el.innerHTML = `<div class="dn-wrap">
    ${manHinhHero('Chào mừng!', 'Thiết lập sổ thi đua cho lớp. Chỉ làm một lần, ngay sau khi triển khai web.')}
    <div class="dn-form">
      <h2>Khởi tạo lần đầu</h2>
      <p class="hint">Tạo tài khoản giáo viên chủ nhiệm và nạp sẵn danh mục lỗi, điểm cộng theo quy chế.</p>
      <form id="fKT" class="stack">
        <div class="row">
          <div class="col"><label class="f" for="kLop">Tên lớp</label><input id="kLop" value="${esc(MAC_DINH.TEN_LOP)}" required></div>
          <div class="col"><label class="f" for="kNam">Năm học</label><input id="kNam" value="${esc(MAC_DINH.NAM_HOC)}" pattern="\\d{4}-\\d{4}" required></div>
        </div>
        <div><label class="f" for="kTruong">Tên trường</label><input id="kTruong" value="${esc(MAC_DINH.TEN_TRUONG)}" required></div>
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <div><label class="f" for="kHoTen">Họ tên giáo viên chủ nhiệm</label><input id="kHoTen" required></div>
        <div><label class="f" for="kTen">Tên đăng nhập <small>(chữ thường không dấu)</small></label>
          <input id="kTen" value="gvcn" autocapitalize="none" required></div>
        <div>${oMatKhau('kMk', 'Mật khẩu <small>(từ 6 ký tự)</small>', 'new-password')}</div>
        <button class="btn primary block" type="submit">Khởi tạo</button>
      </form>
      <div id="ktLoi" style="margin-top:14px"></div>
    </div>
  </div>`;
  ganXemMatKhau();
  q('#fKT').onsubmit = async function (ev) {
    ev.preventDefault();
    const khoiPhuc = banNut(q('#fKT button[type=submit]'), 'Đang khởi tạo…');
    try {
      await D.khoiTaoHeThong({
        truong: q('#kTruong').value, lop: q('#kLop').value, namHoc: q('#kNam').value,
        hoTen: q('#kHoTen').value, tenDangNhap: q('#kTen').value, matKhau: q('#kMk').value
      });
      daKhoiTao = true;
      const l = await D.lopTomTat(); datTieuDe(l.truong, l.lop, l.namHoc);
      toast('Đã khởi tạo xong. Bước tiếp theo: thêm danh sách học sinh.');
      location.hash = '#/quan-tri?muc=hoc-sinh';
      capNhatKhung(); dinhTuyen();
    } catch (e) {
      q('#ktLoi').innerHTML = msg('err', esc(e.message));
      khoiPhuc();
    }
  };
}

// ---------------------------------------------------------------- Đổi mật khẩu

async function mhDoiMatKhau() {
  const hoSo = D.nguoiDung();
  const lanDau = !!hoSo.lanDau;
  el.innerHTML = `<div class="card" style="max-width:460px;margin:20px auto">
    <div class="hero-hs" style="margin-bottom:6px">${avatar(hoSo.hoTen, 'lg')}
      <div><h2>${lanDau ? 'Đặt mật khẩu riêng' : 'Đổi mật khẩu'}</h2>
      <p class="hint" style="margin:2px 0 0">${esc(hoSo.hoTen)}</p></div></div>
    ${lanDau ? msg('info', 'Đây là lần đăng nhập đầu tiên. Nên đặt mật khẩu riêng để người khác không vào được tài khoản của bạn — hoặc bấm “Để sau” nếu muốn xem trước, lúc nào cũng đổi được ở menu góc phải trên.') : ''}
    <form id="fMK" class="stack" style="margin-top:12px">
      <div>${oMatKhau('mkCu', 'Mật khẩu hiện tại', 'current-password')}</div>
      <div>${oMatKhau('mkMoi', 'Mật khẩu mới <small>(từ 6 ký tự)</small>', 'new-password')}</div>
      <div><label class="f" for="mkLai">Nhập lại mật khẩu mới</label>
        <input id="mkLai" type="password" minlength="6" autocomplete="new-password" required></div>
      <button class="btn primary block" type="submit">Đổi mật khẩu</button>
      ${lanDau ? '<button class="btn block" type="button" id="btnDeSau">Để sau, vào xem trước</button>' : ''}
    </form>
    <div id="mkLoi" style="margin-top:14px"></div>
  </div>`;
  ganXemMatKhau();

  const nutDeSau = q('#btnDeSau');
  if (nutDeSau) nutDeSau.onclick = function () {
    datBoQuaDoiMK();
    toast('Bạn nên đổi mật khẩu sớm: bấm tên ở góc phải trên → Đổi mật khẩu.');
    location.hash = trangChuTheoVaiTro();
    capNhatKhung(); dinhTuyen();
  };

  q('#fMK').onsubmit = async function (ev) {
    ev.preventDefault();
    const bao = function (t) { q('#mkLoi').innerHTML = msg('err', esc(t)); };
    if (q('#mkMoi').value !== q('#mkLai').value) { bao('Hai ô mật khẩu mới không giống nhau'); return; }
    const khoiPhuc = banNut(q('#fMK button[type=submit]'), 'Đang đổi…');
    try {
      await D.doiMatKhau(q('#mkCu').value, q('#mkMoi').value);
      toast('Đã đổi mật khẩu. Lần sau đăng nhập bằng mật khẩu mới.');
      location.hash = trangChuTheoVaiTro();
      capNhatKhung(); dinhTuyen();
    } catch (e) {
      bao(e.message);
      khoiPhuc();
    }
  };
}

khoiDong();
