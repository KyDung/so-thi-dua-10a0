/**
 * firebase.js — Khởi tạo Firebase (Auth + Firestore) bằng SDK dạng module từ CDN,
 * không cần cài đặt hay build.
 *
 * Mở trang kèm ?emulator để nối với Firebase Emulator trên máy (cổng mặc định) khi phát triển.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, setPersistence, browserSessionPersistence, connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, connectFirestoreEmulator
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { FIREBASE_CONFIG, CHUA_CAU_HINH } from './config.js';

const dungEmulator = new URLSearchParams(location.search).has('emulator');

export const app = CHUA_CAU_HINH ? null : initializeApp(FIREBASE_CONFIG);
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (app) {
  // Đóng tab là thoát — an toàn hơn cho máy dùng chung ở trường
  setPersistence(auth, browserSessionPersistence).catch(function () { });
  if (dungEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

/**
 * Tạo tài khoản mới mà KHÔNG làm GVCN bị đăng xuất.
 * createUserWithEmailAndPassword tự đăng nhập vào tài khoản vừa tạo, nên phải làm
 * trên một "app" phụ có phiên đăng nhập riêng.
 */
let phu = null;
export function authPhu() {
  if (!phu) {
    const a = initializeApp(FIREBASE_CONFIG, 'tao-tai-khoan');
    phu = getAuth(a);
    if (dungEmulator) connectAuthEmulator(phu, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return phu;
}
