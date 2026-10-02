/**
 * config.js — Cấu hình kết nối Firebase. Chỉ cần sửa file này sau khi tạo dự án Firebase.
 *
 * Lấy ở: Firebase Console → ⚙ Cài đặt dự án → Chung → "Ứng dụng của bạn" → Web (</>) → firebaseConfig.
 * Các giá trị này KHÔNG phải mật khẩu: chúng chỉ chỉ cho trình duyệt biết dự án nào để kết nối.
 * Bảo mật nằm ở firestore.rules (ai đọc / ghi được gì), xem README.
 */

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCudzpq7g1CjCY38oMNTjiC0p08ctKr45I',
  authDomain: 'so-thi-dua-ea713.firebaseapp.com',
  projectId: 'so-thi-dua-ea713',
  storageBucket: 'so-thi-dua-ea713.firebasestorage.app',
  messagingSenderId: '227623165799',
  appId: '1:227623165799:web:daa036dcd7f213b12219c2'
};

// Hiển thị tạm khi chưa kết nối được máy chủ
export const MAC_DINH = {
  TEN_TRUONG: 'THPT Xuân Đỉnh',
  TEN_LOP: '10A0-K67',
  NAM_HOC: '2026-2027'
};

export const CHUA_CAU_HINH = FIREBASE_CONFIG.apiKey.indexOf('PASTE') >= 0;
