/**
 * Firebase GIẢ chạy trong bộ nhớ (lưu vào localStorage), chỉ để thử giao diện và luồng dữ liệu
 * khi chưa có dự án Firebase thật. KHÔNG kiểm tra firestore.rules.
 * Dùng qua import map trong tests/harness/server.mjs.
 */
const KHO = 'fake-firestore-v1', NGUOI = 'fake-auth-v1', PHIEN = 'fake-session-v1';
const luu = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const doc_ = (k, mac) => { try { return JSON.parse(localStorage.getItem(k)) || mac; } catch (e) { return mac; } };

class Ts {
  constructor(ms) { this.ms = ms; }
  toMillis() { return this.ms; }
  toDate() { return new Date(this.ms); }
  toJSON() { return { __ts: this.ms }; }
}
const hoiSinh = (o) => {
  if (Array.isArray(o)) return o.map(hoiSinh);
  if (o && typeof o === 'object') {
    if (o.__ts !== undefined) return new Ts(o.__ts);
    const r = {};
    Object.keys(o).forEach(k => { r[k] = hoiSinh(o[k]); });
    return r;
  }
  return o;
};
let kho = hoiSinh(doc_(KHO, {}));
const ghiKho = () => luu(KHO, kho);
const sao = (o) => hoiSinh(JSON.parse(JSON.stringify(o)));

export const serverTimestamp = () => ({ __sv: true });
const giaiSV = (o) => {
  if (o && o.__sv) return new Ts(Date.now());
  if (Array.isArray(o)) return o.map(giaiSV);
  if (o && typeof o === 'object' && !(o instanceof Ts)) {
    const r = {};
    Object.keys(o).forEach(k => { r[k] = giaiSV(o[k]); });
    return r;
  }
  return o;
};
// JSON.stringify làm mất cờ __sv? Không: nó là object thường nên được giữ lại trước khi giaiSV.

// ---------------- Firestore
export const getFirestore = () => ({ loai: 'db' });
export const connectFirestoreEmulator = () => { };
export const collection = (db, ten) => ({ loai: 'col', ten });
export const doc = (db, col, id) => ({ loai: 'doc', col, id, path: col + '/' + id });
const snapDoc = (col, id) => {
  const d = kho[col + '/' + id];
  return { id, ref: doc(null, col, id), exists: () => d !== undefined, data: () => d === undefined ? undefined : sao(d) };
};
const chuaNhan = () => new Promise(r => setTimeout(r, 8));
export const getDoc = async (ref) => { await chuaNhan(); return snapDoc(ref.col, ref.id); };
export const where = (f, op, v) => ({ k: 'where', f, op, v });
export const orderBy = (f, h) => ({ k: 'order', f, h: h || 'asc' });
export const limit = (n) => ({ k: 'limit', n });
export const query = (col, ...rb) => ({ loai: 'query', col, rb });
export const getDocs = async (q) => {
  await chuaNhan();
  const col = q.loai === 'query' ? q.col : q;
  const rb = q.loai === 'query' ? q.rb : [];
  let ds = Object.keys(kho)
    .filter(p => p.startsWith(col.ten + '/') && p.slice(col.ten.length + 1).indexOf('/') < 0)
    .map(p => snapDoc(col.ten, p.slice(col.ten.length + 1)));
  rb.filter(c => c.k === 'where').forEach(c => {
    ds = ds.filter(d => { const v = d.data()[c.f]; return c.op === '==' ? v === c.v : c.op === '>=' ? v >= c.v : c.op === '<=' ? v <= c.v : false; });
  });
  rb.filter(c => c.k === 'order').forEach(c => {
    ds.sort((a, b) => {
      const x = a.data()[c.f], y = b.data()[c.f];
      const vx = x && x.toMillis ? x.toMillis() : x, vy = y && y.toMillis ? y.toMillis() : y;
      return (vx < vy ? -1 : vx > vy ? 1 : 0) * (c.h === 'desc' ? -1 : 1);
    });
  });
  rb.filter(c => c.k === 'limit').forEach(c => { ds = ds.slice(0, c.n); });
  return { docs: ds, size: ds.length, empty: !ds.length };
};
const ap = (op) => {
  const p = op.ref.col + '/' + op.ref.id;
  const d = op.d === undefined ? undefined : giaiSV(op.d);
  if (op.t === 'set') kho[p] = op.merge ? Object.assign({}, kho[p] || {}, d) : d;
  else if (op.t === 'update') {
    if (kho[p] === undefined) throw Object.assign(new Error('Không có tài liệu để cập nhật: ' + p), { code: 'not-found' });
    kho[p] = Object.assign({}, kho[p], d);
  } else if (op.t === 'delete') delete kho[p];
};
export const setDoc = async (ref, d, o) => { await chuaNhan(); ap({ t: 'set', ref, d, merge: o && o.merge }); ghiKho(); };
export const updateDoc = async (ref, d) => { await chuaNhan(); ap({ t: 'update', ref, d }); ghiKho(); };
export const deleteDoc = async (ref) => { await chuaNhan(); ap({ t: 'delete', ref }); ghiKho(); };
export const addDoc = async (col, d) => {
  await chuaNhan();
  const id = 'auto' + Math.random().toString(36).slice(2, 12);
  ap({ t: 'set', ref: doc(null, col.ten, id), d });
  ghiKho();
  return { id };
};
export const writeBatch = () => {
  const ops = [];
  return {
    set: (ref, d, o) => ops.push({ t: 'set', ref, d, merge: o && o.merge }),
    update: (ref, d) => ops.push({ t: 'update', ref, d }),
    delete: (ref) => ops.push({ t: 'delete', ref }),
    commit: async () => {
      await chuaNhan();
      if (ops.length > 500) throw new Error('Batch quá 500 thao tác');
      const cu = JSON.stringify(kho);
      try { ops.forEach(ap); } catch (e) { kho = hoiSinh(JSON.parse(cu)); throw e; }
      ghiKho();
    }
  };
};

// ---------------- Auth
const nguoi = () => doc_(NGUOI, {});
const loiAuth = (code) => Object.assign(new Error(code), { code });
const cacAuth = {};
export const initializeApp = (cfg, ten) => ({ ten: ten || 'goc' });
export const getAuth = (app) => {
  const ten = (app && app.ten) || 'goc';
  if (!cacAuth[ten]) {
    const a = { ten, currentUser: null, nghe: [] };
    try { const u = JSON.parse(sessionStorage.getItem(PHIEN + ten)); if (u) a.currentUser = u; } catch (e) { /* bỏ qua */ }
    cacAuth[ten] = a;
  }
  return cacAuth[ten];
};
const datUser = (a, u) => {
  a.currentUser = u;
  if (u) sessionStorage.setItem(PHIEN + a.ten, JSON.stringify(u)); else sessionStorage.removeItem(PHIEN + a.ten);
  a.nghe.forEach(f => f(u));
};
export const setPersistence = async () => { };
export const browserSessionPersistence = {};
export const connectAuthEmulator = () => { };
export const onAuthStateChanged = (a, f) => { a.nghe.push(f); setTimeout(() => f(a.currentUser), 10); return () => { }; };
export const createUserWithEmailAndPassword = async (a, email, mk) => {
  await chuaNhan();
  const n = nguoi();
  if (n[email]) throw loiAuth('auth/email-already-in-use');
  if (mk.length < 6) throw loiAuth('auth/weak-password');
  const u = { uid: 'uid_' + Math.random().toString(36).slice(2, 12), email };
  n[email] = { uid: u.uid, mk };
  luu(NGUOI, n);
  datUser(a, u);
  return { user: u };
};
export const signInWithEmailAndPassword = async (a, email, mk) => {
  await chuaNhan();
  const n = nguoi();
  if (!n[email] || n[email].mk !== mk) throw loiAuth('auth/invalid-credential');
  const u = { uid: n[email].uid, email };
  datUser(a, u);
  return { user: u };
};
export const signOut = async (a) => { datUser(a, null); };
export const EmailAuthProvider = { credential: (email, mk) => ({ email, mk }) };
export const reauthenticateWithCredential = async (u, c) => {
  const n = nguoi();
  if (!n[c.email] || n[c.email].mk !== c.mk) throw loiAuth('auth/invalid-credential');
};
export const updatePassword = async (u, mk) => { const n = nguoi(); n[u.email].mk = mk; luu(NGUOI, n); };
